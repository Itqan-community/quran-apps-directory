import "dotenv/config";
import postgres from "postgres";
import bcrypt from "bcryptjs";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set");
const sql = postgres(url, { max: 4 });

// When LIVE_DB_URL points at a restored prod dump (e.g.
// `pg_restore -d qad_prod_clone qad-railway-*.dump`), the script clones the
// whole content of that database instead of the static JSON bootstrap.
// Users/auth are deliberately NOT copied yet (separate decision); the local
// users table is preserved through the flush and `seedAdmin` still runs.
const dumpUrl = process.env.LIVE_DB_URL;

const CATEGORY_LABELS: Record<string, { en: string; ar: string }> = {
  mushaf: { en: "Mushaf", ar: "مصحف" },
  tafsir: { en: "Tafsir", ar: "تفسير" },
  recite: { en: "Recite", ar: "تسميع" },
  memorize: { en: "Memorize", ar: "تحفيظ" },
  kids: { en: "Kids", ar: "أطفال" },
  translations: { en: "Translation", ar: "ترجمات" },
  audio: { en: "Audio", ar: "صوتيات" },
  riwayat: { en: "Riwayat", ar: "روايات" },
  tools: { en: "Other", ar: "أخرى" },
  accessibility: { en: "Accessibility", ar: "ذوي الإعاقة" },
  tajweed: { en: "Tajweed", ar: "تجويد" },
};

const METADATA_SEED = {
  riwayah: {
    label_en: "Riwayah",
    label_ar: "الرواية",
    sort_order: 1,
    description_en: "Quranic recitation style (method of recitation)",
    description_ar: "رواية القرآن الكريم (طريقة التلاوة)",
    options: [
      ["hafs", "Hafs", "حفص"],
      ["warsh", "Warsh", "ورش"],
      ["qalun", "Qalun", "قالون"],
      ["shubah", "Shu'bah", "شعبة"],
      ["alduri", "Al-Duri", "الدوري"],
      ["alsusi", "Al-Susi", "السوسي"],
      ["hisham", "Hisham", "هشام"],
      ["ibn_dhakwan", "Ibn Dhakwan", "ابن ذكوان"],
      ["khalaf", "Khalaf", "خلف"],
      ["khallad", "Khallad", "خلاد"],
      ["other", "Other", "أخرى"],
    ] as [string, string, string][],
  },
  mushaf_type: {
    label_en: "Mushaf Type",
    label_ar: "نوع المصحف",
    sort_order: 2,
    description_en: "Supported Mushaf types",
    description_ar: "أنواع المصاحف المدعومة",
    options: [
      ["madani", "Madani (Madinah)", "مديني"],
      ["uthmani", "Uthmani", "عثماني"],
      ["indo_pak", "Indo-Pakistani", "هندي باكستاني"],
      ["moroccan", "Moroccan", "مغربي"],
      ["simple", "Simple (Imlaei)", "إملائي"],
      ["tajweed", "Tajweed Colored", "مصحف التجويد"],
      ["other", "Other", "أخرى"],
    ] as [string, string, string][],
  },
  features: {
    label_en: "Features",
    label_ar: "الميزات",
    sort_order: 3,
    description_en: "App features",
    description_ar: "ميزات التطبيق",
    options: [
      ["offline", "Offline Mode", "بدون إنترنت"],
      ["audio", "Audio Recitation", "تلاوة صوتية"],
      ["translation", "Translation", "ترجمة"],
      ["tafsir", "Tafsir", "تفسير"],
      ["bookmarks", "Bookmarks", "إشارات مرجعية"],
      ["search", "Search", "بحث"],
      ["tajweed", "Tajweed", "تجويد"],
      ["dark_mode", "Dark Mode", "الوضع الليلي"],
      ["memorization", "Memorization Tools", "أدوات الحفظ"],
      ["prayer_times", "Prayer Times", "مواقيت الصلاة"],
      ["qibla", "Qibla Direction", "اتجاه القبلة"],
      ["notifications", "Notifications", "الإشعارات"],
    ] as [string, string, string][],
  },
};

