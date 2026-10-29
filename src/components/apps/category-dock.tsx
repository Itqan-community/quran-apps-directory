"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import type { Locale } from "@/lib/i18n";
import type { CategoryItem } from "@/lib/repo/categories";
import { categoryHref } from "@/lib/listing-links";
import { formatAppCount } from "@/lib/listing-format";
import { SortSelect } from "./sort-select";
import { CategorySheet } from "./category-sheet";
import { SearchPalette } from "./search-palette";

export type CategoryDockProps = {
  lang: Locale;
  categories: CategoryItem[];
  selectedCategory?: string;
  sort?: string;
  showSort?: boolean;
  basePath?: string;
  count: number | null;
};

function Chevron() {
  return (
    <svg viewBox="0 0 10 6" fill="none" aria-hidden="true" focusable="false">
      <path
        d="M1 1l4 4 4-4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" focusable="false">
      <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M10.5 10.5L14 14"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** First argument that is in the DOM and actually visible (the other search
 *  button is `display:none` on the opposite breakpoint and can never take
 *  focus). */
function firstVisible(
  ...els: (HTMLButtonElement | null)[]
): HTMLButtonElement | null {
  return els.find((el) => el?.checkVisibility()) ?? null;
}

/**
 * Floating category index dock. The rail is the only category surface on
 * desktop; at ≤900px the rail is replaced by a trigger that opens the
 * bottom-sheet index (`CategorySheet`). The utility zone carries the current
 * result count and the sort pill. `count={null}` (streaming fallback) renders
 * fixed-width shimmers instead of numbers.
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
  const pathname = usePathname();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [lastPathname, setLastPathname] = useState(pathname);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const desktopSearchRef = useRef<HTMLButtonElement>(null);
  const mobileSearchRef = useRef<HTMLButtonElement>(null);
  const lastSearchTriggerRef = useRef<HTMLButtonElement | null>(null);
  const allActive = selectedCategory === undefined;
  // Unknown category slugs get no active chip (and `All` is not active either).
  const activeSlug = categories.some((c) => c.slug === selectedCategory)
    ? selectedCategory
    : undefined;
  const activeCategory = categories.find((c) => c.slug === activeSlug);
  // Trigger count: the active category's appCount; the result count when All
  // is active; nothing for an unknown category.
  const triggerCount = activeCategory
    ? formatAppCount(activeCategory.appCount)
    : allActive
      ? formatAppCount(count)
      : null;
  const allCount = allActive ? formatAppCount(count) : null;
  const totalText = formatAppCount(count);

  // A route change — a sheet link, a palette shortcut, browser back, anything
  // — closes the sheet and the search palette so they can never stay open on a
  // different page. Resetting state during render (React's recommended pattern
  // for adjusting state when an external value changes) instead of in a
  // `useEffect` keeps this lint-clean under react-hooks/set-state-in-effect.
  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    setSheetOpen(false);
    setSearchOpen(false);
  }

  // Ctrl/⌘K opens the palette from anywhere on the listing, except while the
  // user is typing in a field. The focus-return target for shortcut opens is
  // the *visible* search button — the other one is display:none on the
  // opposite breakpoint and can never take focus.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== "k") return;
      const target = e.target as HTMLElement | null;
      if (target?.closest("input, textarea, [contenteditable='true']")) return;
      e.preventDefault();
      lastSearchTriggerRef.current = firstVisible(
        desktopSearchRef.current,
        mobileSearchRef.current,
      );
      setSearchOpen(true);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function closeSheet() {
    setSheetOpen(false);
    triggerRef.current?.focus();
  }

  function closeSearch() {
    setSearchOpen(false);
    // Focus the last trigger if it is still visible, otherwise the visible
    // search button (desktop, else mobile). The palette's requestClose path
    // closes the dialog before calling back, so this focus lands — a focus
    // call while the modal is still open is a no-op.
    firstVisible(
      lastSearchTriggerRef.current,
      desktopSearchRef.current,
      mobileSearchRef.current,
    )?.focus();
  }

  return (
    <div className="category-dock-shell">
      <div className="category-dock">
        <button
          ref={desktopSearchRef}
          type="button"
          className="dock-search"
          onClick={(e) => {
            lastSearchTriggerRef.current = e.currentTarget;
            setSearchOpen(true);
          }}
          aria-label={t("search.paletteAria")}
          aria-haspopup="dialog"
          aria-expanded={searchOpen}
          aria-controls="search-palette"
        >
          <SearchIcon />
        </button>

        <button
          ref={mobileSearchRef}
          type="button"
          className="m-search"
          onClick={(e) => {
            lastSearchTriggerRef.current = e.currentTarget;
            setSearchOpen(true);
          }}
          aria-label={t("search.paletteAria")}
          aria-haspopup="dialog"
          aria-expanded={searchOpen}
          aria-controls="search-palette"
        >
          <SearchIcon />
        </button>

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

        <button
          ref={triggerRef}
          type="button"
          className="m-cat"
          onClick={() => setSheetOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={sheetOpen}
          aria-controls="category-sheet"
        >
          <span className="m-cat-label">
            {activeCategory
              ? lang === "ar"
                ? activeCategory.nameAr
                : activeCategory.nameEn
              : t("categories.allApps")}
          </span>
          {triggerCount ? (
            <span className="m-cat-count">{triggerCount}</span>
          ) : activeCategory || allActive ? (
            <span className="m-cat-count m-cat-count--shimmer" aria-hidden />
          ) : null}
          <Chevron />
        </button>

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

      <CategorySheet
        open={sheetOpen}
        onClose={closeSheet}
        lang={lang}
        categories={categories}
        selectedCategory={selectedCategory}
        sort={sort}
        count={count}
      />

      <SearchPalette
        open={searchOpen}
        onClose={closeSearch}
        lang={lang}
        categories={categories}
        sort={sort}
      />
    </div>
  );
}
