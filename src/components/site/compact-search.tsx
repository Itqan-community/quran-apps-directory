"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

export function CompactSearch({ lang }: { lang: "ar" | "en" }) {
  const t = useTranslations("appList.search");
  const router = useRouter();
  const [query, setQuery] = useState("");

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

      <button type="button" className="compact-search-btn" onClick={submit}>
        {t("button")}
      </button>
    </>
  );
}
