import "dotenv/config";
import postgres from "postgres";

/**
 * Compares the fresh DB against the live DB after migrate-live.
 * Exits 1 on mismatch. Run with LIVE_DB_URL + DATABASE_URL set.
 */

const LIVE_URL = process.env.LIVE_DB_URL;
const FRESH_URL = process.env.DATABASE_URL;
if (!LIVE_URL || !FRESH_URL) {
  console.error("Set LIVE_DB_URL and DATABASE_URL first.");
  process.exit(1);
}

const live = postgres(LIVE_URL, { max: 2 });
const fresh = postgres(FRESH_URL, { max: 2 });

function fail(msg: string): never {
  console.error(`FAIL: ${msg}`);
  process.exit(1);
}

async function main() {
  const liveApps = await live`SELECT count(*)::int AS n FROM apps WHERE status = 'published'`;
  const freshApps = await fresh`SELECT count(*)::int AS n FROM apps WHERE status = 'published'`;
  if (liveApps[0].n !== freshApps[0].n) {
    fail(`app count mismatch: live=${liveApps[0].n} fresh=${freshApps[0].n}`);
  }
  console.log(`app count: ${freshApps[0].n} OK`);

  const liveSample = await live`
    SELECT slug, name_en, avg_rating::text AS avg_rating, featured
    FROM apps ORDER BY slug LIMIT 5
  `;
  for (const row of liveSample) {
    const match = await fresh`
      SELECT slug, name_en, avg_rating::text AS avg_rating, featured
      FROM apps WHERE slug = ${row.slug}
    `;
    if (match.length === 0) fail(`missing app slug=${row.slug}`);
    if (match[0].name_en !== row.name_en) fail(`name_en mismatch slug=${row.slug}`);
    if (match[0].avg_rating !== row.avg_rating) fail(`rating mismatch slug=${row.slug}`);
    if (match[0].featured !== row.featured) fail(`featured mismatch slug=${row.slug}`);
  }
  console.log("spot fields: OK");
  console.log("PARITY OK");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
