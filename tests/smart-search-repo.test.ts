import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import postgres from "postgres";
import { searchAppsSmart, _resetVocabularyCache } from "@/lib/repo/smart-search";
import { getAppListRows } from "@/lib/repo/apps-rows";
import { MockProvider } from "@/lib/ai/providers/mock";
import { EmbeddingUnavailableError, type EmbeddingProvider } from "@/lib/ai/types";
import { aiSearchVersion } from "@/lib/ai/provider";

const url = process.env.TEST_DATABASE_URL!;
const sql = postgres(url);
const mock = new MockProvider();

let devId = 0;
let alphaId = 0;
let betaId = 0;
let metaTypeId = 0;
let metaOptionId = 0;

/** pgvector text literal from a JS vector (postgres.js has no vector type parser). */
function vectorLiteral(v: number[]): string {
  return `[${v.map((x) => x.toFixed(6)).join(",")}]`;
}

/** pgvector text format is a JSON number array. */
function parseVector(s: string): number[] {
  return JSON.parse(s);
}

const brokenProvider: EmbeddingProvider = {
  name: "mock",
  dimensions: 768,
  embedDocument: async () => {
    throw new EmbeddingUnavailableError("simulated outage");
  },
  embedQuery: async () => {
    throw new EmbeddingUnavailableError("simulated outage");
  },
};

function countingProvider(inner: EmbeddingProvider) {
  let calls = 0;
  return {
    calls: () => calls,
    provider: {
      name: inner.name,
      dimensions: inner.dimensions,
      embedDocument: inner.embedDocument,
      embedQuery: async (text: string) => {
        calls++;
        return inner.embedQuery(text);
      },
    } as EmbeddingProvider,
  };
}

beforeAll(async () => {
  const d = await sql`
    INSERT INTO developers (name_en, name_ar) VALUES ('T:Smart Dev', 'مطور البحث الذكي')
    RETURNING id
  `;
  devId = d[0].id;

  const a = await sql`
    INSERT INTO apps
      (slug, name_en, name_ar, short_description_en, short_description_ar, description_en, description_ar,
       application_icon, main_image_en, main_image_ar, avg_rating, review_count, view_count, sort_order, platform, featured, status, developer_id,
       riwayah, mushaf_type, features)
    VALUES
      ('alpha', 'Alpha Mushaf Offline', 'مصحف ألفا', 'offline mushaf warsh', 'مصحف ورش بدون إنترنت', 'desc alpha', 'وصف ألفا',
       'ia.png', 'ca.png', 'ca.png', '4.50', 500, 5000, 1, 'android', true, 'published', ${devId},
       '["hafs","warsh"]'::jsonb, '[]'::jsonb, '[]'::jsonb),
      ('beta', 'Beta Audio Kids', 'أصوات أطفال', 'audio kids', 'صوتيات للأطفال', 'desc beta', 'وصف بيتا',
       'ib.png', 'cb.png', 'cb.png', '3.00', 0, 0, 2, 'ios', false, 'published', ${devId},
       '["hafs"]'::jsonb, '[]'::jsonb, '["audio"]'::jsonb)
    RETURNING id
  `;
  alphaId = a[0].id;
  betaId = a[1].id;

  const mt = await sql`
    INSERT INTO metadata_types (name, label_en, label_ar) VALUES ('riwayah', 'Riwayah', 'رواية')
    RETURNING id
  `;
  metaTypeId = mt[0].id;
  const mo = await sql`
    INSERT INTO metadata_options (metadata_type_id, value, label_en, label_ar)
    VALUES (${metaTypeId}, 'warsh', 'Warsh', 'ورش')
    RETURNING id
  `;
  metaOptionId = mo[0].id;
  await sql`INSERT INTO app_metadata_values (app_id, metadata_option_id) VALUES (${alphaId}, ${metaOptionId})`;
});

beforeEach(() => {
  // Fresh vocabulary per test: the memo is module-level with a 60-min TTL, so
  // without a reset fixtures added later in the file would go unnoticed.
  _resetVocabularyCache();
});

afterAll(async () => {
  await sql`DELETE FROM app_metadata_values WHERE app_id IN (${alphaId}, ${betaId})`;
  await sql`DELETE FROM apps WHERE id IN (${alphaId}, ${betaId})`;
  await sql`DELETE FROM metadata_options WHERE id = ${metaOptionId}`;
  await sql`DELETE FROM metadata_types WHERE id = ${metaTypeId}`;
  await sql`DELETE FROM developers WHERE id = ${devId}`;
  await sql`DELETE FROM search_embedding_cache`;
  _resetVocabularyCache();
  await sql.end();
});

