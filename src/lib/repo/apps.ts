import type { AppsFilters } from "./apps-rows";
import { getAppListRows, parsePageParams } from "./apps-rows";

export type { AppsFilters, AppListItem } from "./apps-rows";
export { getApp, type AppDetail } from "./apps-detail";

export async function getApps(filters: AppsFilters = {}) {
  const { count, results } = await getAppListRows(filters);
  const { page, pageSize } = parsePageParams(filters);
  return { count, page, pageSize, results };
}
