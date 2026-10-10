"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import type { CategoryItem } from "@/lib/repo/categories";
import { CategoryIcon } from "@/components/apps/category-icon";

const VISIBLE_CHIPS = 5;

export function CompactSearch({
  lang,
  categories,
}: {
  lang: "ar" | "en";
  categories: CategoryItem[];
}) {
  const t = useTranslations("appList.search");
  const router = useRouter();
  const pathname = usePathname();
  const [query, setQuery] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const rest = pathname.replace(/^\/(ar|en)\//, "");
  const activeSlug = (categories.map((c) => c.slug).find((slug) => rest === slug)) ?? null;

  function submit() {
    router.push(`/${lang}/apps${query.trim() ? `?search=${encodeURIComponent(query.trim())}` : ""}`);
  }

  return (
    <>
      <div className="flex flex-1 items-center gap-2.5">
        <Link href={`/${lang}`} className="compact-logo" aria-label="Home">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/searchLogo.svg" alt="" width={30} height={30} />
        </Link>
        <div className="compact-search-container">
          <span className="compact-search-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
          </span>
          <input
            type="text"
            className="compact-search-input"
            placeholder={lang === "ar" ? "ابحث عن التطبيقات..." : "Search apps..."}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submit();
            }}
          />
        </div>
      </div>

      {categories.slice(0, VISIBLE_CHIPS).map((c) => (
        <Link
          key={c.id}
          href={`/${lang}/${c.slug}`}
          className={`compact-category-chip ${activeSlug === c.slug ? "active" : ""}`}
        >
          <CategoryIcon svg={c.icon} size={16} />
          <span className="compact-chip-text">{lang === "ar" ? c.nameAr : c.nameEn}</span>
        </Link>
      ))}

      <div className="compact-category-dropdown" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className={`compact-category-trigger ${activeSlug ? "active" : ""}`}
          onClick={() => setDropdownOpen((v) => !v)}
          aria-expanded={dropdownOpen}
        >
          <CategoryIcon svg={GRID_ICON} size={16} />
          <span className="compact-chip-text">
            {activeSlug
              ? lang === "ar"
                ? `التصنيف: ${categories.find((c) => c.slug === activeSlug)?.nameAr ?? ""}`
                : `Category: ${categories.find((c) => c.slug === activeSlug)?.nameEn ?? ""}`
              : lang === "ar"
                ? "المزيد"
                : "More"}
          </span>
          <svg className={`compact-chevron ${dropdownOpen ? "open" : ""}`} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>
        {dropdownOpen && (
          <div className="compact-category-panel">
            {categories.slice(VISIBLE_CHIPS).map((c) => (
              <Link
                key={c.id}
                href={`/${lang}/${c.slug}`}
                onClick={() => setDropdownOpen(false)}
                className={`compact-category-option ${activeSlug === c.slug ? "active" : ""}`}
              >
                <CategoryIcon svg={c.icon} size={16} />
                {lang === "ar" ? c.nameAr : c.nameEn}
              </Link>
            ))}
          </div>
        )}
      </div>

      <button type="button" className="compact-search-btn" onClick={submit}>
        {t("button")}
      </button>
    </>
  );
}

const GRID_ICON =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M3.75 3.75v4.5h4.5v-4.5zm-2.25 0A2.25 2.25 0 0 1 3.75 1.5h4.5a2.25 2.25 0 0 1 2.25 2.25v4.5a2.25 2.25 0 0 1-2.25 2.25h-4.5A2.25 2.25 0 0 1 1.5 8.25zm2.25 12v4.5h4.5v-4.5zm-2.25 0a2.25 2.25 0 0 1 2.25-2.25h4.5a2.25 2.25 0 0 1 2.25 2.25v4.5a2.25 2.25 0 0 1-2.25 2.25h-4.5a2.25 2.25 0 0 1-2.25-2.25zm18.75-12h-4.5v4.5h4.5zm-4.5-2.25h4.5a2.25 2.25 0 0 1 2.25 2.25v4.5a2.25 2.25 0 0 1-2.25 2.25h-4.5a2.25 2.25 0 0 1-2.25-2.25v-4.5a2.25 2.25 0 0 1 2.25-2.25m0 14.25v4.5h4.5v-4.5zm-2.25 0a2.25 2.25 0 0 1 2.25-2.25h4.5a2.25 2.25 0 0 1 2.25 2.25v4.5a2.25 2.25 0 0 1-2.25 2.25h-4.5a2.25 2.25 0 0 1-2.25-2.25z"/></svg>';
