import { getTranslations } from "next-intl/server";
import type { Locale } from "@/lib/i18n";

export async function NoResults({ lang }: { lang: Locale }) {
  const t = await getTranslations({ locale: lang, namespace: "empty.noApps" });
  return (
    <div className="flex flex-col items-center py-16 text-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/images/no-results.svg" alt="" width={120} height={120} />
      <h2 className="mt-4 text-lg font-bold text-text">{t("title")}</h2>
      <p className="mt-2 text-sm text-text-secondary">{t("message")}</p>
    </div>
  );
}
