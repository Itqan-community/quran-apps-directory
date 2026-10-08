import { cacheLife, cacheTag } from "next/cache";
import { getMetadataValues } from "@/lib/repo/metadata";

export async function getMetadataValuesCached() {
  "use cache";
  cacheLife("hours");
  cacheTag("metadata");
  return getMetadataValues();
}
