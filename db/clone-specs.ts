/**
 * Shared spec for cloning the legacy production database into the new schema.
 *
 * Used by two executables:
 * - `db/clone-snapshot.ts` — reads a live clone DB via DUMP_SPECS.sourceQuery
 *   and writes `db/seed-data/prod-clone.json`.
 * - `db/seed.ts` — inserts `prod-clone.json` rows (snapshot mode) or reads the
 *   live clone directly (LIVE_DB_URL mode) through the same insert path.
 *
 * Explicit column lists on both sides — schema drift fails loudly instead of
 * silently losing data. IDs are preserved so PK/FK relationships (and
 * /app/{slug} links shared elsewhere) survive the copy verbatim.
 */

import postgres from "postgres";

export type DumpCopySpec = {
  /** Full source SELECT; alias order MUST match targetColumns. */
  sourceQuery: string;
  targetTable: string;
  targetColumns: string[];
  /** Optional SQL cast per target column, e.g. `embedding: "::vector"`. */
  casts?: Record<string, string>;
  /** PK column used by the sequence fixer; null when the table has no serial id. */
  idColumn?: string | null;
};

export const CHUNK = 500;

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

export const DUMP_SPECS: DumpCopySpec[] = [
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
// the user keeps full manual control (flush is an explicit separate command).
export const CONTENT_TABLES = [
  "apps_categories", "app_screenshots", "app_metadata_values",
  "app_submissions_categories", "submission_status_logs", "app_view_events",
  "search_embedding_cache", "app_submissions", "apps",
  "metadata_options", "metadata_types", "developers", "categories",
];

/** Chunked INSERT of prepared rows (keyed by targetColumns) into the target. */
export async function insertRows(
  sql: postgres.Sql,
  spec: DumpCopySpec,
  rows: Record<string, unknown>[],
): Promise<number> {
  let inserted = 0;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK);
    const flat: unknown[] = [];
    const tuples = chunk.map((row) => {
      const ph = spec.targetColumns
        .map((col) => `$${(flat.push(row[col]), flat.length)}${spec.casts?.[col] ?? ""}`)
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

/** Sync bigserial sequences to the copied MAX(id) values. */
export async function fixSequences(sql: postgres.Sql): Promise<void> {
  for (const spec of DUMP_SPECS) {
    if (spec.idColumn === null) continue;
    await sql.unsafe(
      `SELECT setval(pg_get_serial_sequence('${spec.targetTable}','id'), COALESCE((SELECT MAX(id) FROM ${spec.targetTable}), 1))`
    );
  }
}
