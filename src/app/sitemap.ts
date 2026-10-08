import type { MetadataRoute } from "next";
import postgres from "postgres";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://quran-apps.itqan.dev";
const LANGS = ["ar", "en"] as const;
const LASTMOD = new Date();

function alternates(basePath: string) {
  return {
    ar: `${SITE_URL}/ar${basePath}`,
    en: `${SITE_URL}/en${basePath}`,
    "x-default": `${SITE_URL}/en${basePath}`,
  };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const url = process.env.DATABASE_URL;
  if (!url) return [];
  const sql = postgres(url, { max: 2 });
  try {
    const apps = await sql`SELECT id, slug FROM apps WHERE status = 'published' ORDER BY sort_order`;
    const entries: MetadataRoute.Sitemap = [];

    for (const lang of LANGS) {
      entries.push({
        url: `${SITE_URL}/${lang}`,
        lastModified: LASTMOD,
        changeFrequency: "weekly",
        priority: 1,
        alternates: { languages: alternates("") },
      });
      entries.push({
        url: `${SITE_URL}/${lang}/apps`,
        lastModified: LASTMOD,
        changeFrequency: "weekly",
        priority: 0.9,
        alternates: { languages: alternates("/apps") },
      });
      entries.push({
        url: `${SITE_URL}/${lang}/about-us`,
        lastModified: LASTMOD,
        changeFrequency: "yearly",
        priority: 0.6,
        alternates: { languages: alternates("/about-us") },
      });
      entries.push({
        url: `${SITE_URL}/${lang}/contact-us`,
        lastModified: LASTMOD,
        changeFrequency: "yearly",
        priority: 0.6,
        alternates: { languages: alternates("/contact-us") },
      });
      entries.push({
        url: `${SITE_URL}/${lang}/ramadan`,
        lastModified: LASTMOD,
        changeFrequency: "weekly",
        priority: 0.8,
        alternates: { languages: alternates("/ramadan") },
      });
    }

    for (const app of apps) {
      for (const lang of LANGS) {
        entries.push({
          url: `${SITE_URL}/${lang}/app/${app.slug}`,
          lastModified: LASTMOD,
          changeFrequency: "monthly",
          priority: 0.8,
          alternates: { languages: alternates(`/app/${app.slug}`) },
        });
      }
    }

    const devs = await sql`SELECT id, name_en FROM developers ORDER BY name_en`;
    for (const d of devs) {
      const slug = d.name_en.toLowerCase().replace(/\s+/g, "-");
      for (const lang of LANGS) {
        entries.push({
          url: `${SITE_URL}/${lang}/developer/${slug}`,
          lastModified: LASTMOD,
          changeFrequency: "monthly",
          priority: 0.7,
          alternates: { languages: alternates(`/developer/${slug}`) },
        });
      }
    }

    return entries;
  } finally {
    await sql.end();
  }
}
