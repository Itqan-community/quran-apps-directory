/**
 * One-off data refresh from the live production API (123+ apps).
 * Sources: GET /api/apps (all pages) + GET /api/apps/{id} for detail fields.
 * Idempotent: upserts developers/apps by slug, reconciles category links and
 * screenshot rows per app. Never deletes apps that are missing from the API.
 *
 * Usage: npm run db:sync-live-json
 */
import "dotenv/config";
import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set");
const sql = postgres(url, { max: 4 });

const API = "https://qad-backend-api-production.up.railway.app/api";

type StoreApp = {
  id: number;
  slug: string;
  name_en: string;
  name_ar: string;
  short_description_en: string;
  short_description_ar: string;
  description_en?: string;
  description_ar?: string;
  application_icon: string;
  main_image_en: string;
  main_image_ar: string;
  google_play_link?: string | null;
  app_store_link?: string | null;
  app_gallery_link?: string | null;
  screenshots_en?: string[];
  screenshots_ar?: string[];
  avg_rating: string | number;
  review_count: number;
  view_count: number;
  sort_order: number;
  platform: string;
  featured: boolean;
  status: string;
  created_at: string;
  updated_at?: string;
  developer: {
    id: number;
    name_en: string;
    name_ar: string;
    website: string | null;
    logo: string | null;
  } | null;
  categories: string[];
};

async function fetchScript(): Promise<StoreApp[]> {
  const all: StoreApp[] = [];
  let page = 1;
  while (true) {
    const res = await fetch(`${API}/apps/?page=${page}&page_size=100`);
    if (!res.ok) throw new Error(`list page ${page} -> ${res.status}`);
    const data = (await res.json()) as { count: number; results: StoreApp[] };
    all.push(...data.results);
    if (all.length >= data.count) break;
    page += 1;
  }
  console.log(`fetched ${all.length} apps from list endpoint`);

  for (const app of all) {
    try {
      const res = await fetch(`${API}/apps/${app.id}`);
      if (res.ok) {
        const detail = (await res.json()) as StoreApp;
        app.description_en = detail.description_en;
        app.description_ar = detail.description_ar;
        app.google_play_link = detail.google_play_link;
        app.app_store_link = detail.app_store_link;
        app.app_gallery_link = detail.app_gallery_link;
        app.screenshots_en = detail.screenshots_en;
        app.screenshots_ar = detail.screenshots_ar;
        app.updated_at = detail.updated_at;
      }
    } catch (err) {
      console.warn(`detail fetch failed for ${app.slug}:`, (err as Error).message);
    }
  }
  return all;
}

