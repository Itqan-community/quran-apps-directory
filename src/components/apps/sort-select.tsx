"use client";

import type { ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type { Locale } from "@/lib/i18n";

const SORT_OPTIONS = ["featured", "newest", "rating", "az"] as const;

/**
 * Listing sort control. `basePath` is the route whose params the select
 * rewrites (home by default, or the current category route) so changing the
 * sort never navigates away from an active category filter.
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

  function onChange(e: ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value;
    const params = new URLSearchParams();
    if (next !== "featured") params.set("sort", next);
    const qs = params.toString();
    router.push(`${root}${qs ? `?${qs}` : ""}`);
  }

  return (
    <label className="sort-select-wrap">
      <span className="sort-select-label">{t("label")}</span>
      <select className="sort-select" value={value} onChange={onChange}>
        {SORT_OPTIONS.map((opt) => (
          <option key={opt} value={opt}>
            {t(opt)}
          </option>
        ))}
      </select>
    </label>
  );
}