describe("searchAppsSmart", () => {
  it("ranks by hybrid score and returns match reasons", async () => {
    // Crafted vectors, not mock-derived: mock vectors are hash-derived with a
    // 32-dim period, so their cosine ordering is not semantically meaningful.
    // alpha is a scaled copy of the augmented query vector (cosine 1); beta is
    // the exact orthogonal projection of another vector (cosine 0).
    const q = await mock.embedQuery("warsh mushaf");
    await sql`UPDATE apps SET embedding = ${vectorLiteral(q.map((x) => x * 0.5))}::vector WHERE id = ${alphaId}`;
    const w = await mock.embedQuery("beta audio kids");
    const dot = (a: number[], b: number[]) => a.reduce((s, x, i) => s + x * b[i], 0);
    const proj = dot(w, q) / dot(q, q);
    const ortho = w.map((x, i) => x - proj * q[i]);
    await sql`UPDATE apps SET embedding = ${vectorLiteral(ortho)}::vector WHERE id = ${betaId}`;

    const r = await searchAppsSmart({ search: "werSh mushaf" }, { provider: mock });
    expect(r.fallbackMode).toBe(false);
    expect(r.query).toBe("werSh mushaf");
    expect(r.suggestedQuery).toBe("warsh mushaf");
    expect(r.count).toBe(1);
    expect(r.results.map((x) => x.slug)).toEqual(["alpha"]); // offline+warsh match ranks first
    expect(r.results[0].matchReasons?.length).toBeGreaterThan(0);
    expect(r.results[0].relevanceScore).toBeGreaterThan(0.35); // above cutoff
    expect(r.results[0].matchReasons![0].labelAr).toBeTruthy();
  });

  it("seeds query-embedding cache; duplicate concurrent calls upsert, not crash", async () => {
    await sql`DELETE FROM search_embedding_cache`;
    const f = { search: "werSh mushaf" };
    const [r1, r2] = await Promise.all([
      searchAppsSmart(f, { provider: mock }),
      searchAppsSmart(f, { provider: mock }),
    ]);
    expect(r1.fallbackMode).toBe(false);
    expect(r2.fallbackMode).toBe(false);

    const n = await sql`SELECT count(*)::int AS c FROM search_embedding_cache WHERE model = ${aiSearchVersion()}`;
    expect(n[0].c).toBe(1);
    const dims = await sql`SELECT vector_dims(embedding) AS d FROM search_embedding_cache WHERE model = ${aiSearchVersion()}`;
    expect(dims[0].d).toBe(768);

    // The cached vector is the mock embedding of the augmented (suggested)
    // query; tolerance covers the float32 round-trip of the pgvector column.
    const rows = await sql`SELECT embedding FROM search_embedding_cache WHERE model = ${aiSearchVersion()}`;
    const cached = parseVector(rows[0].embedding);
    const expected = await mock.embedQuery("warsh mushaf");
    expect(cached.length).toBe(768);
    expect(Math.max(...cached.map((x, i) => Math.abs(x - expected[i])))).toBeLessThan(1e-6);
  });

  it("serves repeated queries from the embedding cache without re-embedding", async () => {
    await sql`DELETE FROM search_embedding_cache`;
    const { calls, provider } = countingProvider(mock);
    const f = { search: "werSh mushaf" };
    await searchAppsSmart(f, { provider });
    await searchAppsSmart(f, { provider });
    expect(calls()).toBe(1);
  });

  it("treats stale (>7 days) cache entries as a miss and refreshes them", async () => {
    await sql`DELETE FROM search_embedding_cache`;
    const { calls, provider } = countingProvider(mock);
    const f = { search: "werSh mushaf" };
    await searchAppsSmart(f, { provider });
    expect(calls()).toBe(1);

    await sql`UPDATE search_embedding_cache SET created_at = now() - interval '8 days'`;
    // A backdated stale row from another query: the miss-upsert prunes it.
    await sql`
      INSERT INTO search_embedding_cache (query_sha256, embedding, model, created_at)
      VALUES ('stale-prune-probe', ${vectorLiteral(await mock.embedQuery("prune probe"))}::vector, 'old', now() - interval '9 days')
    `;
    await searchAppsSmart(f, { provider });
    expect(calls()).toBe(2);

    const fresh = await sql`SELECT created_at > now() - interval '1 day' AS fresh FROM search_embedding_cache WHERE model = ${aiSearchVersion()} LIMIT 1`;
    expect(fresh[0].fresh).toBe(true);
    const pruned = await sql`SELECT count(*)::int AS c FROM search_embedding_cache WHERE query_sha256 = 'stale-prune-probe'`;
    expect(pruned[0].c).toBe(0);
  });

  it("unreachable provider -> fallbackMode + keyword results still returned", async () => {
    const r = await searchAppsSmart({ search: "Alpha" }, { provider: brokenProvider });
    expect(r.fallbackMode).toBe(true);
    expect(r.suggestedQuery).toBeNull();
    expect(r.query).toBe("Alpha");
    expect(r.results.some((x) => x.slug === "alpha")).toBe(true);
    expect(r.results.every((x) => x.matchReasons === undefined && x.relevanceScore === undefined)).toBe(true);
  });

  it("empty embedding pool -> fallbackMode", async () => {
    await sql`UPDATE apps SET embedding = NULL WHERE id IN (${alphaId}, ${betaId})`;
    const r = await searchAppsSmart({ search: "mushaf" }, { provider: mock });
    expect(r.fallbackMode).toBe(true);
    // Delegates to the legacy hard keyword path with identical results.
    const legacy = await getAppListRows({ search: "mushaf" });
    expect(r.count).toBe(legacy.count);
    expect(r.results.map((x) => x.slug)).toEqual(legacy.results.map((x) => x.slug));
  });

  it("punct-only query renders fallback-safe empty results (no throw)", async () => {
    await sql`UPDATE apps SET embedding = NULL WHERE id IN (${alphaId}, ${betaId})`;
    const r = await searchAppsSmart({ search: "!!!" }, { provider: mock });
    expect(r).toBeDefined();
    expect(r.fallbackMode).toBe(true);
    expect(r.results).toEqual([]);
  });

  it("no search term -> legacy list in fallback mode", async () => {
    const r = await searchAppsSmart({});
    expect(r.fallbackMode).toBe(true);
    expect(r.query).toBe("");
    expect(r.suggestedQuery).toBeNull();
    expect(r.count).toBe(2); // both published fixtures
  });
});
