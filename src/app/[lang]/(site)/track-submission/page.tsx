import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getLang, isLocale, type Locale } from "@/lib/i18n";
import { pageMetadata } from "@/lib/seo/metadata";
import TrackResults from "./track-results";
import "../submit-app/form-shell.css";

type Props = {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ id?: string; email?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const t = await getTranslations({ locale: lang, namespace: "trackSubmission" });
  return pageMetadata(lang, "/track-submission", t("title"), t("subtitle"));
}

function TrackSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="h-36 animate-pulse rounded-app border border-border bg-surface" />
      <div className="h-48 animate-pulse rounded-app border border-border bg-surface" />
    </div>
  );
}

export default async function TrackSubmissionPage({ params, searchParams }: Props) {
  const { lang } = await params;
  const locale: Locale = getLang({ lang });
  if (!isLocale(lang)) return null as never;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "trackSubmission" });

  return (
    <main className="form-shell-page">
      <div className="page-background-left" aria-hidden>
        <span className="ellipse-small" />
      </div>
      <div className="page-background-right" aria-hidden>
        <span className="ellipse-small" />
      </div>

      <section className="form-shell-hero">
        <div className="hero-content">
          <h1 className="form-shell-title">{t("title")}</h1>
          <p className="description">{t("subtitle")}</p>
        </div>
      </section>

      <div className="form-shell-container mx-auto max-w-2xl">
        <Suspense fallback={<TrackSkeleton />}>
          <TrackResults searchParams={searchParams} locale={locale} />
        </Suspense>

        <div className="mt-6 rounded-app border border-border bg-card p-5 text-center shadow-app">
          <p className="text-sm">{t("wantToSubmit")}</p>
          <Link
            href={`/${locale}/submit-app`}
            className="mt-3 inline-block rounded-full bg-black px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-85 dark:bg-white dark:text-black"
          >
            {t("submitNewApp")}
          </Link>
        </div>
      </div>
    </main>
  );
}
