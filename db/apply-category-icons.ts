import "dotenv/config"; // fallback only; .env.prod is loaded via --env-file (see npm script)
import postgres from "postgres";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Idempotent backfill of `categories.icon` (the SVG pills on the app detail
 * page) into the database pointed at by DATABASE_URL — intended for
 * production, where those rows are empty.
 *
 * Usage: npm run db:apply-category-icons
 *        (loads .env.prod, so run it from a checkout that has it and can
 *        reach the DB — server host or inside the app container)
 *
 * Idempotent like the SQL file it ships: each UPDATE no-ops when the stored
 * icon already matches, so it is safe to run any number of times.
 *
 * After it reports success, flush the "categories" cache: re-save any
 * category in the admin panel (revalidates the tag), or wait out the "hours"
 * cacheLifetime / restart the app container.
 *
 * Raw alternative (no node on the DB host): pipe the sibling file through
 * psql in the qad-db container — see the header comment in
 * db/seed-data/category-icons.sql.
 */

const SNAPSHOT_PATH = join(dirname(fileURLToPath(import.meta.url)), "seed-data", "category-icons.sql");

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  throw new Error(
    "DATABASE_URL is not set — run this via `npm run db:apply-category-icons` (loads .env.prod) or export DATABASE_URL first.",
  );
}

const sql = postgres(DATABASE_URL, { max: 1 });
/** Narrowed, closure-safe reference for use inside main(). */
const dbUrl: string = DATABASE_URL;

// The SQL file ships BEGIN; ... COMMIT; plus a verify query. Extract the
// transaction body and split it per statement ("UPDATE categories" markers,
// not semicolons — SVG path data must not be trusted for splitting).
const fileText = readFileSync(SNAPSHOT_PATH, "utf8");
const begin = fileText.indexOf("BEGIN;");
const end = fileText.indexOf("COMMIT;");
if (begin === -1 || end === -1) {
  console.error(`Could not find BEGIN/COMMIT in ${SNAPSHOT_PATH}`);
  process.exit(1);
}
const statements = fileText
  .slice(begin + "BEGIN;".length, end)
  .split("\nUPDATE categories")
  .slice(1)
  .map((chunk, i) => "UPDATE categories" + chunk)
  .map(s => s.trim());
const slugs = statements.map((s, i) => s.match(/WHERE slug = '([^']+)'/)?.[1] ?? `statement-${i}`);

async function main() {
  const before = await sql`SELECT id, slug FROM categories WHERE icon IS NULL OR icon = '' ORDER BY id`;
  console.log(`target db: ${new URL(dbUrl).pathname} — ${before.length} of the categories are missing icons: ${before.map(r => r.slug).join(", ") || "none"}`);
  if (before.length === 0) {
    console.log("Nothing to backfill; exiting.");
    return;
  }

  await sql.begin(async tx => {
    for (let i = 0; i < statements.length; i++) {
      const res = await tx.unsafe(statements[i]);
      if (res.command !== "UPDATE" || res.count === null) {
        throw new Error(`unexpected result for "${slugs[i]}" (${res.command})`);
      }
      console.log(`  ${slugs[i].padEnd(13)} ${res.count === 0 ? "no-op (already set)" : "icon set"}`);
    }
  });

  const verify = await sql`SELECT slug, CASE WHEN icon IS NULL THEN 'NULL' WHEN icon = '' THEN 'EMPTY' ELSE length(icon) || ' chars' END AS icon_state FROM categories ORDER BY id`;
  console.log("--- verify ---");
  for (const r of verify) console.log(`  ${r.slug.padEnd(13)} ${r.icon_state}`);
  const empty = verify.filter(r => r.icon_state === "NULL" || r.icon_state === "EMPTY");
  if (empty.length) {
    console.error(`STILL EMPTY: ${empty.map(r => r.slug).join(", ")}`);
    process.exit(1);
  }
  console.log("All category icons are set. Remember to flush the \"categories\" cache (re-save a category in the admin panel, or wait out the \"hours\" TTL / restart the app).");
}

main()
  .then(async () => {
    await sql.end();
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
