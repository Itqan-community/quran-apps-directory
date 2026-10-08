import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { apps, appScreenshots, appsCategories, categories, developers } from "@/db/schema";
import type { AppListItem } from "./apps-rows";

export type AppDetail = AppListItem & {
  descriptionEn: string;
  descriptionAr: string;
  googlePlayLink: string | null;
  appStoreLink: string | null;
  appGalleryLink: string | null;
  screenshotsEn: string[];
  screenshotsAr: string[];
  createdAt: Date;
  updatedAt: Date;
};

export async function getApp(
  idOrSlug: string,
  opts?: { includeDrafts?: boolean }
): Promise<AppDetail | null> {
  const isId = /^\d+$/.test(idOrSlug);
  const conds = [
    isId ? eq(apps.id, Number(idOrSlug)) : eq(apps.slug, idOrSlug),
    ...(opts?.includeDrafts ? [] : [eq(apps.status, "published")]),
  ];
  const rows = await db.select().from(apps).where(and(...conds)).limit(1);
  if (rows.length === 0) return null;
  const a = rows[0];

  const devRows = await db.select().from(developers).where(eq(developers.id, a.developerId)).limit(1);
  const d = devRows[0];

  const catRows = await db
    .select({
      id: categories.id,
      slug: categories.slug,
      nameEn: categories.nameEn,
      nameAr: categories.nameAr,
    })
    .from(appsCategories)
    .innerJoin(categories, eq(categories.id, appsCategories.categoryId))
    .where(eq(appsCategories.appId, a.id));

  // screenshots: prefer file rows, fallback to legacy jsonb
  const shotRows = await db
    .select()
    .from(appScreenshots)
    .where(eq(appScreenshots.appId, a.id))
    .orderBy(asc(appScreenshots.sortOrder));
  const shotsEn = shotRows.filter((s) => s.language === "en").map((s) => s.image);
  const shotsAr = shotRows.filter((s) => s.language === "ar").map((s) => s.image);

  return {
    id: a.id,
    slug: a.slug,
    nameEn: a.nameEn,
    nameAr: a.nameAr,
    shortDescriptionEn: a.shortDescriptionEn,
    shortDescriptionAr: a.shortDescriptionAr,
    descriptionEn: a.descriptionEn,
    descriptionAr: a.descriptionAr,
    applicationIcon: a.applicationIcon,
    mainImageEn: a.mainImageEn,
    mainImageAr: a.mainImageAr,
    googlePlayLink: a.googlePlayLink,
    appStoreLink: a.appStoreLink,
    appGalleryLink: a.appGalleryLink,
    screenshotsEn: shotsEn.length > 0 ? shotsEn : (a.screenshotsEn ?? []),
    screenshotsAr: shotsAr.length > 0 ? shotsAr : (a.screenshotsAr ?? []),
    avgRating: a.avgRating,
    reviewCount: a.reviewCount,
    viewCount: a.viewCount,
    sortOrder: a.sortOrder,
    featured: a.featured,
    platform: a.platform,
    status: a.status,
    createdAt: a.createdAt,
    updatedAt: a.updatedAt,
    isNew: false, // detail pages don't surface the "new" badge
    developer: {
      id: d.id,
      nameEn: d.nameEn,
      nameAr: d.nameAr,
      website: d.website,
      logo: d.logoUrl,
    },
    categories: catRows,
  };
}
