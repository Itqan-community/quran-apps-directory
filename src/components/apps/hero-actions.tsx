"use client";

import { useRef } from "react";
import { useTranslations } from "next-intl";

export function HeroActions() {
  const t = useTranslations("appDetail");
  async function share() {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ url, title: document.title });
      } catch {
        /* user cancelled */
      }
    } else {
      await navigator.clipboard.writeText(url);
    }
  }
  return (
    <div className="hero-actions">
      <button type="button" className="primary-btn" onClick={() => document.getElementById("downloads")?.scrollIntoView({ behavior: "smooth" })}>
        {t("downloadApp")}
      </button>
      <button type="button" className="secondary-btn" onClick={() => void share()}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
          <polyline points="16 6 12 2 8 6" />
          <line x1="12" x2="12" y1="2" y2="15" />
        </svg>
        {t("share")}
      </button>
    </div>
  );
}

export function RelatedScroll({
  children,
  dir,
  headerTitle,
}: {
  children: React.ReactNode;
  dir: "ltr" | "rtl";
  headerTitle?: string;
}) {
  const ref = useRef<HTMLDivElement | null>(null);

  function scrollBy(direction: 1 | -1) {
    if (!ref.current) return;
    const firstCard = ref.current.firstElementChild as HTMLElement | null;
    const cardWidth = firstCard?.getBoundingClientRect().width ?? 300;
    const styles = getComputedStyle(ref.current);
    const gap = Number.parseFloat(styles.columnGap || styles.gap || "0") || 0;
    const delta = direction * (cardWidth + gap) * (dir === "rtl" ? -1 : 1);
    ref.current.scrollBy({ left: delta, behavior: "smooth" });
  }

  return (
    <div>
      <div className="section-header">
        <h2>{headerTitle}</h2>
        <div className="carousel-nav-buttons">
          <button type="button" className="nav-btn" onClick={() => scrollBy(-1)} aria-label={dir === "rtl" ? "\u0627\u0644\u0633\u0627\u0628\u0642" : "Previous"}>
            <svg width="11" height="20" viewBox="0 0 11 20" fill="none" aria-hidden="true">
              <path d="M10.617 0.924C10.888 1.195 10.888 1.635 10.617 1.906L1.802 10.72L10.617 19.535C10.888 19.806 10.888 20.246 10.617 20.517C10.346 20.788 9.906 20.788 9.635 20.517L0.566 11.448C0.164 11.046 0.164 10.395 0.566 9.993L9.635 0.924C9.906 0.653 10.346 0.653 10.617 0.924Z" fill="currentColor" />
            </svg>
          </button>
          <button type="button" className="nav-btn" onClick={() => scrollBy(1)} aria-label={dir === "rtl" ? "\u0627\u0644\u062a\u0627\u0644\u064a" : "Next"}>
            <svg width="11" height="20" viewBox="0 0 11 20" fill="none" aria-hidden="true">
              <path d="M0.383 20.076C0.112 19.805 0.112 19.365 0.383 19.094L9.198 10.28L0.383 1.465C0.112 1.194 0.112 0.754 0.383 0.483C0.654 0.212 1.094 0.212 1.365 0.483L10.434 9.552C10.836 9.954 10.836 10.605 10.434 11.007L1.365 20.076C1.094 20.347 0.654 20.347 0.383 20.076Z" fill="currentColor" />
            </svg>
          </button>
        </div>
      </div>
      <div ref={ref} className="related-apps-carousel">
        {children}
      </div>
    </div>
  );
}
