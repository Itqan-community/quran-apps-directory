import { getTranslations, setRequestLocale } from "next-intl/server";
import { getLang } from "@/lib/i18n";
import { AppsListing } from "@/components/apps/apps-listing";
import { getCategoriesCached } from "@/lib/cache/categories";

// searchParams-driven listing: no instant prefetch shell (validation cannot
// resolve URL data inside the static shell)
export const instant = false;

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
  const search = (Array.isArray(sp.search) ? sp.search[0] : sp.search)?.trim() || undefined;
  const page = Number((Array.isArray(sp.page) ? sp.page[0] : sp.page) ?? 1) || 1;
  const mode = sp.mode === "smart" ? "smart" : undefined;
  const categories = await getCategoriesCached();

  return (
    <AppsListing
      lang={locale}
      search={search}
      mode={mode}
      selectedCategory={undefined}
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
    />
  );
}
