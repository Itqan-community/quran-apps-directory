import postgres from "postgres";

/**
 * One-time migration: copies the live Django database into the fresh Drizzle schema.
 * - Reads every table with an explicit column list (drift fails loudly).
 * - Preserves IDs so FKs and external /app/{slug} URLs stay valid.
 * - Idempotent: ON CONFLICT DO NOTHING everywhere (safe to re-run).
 * Source:  process.env.LIVE_DB_URL (read-only usage)
 * Target:  process.env.DATABASE_URL (must be empty or previously migrated)
 */

const SOURCE_URL = process.env.LIVE_DB_URL;
const TARGET_URL = process.env.DATABASE_URL;
if (!SOURCE_URL || !TARGET_URL) {
  console.error("Set LIVE_DB_URL and DATABASE_URL first.");
  process.exit(1);
}

const source = postgres(SOURCE_URL, { max: 4 });
const target = postgres(TARGET_URL, { max: 4 });

type CopySpec = { table: string; columns: string[]; where?: string };

const SPECS: CopySpec[] = [
  {
    table: "developers",
    columns: [
      "id", "name_en", "name_ar", "website", "email", "logo_url",
      "description_en", "description_ar", "social_links", "is_verified",
      "created_at", "updated_at",
    ],
  },
  {
    table: "categories",
    columns: [
      "id", "name_en", "name_ar", "description_en", "description_ar",
      "slug", "icon", "color", "sort_order", "is_active", "created_at", "updated_at",
    ],
  },
  {
    table: "apps",
    columns: [
      "id", "name_en", "name_ar", "slug",
      "short_description_en", "short_description_ar",
      "description_en", "description_ar",
      "application_icon", "main_image_en", "main_image_ar",
      "google_play_link", "app_store_link", "app_gallery_link",
      "screenshots_en", "screenshots_ar",
      "avg_rating", "review_count", "view_count", "sort_order",
      "developer_id", "platform", "featured",
      "riwayah", "mushaf_type", "features",
      "status", "created_at", "updated_at",
    ],
  },
  { table: "apps_categories", columns: ["id", "app_id", "category_id"] },
  { table: "app_screenshots", columns: ["id", "app_id", "language", "image", "sort_order"] },
  {
    table: "metadata_types",
    columns: [
      "id", "name", "label_en", "label_ar", "description_en", "description_ar",
      "is_multi_select", "sort_order", "is_active", "icon", "created_at", "updated_at",
    ],
  },
  {
    table: "metadata_options",
    columns: [
      "id", "metadata_type_id", "value", "label_en", "label_ar",
      "description_en", "description_ar", "sort_order", "is_active",
      "icon", "color", "created_at", "updated_at",
    ],
  },
  { table: "app_metadata_values", columns: ["id", "app_id", "metadata_option_id", "created_at"] },
  {
    table: "app_submissions",
    columns: [
      "id", "tracking_id", "status",
      "submitter_name", "submitter_email", "submitter_phone", "submitter_organization",
      "is_developer", "app_name_en", "app_name_ar",
      "short_description_en", "short_description_ar", "description_en", "description_ar",
      "google_play_link", "app_store_link", "app_gallery_link", "website_link",
      "app_icon_url", "main_image_en", "main_image_ar",
      "screenshots_en", "screenshots_ar",
      "additional_notes", "content_confirmation",
      "admin_notes", "rejection_reason", "info_request_message",
      "reviewed_by_id", "reviewed_at", "created_app_id",
      "created_at", "updated_at",
    ],
  },
  { table: "app_submissions_categories", columns: ["id", "appsubmission_id", "category_id"] },
  {
    table: "submission_status_logs",
    columns: [
      "id", "submission_id", "from_status", "to_status",
      "changed_by_id", "notes", "created_at", "updated_at",
    ],
  },
  {
    table: "app_view_events",
    columns: [
      "id", "app_id", "viewed_at", "referrer", "user_agent", "session_id",
      "country_code", "ip_hash", "device_type", "browser", "os",
    ],
    where: "viewed_at > now() - interval '90 days'",
  },
];

const CHUNK = 500;

async function copyTable(spec: CopySpec): Promise<number> {
  const where = spec.where ? `WHERE ${spec.where}` : "";
  const rows = await source.unsafe(
    `SELECT ${spec.columns.join(",")} FROM ${spec.table} ${where}`
  );
  let inserted = 0;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK);
    const flat: unknown[] = [];
    const tuples = chunk.map((row) => {
      const r = row as Record<string, unknown>;
      const ph = spec.columns
        .map((_, idx) => `$${(flat.push(r[spec.columns[idx]]), flat.length)}`)
        .join(",");
      return `(${ph})`;
    });
    await target.unsafe(
      `INSERT INTO ${spec.table} (${spec.columns.join(",")}) VALUES ${tuples.join(",")} ON CONFLICT DO NOTHING`,
      flat
    );
    inserted += chunk.length;
  }
  return inserted;
}

async function fixSequences() {
  for (const spec of SPECS) {
    await target.unsafe(
      `SELECT setval(pg_get_serial_sequence('${spec.table}','id'), COALESCE((SELECT MAX(id) FROM ${spec.table}), 1))`
    );
  }
}

async function main() {
  console.log("Migrating", SPECS.length, "tables...");
  for (const spec of SPECS) {
    const n = await copyTable(spec);
    console.log(`${spec.table}: ${n}`);
  }
  await fixSequences();
  console.log("Done.");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
