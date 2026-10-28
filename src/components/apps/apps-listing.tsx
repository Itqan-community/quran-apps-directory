import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { aiSearchVersion } from "@/lib/ai/provider";
import { getAppsCached } from "@/lib/cache/apps";
import { getSmartAppsCached } from "@/lib/cache/smart-search";
import type { AppsFilters } from "@/lib/repo/apps-rows";
import type { SmartAppItem } from "@/lib/repo/smart-search";
import type { CategoryItem } from "@/lib/repo/categories";
import { AppCard } from "./app-card";
import { NoResults } from "./no-results";
import { Pagination } from "./pagination";
import { HeroSearch } from "./hero-search";
import { CategoryDock } from "./category-dock";
import { ListingCardsSkeleton } from "./listing-skeleton";
import { CompactModeConnector } from "@/components/site/compact-mode-connector";

export async function AppsListing({
  lang,
  filters,
  categories,
  search,
  selectedCategory,
  mode,
  sort,
  showSort,
  basePath,
}: {
  lang: "ar" | "en";
  filters: AppsFilters;
  categories: CategoryItem[];
  search?: string;
  selectedCategory?: string;
  mode?: "smart";
  /** Raw `?sort=` URL value (drives the select's checked option) */
  sort?: string;
  /** Render the count + sort zone in the dock (home/category listings) */
  showSort?: boolean;
  /** Route the pagination links point at (defaults to /{lang}/apps) */
  basePath?: string;
}) {
  const t = await getTranslations({ locale: lang, namespace: "appList" });

  return (
    <>
      {/* Hero (shared with home/category/apps, like the old AppList page) */}
      <CompactModeConnector />
      <section className="hero-section">
        <div className="hero-background" aria-hidden>
          <img src="/images/star.svg" alt="" className="hero-star-decoration" />
        </div>
        <div className="hero-content">
          <h1 className="hero-title">{t("hero.title")}</h1>
          <p className="hero-subtitle">{t("hero.subtitle")}</p>
          <HeroSearch lang={lang} />
        </div>
      </section>

      {/* Only the results area streams; the hero stays stable during category changes. */}
      <Suspense
        fallback={
          <ListingCardsSkeleton
            lang={lang}
            categories={categories}
            selectedCategory={selectedCategory}
            sort={sort}
            showSort={showSort}
            basePath={basePath}
          />
        }
      >
        <ListingResults
          lang={lang}
          filters={filters}
          categories={categories}
          search={search}
          selectedCategory={selectedCategory}
          mode={mode}
          sort={sort}
          showSort={showSort}
          basePath={basePath}
        />
      </Suspense>
    </>
  );
}

async function ListingResults({
  lang,
  filters,
  categories,
  search,
  selectedCategory,
  mode,
  sort,
  showSort,
  basePath,
}: {
  lang: "ar" | "en";
  filters: AppsFilters;
  categories: CategoryItem[];
  search?: string;
  selectedCategory?: string;
  mode?: "smart";
  sort?: string;
  showSort?: boolean;
  basePath?: string;
}) {
  const t = await getTranslations({ locale: lang, namespace: "appList" });
  // Smart mode uses the hybrid AI ranking; traditional keeps the legacy path.
  // Both are unified into one result shape for rendering (suggestedQuery /
  // fallbackMode default to null / false in traditional).
  const smart = mode === "smart" ? await getSmartAppsCached(filters, aiSearchVersion()) : null;
  const { count, results, suggestedQuery, fallbackMode }: {
    count: number;
    results: SmartAppItem[];
    suggestedQuery: string | null;
    fallbackMode: boolean;
  } = smart ?? { ...(await getAppsCached(filters)), suggestedQuery: null, fallbackMode: false };
  const pageSize = filters.pageSize ?? 100;
  const totalPages = Math.max(1, Math.ceil(count / pageSize));
  const showResultsHeader = !!search?.trim();

  return (
    <>
      <CategoryDock
        lang={lang}
        categories={categories}
        selectedCategory={selectedCategory}
        sort={sort}
        showSort={showSort}
        basePath={basePath}
        count={count}
      />
      <div className="main-content">
        {showResultsHeader && (
          <div className="search-results-header">
            <h2 className="search-results-title">
              {t("search.resultsFor")} &ldquo;{search}&rdquo;
            </h2>
            <span className="search-results-count">
              {count} {count === 1 ? t("search.result") : t("search.results")}
            </span>
          </div>
        )}

        {smart && suggestedQuery && suggestedQuery !== search && (
          <div className="mb-4">
            <Link
              className="did-you-mean inline-block rounded-app border border-border bg-surface px-3 py-1.5 text-sm text-text-secondary hover:border-primary"
              href={`/${lang}/apps?search=${encodeURIComponent(suggestedQuery)}&mode=smart`}
            >
              {t("search.didYouMean")} &ldquo;{suggestedQuery}&rdquo;
            </Link>
          </div>
        )}

        {smart && fallbackMode && (
          <div
            role="status"
            className="mb-4 rounded-app border border-border bg-surface px-4 py-3 text-sm text-text-secondary"
          >
            {t("search.fallbackNotice")}
          </div>
        )}

        {results.length === 0 ? (
          <NoResults lang={lang} searching={showResultsHeader} query={search} mode={mode} />
        ) : (
          <div className="apps-grid">
            {results.map((app, i) => (
              <AppCard key={app.id} app={app} lang={lang} index={i} matchReasons={app.matchReasons} />
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <Pagination
            lang={lang}
            page={filters.page ?? 1}
            totalPages={totalPages}
            basePath={basePath}
            searchParams={{
              ...(filters as unknown as Record<string, unknown>),
              // The category already lives in the path; repeating it as a query
              // param would create duplicate URLs on the category pager.
              ...(selectedCategory ? { categorySlugs: undefined } : {}),
              ...(sort ? { sort } : {}),
              ...(mode ? { mode } : {}),
            }}
          />
        )}
      </div>
    </>
  );
}
