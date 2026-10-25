"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";

const QUESTIONS = [1, 2, 3, 4] as const;

export function SupportWidget() {
  const t = useTranslations("support");
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  function closeSupport() {
    setOpen(false);
    setSelected(null);
  }

  function toggleSupport() {
    if (open) {
      closeSupport();
    } else {
      setOpen(true);
    }
  }

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: PointerEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        closeSupport();
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeSupport();
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div className="support-container" ref={containerRef}>
      {open && (
        <div className="support-card-wrapper">
          <div className="support-card">
            <div className="support-card-header">
              {selected !== null ? (
                <div className="flex items-start justify-between gap-4">
                  <button
                    onClick={() => setSelected(null)}
                    aria-label={t("back")}
                    className="support-back-btn"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M19 12H5M12 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <span className="support-question-title">{t(`q${selected}`)}</span>
                </div>
              ) : (
                <h3 className="support-title">{t("faq")}</h3>
              )}
            </div>
            <div className="support-card-body">
              {selected === null ? (
                <div className="questions-content">
                  {QUESTIONS.map((q) => (
                    <button key={q} onClick={() => setSelected(q)} className="question-item">
                      <span className="question-text">{t(`q${q}`)}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="answer-wrapper">
                  <p className="answer-text">{t(`q${selected}a`)}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      <button
        onClick={toggleSupport}
        aria-label={t("fab")}
        className={`support-fab ${open ? "active" : ""}`}
      >
        <span className="fab-text">{t("fab")}</span>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="10" />
          <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
          <path d="M12 17h.01" />
        </svg>
      </button>
    </div>
  );
}