type AppRow = {
  id: string;
  Name_Ar: string;
  Name_En: string;
  Short_Description_Ar: string;
  Short_Description_En: string;
  Description_Ar: string;
  Description_En: string;
  sort: number;
  Apps_Avg_Rating: number;
  categories: string[];
  screenshots_ar: string[];
  screenshots_en: string[];
  mainImage_ar: string;
  mainImage_en: string;
  applicationIcon: string;
  Developer_Name_En: string;
  Developer_Name_Ar: string;
  Developer_Website: string;
  Google_Play_Link: string;
  AppStore_Link: string;
  App_Gallery_Link: string;
};

/* ----------------------------------------------------------------------------
 * Dump mode: clone every content table from the restored prod dump.
 * Explicit column lists on both sides — schema drift fails loudly instead of
 * silently losing data. IDs are preserved so PK/FK relationships (and
 * /app/{slug} links shared elsewhere) survive the copy verbatim.
 * ------------------------------------------------------------------------- */

type DumpCopySpec = {
  /** Full source SELECT; alias order MUST match targetColumns. */
  sourceQuery: string;
  targetTable: string;
  targetColumns: string[];
  /** Optional SQL cast per target column, e.g. `embedding: "::vector"`. */
  casts?: Record<string, string>;
  /** PK column used by the sequence fixer; null when the table has no serial id. */
  idColumn?: string | null;
};

const CHUNK = 500;

