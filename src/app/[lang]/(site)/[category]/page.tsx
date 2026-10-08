import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
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
  if (!categoryRow || !categoryRow.isActive) notFound();
  const page = Number((Array.isArray(sp.page) ? sp.page[0] : sp.page) ?? 1) || 1;
  const [metadata, categories] = await Promise.all([
    getMetadataValues(),
    getCategories(),
  ]);

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
