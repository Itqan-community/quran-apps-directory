import { setRequestLocale } from "next-intl/server";
import { getLang } from "@/lib/i18n";
import { getCategoriesCached } from "@/lib/cache/categories";
import { AppsListing } from "@/components/apps/apps-listing";

// Data-driven top-level category route: no instant prefetch shell — the
// validator reruns cached queries in an isolated scope and trips on
// postgres.js's per-connection Math.random statement ids (dev-only noise).
export const instant = false;

type SP = Record<string, string | string[] | undefined>;

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string; category: string }>;
  searchParams: Promise<SP>;
}) {
  const [{ lang, category }, sp] = await Promise.all([params, searchParams]);
  const locale = getLang({ lang });
  setRequestLocale(locale);
  const categories = await getCategoriesCached();
  const page = Number((Array.isArray(sp.page) ? sp.page[0] : sp.page) ?? 1) || 1;

  // Unknown category: the old SPA also served its listing view with the hero
  // and the in-app empty state (200) — parity documented in the spec amendments.
  return (
    <AppsListing
      lang={locale}
      selectedCategory={category}
      filters={{ categorySlugs: [category], page }}
      categories={categories}
    />
  );
}