// Legacy Django DB stores raw object keys (e.g. "app-images/1-wahy/main_ar.webp");
// the frontend needs absolute URLs against the legacy R2 public base (the same
// bucket the old JSON export and next.config remotePatterns already use).
// Already-absolute values (submissions etc.) pass through unchanged. Override
// with LEGACY_MEDIA_BASE_URL if the bucket moves.
const LEGACY_MEDIA_BASE = (
  process.env.LEGACY_MEDIA_BASE_URL || "https://pub-e11717db663c469fb51c65995892b449.r2.dev"
).replace(/'/g, "''");

/** Media column normalizer: appends the legacy public base to relative keys. */
const media = (col: string, alias: string): string =>
  `CASE WHEN ${col} LIKE 'http%' THEN ${col} ELSE '${LEGACY_MEDIA_BASE}/' || trim(leading '/' FROM ${col}) END AS ${alias}`;

/** Media jsonb-array normalizer (preserves []; skips null/empty entries). */
const mediaArray = (col: string, alias: string): string =>
  `COALESCE((SELECT jsonb_agg(CASE WHEN v LIKE 'http%' THEN v ELSE '${LEGACY_MEDIA_BASE}/' || trim(leading '/' FROM v) END ORDER BY ord)
             FROM jsonb_array_elements_text(${col}) WITH ORDINALITY AS t(v, ord)
             WHERE v IS NOT NULL AND v != ''), '[]'::jsonb) AS ${alias}`;

const DUMP_SPECS: DumpCopySpec[] = [
  {
    sourceQuery: `SELECT id, name_en, name_ar, description_en, description_ar, slug,
                         icon, color, sort_order, is_active, created_at, updated_at
                  FROM categories ORDER BY id`,
    targetTable: "categories",
    targetColumns: [
      "id", "name_en", "name_ar", "description_en", "description_ar", "slug",
      "icon", "color", "sort_order", "is_active", "created_at", "updated_at",
    ],
  },
  {
    // contact_info exists only in prod — dropped in the new schema.
    sourceQuery: `SELECT id, name_en, name_ar, website, email, logo_url,
                         description_en, description_ar, social_links, is_verified,
                         created_at, updated_at
                  FROM developers ORDER BY id`,
    targetTable: "developers",
    targetColumns: [
      "id", "name_en", "name_ar", "website", "email", "logo_url",
      "description_en", "description_ar", "social_links", "is_verified",
      "created_at", "updated_at",
    ],
  },
  {
    // crawled_at/crawled_content are prod-only; doc_hash/embedded_at stay null
    // until the next reindex. Embedding is copied so prod vectors stay live
    // (768-dim, same pipeline) until `npm run embeddings:reindex` refreshes it.
    // Icons/covers/screenshots are normalized from raw R2 keys to absolute URLs.
    sourceQuery: `SELECT id, created_at, updated_at, status, name_en, name_ar, slug,
                         short_description_en, short_description_ar,
                         description_en, description_ar,
                         ${media("application_icon", "application_icon")},
                         ${media("main_image_en", "main_image_en")},
                         ${media("main_image_ar", "main_image_ar")},
                         google_play_link, app_store_link, app_gallery_link,
                         ${mediaArray("screenshots_en", "screenshots_en")},
                         ${mediaArray("screenshots_ar", "screenshots_ar")},
                         avg_rating, review_count, view_count, sort_order,
                         platform, featured, developer_id,
                         embedding::text AS embedding,
                         riwayah, mushaf_type, features
                  FROM apps ORDER BY id`,
    targetTable: "apps",
    targetColumns: [
      "id", "created_at", "updated_at", "status", "name_en", "name_ar", "slug",
      "short_description_en", "short_description_ar",
      "description_en", "description_ar",
      "application_icon", "main_image_en", "main_image_ar",
      "google_play_link", "app_store_link", "app_gallery_link",
      "screenshots_en", "screenshots_ar",
      "avg_rating", "review_count", "view_count", "sort_order",
      "platform", "featured", "developer_id",
      "embedding",
      "riwayah", "mushaf_type", "features",
    ],
    casts: { embedding: "::vector" },
  },
  {
    sourceQuery: `SELECT id, app_id, category_id FROM apps_categories ORDER BY id`,
    targetTable: "apps_categories",
    targetColumns: ["id", "app_id", "category_id"],
  },
  {
    sourceQuery: `SELECT id, app_id, language,
                         ${media("image", "image")}, sort_order
                  FROM app_screenshots ORDER BY id`,
    targetTable: "app_screenshots",
    targetColumns: ["id", "app_id", "language", "image", "sort_order"],
  },
  {
    sourceQuery: `SELECT id, name, label_en, label_ar, description_en, description_ar,
                         is_multi_select, sort_order, is_active, icon, created_at, updated_at
                  FROM metadata_types ORDER BY id`,
    targetTable: "metadata_types",
    targetColumns: [
      "id", "name", "label_en", "label_ar", "description_en", "description_ar",
      "is_multi_select", "sort_order", "is_active", "icon", "created_at", "updated_at",
    ],
  },
  {
    sourceQuery: `SELECT id, metadata_type_id, value, label_en, label_ar,
                         description_en, description_ar, sort_order, is_active,
                         icon, color, created_at, updated_at
                  FROM metadata_options ORDER BY id`,
    targetTable: "metadata_options",
    targetColumns: [
      "id", "metadata_type_id", "value", "label_en", "label_ar",
      "description_en", "description_ar", "sort_order", "is_active",
      "icon", "color", "created_at", "updated_at",
    ],
  },
  {
    sourceQuery: `SELECT id, app_id, metadata_option_id, created_at FROM app_metadata_values ORDER BY id`,
    targetTable: "app_metadata_values",
    targetColumns: ["id", "app_id", "metadata_option_id", "created_at"],
  },
  {
    // reviewed_by_id references users — users are not copied yet, so null it.
    sourceQuery: `SELECT id, tracking_id, status,
                         submitter_name, submitter_email, submitter_phone, submitter_organization,
                         is_developer, developer_name_en, developer_name_ar,
                         developer_website, developer_email,
                         app_name_en, app_name_ar,
                         short_description_en, short_description_ar,
                         description_en, description_ar,
                         google_play_link, app_store_link, app_gallery_link, website_link,
                         crawled_content, app_icon_url, main_image_en, main_image_ar,
                         screenshots_en, screenshots_ar,
                         additional_notes, content_confirmation,
                         admin_notes, rejection_reason, info_request_message,
                         NULL::bigint AS reviewed_by_id, reviewed_at, created_app_id,
                         created_at, updated_at
                  FROM app_submissions ORDER BY id`,
    targetTable: "app_submissions",
    targetColumns: [
      "id", "tracking_id", "status",
      "submitter_name", "submitter_email", "submitter_phone", "submitter_organization",
      "is_developer", "developer_name_en", "developer_name_ar",
      "developer_website", "developer_email",
      "app_name_en", "app_name_ar",
      "short_description_en", "short_description_ar",
      "description_en", "description_ar",
      "google_play_link", "app_store_link", "app_gallery_link", "website_link",
      "crawled_content", "app_icon_url", "main_image_en", "main_image_ar",
      "screenshots_en", "screenshots_ar",
      "additional_notes", "content_confirmation",
      "admin_notes", "rejection_reason", "info_request_message",
      "reviewed_by_id", "reviewed_at", "created_app_id",
      "created_at", "updated_at",
    ],
  },
  {
    sourceQuery: `SELECT id, appsubmission_id, category_id FROM app_submissions_categories ORDER BY id`,
    targetTable: "app_submissions_categories",
    targetColumns: ["id", "appsubmission_id", "category_id"],
  },
  {
    // changed_by_id references users — null for the same reason as above.
    sourceQuery: `SELECT id, submission_id, from_status, to_status,
                         NULL::bigint AS changed_by_id, notes, created_at, updated_at
                  FROM submission_status_logs ORDER BY id`,
    targetTable: "submission_status_logs",
    targetColumns: [
      "id", "submission_id", "from_status", "to_status",
      "changed_by_id", "notes", "created_at", "updated_at",
    ],
  },
  {
    // Full history is copied (no 90-day window): this is a production clone.
    sourceQuery: `SELECT id, app_id, viewed_at, referrer, user_agent, session_id,
                         country_code, ip_hash, device_type, browser, os
                  FROM app_view_events ORDER BY id`,
    targetTable: "app_view_events",
    targetColumns: [
      "id", "app_id", "viewed_at", "referrer", "user_agent", "session_id",
      "country_code", "ip_hash", "device_type", "browser", "os",
    ],
  },
  {
    // Rename + column mapping: query_hash → query_sha256, query_text dropped
    // (not in the new schema). Prod cache rows carry no model column, so they
    // are stamped with the current embedding model name.
    sourceQuery: `SELECT query_hash AS query_sha256,
                         embedding::text AS embedding,
                         '${(process.env.AI_EMBEDDING_MODEL || "gemini-embedding-001").replaceAll("'", "''")}' AS model,
                         created_at
                  FROM core_search_embedding_cache ORDER BY id`,
    targetTable: "search_embedding_cache",
    targetColumns: ["query_sha256", "embedding", "model", "created_at"],
    casts: { embedding: "::vector" },
    idColumn: null,
  },
];

// Content tables wiped by `npm run db:flush` (db/flush.ts). Kept in sync with
// that script — the seed refuses to run while any of these is non-empty so
// user keeps full manual control (flush is an explicit separate command).
const CONTENT_TABLES = [
  "apps_categories", "app_screenshots", "app_metadata_values",
  "app_submissions_categories", "submission_status_logs", "app_view_events",
  "search_embedding_cache", "app_submissions", "apps",
  "metadata_options", "metadata_types", "developers", "categories",
];

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

async function copyTable(source: postgres.Sql, spec: DumpCopySpec): Promise<number> {
  const rows = await source.unsafe(spec.sourceQuery);
  let inserted = 0;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK);
    const flat: unknown[] = [];
    const tuples = chunk.map((row) => {
      const r = row as Record<string, unknown>;
      const ph = spec.targetColumns
        .map((col, idx) => `$${(flat.push(r[col]), flat.length)}${spec.casts?.[col] ?? ""}`)
        .join(",");
      return `(${ph})`;
    });
    await sql.unsafe(
      `INSERT INTO ${spec.targetTable} (${spec.targetColumns.join(",")}) VALUES ${tuples.join(",")}`,
      flat as never[]
    );
    inserted += chunk.length;
  }
  return inserted;
}

