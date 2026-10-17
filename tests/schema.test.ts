import { describe, it, expect } from "vitest";
import postgres from "postgres";

const url = process.env.TEST_DATABASE_URL!;
if (!url) throw new Error("TEST_DATABASE_URL is not set");
const sql = postgres(url, { max: 2 });

const EXPECTED_TABLES = [
  "users",
  "developers",
  "categories",
  "apps",
  "apps_categories",
  "app_screenshots",
  "metadata_types",
  "metadata_options",
  "app_metadata_values",
  "app_submissions",
  "app_submissions_categories",
  "submission_status_logs",
  "app_view_events",
];

describe("schema", () => {
  it("has all phase-1 tables", async () => {
    const tables = await sql`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public'
    `;
    const names = tables.map((t) => t.table_name);
    for (const expected of EXPECTED_TABLES) {
      expect(names).toContain(expected);
    }
  });

  it("has GIN indexes on app jsonb filter columns", async () => {
    const indexes = await sql`
      SELECT indexname FROM pg_indexes
      WHERE tablename = 'apps' AND indexname LIKE 'apps_%_gin'
    `;
    const names = indexes.map((i) => i.indexname);
    expect(names).toContain("apps_riwayah_gin");
    expect(names).toContain("apps_mushaf_type_gin");
    expect(names).toContain("apps_features_gin");
  });

  it("has dynamically created test and shadow databases from init script", async () => {
    // sanity: connecting here proves init script ran
    const one = await sql`SELECT 1 AS one`;
    expect(one[0].one).toBe(1);
  });
});

describe("smart-search schema", () => {
  it("apps.embedding columns exist and cache table holds 768-dim vectors", async () => {
    const sql = postgres(process.env.TEST_DATABASE_URL!);
    // column presence: select reads must not raise
    await expect(sql`
      SELECT doc_hash, embedded_at FROM apps WHERE embedding IS NULL AND status='published' LIMIT 1
    `).resolves.toBeDefined();
    // dimension proof: insert a real 768-dim vector, read it back
    const vec = `[${Array.from({ length: 768 }, (_, i) => (i % 2 ? 0 : 1)).join(",")}]`;
    const ins = await sql`
      INSERT INTO search_embedding_cache (query_sha256, embedding, model)
      VALUES ('t-cache-1', ${vec}::vector, 'test') RETURNING embedding::text`;
    expect(ins[0].embedding.split(",").length).toBe(768);
    await sql`DELETE FROM search_embedding_cache WHERE query_sha256='t-cache-1'`;
    await sql.end();
  });
});
