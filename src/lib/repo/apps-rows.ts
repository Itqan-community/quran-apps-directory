import { and, asc, desc, eq, inArray, or, sql } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
import { db } from "@/db";
import { apps, appsCategories, categories, developers } from "@/db/schema";
import { normalizeArabic } from "@/lib/services/arabic";

export type AppsFilters = {
  search?: string;
  developerId?: number;
  categorySlugs?: string[];
  platforms?: string[];
  featured?: boolean;
  status?: string; // default "published"; "draft" etc. for admin
  riwayah?: string[];
  mushafType?: string[];
  features?: string[];
  ordering?: string; // CSV like "sort_order,name_en" or "avg_rating,desc"
  includeCategories?: boolean; // default true; false skips the categories fetch
  page?: number;
  pageSize?: number;
};

export type AppListItem = {
  id: number;
  slug: string;
  nameEn: string;
  nameAr: string;
  shortDescriptionEn: string;
  shortDescriptionAr: string;
  applicationIcon: string;
  mainImageEn: string;
  mainImageAr: string;
  avgRating: string;
  reviewCount: number;
  viewCount: number;
  sortOrder: number;
  featured: boolean;
  platform: string;
  status: string;
  createdAt: Date;
  developer: {
    id: number;
    nameEn: string;
    nameAr: string;
    website: string | null;
    logo: string | null;
  };
  categories: { id: number; slug: string; nameEn: string; nameAr: string }[];
};

const ORDERABLE = {
  sort_order: apps.sortOrder,
  name_en: apps.nameEn,
  avg_rating: apps.avgRating,
  view_count: apps.viewCount,
  review_count: apps.reviewCount,
  created_at: apps.createdAt,
} as const;

function parseOrdering(ordering?: string) {
  const parts = (ordering ?? "sort_order,name_en").split(",").map((s) => s.trim());
  const dir = parts[parts.length - 1] === "desc" ? "desc" : "asc";
  const field = Object.hasOwn(ORDERABLE, parts[0]) ? (parts[0] as keyof typeof ORDERABLE) : "sort_order";
  const col = ORDERABLE[field];
  return dir === "desc" ? desc(col) : asc(col);
}

/** Escape LIKE metacharacters so user input is matched literally (pairs with ESCAPE '\' in SQL). */
function escapeLike(s: string) {
  return s.replace(/[%_\\]/g, "\\$&");
}

/** OR-within-values condition over a jsonb string array (GIN-backed) */
function jsonbAny(col: AnyPgColumn, values: string[]) {
  const list = sql.join(
    values.map((v) => sql`${v}`),
    sql`, `
  );
  return sql`${col} ?| array[${list}]::text[]`;
}

export function parsePageParams(filters: { page?: number; pageSize?: number }) {
  return {
    page: Math.max(1, filters.page ?? 1),
    pageSize: Math.min(200, Math.max(1, filters.pageSize ?? 100)),
  };
}

