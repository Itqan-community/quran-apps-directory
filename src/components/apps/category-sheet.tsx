"use client";

import { useEffect, useRef } from "react";
import type { MouseEvent, ReactElement, SyntheticEvent } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import type { Locale } from "@/lib/i18n";
import type { CategoryItem } from "@/lib/repo/categories";
import { categoryHref } from "@/lib/listing-links";
import { formatAppCount } from "@/lib/listing-format";

export type CategorySheetProps = {
  open: boolean;
  onClose: () => void;
  lang: Locale;
  categories: CategoryItem[];
  selectedCategory?: string;
  sort?: string;
  count: number | null;
};

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

/**
 * Mobile bottom sheet: a 3×4 index of all categories (All + 11) rendered as a
 * native `<dialog>` opened with `showModal()`. The dialog stays mounted at all
 * times so the trigger's `aria-controls` always resolves and a closed dialog is
 * hidden by the user agent; the `open` prop drives `showModal()`/`close()` and
 * the body-scroll lock. Esc, the backdrop and the close button all route
 * through `onClose` so the dock owns the state.
 */
export function CategorySheet({
  open,
  onClose,
  lang,
  categories,
  selectedCategory,
  sort,
  count,
}: CategorySheetProps): ReactElement | null {
  const t = useTranslations("appList");
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const allActive = selectedCategory === undefined;
  // Unknown category slugs get no active tile (and `All` is not active either).
  const activeSlug = categories.some((c) => c.slug === selectedCategory)
    ? selectedCategory
    : undefined;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open) {
      if (!dialog.open) dialog.showModal();
      document.body.style.overflow = "hidden";
      closeRef.current?.focus();
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

  function onCancel(e: SyntheticEvent<HTMLDialogElement>) {
    e.preventDefault();
    onClose();
  }

  // A click whose target is the dialog itself landed on the backdrop, not the
  // panel: close the sheet.
  function onDialogClick(e: MouseEvent<HTMLDialogElement>) {
    if (e.target === e.currentTarget) onClose();
  }

  const allCount = formatAppCount(count);

  return (
    <dialog
      id="category-sheet"
      ref={dialogRef}
      className="m-sheet"
      aria-label={t("categories.browse")}
      onCancel={onCancel}
      onClick={onDialogClick}
    >
      <div className="m-sheet-panel">
        <span className="m-sheet-handle" aria-hidden="true" />
        <header className="m-sheet-head">
          <div className="m-sheet-heading">
            <h2 className="m-sheet-title">{t("categories.browse")}</h2>
            <p className="m-sheet-sub">
              {t("categories.count", { count: categories.length })}
            </p>
          </div>
          <button
            ref={closeRef}
            type="button"
            className="m-sheet-close"
            aria-label={t("categories.close")}
            onClick={onClose}
          >
            <CloseIcon />
          </button>
        </header>

        <div className="m-sheet-grid">
          <Link
            href={categoryHref(lang, undefined, sort)}
            scroll={false}
            className={`m-tile ${allActive ? "active" : ""}`}
            aria-current={allActive ? "page" : undefined}
            onClick={onClose}
          >
            <span className="m-tile-name">{t("categories.all")}</span>
            {allActive &&
              (allCount ? (
                <span className="m-tile-count">{allCount}</span>
              ) : (
                <span className="m-tile-count m-tile-count--shimmer" aria-hidden="true" />
              ))}
          </Link>

          {categories.map((category) => {
            const isActive = activeSlug === category.slug;
            return (
              <Link
                key={category.id}
                href={categoryHref(lang, category.slug, sort)}
                scroll={false}
                className={`m-tile ${isActive ? "active" : ""}`}
                aria-current={isActive ? "page" : undefined}
                onClick={onClose}
              >
                <span className="m-tile-name">
                  {lang === "ar" ? category.nameAr : category.nameEn}
                </span>
                <span className="m-tile-count">{category.appCount}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </dialog>
  );
}
