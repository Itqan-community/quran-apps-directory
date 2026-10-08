import type { ReactNode } from "react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import type { Locale } from "@/lib/i18n";
import {
  getSubmissionByTrackingIdCached,
  getSubmissionsByEmailCached,
} from "@/lib/cache/submissions";

const STATUS_ICONS: Record<string, ReactNode> = {
  pending: (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </svg>
  ),
  under_review: (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
  info_requested: (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3M12 17h.01" />
    </svg>
  ),
  approved: (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <circle cx="12" cy="12" r="10" />
      <path d="m8 12 3 3 5-5" />
    </svg>
  ),
  rejected: (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <circle cx="12" cy="12" r="10" />
      <path d="m15 9-6 6m0-6 6 6" />
    </svg>
  ),
};

function StatusTag({
  status,
  label,
  icon,
}: {
  status: string;
  label: string;
  icon: ReactNode;
}) {
  const colors: Record<string, string> = {
    pending: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400",
    under_review: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400",
    info_requested: "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-400",
    approved: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400",
    rejected: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400",
  };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold ${colors[status] ?? "bg-surface text-text-secondary"}`}>
      {icon}
      {label}
    </span>
  );
}

function formatDate(date: Date, locale: Locale): string {
  return date.toLocaleDateString(locale === "ar" ? "ar-SA" : "en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default async function TrackResults({
  searchParams,
  locale,
}: {
  searchParams: Promise<{ id?: string; email?: string }>;
  locale: Locale;
}) {
  const t = await getTranslations({ locale, namespace: "trackSubmission" });
  const tApp = await getTranslations({ locale, namespace: "APP" });
  const { id, email } = await searchParams;

  const statusLabels: Record<string, string> = {
    pending: t("status.pending"),
    under_review: t("status.under_review"),
    info_requested: t("status.info_requested"),
    approved: t("status.approved"),
    rejected: t("status.rejected"),
  };

  const tab = email && !id ? "email" : "tracking";
  const byId = id ? await getSubmissionByTrackingIdCached(id) : null;
  const byEmail = !id && email ? await getSubmissionsByEmailCached(email) : [];

  const inputCls =
    "w-full rounded-app border border-border bg-card px-3 py-2 text-sm text-text outline-none placeholder:text-text-secondary focus:border-primary";
  const tabCls = (active: boolean) =>
    `rounded-app px-4 py-2 text-sm font-bold transition-colors ${
      active ? "bg-primary text-white" : "text-text-secondary hover:bg-surface"
    }`;

  return (
    <>
      <div className="mb-6 flex justify-center gap-1 rounded-app border border-border bg-card p-1">
        <Link href={`/${locale}/track-submission`} className={tabCls(tab === "tracking")}>
          {t("byTrackingId")}
        </Link>
        <Link href={`/${locale}/track-submission?email=`} className={tabCls(tab === "email")}>
          {t("byEmail")}
        </Link>
      </div>

      {tab === "tracking" ? (
        <form method="GET" className="mb-6 flex flex-col gap-2 rounded-app border border-border bg-card p-5">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-bold text-text">{t("byTrackingId")}</span>
            <input
              className={inputCls}
              dir="ltr"
              name="id"
              defaultValue={id ?? ""}
              placeholder={t("trackingIdPlaceholder")}
              pattern="QAD-[A-Za-z0-9]{6}"
            />
            <span className="text-xs text-text-secondary">{t("trackingIdHint")}</span>
          </label>
          <button type="submit" className="rounded-app bg-primary px-5 py-2 text-sm font-bold text-white hover:bg-primary-hover">
            {t("search")}
          </button>
        </form>
      ) : (
        <form method="GET" className="mb-6 flex flex-col gap-2 rounded-app border border-border bg-card p-5">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-bold text-text">{t("byEmail")}</span>
            <input className={inputCls} dir="ltr" type="email" name="email" placeholder={t("emailPlaceholder")} />
            <span className="text-xs text-text-secondary">{t("emailHint")}</span>
          </label>
          <button type="submit" className="rounded-app bg-primary px-5 py-2 text-sm font-bold text-white hover:bg-primary-hover">
            {t("search")}
          </button>
        </form>
      )}

      {/* by-ID result */}
      {id && tab === "tracking" && (
        byId ? (
          <section className="mb-6 overflow-hidden rounded-app border border-border bg-card shadow-app" aria-label={byId.trackingId}>
            <div className="flex items-center justify-between border-b border-border p-5">
              <span className="font-mono text-sm font-bold text-text">{byId.trackingId}</span>
              <StatusTag status={byId.status} label={statusLabels[byId.status] ?? byId.status} icon={STATUS_ICONS[byId.status]} />
            </div>
            <div className="flex flex-col gap-4 p-5">
              <div className="flex items-center gap-3">
                {byId.appIconUrl && (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={byId.appIconUrl} alt={byId.appNameEn} width={48} height={48} className="rounded-app border border-border" />
                )}
                <div>
                  <h2 className="font-bold text-text">{locale === "ar" ? byId.appNameAr : byId.appNameEn}</h2>
                  <p className="text-xs text-text-secondary">{locale === "ar" ? byId.appNameEn : byId.appNameAr}</p>
                </div>
              </div>
              <p className="rounded-app bg-surface p-3 text-sm text-text-secondary">
                {statusLabels[byId.status] ?? byId.status}
              </p>
              <div className="flex flex-wrap gap-6 text-sm">
                <div>
                  <span className="text-text-secondary">{t("submittedOn")}: </span>
                  <span className="font-bold text-text">{formatDate(byId.submittedAt, locale)}</span>
                </div>
                {byId.reviewedAt && (
                  <div>
                    <span className="text-text-secondary">{t("reviewedOn")}: </span>
                    <span className="font-bold text-text">{formatDate(byId.reviewedAt, locale)}</span>
                  </div>
                )}
              </div>
              {byId.createdAppSlug && (
                <a
                  href={`/${locale}/app/${byId.createdAppSlug}`}
                  className="w-max rounded-app bg-primary px-5 py-2.5 text-sm font-bold text-white hover:bg-primary-hover"
                >
                  {t("viewAppListing")}
                </a>
              )}
            </div>
          </section>
        ) : (
          <div className="mb-6 flex flex-col items-center rounded-app border border-border bg-card p-10 text-center">
            <h2 className="text-xl font-bold text-text">{tApp("NOT_FOUND_TITLE")}</h2>
            <p className="mt-2 text-sm text-text-secondary">{tApp("NOT_FOUND_MESSAGE")}</p>
          </div>
        )
      )}

      {/* by-email results */}
      {tab === "email" && email && (
        byEmail.length > 0 ? (
          <section className="mb-6">
            <h2 className="mb-3 text-lg font-bold text-text">
              {t("foundSubmissions")}: {byEmail.length}
            </h2>
            <div className="flex flex-col gap-3">
              {byEmail.map((item) => (
                <Link
                  key={item.trackingId}
                  href={`/${locale}/track-submission?id=${encodeURIComponent(item.trackingId)}`}
                  className="block rounded-app border border-border bg-card p-4 transition-colors hover:border-primary"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-sm font-bold text-text">{item.trackingId}</span>
                    <StatusTag status={item.status} label={statusLabels[item.status] ?? item.status} icon={STATUS_ICONS[item.status]} />
                  </div>
                  <div className="mt-2 flex items-center justify-between text-sm">
                    <span className="text-text">{locale === "ar" ? item.appNameAr : item.appNameEn}</span>
                    <span className="text-text-secondary">{formatDate(item.submittedAt, locale)}</span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ) : (
          <div className="mb-6 rounded-app border border-border bg-card p-10 text-center text-sm text-text-secondary">
            {t("noSubmissions")}
          </div>
        )
      )}
    </>
  );
}
