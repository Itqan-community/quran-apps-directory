"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

export function SearchForm({ lang }: { lang: "ar" | "en" }) {
  const t = useTranslations("appList.search");
  const [q, setQ] = useState("");
  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const query = q.trim();
    window.location.assign(
      query ? `/${lang}/apps?search=${encodeURIComponent(query)}` : `/${lang}/apps`
    );
  }
  return (
    <form
      onSubmit={onSubmit}
      className="mx-auto mt-8 flex max-w-xl items-stretch gap-2 rounded-app border border-border bg-card p-2 shadow-app"
    >
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={t("traditionalPlaceholder")}
        aria-label={t("traditional")}
        className="w-full bg-transparent px-3 text-text outline-none placeholder:text-text-secondary"
      />
      <button
        type="submit"
        className="rounded-app bg-primary px-4 py-2 text-sm font-bold text-white hover:bg-primary-hover"
      >
        {t("button")}
      </button>
    </form>
  );
}
