import { setRequestLocale } from "next-intl/server";
import { getLang } from "@/lib/i18n";
import { AppsListing } from "@/components/apps/apps-listing";
import { getCategoriesCached } from "@/lib/cache/categories";
import { JsonLd } from "@/components/site/jsonld-script";
import { websiteJsonLd, itemListJsonLd } from "@/lib/seo/jsonld";
import { getAppsCached } from "@/lib/cache/apps";
import { sortOrdering } from "@/lib/repo/apps-rows";

// searchParams-driven sort + pager: no instant prefetch shell (validation
// cannot resolve URL data inside the static shell), same as /apps
export const instant = false;

const PAGE_SIZE = 20;

type SP = Record<string, string | string[] | undefined>;

export default async function HomePage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<SP>;
}) {
  const [{ lang }, sp] = await Promise.all([params, searchParams]);
  const locale = getLang({ lang });
  setRequestLocale(locale);
  const sort = (Array.isArray(sp.sort) ? sp.sort[0] : sp.sort) || undefined;
  const ordering = sortOrdering(sort, locale);
  const rawPage = Number(Array.isArray(sp.page) ? sp.page[0] : sp.page);
  const page = Number.isFinite(rawPage) ? Math.max(1, Math.floor(rawPage)) : 1;
  // One render window of 20; the numbered pager sits below the grid.
  const { count, results } = await getAppsCached({ pageSize: PAGE_SIZE, page, ordering });

  return (
    <main>
      <JsonLd data={websiteJsonLd(locale)} />
      <JsonLd
        data={itemListJsonLd(results, null, locale, {
          total: count,
          offset: (page - 1) * PAGE_SIZE,
        })}
      />
      <AppsListing
        lang={locale}
        filters={{ pageSize: PAGE_SIZE, page, ordering }}
        categories={await getCategoriesCached()}
        sort={sort}
        showSort
        basePath={`/${locale}`}
      />
    </main>
  );
}