async function fixSequences(): Promise<void> {
  for (const spec of DUMP_SPECS) {
    if (spec.idColumn === null) continue;
    await sql.unsafe(
      `SELECT setval(pg_get_serial_sequence('${spec.targetTable}','id'), COALESCE((SELECT MAX(id) FROM ${spec.targetTable}), 1))`
    );
  }
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
    console.log("dump mode: cloning from restored prod dump");
    await assertContentTablesEmpty();
    for (const spec of DUMP_SPECS) {
      const n = await copyTable(source, spec);
      console.log(`copy: ${spec.targetTable}: ${n}`);
    }
    await fixSequences();
    await verifyClone(source);
  } finally {
    await source.end();
  }
}

/* ----------------------------------------------------------------------------
 * Static mode (no LIVE_DB_URL): idempotent bootstrap from seed-data JSON.
 * ------------------------------------------------------------------------- */

async function seedCategories() {
  // Live snapshot (names/icons/order) — fallback to static labels if absent.
  const catPath = resolve("db/seed-data/live-categories.json");
  let cats: { slug: string; name_en: string; name_ar: string; description_en: string; description_ar: string; icon: string | null; sort_order: number }[] = [];
  try {
    cats = JSON.parse(readFileSync(catPath, "utf8")) as typeof cats;
  } catch {
    /* snapshot missing — seed from static labels */
  }
  if (cats.length > 0) {
    for (const c of cats) {
      await sql`
        INSERT INTO categories (name_en, name_ar, slug, description_en, description_ar, icon, sort_order, is_active)
        VALUES (${c.name_en}, ${c.name_ar}, ${c.slug}, ${c.description_en}, ${c.description_ar}, ${c.icon}, ${c.sort_order}, true)
        ON CONFLICT (slug) DO NOTHING
      `;
    }
    return;
  }
  let i = 0;
  for (const [slug, labels] of Object.entries(CATEGORY_LABELS)) {
    i += 1;
    await sql`
      INSERT INTO categories (name_en, name_ar, slug, sort_order, is_active)
      VALUES (${labels.en}, ${labels.ar}, ${slug}, ${i}, true)
      ON CONFLICT (slug) DO NOTHING
    `;
  }
}

