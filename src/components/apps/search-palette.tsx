"use client";

import { useEffect, useRef, useState } from "react";
import type { FormEvent, MouseEvent, ReactElement, SyntheticEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type { Locale } from "@/lib/i18n";
import type { CategoryItem } from "@/lib/repo/categories";
import { categoryHref, searchHref } from "@/lib/listing-links";
import { requestDockFocus } from "./dock-focus";

export type SearchPaletteProps = {
  open: boolean;
  onClose: () => void;
  lang: Locale;
  categories: CategoryItem[];
  sort?: string;
};

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

function CloseIcon() {
  return (
    <svg viewBox="0 0 14 14" fill="none" aria-hidden="true" focusable="false">
      <path
        d="M2 2l10 10M12 2L2 12"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function SparkIcon() {
  return (
    <svg viewBox="0 0 12 12" fill="currentColor" aria-hidden="true" focusable="false">
      <path d="M6 0l1.5 4.5L12 6l-4.5 1.5L6 12 4.5 7.5 0 6l4.5-1.5L6 0z" />
    </svg>
  );
}

/**
 * Spotlight-style search launcher: a native `<dialog>` opened with
 * `showModal()`. The dialog is a full-viewport transparent overlay and
 * `.sp-panel` the visible panel, so a click on the dimmed area targets the
 * dialog itself (backdrop close). The dialog stays mounted at all times so the
 * search button's `aria-controls` always resolves and a closed dialog is
 * hidden by the user agent; the `open` prop drives `showModal()`/`close()`
 * and the body-scroll lock. Esc, the backdrop, the close button and
 * "All categories" use `requestClose()`, which closes the dialog *before*
 * calling `onClose`: a focus call made while the modal is still open is a
 * no-op, so the dock's focus return only lands once the dialog is off the
 * top layer. Navigation paths (submit, category links) call `onClose`
 * directly — the route change closes the palette.
 *
 * Launcher only: no live results, no debounce, no new API — submit navigates
 * to the existing `/apps` search route.
 */
export function SearchPalette({
  open,
  onClose,
  lang,
  categories,
  sort,
}: SearchPaletteProps): ReactElement {
  const t = useTranslations("appList");
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<"traditional" | "smart">("traditional");
  const [query, setQuery] = useState("");

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open) {
      if (!dialog.open) dialog.showModal();
      inputRef.current?.focus();
      document.body.style.overflow = "hidden";
    } else {
      if (dialog.open) dialog.close();
      document.body.style.overflow = "";
    }

    // The dialog stays mounted across open/close, so the cleanup — not a
    // mount-only effect — guarantees the scroll lock is released when `open`
    // flips back and when the component unmounts.
    return () => {
      if (dialog.open) dialog.close();
      document.body.style.overflow = "";
    };
  }, [open]);

  function submit(raw: string) {
    const q = raw.trim();
    if (!q) return;
    // Submit is a navigation: record where the destination page's dock should
    // restore focus (the results heading), then close and navigate.
    requestDockFocus("search-results");
    router.push(searchHref(lang, q, mode, sort));
    requestClose();
  }

  // A category shortcut is a navigation: record where the destination
  // page's dock should restore focus (the now-active dock pill), then close
  // and let the link navigate.
  function onCategoryClick() {
    requestDockFocus("category");
    requestClose();
  }

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    submit(query);
  }

  // Close the dialog first, then hand back to the dock: while the modal is
  // open, focus calls to elements outside the top layer are no-ops, so the
  // dock's focus return only works after `dialog.close()` has run.
  function requestClose() {
    const dialog = dialogRef.current;
    if (dialog?.open) dialog.close();
    onClose();
  }

  function onCancel(e: SyntheticEvent<HTMLDialogElement>) {
    e.preventDefault();
    requestClose();
  }

  // A click whose target is the dialog itself landed on the backdrop, not the
  // panel: close the palette.
  function onDialogClick(e: MouseEvent<HTMLDialogElement>) {
    if (e.target === e.currentTarget) requestClose();
  }

  return (
    <dialog
      id="search-palette"
      ref={dialogRef}
      className="search-palette"
      aria-label={t("search.paletteAria")}
      onCancel={onCancel}
      onClick={onDialogClick}
    >
      <div className="sp-panel">
        <form className="sp-input-row" onSubmit={onSubmit}>
          <span className="sp-search-icon">
            <SearchIcon />
          </span>
          <input
            ref={inputRef}
            className="sp-input"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("search.palettePlaceholder")}
            aria-label={t("search.paletteAria")}
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
          />
          <span className="sp-esc" aria-hidden="true">
            Esc
          </span>
          <button
            type="button"
            className="sp-close"
            aria-label={t("search.closeAria")}
            onClick={requestClose}
          >
            <CloseIcon />
          </button>
        </form>

        <div className="sp-section">
          <div className="sp-section-head">
            <span className="sp-label">{t("search.mode")}</span>
            <div className="sp-mode" role="group" aria-label={t("search.mode")}>
              <button
                type="button"
                className={`sp-mode-btn ${mode === "traditional" ? "active" : ""}`}
                aria-pressed={mode === "traditional"}
                onClick={() => setMode("traditional")}
              >
                {t("search.traditional")}
              </button>
              <button
                type="button"
                className={`sp-mode-btn ${mode === "smart" ? "active" : ""}`}
                aria-pressed={mode === "smart"}
                onClick={() => setMode("smart")}
              >
                {t("search.smart")}
                <SparkIcon />
              </button>
            </div>
          </div>
        </div>

        <div className="sp-section">
          <div className="sp-section-head">
            <span className="sp-label">{t("categories.browse")}</span>
            <button type="button" className="sp-all" onClick={requestClose}>
              {t("categories.allCategories")}
            </button>
          </div>
          <div className="sp-cats">
            {categories.map((category, index) => (
              <Link
                key={category.id}
                href={categoryHref(lang, category.slug, sort)}
                scroll={false}
                className={`search-cat ${index >= 6 ? "search-cat--extra" : ""}`}
                onClick={onCategoryClick}
              >
                <span className="search-cat-name">
                  {lang === "ar" ? category.nameAr : category.nameEn}
                </span>
                <span className="search-cat-count">{category.appCount}</span>
              </Link>
            ))}
          </div>
        </div>

        <div className="sp-section">
          <span className="sp-label">{t("search.try")}</span>
          <div className="sp-suggest">
            <button
              type="button"
              className="sp-suggest-btn"
              onClick={() => submit(t("search.suggestionMushaf"))}
            >
              <SearchIcon />
              {t("search.suggestionMushaf")}
            </button>
            <button
              type="button"
              className="sp-suggest-btn"
              onClick={() => submit(t("search.suggestionTajweed"))}
            >
              <SearchIcon />
              {t("search.suggestionTajweed")}
            </button>
            <button
              type="button"
              className="sp-suggest-btn"
              onClick={() => submit(t("search.suggestionMemorize"))}
            >
              <SearchIcon />
              {t("search.suggestionMemorize")}
            </button>
          </div>
        </div>

        <footer className="sp-footer">
          <span className="sp-hint">
            <kbd aria-hidden="true">↵</kbd>
            {t("search.enter")}
          </span>
          <span className="sp-hint">
            <kbd aria-hidden="true">esc</kbd>
            {t("search.close")}
          </span>
          <span className="sp-hint">
            <kbd aria-hidden="true">⌘K</kbd>
            {t("search.openAnytime")}
          </span>
        </footer>
      </div>
    </dialog>
  );
}
