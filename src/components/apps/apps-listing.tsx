import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { getAppsCached } from "@/lib/cache/apps";
import type { AppsFilters } from "@/lib/repo/apps-rows";
import type { CategoryItem } from "@/lib/repo/categories";
import { AppCard } from "./app-card";
import { NoResults } from "./no-results";
import { Pagination } from "./pagination";
import { HeroSearch } from "./hero-search";
import { CategoryIcon } from "./category-icon";
import { CompactModeConnector } from "@/components/site/compact-mode-connector";

export async function AppsListing({
  lang,
  filters,
  categories,
  search,
  selectedCategory,
}: {
  lang: "ar" | "en";
  filters: AppsFilters;
  categories: CategoryItem[];
  search?: string;
  selectedCategory?: string;
}) {
  const t = await getTranslations({ locale: lang, namespace: "appList" });
  const { count, results } = await getAppsCached(filters);
  const pageSize = filters.pageSize ?? 100;
  const totalPages = Math.max(1, Math.ceil(count / pageSize));
  const showResultsHeader = !!search?.trim();

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
          <div className="categories-chips-wrapper">
            <div className="categories-chips">
              <Link href={`/${lang}`} className={`category-chip ${!selectedCategory ? "active" : ""}`}>
                <CategoryIcon svg={GRID_ICON} />
                <span className="chip-text">{t("categories.all")}</span>
                <span className="chip-arrow">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </span>
              </Link>

              {categories.map((category) => (
                <Link
                  key={category.id}
                  href={`/${lang}/${category.slug}`}
                  className={`category-chip ${selectedCategory === category.slug ? "active" : ""}`}
                >
                  <CategoryIcon svg={category.icon} />
                  <span className="chip-text">
                    {lang === "ar" ? category.nameAr : category.nameEn}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

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

        {results.length === 0 ? (
          <NoResults lang={lang} searching={showResultsHeader} />
        ) : (
          <div className="apps-grid">
            {results.map((app, i) => (
              <AppCard key={app.id} app={app} lang={lang} index={i} />
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <Pagination
            lang={lang}
            page={filters.page ?? 1}
            totalPages={totalPages}
            searchParams={filters as unknown as Record<string, unknown>}
          />
        )}
      </div>
    </>
  );
}

const GRID_ICON =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M3.75 3.75v4.5h4.5v-4.5zm-2.25 0A2.25 2.25 0 0 1 3.75 1.5h4.5a2.25 2.25 0 0 1 2.25 2.25v4.5a2.25 2.25 0 0 1-2.25 2.25h-4.5A2.25 2.25 0 0 1 1.5 8.25zm2.25 12v4.5h4.5v-4.5zm-2.25 0a2.25 2.25 0 0 1 2.25-2.25h4.5a2.25 2.25 0 0 1 2.25 2.25v4.5a2.25 2.25 0 0 1-2.25 2.25h-4.5a2.25 2.25 0 0 1-2.25-2.25zm18.75-12h-4.5v4.5h4.5zm-4.5-2.25h4.5a2.25 2.25 0 0 1 2.25 2.25v4.5a2.25 2.25 0 0 1-2.25 2.25h-4.5a2.25 2.25 0 0 1-2.25-2.25v-4.5a2.25 2.25 0 0 1 2.25-2.25m0 14.25v4.5h4.5v-4.5zm-2.25 0a2.25 2.25 0 0 1 2.25-2.25h4.5a2.25 2.25 0 0 1 2.25 2.25v4.5a2.25 2.25 0 0 1-2.25 2.25h-4.5a2.25 2.25 0 0 1-2.25-2.25z"/></svg>';
