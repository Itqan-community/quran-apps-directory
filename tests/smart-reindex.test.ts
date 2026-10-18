import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from "vitest";
import postgres from "postgres";

// Auth mocking pattern from tests/review-actions.test.ts: mock the session
// source so requireAdmin() can be exercised without a real NextAuth setup.
const authMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/auth", () => ({ auth: authMock }));
vi.mock("next/cache", () => ({ revalidateTag: vi.fn(), revalidatePath: vi.fn() }));

import { reindexAllEmbeddings, reindexAppEmbedding } from "@/lib/ai/reindex";
import { reindexAllEmbeddingsAction } from "@/lib/actions/admin-apps";
import { upsertAppEmbedding } from "@/lib/ai/ingest";
import { MockProvider } from "@/lib/ai/providers/mock";
import type { EmbeddingProvider } from "@/lib/ai/types";

const sql = postgres(process.env.TEST_DATABASE_URL!, { max: 4 });

const SLUG_PREFIX = "t-reix-%";
const DEV_NAME = "T:ReixDev";

let devId = 0;
let appA = 0;
let appB = 0;
let appC = 0;

beforeAll(async () => {
  // Defensive pre-clean so a failed run mid-suite never breaks the next run.
  await sql`DELETE FROM apps WHERE slug LIKE ${SLUG_PREFIX}`;
  await sql`DELETE FROM developers WHERE name_en = ${DEV_NAME}`;

  const d = await sql`
    INSERT INTO developers (name_en, name_ar) VALUES (${DEV_NAME}, 'ت:ترميز')
    RETURNING id
  `;
  devId = Number(d[0].id);

  const appSeed = (slug: string, nameEn: string, nameAr: string, sort: number) =>
    sql`
      INSERT INTO apps
        (slug, name_en, name_ar, short_description_en, short_description_ar, description_en, description_ar,
         application_icon, main_image_en, main_image_ar, avg_rating, sort_order, platform, status, developer_id)
      VALUES (${slug}, ${nameEn}, ${nameAr}, 'd', 'د', 'desc', 'وصف', 'i.png', 'c.png', 'c.png', '3.00', ${sort}, 'android', 'published', ${devId})
      RETURNING id
    `;
  appA = Number((await appSeed("t-reix-a", "T:Reix A", "ت:أ", 1))[0].id);
  appB = Number((await appSeed("t-reix-b", "T:Reix B", "ت:ب", 2))[0].id);
  appC = Number((await appSeed("t-reix-c", "T:Reix C", "ت:ج", 3))[0].id);

  // Pre-embed app C (Task 5 fixture style) so the first sweep exercises "skipped".
  expect((await upsertAppEmbedding(appC, { provider: new MockProvider() })).status).toBe("embedded");
});

afterAll(async () => {
  // doc_hash/embedding live on the apps rows, so deleting the apps removes
  // those artifacts too; the reindex path never writes search_embedding_cache.
  await sql`DELETE FROM apps WHERE slug LIKE ${SLUG_PREFIX}`;
  await sql`DELETE FROM developers WHERE name_en = ${DEV_NAME}`;
  await sql.end();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("reindexAllEmbeddings", () => {
  it("tallies embedded + skipped and is idempotent on a second run", async () => {
    const mock = new MockProvider();

    const first = await reindexAllEmbeddings({ provider: mock });
    expect(first.failed).toBe(0);
    expect(first.embedded).toBeGreaterThanOrEqual(2); // A + B had no embedding
    expect(first.skipped).toBeGreaterThanOrEqual(1); // C was pre-embedded

    // The tallies are backed by real rows: both previously-unembedded apps
    // now carry a doc_hash and a 768-dim vector.
    for (const id of [appA, appB]) {
      const [row] = await sql`SELECT doc_hash, vector_dims(embedding) AS d FROM apps WHERE id = ${id}`;
      expect(row.doc_hash).toBeTruthy();
      expect(Number(row.d)).toBe(768);
    }

    // Unchanged docs: nothing to re-embed.
    const second = await reindexAllEmbeddings({ provider: mock });
    expect(second.failed).toBe(0);
    expect(second.embedded).toBe(0);
    expect(second.skipped).toBeGreaterThanOrEqual(3);
  });

  it("never throws with a broken provider and tallies every failure", async () => {
    // Clear the stored hashes so every upsert reaches the (broken) provider
    // instead of returning via the unchanged-doc skip.
    await sql`UPDATE apps SET doc_hash = NULL WHERE slug LIKE ${SLUG_PREFIX}`;

    const broken = {
      name: "broken",
      dimensions: 768,
      embedDocument: () => Promise.reject(new Error("x")),
      embedQuery: () => Promise.reject(new Error("x")),
    } as unknown as EmbeddingProvider;

    // Resolving at all is the never-throws pin; the report tallies the failures.
    const report = await reindexAllEmbeddings({ provider: broken });
    expect(report.failed).toBeGreaterThanOrEqual(3);
    expect(report.embedded).toBe(0);
    expect(report.skipped).toBe(0);
  });
});

describe("reindexAppEmbedding", () => {
  it("wraps the default-provider upsert and passes the status through", async () => {
    vi.stubEnv("AI_SEARCH_PROVIDER", "mock");
    await sql`UPDATE apps SET doc_hash = NULL WHERE slug = 't-reix-a'`;

    expect((await reindexAppEmbedding(appA)).status).toBe("embedded");
    expect((await reindexAppEmbedding(appA)).status).toBe("skipped");
    expect((await reindexAppEmbedding(99999999)).status).toBe("app_not_found");
  });
});

describe("reindexAllEmbeddingsAction", () => {
  it("redirects to /admin/login when unauthenticated", async () => {
    authMock.mockResolvedValue(null);

    let error: unknown;
    try {
      await reindexAllEmbeddingsAction();
    } catch (e) {
      error = e;
    }

    expect(error).toBeInstanceOf(Error);
    const digest = (error as { digest?: string }).digest ?? "";
    expect(digest).toContain("NEXT_REDIRECT");
    expect(digest).toContain("/admin/login");
  });
});
