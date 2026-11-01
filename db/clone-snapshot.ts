import "dotenv/config";
import postgres from "postgres";
import { writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

import { DUMP_SPECS } from "./clone-specs.ts";

/**
 * One-shot generator: reads the restored legacy production DB (LIVE_DB_URL —
 * e.g. a local `qad_prod_clone`) through the explicit DUMP_SPECS queries and
 * writes `db/seed-data/prod-clone.json`, a self-contained snapshot that
 * `db/seed.ts` seeds from in file mode (no source DB needed where it runs).
 *
 * All transformations live in the specs: media keys → absolute URLs, user
 * references → NULL, search-cache column mapping, model stamping.
 *
 * Usage: LIVE_DB_URL=postgres://... npm run db:clone-snapshot
 *
 * The output contains production data (submission emails/phones, hashed IPs)
 * — keep it out of git and image layers; it is git- and dockerignored.
 */

const SOURCE_URL = process.env.LIVE_DB_URL;
if (!SOURCE_URL) {
  console.error("Set LIVE_DB_URL (restored legacy clone DB) first.");
  process.exit(1);
}

const OUT_PATH = resolve(process.env.SEED_SNAPSHOT || "db/seed-data/prod-clone.json");

const source = postgres(SOURCE_URL, { max: 4 });

async function main() {
  const tables: Record<string, Record<string, unknown>[]> = {};
  for (const spec of DUMP_SPECS) {
    const rows = (await source.unsafe(spec.sourceQuery)) as unknown as Record<string, unknown>[];
    tables[spec.targetTable] = rows;
    console.log(`extract: ${spec.targetTable}: ${rows.length}`);
  }
  const payload = {
    generatedAt: new Date().toISOString(),
    tables,
  };
  mkdirSync(resolve(OUT_PATH, ".."), { recursive: true });
  writeFileSync(OUT_PATH, JSON.stringify(payload));
  console.log(`written: ${OUT_PATH}`);
}

main()
  .then(async () => {
    await source.end();
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
