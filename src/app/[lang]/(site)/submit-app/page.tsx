import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getLang, isLocale } from "@/lib/i18n";
import { getSubmissionCategoriesCached } from "@/lib/cache/submission-form-data";
import { SubmitAppForm } from "@/components/apps/submit-app-form";
import { pageMetadata } from "@/lib/seo/metadata";

type Props = { params: Promise<{ lang: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const t = await getTranslations({ locale: lang, namespace: "submitApp" });
  return pageMetadata(lang, "/submit-app", t("title"), t("subtitle"));
}

export default async function SubmitAppPage({ params }: Props) {
  const { lang } = await params;
  const locale = getLang({ lang });
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "submitApp" });
  const categories = await getSubmissionCategoriesCached(locale);
  const isAr = locale === "ar";

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <section className="mb-10 text-center">
        <h1 className="text-3xl font-bold text-text sm:text-4xl">{t("title")}</h1>
        <p className="mt-3 text-text-secondary">{t("subtitle")}</p>
      </section>

      <div className="mx-auto mb-8 flex max-w-2xl items-center justify-center gap-2 rounded-full border border-[rgba(160,83,59,0.2)] bg-[rgba(160,83,59,0.06)] px-4 py-2.5 text-sm dark:border-[rgba(255,140,66,0.25)] dark:bg-[rgba(255,140,66,0.08)]">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </svg>
        <span className="text-text">{t("alreadySubmitted")}</span>
        <Link
          href={`/${locale}/track-submission`}
          className="inline-flex items-center gap-1 font-bold text-primary underline"
        >
          {t("trackYourSubmission")}
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            {isAr ? <path d="M5 12h14m-6-6 6 6-6 6" /> : <path d="M19 12H5m6-6-6 6 6 6" />}
          </svg>
        </Link>
      </div>

      <div className="mx-auto max-w-3xl">
        <SubmitAppForm lang={locale} categories={categories} />
      </div>
    </main>
  );
}
