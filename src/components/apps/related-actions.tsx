"use client";

import { useRouter } from "next/navigation";

export function RelatedActions({ urlParam, lang }: { urlParam: string; lang: "ar" | "en" }) {
  const router = useRouter();
  async function share() {
    const url = `${window.location.origin}/${lang}/app/${urlParam}`;
    if (navigator.share) {
      try {
        await navigator.share({ url });
      } catch {
        /* user cancelled */
      }
    } else {
      await navigator.clipboard.writeText(url);
    }
  }
  function download(e: React.MouseEvent) {
    e.stopPropagation();
    router.push(`/${lang}/app/${urlParam}#downloads`);
  }
  return (
    <div className="related-card-actions">
      <button type="button" onClick={download} className="related-btn-primary">
        {lang === "ar" ? "تنزيل التطبيق" : "Download App"}
      </button>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          void share();
        }}
        className="related-btn-secondary"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
          <polyline points="16 6 12 2 8 6" />
          <line x1="12" x2="12" y1="2" y2="15" />
        </svg>
        {lang === "ar" ? "مشاركة" : "Share"}
      </button>
    </div>
  );
}
