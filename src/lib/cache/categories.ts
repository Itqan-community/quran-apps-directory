import { cacheLife, cacheTag } from "next/cache";
import { getCategoryBySlug } from "@/lib/repo/categories";

/** Cached so unknown-category 404s resolve before the shell flushes (real 404 status). */
export async function getCategoryBySlugCached(slug: string) {
  "use cache";
  cacheLife("hours");
  cacheTag("categories");
  return getCategoryBySlug(slug);
}
