import type { AppsFilters } from "./apps-rows";
import { getAppListRows } from "./apps-rows";

export type { AppsFilters, AppListItem } from "./apps-rows";
export { getApp, type AppDetail } from "./apps-detail";

export async function getApps(filters: AppsFilters = {}) {
  const { count, results } = await getAppListRows(filters);
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(200, Math.max(1, filters.pageSize ?? 100));
  return { count, page, pageSize, results };
}
