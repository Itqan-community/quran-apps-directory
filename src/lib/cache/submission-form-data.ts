import { cacheLife, cacheTag } from "next/cache";
import { getSubmissionCategories } from "@/lib/actions/submission-form-data";
import type { Locale } from "@/lib/i18n";

export async function getSubmissionCategoriesCached(lang: Locale) {
  "use cache";
  cacheLife("hours");
  cacheTag("categories");
  return getSubmissionCategories(lang);
}
