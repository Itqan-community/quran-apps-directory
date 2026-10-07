"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

const QUESTIONS = [1, 2, 3, 4] as const;

export function SupportWidget({ lang }: { lang: "ar" | "en" }) {
  void lang;
  const t = useTranslations("support");
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);

  return (
    <div className="fixed bottom-5 end-5 z-50">
      {open && (
        <div className="mb-3 w-80 overflow-hidden rounded-app border border-border bg-card shadow-app">
          <div className="flex items-center gap-2 border-b border-border bg-surface px-4 py-3">
            {selected !== null && (
              <button onClick={() => setSelected(null)} aria-label={t("back")}
                className="text-text-secondary hover:text-text">
                {lang === "ar" ? "→" : "←"}
              </button>
            )}
            <h2 className="text-sm font-bold">{selected === null ? t("title") : t(`q${selected}`)}</h2>
          </div>
          <div className="p-2">
            {selected === null ? (
              QUESTIONS.map((q) => (
                <button key={q} onClick={() => setSelected(q)}
                  className="block w-full rounded-app px-3 py-2 text-start text-sm text-text hover:bg-surface">
                  {t(`q${q}`)}
                </button>
              ))
            ) : (
              <p className="px-3 py-2 text-sm text-text-secondary">{t(`q${selected}a`)}</p>
            )}
          </div>
        </div>
      )}
      <button onClick={() => setOpen((v) => !v)} aria-label={t("fab")}
        className="flex items-center gap-2 rounded-full bg-primary px-4 py-3 text-sm font-bold text-white shadow-app hover:bg-primary-hover">
        <span>{t("fab")}</span>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <circle cx="12" cy="12" r="10" />
          <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
          <path d="M12 17h.01" />
        </svg>
      </button>
    </div>
  );
}
