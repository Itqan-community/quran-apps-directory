import { getTranslations } from "next-intl/server";
import Link from "next/link";
import type { Locale } from "@/lib/i18n";

export async function NoResults({ lang, searching }: { lang: Locale; searching?: boolean }) {
  const t = await getTranslations({ locale: lang, namespace: "empty.noApps" });
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
            <Link href={`/${lang}/apps`} className="smart-search-btn">
              {t("trySmartSearch")}
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
