import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getLang, isLocale, type Locale } from "@/lib/i18n";
import { pageMetadata } from "@/lib/seo/metadata";
import TrackResults from "./track-results";

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
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "trackSubmission" });

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <section className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-text">{t("title")}</h1>
        <p className="mt-3 text-text-secondary">{t("subtitle")}</p>
      </section>

      <Suspense fallback={<TrackSkeleton />}>
        <TrackResults searchParams={searchParams} locale={locale} />
      </Suspense>

      <div className="rounded-app bg-surface p-5 text-center">
        <p className="text-sm text-text-secondary">{t("wantToSubmit")}</p>
        <Link
          href={`/${locale}/submit-app`}
          className="mt-3 inline-block rounded-app border border-primary px-4 py-2 text-sm font-bold text-primary hover:bg-primary hover:text-white"
        >
          {t("submitNewApp")}
        </Link>
      </div>
    </main>
  );
}
