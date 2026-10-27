"use client";

import type { ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type { Locale } from "@/lib/i18n";

const SORT_OPTIONS = ["featured", "newest", "rating", "az"] as const;

/**
 * Homepage sort control. The homepage carries no other URL params, so the
 * pushed URL is rebuilt from scratch; if this control ever moves to a
 * param-carrying page (e.g. /apps), merge the existing params instead.
 */
export function SortSelect({ lang, value }: { lang: Locale; value: string }) {
  const router = useRouter();
  const t = useTranslations("appList.sort");

  function onChange(e: ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value;
    const params = new URLSearchParams();
    if (next !== "featured") params.set("sort", next);
    const qs = params.toString();
    router.push(`/${lang}${qs ? `?${qs}` : ""}`);
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
