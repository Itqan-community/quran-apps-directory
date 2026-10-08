import { cacheLife, cacheTag } from "next/cache";
import { getApps, getApp, type AppsFilters } from "@/lib/repo/apps";

/**
 * ISR-cached wrappers over the repo layer (cacheComponents pattern).
 * "use cache" here — NOT in lib/repo — so unit tests keep using raw functions.
 */

export async function getAppsCached(filters: AppsFilters = {}) {
  "use cache";
  cacheLife("hours");
  cacheTag("apps");
  return getApps(filters);
}

export async function getAppCached(idOrSlug: string, opts?: { includeDrafts?: boolean }) {
  "use cache";
  cacheLife("hours");
  cacheTag("apps");
  return getApp(idOrSlug, opts);
}
