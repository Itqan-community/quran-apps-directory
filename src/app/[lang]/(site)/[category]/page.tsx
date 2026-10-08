import { getTranslations, setRequestLocale } from "next-intl/server";
import { getLang } from "@/lib/i18n";
import { getCategories } from "@/lib/repo/categories";
import { getCategoryBySlugCached } from "@/lib/cache/categories";
import { getMetadataValues } from "@/lib/repo/metadata";
import { AppsListing } from "@/components/apps/apps-listing";

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
  const categoryRow = await getCategoryBySlugCached(category);
  const page = Number((Array.isArray(sp.page) ? sp.page[0] : sp.page) ?? 1) || 1;
  const [metadata, categories] = await Promise.all([
    getMetadataValues(),
    getCategories(),
  ]);

  // Unknown category: render not-found content in-page (cacheComponents streams
  // notFound() as an unpaintable hole; the old SPA also returned 200 with an
  // in-app not-found view — documented in the spec amendments).
  if (!categoryRow || !categoryRow.isActive) {
    const t = await getTranslations({ locale, namespace: "APP" });
    return (
      <main className="mx-auto flex max-w-3xl flex-col items-center px-4 py-24 text-center">
        <h1 className="text-3xl font-bold text-text">{t("NOT_FOUND_TITLE")}</h1>
        <p className="mt-3 text-sm text-text-secondary">{t("NOT_FOUND_MESSAGE")}</p>
        <a
          href={`/${locale}`}
          className="mt-6 rounded-app bg-primary px-4 py-2 text-sm font-bold text-white hover:bg-primary-hover"
        >
          {t("BACK_HOME")}
        </a>
      </main>
    );
  }

  return (
    <AppsListing
      lang={locale}
      title={locale === "ar" ? categoryRow.nameAr : categoryRow.nameEn}
      filters={{ categorySlugs: [category], page }}
      categories={categories}
      metadata={metadata}
    />
  );
}
