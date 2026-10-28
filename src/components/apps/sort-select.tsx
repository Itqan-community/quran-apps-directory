"use client";

import type { ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type { Locale } from "@/lib/i18n";

const SORT_OPTIONS = ["featured", "newest", "rating", "az"] as const;

function SortIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" focusable="false">
      <path
        d="M2 4h12M4.5 8h7M7 12h2"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

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

/**
 * Listing sort control rendered as a dock pill. The native `<select>` sits
 * transparent over the pill so keyboard and screen readers keep the native
 * control; `basePath` is the route whose params the select rewrites (home by
 * default, or the current category route) so changing the sort never navigates
 * away from an active category filter.
 */
export function SortSelect({
  lang,
  value,
  basePath,
}: {
  lang: Locale;
  value: string;
  /** Listing route to stay on; defaults to the homepage. */
  basePath?: string;
}) {
  const router = useRouter();
  const t = useTranslations("appList.sort");
  const root = basePath ?? `/${lang}`;
  // `?sort=` is user-controlled URL input; coerce unknown values so next-intl
  // never receives an unknown key.
  const safeValue = (SORT_OPTIONS as readonly string[]).includes(value)
    ? value
    : "featured";

  function onChange(e: ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value;
    const params = new URLSearchParams();
    if (next !== "featured") params.set("sort", next);
    const qs = params.toString();
    router.push(`${root}${qs ? `?${qs}` : ""}`);
  }

  return (
    <div className="dock-sort">
      <SortIcon />
      <span className="dock-sort-value">{t(safeValue)}</span>
      <Chevron />
      <select
        className="dock-sort-native"
        aria-label={t("label")}
        value={safeValue}
        onChange={onChange}
      >
        {SORT_OPTIONS.map((opt) => (
          <option key={opt} value={opt}>
            {t(opt)}
          </option>
        ))}
      </select>
    </div>
  );
}
