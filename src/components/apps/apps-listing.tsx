import { getAppsCached } from "@/lib/cache/apps";
import type { Locale } from "@/lib/i18n";
import type { AppsFilters } from "@/lib/repo/apps-rows";
import type { CategoryItem } from "@/lib/repo/categories";
import type { MetadataValuesResponse } from "@/lib/repo/metadata";
import { AppCard } from "./app-card";
import { FiltersBar } from "./filters-bar";
import { Pagination } from "./pagination";
import { NoResults } from "./no-results";

export async function AppsListing({
  lang,
  filters,
  title,
  categories,
  metadata,
}: {
  lang: Locale;
  filters: AppsFilters;
  title: string;
  categories: CategoryItem[];
  metadata: MetadataValuesResponse;
}) {
  const { count, results } = await getAppsCached(filters);
  const pageSize = filters.pageSize ?? 100;
  const totalPages = Math.max(1, Math.ceil(count / pageSize));
  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold text-text">{title}</h1>
      <FiltersBar lang={lang} current={filters} categories={categories} metadata={metadata} />
      {results.length === 0 ? (
        <NoResults lang={lang} />
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {results.map((app, i) => (
            <AppCard key={app.id} app={app} lang={lang} index={i} />
          ))}
        </div>
      )}
      <Pagination
        lang={lang}
        page={filters.page ?? 1}
        totalPages={totalPages}
        searchParams={filters as unknown as Record<string, unknown>}
      />
    </div>
  );
}