async function seedMetadata() {
  for (const [name, def] of Object.entries(METADATA_SEED)) {
    const rows = await sql`
      INSERT INTO metadata_types (name, label_en, label_ar, description_en, description_ar, is_multi_select, sort_order, is_active)
      VALUES (${name}, ${def.label_en}, ${def.label_ar}, ${def.description_en}, ${def.description_ar}, true, ${def.sort_order}, true)
      ON CONFLICT (name) DO NOTHING
      RETURNING id
    `;
    if (rows.length === 0) continue; // already seeded
    const typeId = rows[0].id as number;
    let o = 0;
    for (const [value, en, ar] of def.options) {
      o += 1;
      await sql`
        INSERT INTO metadata_options (metadata_type_id, value, label_en, label_ar, sort_order, is_active)
        VALUES (${typeId}, ${value}, ${en}, ${ar}, ${o}, true)
        ON CONFLICT (metadata_type_id, value) DO NOTHING
      `;
    }
    console.log(`metadata: ${name} seeded`);
  }
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

async function seedAppsFromJson() {
  const raw = readFileSync(resolve("db/seed-data/applications_data_python.json"), "utf8");
  const data = JSON.parse(raw) as { apps: AppRow[] };
  const apps = data.apps;
  console.log(`apps: seeding ${apps.length} from JSON`);

  for (const a of apps) {
    // developer upsert by name_en
    const dev = await sql`
      INSERT INTO developers (name_en, name_ar, website)
      VALUES (${a.Developer_Name_En}, ${a.Developer_Name_Ar}, ${a.Developer_Website})
      ON CONFLICT (name_en) DO NOTHING
      RETURNING id
    `;
    let devId: number;
    if (dev.length > 0) devId = dev[0].id as number;
    else {
      const found = await sql`SELECT id FROM developers WHERE name_en = ${a.Developer_Name_En}`;
      devId = found[0].id as number;
    }

    const inserted = await sql`
      INSERT INTO apps (
        slug, name_en, name_ar,
        short_description_en, short_description_ar,
        description_en, description_ar,
        application_icon, main_image_en, main_image_ar,
        google_play_link, app_store_link, app_gallery_link,
        screenshots_en, screenshots_ar,
        avg_rating, sort_order, platform, featured, status, developer_id
      ) VALUES (
        ${a.id}, ${a.Name_En}, ${a.Name_Ar},
        ${a.Short_Description_En}, ${a.Short_Description_Ar},
        ${a.Description_En}, ${a.Description_Ar},
        ${a.applicationIcon}, ${a.mainImage_en}, ${a.mainImage_ar},
        ${a.Google_Play_Link}, ${a.AppStore_Link}, ${a.App_Gallery_Link},
        ${JSON.stringify(a.screenshots_en)}::jsonb, ${JSON.stringify(a.screenshots_ar)}::jsonb,
        ${a.Apps_Avg_Rating.toFixed(2)}, ${a.sort}, 'cross_platform', false, 'published', ${devId}
      )
      ON CONFLICT (slug) DO NOTHING
      RETURNING id
    `;
    // resolve id either from insert or lookup (partially-repaired state stays idempotent)
    let appId: number;
    if (inserted.length > 0) {
      appId = inserted[0].id as number;
    } else {
      const found = await sql`SELECT id FROM apps WHERE slug = ${a.id}`;
      if (found.length === 0) continue;
      appId = found[0].id as number;
    }
    // category links (idempotent: unique pair index + ON CONFLICT DO NOTHING)
    for (const catSlug of a.categories) {
      const cat = await sql`SELECT id FROM categories WHERE slug = ${catSlug}`;
      if (cat.length > 0) {
        await sql`
          INSERT INTO apps_categories (app_id, category_id) VALUES (${appId}, ${cat[0].id as number})
          ON CONFLICT (app_id, category_id) DO NOTHING
        `;
      }
    }
    // screenshot file rows (guarded: (app_id, language, sort_order) has no unique constraint)
    for (const [lang, urls] of [
      ["en", a.screenshots_en],
      ["ar", a.screenshots_ar],
    ] as const) {
      for (let s = 0; s < urls.length; s++) {
        await sql`
          INSERT INTO app_screenshots (app_id, language, image, sort_order)
          SELECT ${appId}, ${lang}, ${urls[s]}, ${s}
          WHERE NOT EXISTS (
            SELECT 1 FROM app_screenshots WHERE app_id = ${appId} AND language = ${lang} AND sort_order = ${s}
          )
        `;
      }
    }
  }
  console.log("apps: done");
}

async function seedFromStatic(): Promise<void> {
  await seedCategories();
  await seedMetadata();
  await seedAppsFromJson();
}

async function main() {
  if (dumpUrl) {
    await seedFromDump(dumpUrl);
  } else {
    console.log("static mode: LIVE_DB_URL not set — seeding from seed-data JSON");
    await seedFromStatic();
  }
  await seedAdmin();
  await sql.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
