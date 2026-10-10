"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";

export function HeroSearch({ lang }: { lang: "ar" | "en" }) {
  const t = useTranslations("appList.search");
  const [searchType, setSearchType] = useState<"traditional" | "smart">("traditional");
  const [q, setQ] = useState("");
  const [searching, setSearching] = useState(false);
  const recentTimer = useRef(0);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const query = q.trim();
    if (searchType === "smart") {
      recentTimer.current += 1;
      setSearching(true);
      setTimeout(() => recentTimer.current > 0 && setSearching(false), 900);
    }
    window.location.assign(
      query ? `/${lang}/apps?search=${encodeURIComponent(query)}` : `/${lang}/apps`
    );
  }

  const isSmart = searchType === "smart";

  return (
    <div className="search-container" id="search-container">
      <div className="search-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={!isSmart}
          className={`search-tab ${!isSmart ? "active" : ""}`}
          onClick={() => setSearchType("traditional")}
        >
          {t("traditional")}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={isSmart}
          className={`search-tab ${isSmart ? "active" : ""}`}
          onClick={() => setSearchType("smart")}
        >
          {t("smart")}
        </button>
      </div>

      <form onSubmit={onSubmit}>
        <div className={`search-input-container ${isSmart ? "smart-mode" : ""}`}>
          <span className="search-icon">
            {isSmart ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src="/images/searchLogo.svg"
                alt=""
                className={`search-logo-img ${searching ? "spinning" : ""}`}
                width={20}
                height={20}
              />
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
            )}
          </span>
          <input
            type="text"
            className="search-input"
            placeholder={isSmart ? t("placeholder") : t("traditionalPlaceholder")}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label={isSmart ? t("smart") : t("traditional")}
          />
          <button type="submit" className="search-button">
            {isSmart ? t("sendButton") : t("button")}
          </button>
        </div>
      </form>
    </div>
  );
}
