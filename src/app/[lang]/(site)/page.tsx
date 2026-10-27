import { setRequestLocale } from "next-intl/server";
import { getLang } from "@/lib/i18n";
import { AppsListing } from "@/components/apps/apps-listing";
import { getCategoriesCached } from "@/lib/cache/categories";
import { JsonLd } from "@/components/site/jsonld-script";
import { websiteJsonLd, itemListJsonLd } from "@/lib/seo/jsonld";
import { getAppsCached } from "@/lib/cache/apps";
import { sortOrdering } from "@/lib/repo/apps-rows";

// searchParams-driven sort: no instant prefetch shell (validation cannot
// resolve URL data inside the static shell), same as /apps
export const instant = false;

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
  // Live parity: the old home loads the whole grid (infinite scroll in the SPA);
  // a single server render window covers the current 123 apps without a pager.
  const { results: all } = await getAppsCached({ pageSize: 200, ordering });

  return (
    <main>
      <JsonLd data={websiteJsonLd(locale)} />
      <JsonLd data={itemListJsonLd(all, null, locale)} />
      <AppsListing
        lang={locale}
        filters={{ pageSize: 200, ordering }}
        categories={await getCategoriesCached()}
        sort={sort}
        showSort
      />
    </main>
  );
}
