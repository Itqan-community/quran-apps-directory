"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { submitApp, type SubmitResult } from "@/lib/actions/submissions";
import type { PublicCategory } from "@/lib/actions/submission-form-data";

const STEP_LABEL_KEYS = ["steps.essentials", "steps.details", "steps.developerMedia"] as const;

type SubmitState = {
  submitter_name: string;
  submitter_email: string;
  submitter_phone: string;
  submitter_organization: string;
  is_developer: boolean;
  app_name_en: string;
  app_name_ar: string;
  google_play_link: string;
  app_store_link: string;
  app_gallery_link: string;
  website_link: string;
  short_description_en: string;
  short_description_ar: string;
  description_en: string;
  description_ar: string;
  categories: number[];
  developer_name_en: string;
  developer_name_ar: string;
  developer_website: string;
  developer_email: string;
  app_icon_url: string;
  main_image_en: string;
  main_image_ar: string;
  screenshots_en: string;
  screenshots_ar: string;
  additional_notes: string;
  content_confirmation: boolean;
};

const INITIAL: SubmitState = {
  submitter_name: "",
  submitter_email: "",
  submitter_phone: "",
  submitter_organization: "",
  is_developer: false,
  app_name_en: "",
  app_name_ar: "",
  google_play_link: "",
  app_store_link: "",
  app_gallery_link: "",
  website_link: "",
  short_description_en: "",
  short_description_ar: "",
  description_en: "",
  description_ar: "",
  categories: [],
  developer_name_en: "",
  developer_name_ar: "",
  developer_website: "",
  developer_email: "",
  app_icon_url: "",
  main_image_en: "",
  main_image_ar: "",
  screenshots_en: "",
  screenshots_ar: "",
  additional_notes: "",
  content_confirmation: false,
};

function parseUrls(input: string): string[] {
  return input
    .split("\n")
    .map((s) => s.trim())
    .filter((s) => s.startsWith("http"));
}

