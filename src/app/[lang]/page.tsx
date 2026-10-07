import { getTranslations } from "next-intl/server";
import { getLang } from "@/lib/i18n";

export default async function HomePage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  getLang({ lang });
  const t = await getTranslations({ locale: lang, namespace: "appList.hero" });
  return (
    <main className="p-8">
      <h1 className="text-3xl font-bold text-primary">{t("title")}</h1>
      <p className="mt-4 text-text-secondary">{t("subtitle")}</p>
    </main>
  );
}
