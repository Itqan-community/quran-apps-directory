import "dotenv/config";
import postgres from "postgres";

/**
 * Flushes every content table on DATABASE_URL.
 * Idempotent by nature, but destructive — run intentionally:
 *   npm run db:flush       (then `npm run db:seed` to rebuild)
 *
 * users/auth are NOT touched on purpose: no user data is migrated yet and
 * existing admin accounts must stay valid.
 */

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set");
const sql = postgres(url, { max: 4 });

const FLUSH_TABLES = [
  "apps_categories", "app_screenshots", "app_metadata_values",
  "app_submissions_categories", "submission_status_logs", "app_view_events",
  "search_embedding_cache", "app_submissions", "apps",
  "metadata_options", "metadata_types", "developers", "categories",
];

async function main() {
  const counts: Record<string, number> = {};
  for (const t of FLUSH_TABLES) {
    const row = (await sql.unsafe(`SELECT count(*)::int AS n FROM ${t}`))[0] as unknown as { n: number };
    counts[t] = row.n;
  }
  await sql.unsafe(`TRUNCATE ${FLUSH_TABLES.join(", ")} RESTART IDENTITY CASCADE`);
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  console.log(`flush: truncated ${FLUSH_TABLES.length} content tables (${total} rows) — users kept`);
  const nonEmpty = Object.entries(counts).filter(([, n]) => n > 0);
  for (const [t, n] of nonEmpty) console.log(`flush:   ${t}: ${n}`);
  await sql.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
