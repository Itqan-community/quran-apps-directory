import { getTranslations } from "next-intl/server";
import Link from "next/link";
import type { Locale } from "@/lib/i18n";

export async function NoResults({
  lang,
  searching,
  query,
  mode,
}: {
  lang: Locale;
  searching?: boolean;
  query?: string;
  mode?: "smart";
}) {
  const t = await getTranslations({ locale: lang, namespace: "empty.noApps" });
  // Traditional empty state offers Smart Search; Smart empty state offers
  // switching back to Traditional (same query, no mode).
  const isSmart = mode === "smart";
  const buttonHref = !query
    ? `/${lang}/apps`
    : isSmart
      ? `/${lang}/apps?search=${encodeURIComponent(query)}`
      : `/${lang}/apps?search=${encodeURIComponent(query)}&mode=smart`;
  return (
    <div className="empty-state">
      <div className="empty-state-content">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/no-results.svg" alt="" className="empty-state-img" aria-hidden="true" />
        <h3>{t("title")}</h3>
        <p>{t("message")}</p>
        {searching && (
          <>
            <p>{t("smartSearchHint")}</p>
            <Link href={buttonHref} className="smart-search-btn">
              {isSmart ? t("tryTraditional") : t("trySmartSearch")}
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
