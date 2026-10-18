import { cacheLife, cacheTag } from "next/cache";
import { searchAppsSmart, type SmartSearchResult } from "@/lib/repo/smart-search";
import type { AppsFilters } from "@/lib/repo/apps-rows";

/**
 * ISR-cached wrapper over the smart search (cacheComponents pattern).
 * "use cache" here — NOT in lib/repo — so unit tests keep using raw functions.
 * `version` (aiSearchVersion() at the call site) is a cache-key ingredient:
 * a deployment-level provider/model change busts the entries. It is not used
 * in the body — the deployment-default provider answers the query.
 */
export async function getSmartAppsCached(filters: AppsFilters, version: string): Promise<SmartSearchResult> {
  "use cache";
  cacheLife("hours");
  cacheTag("apps");
  void version;
  return searchAppsSmart(filters);
}