export async function getAppListRows(filters: AppsFilters): Promise<{
  count: number;
  results: AppListItem[];
}> {
  const { page, pageSize } = parsePageParams(filters);
  const status = filters.status ?? "published";

  const conds = [eq(apps.status, status)];
  if (filters.featured !== undefined) conds.push(eq(apps.featured, filters.featured));
  if (filters.developerId) conds.push(eq(apps.developerId, filters.developerId));
  if (filters.platforms?.length) conds.push(inArray(apps.platform, filters.platforms));
  if (filters.riwayah?.length) conds.push(jsonbAny(apps.riwayah, filters.riwayah));
  if (filters.mushafType?.length) conds.push(jsonbAny(apps.mushafType, filters.mushafType));
  if (filters.features?.length) conds.push(jsonbAny(apps.features, filters.features));
  if (filters.categorySlugs?.length) {
    conds.push(sql`EXISTS (
      SELECT 1 FROM apps_categories ac
      JOIN categories ON categories.id = ac.category_id
      WHERE ac.app_id = apps.id AND categories.slug IN (${sql.join(
        filters.categorySlugs.map((s) => sql`${s}`),
        sql`, `
      )})
    )`);
  }
  if (filters.search) {
    const raw = `%${escapeLike(filters.search.trim())}%`;
    const norm = `%${escapeLike(normalizeArabic(filters.search.trim()))}%`;
    conds.push(
      or(
        sql`${apps.nameEn} ILIKE ${raw} ESCAPE '\\'`,
        sql`${apps.nameAr} ILIKE ${raw} ESCAPE '\\'`,
        sql`${apps.shortDescriptionEn} ILIKE ${raw} ESCAPE '\\'`,
        sql`${apps.shortDescriptionAr} ILIKE ${raw} ESCAPE '\\'`,
        norm !== raw ? sql`translate(${apps.nameAr}, 'أإآٱةؤئ', 'ااااهوي') ILIKE ${norm} ESCAPE '\\'` : sql`false`
      )!
    );
  }

  const where = and(...conds);
  const [{ total }] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(apps)
    .where(where);

  const rows = await db
    .select({
      id: apps.id,
      slug: apps.slug,
      nameEn: apps.nameEn,
      nameAr: apps.nameAr,
      shortDescriptionEn: apps.shortDescriptionEn,
      shortDescriptionAr: apps.shortDescriptionAr,
      applicationIcon: apps.applicationIcon,
      mainImageEn: apps.mainImageEn,
      mainImageAr: apps.mainImageAr,
      avgRating: apps.avgRating,
      reviewCount: apps.reviewCount,
      viewCount: apps.viewCount,
      sortOrder: apps.sortOrder,
      featured: apps.featured,
      platform: apps.platform,
      status: apps.status,
      createdAt: apps.createdAt,
      devId: developers.id,
      devNameEn: developers.nameEn,
      devNameAr: developers.nameAr,
      devWebsite: developers.website,
      devLogo: developers.logoUrl,
    })
    .from(apps)
    .innerJoin(developers, eq(developers.id, apps.developerId))
    .where(where)
    .orderBy(parseOrdering(filters.ordering), asc(apps.nameEn))
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  const pageIds = rows.map((r) => r.id);
  const catRows =
    filters.includeCategories !== false && pageIds.length > 0
      ? await db
          .select({
            appId: appsCategories.appId,
            id: categories.id,
            slug: categories.slug,
            nameEn: categories.nameEn,
            nameAr: categories.nameAr,
          })
          .from(appsCategories)
          .innerJoin(categories, eq(categories.id, appsCategories.categoryId))
          .where(inArray(appsCategories.appId, pageIds))
      : [];
  const catsByApp = new Map<number, AppListItem["categories"]>();
  for (const c of catRows) {
    const list = catsByApp.get(c.appId) ?? [];
    list.push({ id: c.id, slug: c.slug, nameEn: c.nameEn, nameAr: c.nameAr });
    catsByApp.set(c.appId, list);
  }

  const results: AppListItem[] = rows.map((r) => ({
    id: r.id,
    slug: r.slug,
    nameEn: r.nameEn,
    nameAr: r.nameAr,
    shortDescriptionEn: r.shortDescriptionEn,
    shortDescriptionAr: r.shortDescriptionAr,
    applicationIcon: r.applicationIcon,
    mainImageEn: r.mainImageEn,
    mainImageAr: r.mainImageAr,
    avgRating: r.avgRating,
    reviewCount: r.reviewCount,
    viewCount: r.viewCount,
    sortOrder: r.sortOrder,
    featured: r.featured,
    platform: r.platform,
    status: r.status,
    createdAt: r.createdAt,
    developer: {
      id: r.devId,
      nameEn: r.devNameEn,
      nameAr: r.devNameAr,
      website: r.devWebsite,
      logo: r.devLogo,
    },
    categories: catsByApp.get(r.id) ?? [],
  }));

  return { count: total, results };
}
