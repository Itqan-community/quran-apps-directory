import { cacheLife, cacheTag } from "next/cache";
import { searchAppsSmart, type SmartSearchResult } from "@/lib/repo/smart-search";
import type { AppsFilters } from "@/lib/repo/apps-rows";

/**
 * ISR-cached wrapper over the smart search (cacheComponents pattern).
 * "use cache" here — NOT in lib/repo — so unit tests keep using raw functions.
 * `version` (aiSearchVersion() at the call site) is a cache-key ingredient:
 * a deployment-level provider/model change busts the entries. It is not used
 * in the body — the deployment-default provider answers the query.
 *
 * The lifetime is conditional (one cacheLife call per invocation, after the
 * await — the documented "conditional cache lifetimes" pattern, called in
 * different control-flow branches): fallback results are transient (provider
 * outage / empty pool), so they cache for minutes and the next request
 * re-tries the smart pipeline; successful smart results cache for hours.
 */
export async function getSmartAppsCached(filters: AppsFilters, version: string): Promise<SmartSearchResult> {
  "use cache";
  cacheTag("apps");
  void version;
  const result = await searchAppsSmart(filters);
  if (result.fallbackMode) {
    cacheLife("minutes");
  } else {
    cacheLife("hours");
  }
  return result;
}
