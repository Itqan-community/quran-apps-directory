import "dotenv/config";
import postgres from "postgres";
import bcrypt from "bcryptjs";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

import {
  CONTENT_TABLES,
  DUMP_SPECS,
  fixSequences,
  insertRows,
} from "./clone-specs.ts";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set");
const sql = postgres(url, { max: 4 });

// Two seeding modes, tried in order:
// 1. LIVE_DB_URL set → clone directly from a live legacy clone DB.
// 2. Seed snapshot file present (db/seed-data/prod-clone.json, made by
//    `db/clone-snapshot.ts`) → clone from the file; no source DB needed.
// Otherwise the seed fails: a bootstrap-from-nothing mode no longer exists —
// use `db:clone-snapshot` on a machine that has the legacy data.
// Users/auth are deliberately NOT copied (separate decision); the local users
// table is preserved through the flush and `seedAdmin` still runs.
const dumpUrl = process.env.LIVE_DB_URL;
const SNAPSHOT_PATH = process.env.SEED_SNAPSHOT || "db/seed-data/prod-clone.json";

/* ----------------------------------------------------------------------------
 * Clone modes: fill every content table from the production clone.
 * Refuses to run on a populated target so flush stays an explicit command.
 * ------------------------------------------------------------------------- */

async function assertContentTablesEmpty(): Promise<void> {
  const populated: string[] = [];
  for (const t of CONTENT_TABLES) {
    const row = (await sql.unsafe(`SELECT count(*)::int AS n FROM ${t}`))[0] as unknown as { n: number };
    if (row.n > 0) populated.push(`${t}: ${row.n}`);
  }
  if (populated.length > 0) {
    throw new Error(
      'target database is not empty — run "npm run db:flush" first:\n  ' +
        populated.join("\n  ")
    );
  }
}

async function copyTable(source: postgres.Sql, spec: typeof DUMP_SPECS[number]): Promise<number> {
  const rows = (await source.unsafe(spec.sourceQuery)) as unknown as Record<string, unknown>[];
  return insertRows(sql, spec, rows);
}

async function verifyClone(source: postgres.Sql): Promise<void> {
  let ok = true;
  for (const spec of DUMP_SPECS) {
    const src = (await source
      .unsafe(`SELECT count(*)::int AS n FROM (${spec.sourceQuery}) s`))[0] as unknown as { n: number };
    const dst = (await sql
      .unsafe(`SELECT count(*)::int AS n FROM ${spec.targetTable}`))[0] as unknown as { n: number };
    const tag = src.n === dst.n ? "OK" : "MISMATCH";
    if (src.n !== dst.n) ok = false;
    console.log(`verify: ${spec.targetTable}: source=${src.n} target=${dst.n} ${tag}`);
  }
  if (!ok) throw new Error("clone verification failed — target does not match source counts");
}

async function seedFromDump(sourceUrl: string): Promise<void> {
  const source = postgres(sourceUrl, { max: 4 });
  try {
    console.log("dump mode: cloning from live legacy DB");
    await assertContentTablesEmpty();
    for (const spec of DUMP_SPECS) {
      const n = await copyTable(source, spec);
      console.log(`copy: ${spec.targetTable}: ${n}`);
    }
    await fixSequences(sql);
    await verifyClone(source);
  } finally {
    await source.end();
  }
}

/** File mode: prod-clone.json made by `db/clone-snapshot.ts` — no source DB needed. */
async function seedFromSnapshot(path: string): Promise<void> {
  const snapshot = JSON.parse(readFileSync(path, "utf8")) as {
    tables: Record<string, Record<string, unknown>[]>;
  };
  console.log(`snapshot mode: seeding from ${path}`);
  await assertContentTablesEmpty();
  for (const spec of DUMP_SPECS) {
    const rows = snapshot.tables[spec.targetTable] ?? [];
    const n = await insertRows(sql, spec, rows);
    console.log(`copy: ${spec.targetTable}: ${n}`);
  }
  await fixSequences(sql);
  console.log("snapshot: done");
}

async function seedAdmin() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) {
    console.log("admin: skipped (ADMIN_EMAIL/ADMIN_PASSWORD not set)");
    return;
  }
  const hash = bcrypt.hashSync(password, 12);
  await sql`
    INSERT INTO users (email, password_hash, name, is_staff)
    VALUES (${email}, ${hash}, 'Admin', true)
    ON CONFLICT (email) DO NOTHING
  `;
  console.log("admin: ensured");
}

async function main() {
  if (dumpUrl) {
    await seedFromDump(dumpUrl);
  } else if (existsSync(resolve(SNAPSHOT_PATH))) {
    await seedFromSnapshot(SNAPSHOT_PATH);
  } else {
    throw new Error(
      "nothing to seed from: set LIVE_DB_URL, or provide a snapshot file at\n" +
        `${SNAPSHOT_PATH} (generate it with: LIVE_DB_URL=<legacy clone DB> npm run db:clone-snapshot)`
    );
  }
  await seedAdmin();
  await sql.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
