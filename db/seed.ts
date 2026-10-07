import "dotenv/config";
import postgres from "postgres";
import bcrypt from "bcryptjs";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set");
const sql = postgres(url, { max: 4 });

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

async function seedCategories() {
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
  let t = 0;
  for (const [name, def] of Object.entries(METADATA_SEED)) {
    t += 1;
    void t;
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

async function main() {
  await seedCategories();
  await seedMetadata();
  await seedAppsFromJson();
  await seedAdmin();
  await sql.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
