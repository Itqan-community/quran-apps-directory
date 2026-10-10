import { and, ne, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { apps } from "@/db/schema";
import type { AppsFilters } from "./apps-rows";
import { getAppListRows, parsePageParams } from "./apps-rows";

export type { AppsFilters, AppListItem } from "./apps-rows";
export { getApp, type AppDetail } from "./apps-detail";

export async function getApps(filters: AppsFilters = {}) {
  const { count, results } = await getAppListRows(filters);
  const { page, pageSize } = parsePageParams(filters);
  return { count, page, pageSize, results };
}

/**
 * Names must be unique across the directory (slug already is). name_ar has
 * two legacy repeats in the live data, so it is enforced at write time rather
 * than by a DB index. Returns the offending field, if any.
 */
export async function findDuplicateAppName(
  nameEn: string,
  nameAr: string,
  excludeId?: number
): Promise<"app_name_en" | "app_name_ar" | null> {
  const en = nameEn.trim().toLowerCase();
  const ar = nameAr.trim().toLowerCase();
  if (!en && !ar) return null;
  const conds = [];
  if (en) conds.push(sql`lower(${apps.nameEn}) = ${en}`);
  if (ar) conds.push(sql`lower(${apps.nameAr}) = ${ar}`);
  const where = excludeId ? and(or(...conds), ne(apps.id, excludeId)) : or(...conds);
  const rows = await db
    .select({ nameEn: apps.nameEn, nameAr: apps.nameAr })
    .from(apps)
    .where(where)
    .limit(2);
  if (rows.length === 0) return null;
  if (en && rows.some((r) => r.nameEn.toLowerCase() === en)) return "app_name_en";
  return "app_name_ar";
}