export function SubmitAppForm({
  lang,
  categories,
}: {
  lang: "ar" | "en";
  categories: PublicCategory[];
}) {
  const t = useTranslations("submitApp");

  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<string | null>(null);
  const [form, setForm] = useState<SubmitState>(INITIAL);

  function set<K extends keyof SubmitState>(key: K, value: SubmitState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  const screenshotsEn = parseUrls(form.screenshots_en);
  const screenshotsAr = parseUrls(form.screenshots_ar);
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.submitter_email.trim());
  const hasStoreLink = Boolean(
    form.google_play_link.trim() || form.app_store_link.trim() || form.app_gallery_link.trim()
  );
  const step0Valid = form.app_name_en.trim() !== "" && emailValid && hasStoreLink;

  const inputCls =
    "w-full rounded-app border border-border bg-card px-3 py-2 text-sm text-text outline-none placeholder:text-text-secondary focus:border-primary";

  function err(key: string): string | undefined {
    return errors[key];
  }

  function nextStep() {
    const next: Record<string, string> = {};
    if (step === 0) {
      if (!form.app_name_en.trim()) next.app_name_en = t("validation.appNameRequired");
      if (!emailValid) next.submitter_email = t("validation.yourEmailRequired");
      if (!hasStoreLink) next.google_play_link = t("validation.storeLink");
    }
    if (step === 1) {
      if (form.short_description_en.length > 150)
        next.short_description_en = "Max 150 characters";
      if (form.short_description_ar.length > 150)
        next.short_description_ar = "150 حرفاً كحد أقصى";
    }
    setErrors(next);
    if (Object.keys(next).length === 0) {
      setStep((s) => Math.min(s + 1, 2));
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  function prevStep() {
    setStep((s) => Math.max(s - 1, 0));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setServerError(null);
    if (!step0Valid) {
      setStep(0);
      nextStep();
      return;
    }
    if (!form.content_confirmation) {
      setErrors({ content_confirmation: t("validation.confirmationRequired") });
      return;
    }
    setErrors({});
    startTransition(async () => {
      const res = await submitApp({
        submitter_name: form.submitter_name,
        submitter_email: form.submitter_email.trim(),
        submitter_phone: form.submitter_phone.trim(),
        submitter_organization: form.submitter_organization.trim(),
        is_developer: form.is_developer,
        app_name_en: form.app_name_en.trim(),
        app_name_ar: form.app_name_ar.trim(),
        google_play_link: form.google_play_link.trim(),
        app_store_link: form.app_store_link.trim(),
        app_gallery_link: form.app_gallery_link.trim(),
        website_link: form.website_link.trim(),
        categories: form.categories,
        developer_name_en: form.developer_name_en.trim(),
        developer_name_ar: form.developer_name_ar.trim(),
        developer_website: form.developer_website.trim(),
        developer_email: form.developer_email.trim(),
        app_icon_url: form.app_icon_url.trim(),
        main_image_en: form.main_image_en.trim(),
        main_image_ar: form.main_image_ar.trim(),
        screenshots_en: screenshotsEn,
        screenshots_ar: screenshotsAr,
        additional_notes: form.additional_notes.trim(),
        content_confirmation: form.content_confirmation,
      });
      if (res.ok) {
        setResult(res.trackingId);
      } else if (res.error === "validation") {
        const fe = res.fieldErrors ?? {};
        const mapped: Record<string, string> = {};
        for (const [key, messages] of Object.entries(fe)) {
          if (messages.includes("invalidStoreLink"))
            mapped[key] = t("validation.invalidStoreLink");
          else if (key === "content_confirmation")
            mapped[key] = t("validation.confirmationRequired");
          else mapped[key] = messages.join(", ");
        }
        setErrors(mapped);
        if (Object.keys(mapped).some((k) => !k.startsWith("short_"))) setStep(0);
      } else {
        setServerError(res.message ?? "Failed to submit. Please try again.");
      }
    });
  }

  if (result) {
    const trackHref = `/${lang}/track-submission?id=${encodeURIComponent(result)}`;
    return (
      <div className="mx-auto my-16 flex max-w-lg flex-col items-center rounded-app border border-border bg-card p-10 text-center shadow-app">
        <svg width="80" height="80" viewBox="0 0 80 80" fill="none" aria-hidden>
          <circle cx="40" cy="40" r="38" fill="#e8f5e9" stroke="#4caf50" strokeWidth="3" />
          <path
            d="M25 40l10 10 20-20"
            stroke="#4caf50"
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <h2 className="mt-5 text-2xl font-bold text-text">{t("success.title")}</h2>
        <p className="mt-2 text-sm leading-relaxed text-text-secondary">{t("success.message")}</p>
        <div className="mt-6 w-full rounded-app border border-[#e8b8a8] bg-gradient-to-br from-[#fdf2f0] to-[#fff5f2] p-5 dark:border-[#5a4038] dark:from-[#2a1f1c] dark:to-[#241a17]">
          <p className="text-xs font-bold uppercase tracking-wide text-text-secondary">
            {t("success.trackingId")}
          </p>
          <p className="mt-1 break-all font-mono text-3xl font-extrabold text-primary">{result}</p>
          <p className="mt-2 text-xs text-text-secondary">{t("success.trackingIdNote")}</p>
        </div>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link
            href={trackHref}
            className="rounded-app bg-primary px-4 py-2 text-sm font-bold text-white hover:bg-primary-hover"
          >
            {t("success.trackSubmission")}
          </Link>
          <button
            type="button"
            onClick={() => {
              setResult(null);
              setStep(0);
            }}
            className="rounded-app border border-border px-4 py-2 text-sm text-text hover:border-primary hover:text-primary"
          >
            {t("success.submitAnother")}
          </button>
        </div>
      </div>
    );
  }

  function Field({
    label,
    required,
    error,
    hint,
    children,
  }: {
    label: string;
    required?: boolean;
    error?: string;
    hint?: string;
    children: React.ReactNode;
  }) {
    return (
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-bold text-text">
          {label}
          {required && <span className="ms-1 text-red-500">*</span>}
        </span>
        {children}
        {error && <span className="text-xs text-red-500">{error}</span>}
        {!error && hint && <span className="text-xs text-text-secondary">{hint}</span>}
      </label>
    );
  }

  return (
    <form onSubmit={onSubmit} className="w-full">
      <div className="mb-6 flex items-center justify-center gap-2" aria-hidden>
        {STEP_LABEL_KEYS.map((key, i) => (
          <div key={key} className="flex items-center gap-2">
            <span
              className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                i === step
                  ? "bg-primary text-white"
                  : i < step
                    ? "bg-primary/20 text-primary"
                    : "bg-surface text-text-secondary"
              }`}
            >
              {i + 1}
            </span>
            <span
              className={`hidden text-xs sm:block ${
                i === step ? "font-bold text-text" : "text-text-secondary"
              }`}
            >
              {t(key)}
            </span>
            {i < 2 && <span className="mx-1 h-px w-6 bg-border sm:w-10" />}
          </div>
        ))}
      </div>
      <p className="sr-only" aria-live="polite">
        {t(STEP_LABEL_KEYS[step])}
      </p>

      {serverError && (
        <div className="mb-4 rounded-app border border-red-300 bg-red-50 p-3 text-sm text-red-600 dark:border-red-800 dark:bg-red-950 dark:text-red-400">
          {serverError}
        </div>
      )}

      {step === 0 && (
        <div className="flex flex-col gap-6">
          <section className="rounded-app border border-border bg-card p-6" aria-label={t("sections.contact")}>
            <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-text">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <circle cx="12" cy="7" r="4" />
                <path d="M4 21v-2a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v2" />
              </svg>
              {t("sections.contact")}
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t("fields.yourName")}>
                <input className={inputCls} value={form.submitter_name} onChange={(e) => set("submitter_name", e.target.value)} placeholder={t("placeholders.yourName")} />
              </Field>
              <Field label={t("fields.yourEmail")} required error={errors.submitter_email}>
                <input className={inputCls} type="email" value={form.submitter_email} onChange={(e) => set("submitter_email", e.target.value)} placeholder={t("placeholders.yourEmail")} />
              </Field>
              <Field label={t("fields.phone")}>
                <input className={inputCls} dir="ltr" value={form.submitter_phone} onChange={(e) => set("submitter_phone", e.target.value)} placeholder={t("placeholders.phone")} />
              </Field>
              <Field label={t("fields.organization")}>
                <input className={inputCls} value={form.submitter_organization} onChange={(e) => set("submitter_organization", e.target.value)} placeholder={t("placeholders.organization")} />
              </Field>
            </div>
            <label className="mt-4 flex items-center gap-2 text-sm text-text">
              <input type="checkbox" checked={form.is_developer} onChange={(e) => set("is_developer", e.target.checked)} className="h-4 w-4 accent-[var(--primary-color)]" />
              {t("fields.isDeveloper")}
            </label>
          </section>

          <section className="rounded-app border border-border bg-card p-6" aria-label={t("sections.appDetails")}>
            <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-text">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <rect x="7" y="2" width="10" height="20" rx="2" />
                <path d="M11 18h2" />
              </svg>
              {t("sections.appDetails")}
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t("fields.appNameEn")} required error={errors.app_name_en}>
                <input className={inputCls} dir="ltr" value={form.app_name_en} onChange={(e) => set("app_name_en", e.target.value)} placeholder={t("placeholders.appNameEn")} />
              </Field>
              <Field label={t("fields.appNameAr")}>
                <input className={inputCls} dir="rtl" value={form.app_name_ar} onChange={(e) => set("app_name_ar", e.target.value)} placeholder={t("placeholders.appNameAr")} />
              </Field>
            </div>
          </section>

          <section className="rounded-app border border-border bg-card p-6" aria-label={t("sections.storeLinks")}>
            <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-text">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
              </svg>
              {t("sections.storeLinks")}
            </h2>
            {!hasStoreLink && (
              <p className="mb-4 rounded-app border border-amber-300 bg-amber-50 p-3 text-sm text-amber-700 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-400">
                {t("validation.storeLink")}
              </p>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t("fields.googlePlay")} error={errors.google_play_link}>
                <input className={inputCls} dir="ltr" value={form.google_play_link} onChange={(e) => set("google_play_link", e.target.value)} placeholder={t("placeholders.googlePlay")} />
              </Field>
              <Field label={t("fields.appStore")} error={errors.app_store_link}>
                <input className={inputCls} dir="ltr" value={form.app_store_link} onChange={(e) => set("app_store_link", e.target.value)} placeholder={t("placeholders.appStore")} />
              </Field>
              <Field label={t("fields.appGallery")} error={errors.app_gallery_link}>
                <input className={inputCls} dir="ltr" value={form.app_gallery_link} onChange={(e) => set("app_gallery_link", e.target.value)} placeholder={t("placeholders.appGallery")} />
              </Field>
              <Field label={t("fields.website")} error={errors.website_link}>
                <input className={inputCls} dir="ltr" value={form.website_link} onChange={(e) => set("website_link", e.target.value)} placeholder={t("placeholders.website")} />
              </Field>
            </div>
          </section>
        </div>
      )}

      {step === 1 && (
        <div className="flex flex-col gap-6">
          <section className="rounded-app border border-border bg-card p-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t("fields.shortDescEn")} error={errors.short_description_en} hint={`${form.short_description_en.length}/150`}>
                <textarea className={inputCls} dir="ltr" rows={3} value={form.short_description_en} onChange={(e) => set("short_description_en", e.target.value)} placeholder={t("placeholders.shortDescEn")} />
              </Field>
              <Field label={t("fields.shortDescAr")} error={errors.short_description_ar} hint={`${form.short_description_ar.length}/150`}>
                <textarea className={inputCls} dir="rtl" rows={3} value={form.short_description_ar} onChange={(e) => set("short_description_ar", e.target.value)} placeholder={t("placeholders.shortDescAr")} />
              </Field>
              <Field label={t("fields.descEn")}>
                <textarea className={inputCls} dir="ltr" rows={6} value={form.description_en} onChange={(e) => set("description_en", e.target.value)} placeholder={t("placeholders.descEn")} />
              </Field>
              <Field label={t("fields.descAr")}>
                <textarea className={inputCls} dir="rtl" rows={6} value={form.description_ar} onChange={(e) => set("description_ar", e.target.value)} placeholder={t("placeholders.descAr")} />
              </Field>
            </div>
          </section>

          <section className="rounded-app border border-border bg-card p-6">
            <h2 className="mb-4 text-lg font-bold text-text">{t("sections.categories")}</h2>
            <div className="flex flex-wrap gap-2">
              {categories.map((c) => {
                const active = form.categories.includes(c.id);
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() =>
                      set("categories", active ? form.categories.filter((id) => id !== c.id) : [...form.categories, c.id])
                    }
                    className={`rounded-full border px-3 py-1 text-sm ${
                      active
                        ? "border-primary bg-primary text-white"
                        : "border-border bg-card text-text-secondary hover:border-primary"
                    }`}
                  >
                    {c.label}
                  </button>
                );
              })}
            </div>
          </section>
        </div>
      )}

      {step === 2 && (
        <div className="flex flex-col gap-6">
          <section className="rounded-app border border-border bg-card p-6" aria-label={t("sections.developer")}>
            <h2 className="mb-4 text-lg font-bold text-text">{t("sections.developer")}</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t("fields.devNameEn")}>
                <input className={inputCls} dir="ltr" value={form.developer_name_en} onChange={(e) => set("developer_name_en", e.target.value)} placeholder={t("placeholders.devNameEn")} />
              </Field>
              <Field label={t("fields.devNameAr")}>
                <input className={inputCls} dir="rtl" value={form.developer_name_ar} onChange={(e) => set("developer_name_ar", e.target.value)} placeholder={t("placeholders.devNameAr")} />
              </Field>
              <Field label={t("fields.devWebsite")} error={errors.developer_website}>
                <input className={inputCls} dir="ltr" value={form.developer_website} onChange={(e) => set("developer_website", e.target.value)} placeholder={t("placeholders.devWebsite")} />
              </Field>
              <Field label={t("fields.devEmail")} error={errors.developer_email}>
                <input className={inputCls} dir="ltr" type="email" value={form.developer_email} onChange={(e) => set("developer_email", e.target.value)} placeholder={t("placeholders.devEmail")} />
              </Field>
            </div>
          </section>

          <section className="rounded-app border border-border bg-card p-6" aria-label={t("sections.media")}>
            <h2 className="mb-4 text-lg font-bold text-text">{t("sections.media")}</h2>
            <div className="grid gap-4">
              <Field label={t("fields.iconUrl")} error={errors.app_icon_url} hint={t("hints.iconUrl")}>
                <input className={inputCls} dir="ltr" value={form.app_icon_url} onChange={(e) => set("app_icon_url", e.target.value)} placeholder={t("placeholders.iconUrl")} />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label={t("fields.mainImageEn")} error={errors.main_image_en} hint={t("hints.mainImage")}>
                  <input className={inputCls} dir="ltr" value={form.main_image_en} onChange={(e) => set("main_image_en", e.target.value)} placeholder={t("placeholders.mainImageEn")} />
                </Field>
                <Field label={t("fields.mainImageAr")} error={errors.main_image_ar}>
                  <input className={inputCls} dir="ltr" value={form.main_image_ar} onChange={(e) => set("main_image_ar", e.target.value)} placeholder={t("placeholders.mainImageAr")} />
                </Field>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <span className="text-sm font-bold text-text">{t("fields.screenshotsEn")}</span>
                  <textarea className={inputCls} dir="ltr" rows={3} value={form.screenshots_en} onChange={(e) => set("screenshots_en", e.target.value)} placeholder="https://..." />
                  {screenshotsEn.length > 0 && (
                    <span className="text-xs text-primary">
                      {screenshotsEn.length} {t("screenshotsDetected")}
                    </span>
                  )}
                  <span className="text-xs text-text-secondary">{t("hints.screenshots")}</span>
                </div>
                <div className="flex flex-col gap-1.5">
                  <span className="text-sm font-bold text-text">{t("fields.screenshotsAr")}</span>
                  <textarea className={inputCls} dir="ltr" rows={3} value={form.screenshots_ar} onChange={(e) => set("screenshots_ar", e.target.value)} placeholder="https://..." />
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-app border border-border bg-card p-6" aria-label={t("sections.additional")}>
            <h2 className="mb-4 text-lg font-bold text-text">{t("sections.additional")}</h2>
            <div className="flex flex-col gap-4">
              <Field label={t("fields.additionalNotes")}>
                <textarea className={inputCls} rows={3} value={form.additional_notes} onChange={(e) => set("additional_notes", e.target.value)} placeholder={t("placeholders.additionalNotes")} />
              </Field>
              <label className="flex items-start gap-2 text-sm text-text">
                <input
                  type="checkbox"
                  checked={form.content_confirmation}
                  onChange={(e) => set("content_confirmation", e.target.checked)}
                  className="mt-0.5 h-4 w-4 accent-[var(--primary-color)]"
                />
                {t("fields.contentConfirmation")}
              </label>
              {errors.content_confirmation && <span className="text-xs text-red-500">{errors.content_confirmation}</span>}
            </div>
          </section>
        </div>
      )}

      <div className="mt-6 flex items-center justify-between">
        <button
          type="button"
          onClick={prevStep}
          disabled={step === 0}
          className="rounded-app border border-border px-5 py-2.5 text-sm font-bold text-text disabled:opacity-40"
        >
          {t("stepNav.back")}
        </button>
        {step < 2 ? (
          <button
            type="button"
            onClick={nextStep}
            className="rounded-app bg-primary px-5 py-2.5 text-sm font-bold text-white hover:bg-primary-hover"
          >
            {t("stepNav.continue")}
          </button>
        ) : (
          <button
            type="submit"
            disabled={pending || !step0Valid || !form.content_confirmation}
            className="rounded-app bg-primary px-5 py-2.5 text-sm font-bold text-white hover:bg-primary-hover disabled:opacity-50"
          >
            {pending ? "..." : t("submitButton")}
          </button>
        )}
      </div>
    </form>
  );
}
