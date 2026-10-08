import { getTranslations } from "next-intl/server";
import { headers } from "next/headers";

export default async function LangNotFound() {
  const h = await headers();
  const path = h.get("next-url") ?? "";
  const lang = path.split("/")[1] === "en" ? "en" : "ar";
  const t = await getTranslations({ locale: lang, namespace: "APP" });
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center p-8 text-center">
      <h1 className="text-4xl font-bold text-text">{t("NOT_FOUND_TITLE")}</h1>
      <p className="mt-3 text-sm text-text-secondary">{t("NOT_FOUND_MESSAGE")}</p>
      <a
        href={`/${lang}`}
        className="mt-6 rounded-app bg-primary px-4 py-2 text-sm font-bold text-white hover:bg-primary-hover"
      >
        {t("BACK_HOME")}
      </a>
    </div>
  );
}
