import { getTranslations, setRequestLocale } from "next-intl/server";
import { getLang } from "@/lib/i18n";
import { AppsListing } from "@/components/apps/apps-listing";
import { getCategoriesCached } from "@/lib/cache/categories";
import { getMetadataValuesCached } from "@/lib/cache/metadata";

type SP = Record<string, string | string[] | undefined>;

function csv(sp: SP, key: string): string[] | undefined {
  const v = sp[key];
  const raw = Array.isArray(v) ? v.join(",") : v;
  if (!raw) return undefined;
  return raw.split(",").map((s) => s.trim()).filter(Boolean);
}

export default async function AppsPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<SP>;
}) {
  const [{ lang }, sp] = await Promise.all([params, searchParams]);
  const locale = getLang({ lang });
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "appList" });
  const tCat = await getTranslations({ locale, namespace: "appList.categories" });
  const search = (Array.isArray(sp.search) ? sp.search[0] : sp.search)?.trim() || undefined;
  const page = Number((Array.isArray(sp.page) ? sp.page[0] : sp.page) ?? 1) || 1;
  const [categories, metadata] = await Promise.all([getCategoriesCached(), getMetadataValuesCached()]);

  return (
    <AppsListing
      lang={locale}
      title={search ? `${t("search.resultsFor")} "${search}"` : tCat("main-title")}
      filters={{
        search,
        categorySlugs: csv(sp, "category"),
        platforms: csv(sp, "platform"),
        riwayah: csv(sp, "riwayah"),
        mushafType: csv(sp, "mushaf_type"),
        features: csv(sp, "features"),
        featured: sp.featured === "true" ? true : undefined,
        page,
      }}
      categories={categories}
      metadata={metadata}
    />
  );
}
