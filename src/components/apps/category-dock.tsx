"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import type { Locale } from "@/lib/i18n";
import type { CategoryItem } from "@/lib/repo/categories";
import { categoryHref } from "@/lib/listing-links";
import { formatAppCount } from "@/lib/listing-format";
import { SortSelect } from "./sort-select";

export type CategoryDockProps = {
  lang: Locale;
  categories: CategoryItem[];
  selectedCategory?: string;
  sort?: string;
  showSort?: boolean;
  basePath?: string;
  count: number | null;
};

/**
 * Floating category index dock. The rail is the only category surface on the
 * listing pages; the utility zone carries the current result count and the
 * sort pill. `count={null}` (streaming fallback) renders fixed-width shimmers
 * instead of numbers.
 */
export function CategoryDock({
  lang,
  categories,
  selectedCategory,
  sort,
  showSort,
  basePath,
  count,
}: CategoryDockProps) {
  const t = useTranslations("appList");
  const allActive = selectedCategory === undefined;
  // Unknown category slugs get no active chip (and `All` is not active either).
  const activeSlug = categories.some((c) => c.slug === selectedCategory)
    ? selectedCategory
    : undefined;
  const allCount = allActive ? formatAppCount(count) : null;
  const totalText = formatAppCount(count);

  return (
    <div className="category-dock-shell">
      <div className="category-dock">
        <nav className="dock-rail" aria-label={t("categories.title")}>
          <Link
            href={categoryHref(lang, undefined, sort)}
            scroll={false}
            className={`dock-pill ${allActive ? "active" : ""}`}
            aria-current={allActive ? "page" : undefined}
          >
            <span>{t("categories.all")}</span>
            {allActive &&
              (allCount ? (
                <span className="dock-num">{allCount}</span>
              ) : (
                <span className="dock-num dock-num--shimmer" aria-hidden />
              ))}
          </Link>

          {categories.map((category) => {
            const isActive = activeSlug === category.slug;
            return (
              <Link
                key={category.id}
                href={categoryHref(lang, category.slug, sort)}
                scroll={false}
                className={`dock-pill ${isActive ? "active" : ""}`}
                aria-current={isActive ? "page" : undefined}
              >
                <span>{lang === "ar" ? category.nameAr : category.nameEn}</span>
                <span className="dock-num">{category.appCount}</span>
              </Link>
            );
          })}
        </nav>

        <div className="dock-actions">
          <span className="dock-count">
            {totalText ? (
              `${totalText} ${t(count === 1 ? "sort.app" : "sort.apps")}`
            ) : (
              <span className="dock-shimmer dock-shimmer--count" aria-hidden />
            )}
          </span>
          {showSort && (
            <SortSelect lang={lang} value={sort ?? "featured"} basePath={basePath} />
          )}
        </div>
      </div>
    </div>
  );
}