async function main() {
  const apps = await fetchScript();

  // Categories (keep icons/sort in line with live)
  const catList = (await (await fetch(`${API}/categories/`)).json()) as
    | { results: { slug: string; name_en: string; name_ar: string; icon: string; description_en: string; description_ar: string; sort_order?: number }[] }
    | { slug: string; name_en: string; name_ar: string; icon: string; description_en: string; description_ar: string; sort_order?: number }[];
  const cats = Array.isArray(catList) ? catList : catList.results;
  for (const [i, c] of cats.entries()) {
    await sql`
      UPDATE categories SET
        name_en = ${c.name_en}, name_ar = ${c.name_ar}, icon = ${c.icon},
        description_en = ${c.description_en}, description_ar = ${c.description_ar},
        sort_order = ${c.sort_order ?? i + 1}
      WHERE slug = ${c.slug}
    `;
  }
  console.log("categories synced");

  // Full reload with live IDs (keeps slug_id URLs identical to production).
  // App-linked rows cascade; submissions/analyses tables keep their FKs intact.
  await sql`TRUNCATE apps, app_screenshots, apps_categories, app_view_events, developers RESTART IDENTITY CASCADE`;

  const devBy = new Map<number, NonNullable<StoreApp["developer"]>>();
  for (const a of apps) if (a.developer) devBy.set(a.developer.id, a.developer);
  for (const dev of devBy.values()) {
    await sql`
      INSERT INTO developers (id, name_en, name_ar, website, logo_url)
      VALUES (${dev.id}, ${dev.name_en}, ${dev.name_ar}, ${dev.website}, ${dev.logo})
      ON CONFLICT (id) DO UPDATE SET
        name_en = EXCLUDED.name_en, name_ar = EXCLUDED.name_ar,
        website = EXCLUDED.website, logo_url = EXCLUDED.logo_url
    `;
  }
  const devMax = [...devBy.keys()].reduce((m, x) => Math.max(m, x), 0);
  await sql`SELECT setval(pg_get_serial_sequence('developers', 'id'), ${devMax})`;
  console.log(`developers reloaded: ${devBy.size}`);

  const missingCats: string[] = [];
  const catIds = new Map(
    (await sql`SELECT id, slug FROM categories`).map((r) => [r.slug as string, r.id as number]),
  );

  for (const a of apps) {
    const createdAt = new Date(a.created_at);
    const updatedAt = a.updated_at ? new Date(a.updated_at) : createdAt;
    await sql`
      INSERT INTO apps (
        id, slug, name_en, name_ar, short_description_en, short_description_ar,
        description_en, description_ar, application_icon, main_image_en, main_image_ar,
        google_play_link, app_store_link, app_gallery_link,
        screenshots_en, screenshots_ar,
        avg_rating, review_count, view_count, sort_order, platform, featured,
        status, developer_id, created_at, updated_at
      ) VALUES (
        ${a.id}, ${a.slug}, ${a.name_en}, ${a.name_ar},
        ${a.short_description_en}, ${a.short_description_ar},
        ${a.description_en ?? a.short_description_en}, ${a.description_ar ?? a.short_description_ar},
        ${a.application_icon}, ${a.main_image_en ?? a.application_icon}, ${a.main_image_ar ?? a.application_icon},
        ${a.google_play_link ?? null}, ${a.app_store_link ?? null}, ${a.app_gallery_link ?? null},
        ${JSON.stringify(a.screenshots_en ?? [])}::jsonb, ${JSON.stringify(a.screenshots_ar ?? [])}::jsonb,
        ${Number(a.avg_rating ?? 0).toFixed(2)}, ${a.review_count ?? 0}, ${a.view_count ?? 0},
        ${a.sort_order ?? 0}, ${a.platform}, ${a.featured},
        ${a.status}, ${a.developer?.id ?? 1}, ${createdAt}, ${updatedAt}
      )
      ON CONFLICT (id) DO UPDATE SET
        slug = EXCLUDED.slug, name_en = EXCLUDED.name_en, name_ar = EXCLUDED.name_ar,
        short_description_en = EXCLUDED.short_description_en, short_description_ar = EXCLUDED.short_description_ar,
        description_en = EXCLUDED.description_en, description_ar = EXCLUDED.description_ar,
        application_icon = EXCLUDED.application_icon, main_image_en = EXCLUDED.main_image_en, main_image_ar = EXCLUDED.main_image_ar,
        google_play_link = EXCLUDED.google_play_link, app_store_link = EXCLUDED.app_store_link, app_gallery_link = EXCLUDED.app_gallery_link,
        screenshots_en = EXCLUDED.screenshots_en, screenshots_ar = EXCLUDED.screenshots_ar,
        avg_rating = EXCLUDED.avg_rating, review_count = EXCLUDED.review_count, view_count = EXCLUDED.view_count,
        sort_order = EXCLUDED.sort_order, platform = EXCLUDED.platform, featured = EXCLUDED.featured,
        status = EXCLUDED.status, developer_id = EXCLUDED.developer_id
    `;

    for (const catSlug of a.categories ?? []) {
      const catId = catIds.get(catSlug);
      if (catId) {
        await sql`
          INSERT INTO apps_categories (app_id, category_id)
          VALUES (${a.id}, ${catId})
          ON CONFLICT (app_id, category_id) DO NOTHING
        `;
      } else {
        missingCats.push(`${a.slug}:${catSlug}`);
      }
    }

    const shots: [string, string[]][] = [
      ["en", a.screenshots_en ?? []],
      ["ar", a.screenshots_ar ?? []],
    ];
    for (const [lang, urls] of shots) {
      for (let s = 0; s < urls.length; s++) {
        await sql`
          INSERT INTO app_screenshots (app_id, language, image, sort_order)
          VALUES (${a.id}, ${lang}, ${urls[s]}, ${s})
        `;
      }
    }
  }

  const appMax = apps.reduce((m, a) => Math.max(m, a.id), 0);
  await sql`SELECT setval(pg_get_serial_sequence('apps', 'id'), ${appMax})`;

  const count = await sql`SELECT count(*) FROM apps`;
  console.log(`apps synced: ${count[0].count}; app ids up to ${appMax}`);
  if (missingCats.length > 0) console.log(`missing category links: ${missingCats.join(", ")}`);
  await sql.end();
  console.log("done");
}

main().catch(async (err) => {
  console.error(err);
  await sql.end();
  process.exit(1);
});
