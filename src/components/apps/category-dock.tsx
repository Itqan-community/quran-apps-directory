"use client";

import { Suspense, use, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
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
import { takeDockFocus } from "./dock-focus";

export type CategoryDockProps = {
  lang: Locale;
  categories: CategoryItem[];
  selectedCategory?: string;
  sort?: string;
  showSort?: boolean;
  basePath?: string;
  /**
   * The result count, streamed as a promise. The dock is rendered once,
   * outside the Suspense boundary, so it stays mounted across the fallback →
   * settled swap; only this count resolves late and streams in. Unwrapped with
   * `use()` behind small shimmer boundaries (see `StreamedCount`).
   */
  count: Promise<number>;
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

/**
 * Visibility check with a Safari 16.4–17.3 / iOS 16 fallback:
 * `Element.checkVisibility()` does not exist there and throws, which would
 * break Ctrl/⌘K and the focus return before the palette/sheet opens.
 * `getClientRects().length > 0` is the long-standing equivalent for
 * "laid out and not display:none / visibility:hidden".
 */
function isElementVisible(el: HTMLElement): boolean {
  if (typeof el.checkVisibility === "function") {
    return el.checkVisibility();
  }
  return el.getClientRects().length > 0;
}

/** First argument that is in the DOM and actually visible (the other search
 *  button is `display:none` on the opposite breakpoint and can never take
 *  focus). */
function firstVisible(
  ...els: (HTMLElement | null)[]
): HTMLElement | null {
  return els.find((el) => el != null && isElementVisible(el)) ?? null;
}

/**
 * Unwraps the streamed count promise and renders the formatted value.
 * `use()` suspends while the promise is pending, so this must sit inside a
 * `<Suspense>` boundary whose fallback is the fixed-width shimmer.
 */
function StreamedCount({
  count,
  format,
}: {
  count: Promise<number>;
  format: (value: number) => ReactNode;
}) {
  const value = use(count);
  return <>{format(value)}</>;
}

/**
 * Floating category index dock. The rail is the only category surface on
 * desktop; at ≤900px the rail is replaced by a trigger that opens the
 * bottom-sheet index (`CategorySheet`). The utility zone carries the current
 * result count and the sort pill. The dock is rendered once, outside the
 * results Suspense boundary, so it (and any open palette/sheet) survives the
 * fallback → settled swap; only `count` streams in (shimmer until resolved).
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
  const lastSearchTriggerRef = useRef<HTMLElement | null>(null);
  const allActive = selectedCategory === undefined;
  // Unknown category slugs get no active chip (and `All` is not active either).
  const activeSlug = categories.some((c) => c.slug === selectedCategory)
    ? selectedCategory
    : undefined;
  const activeCategory = categories.find((c) => c.slug === activeSlug);
  // Trigger count source: the active category's own appCount, the streamed
  // result count when All is active, nothing for an unknown category.
  const triggerUsesResultCount = allActive && !activeCategory;
  const triggerCategoryCount = activeCategory
    ? formatAppCount(activeCategory.appCount)
    : null;

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

  // Post-navigation focus handoff: a sheet/palette link recorded its intended
  // target before navigating (see dock-focus). The dock remounts on the
  // destination page, so consume the request here and focus the matching
  // element once the new page's DOM is settled.
  useEffect(() => {
    const target = takeDockFocus();
    if (!target) return;

    if (target === "category") {
      // The active dock pill on desktop, the category trigger on mobile (the
      // rail is display:none there and can never take focus).
      const activePill = document.querySelector<HTMLElement>(
        ".dock-pill[aria-current='page']",
      );
      const el = firstVisible(activePill, triggerRef.current);
      if (!el) return;
      const id = requestAnimationFrame(() => el.focus());
      return () => cancelAnimationFrame(id);
    }

    // "search-results": the heading streams in with the results (inside the
    // Suspense boundary, below the dock), so poll until it lands. It is
    // focusable via tabIndex=-1 (see the heading in ListingResults).
    let attempts = 0;
    const id = window.setInterval(() => {
      attempts += 1;
      const heading = document.getElementById("search-results-title");
      if (heading) {
        heading.focus();
        window.clearInterval(id);
        return;
      }
      if (attempts >= 200) {
        window.clearInterval(id);
      }
    }, 50);
    return () => window.clearInterval(id);
  }, [lastPathname]);

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
          {/* prefetch={false}: the 12 pills sit in the viewport, so Next 16
              would prefetch every route on page load — heavy, and a cached
              flight makes a click navigate in one piece, which defeats the
              deliberate slow-flight streaming test. */}
          <Link
            href={categoryHref(lang, undefined, sort)}
            scroll={false}
            prefetch={false}
            className={`dock-pill ${allActive ? "active" : ""}`}
            aria-current={allActive ? "page" : undefined}
          >
            <span>{t("categories.all")}</span>
            {allActive && (
              <Suspense
                fallback={<span className="dock-num dock-num--shimmer" aria-hidden />}
              >
                <StreamedCount
                  count={count}
                  format={(value) => (
                    <span className="dock-num">{formatAppCount(value)}</span>
                  )}
                />
              </Suspense>
            )}
          </Link>

          {categories.map((category) => {
            const isActive = activeSlug === category.slug;
            return (
              <Link
                key={category.id}
                href={categoryHref(lang, category.slug, sort)}
                scroll={false}
                prefetch={false}
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
          {triggerUsesResultCount ? (
            <Suspense
              fallback={
                <span className="m-cat-count m-cat-count--shimmer" aria-hidden />
              }
            >
              <StreamedCount
                count={count}
                format={(value) => (
                  <span className="m-cat-count">{formatAppCount(value)}</span>
                )}
              />
            </Suspense>
          ) : triggerCategoryCount ? (
            <span className="m-cat-count">{triggerCategoryCount}</span>
          ) : null}
          <Chevron />
        </button>

        <div className="dock-actions">
          <span className="dock-count">
            <Suspense
              fallback={<span className="dock-shimmer dock-shimmer--count" aria-hidden />}
            >
              <StreamedCount
                count={count}
                format={(value) => (
                  <>
                    {`${formatAppCount(value)} ${t(value === 1 ? "sort.app" : "sort.apps")}`}
                  </>
                )}
              />
            </Suspense>
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
