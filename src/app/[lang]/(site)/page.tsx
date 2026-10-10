import { setRequestLocale } from "next-intl/server";
import { getLang } from "@/lib/i18n";
import { AppsListing } from "@/components/apps/apps-listing";
import { getCategoriesCached } from "@/lib/cache/categories";
import { JsonLd } from "@/components/site/jsonld-script";
import { websiteJsonLd, itemListJsonLd } from "@/lib/seo/jsonld";
import { getAppsCached } from "@/lib/cache/apps";

export default async function HomePage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const locale = getLang({ lang });
  setRequestLocale(locale);
  // Live parity: the old home loads the whole grid (infinite scroll in the SPA);
  // a single server render window covers the current 123 apps without a pager.
  const { results: all } = await getAppsCached({ pageSize: 200 });

  return (
    <main>
      <JsonLd data={websiteJsonLd(locale)} />
      <JsonLd data={itemListJsonLd(all, null, locale)} />
      <AppsListing lang={locale} filters={{ pageSize: 200 }} categories={await getCategoriesCached()} />
    </main>
  );
}
