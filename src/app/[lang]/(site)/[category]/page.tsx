import { setRequestLocale } from "next-intl/server";
import { getLang } from "@/lib/i18n";
import { getCategoriesCached } from "@/lib/cache/categories";
import { AppsListing } from "@/components/apps/apps-listing";
import { sortOrdering } from "@/lib/repo/apps-rows";

// Data-driven top-level category route: no instant prefetch shell — the
// validator reruns cached queries in an isolated scope and trips on
// postgres.js's per-connection Math.random statement ids (dev-only noise).
export const instant = false;

const PAGE_SIZE = 20;

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
  const sort = (Array.isArray(sp.sort) ? sp.sort[0] : sp.sort) || undefined;
  const ordering = sortOrdering(sort, locale);
  const rawPage = Number(Array.isArray(sp.page) ? sp.page[0] : sp.page);
  const page = Number.isFinite(rawPage) ? Math.max(1, Math.floor(rawPage)) : 1;

  // Unknown category: the old SPA also served its listing view with the hero
  // and the in-app empty state (200) — parity documented in the spec amendments.
  return (
    <AppsListing
      lang={locale}
      selectedCategory={category}
      filters={{ categorySlugs: [category], pageSize: PAGE_SIZE, page, ordering }}
      categories={categories}
      sort={sort}
      showSort
      basePath={`/${locale}/${category}`}
    />
  );
}
