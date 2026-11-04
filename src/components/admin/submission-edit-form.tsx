"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  Building2,
  Check,
  FileText,
  ImagePlus,
  Pencil,
  Store,
  Tags,
  X,
} from "lucide-react";
import { AppleMark, GooglePlayMark, HuaweiMark, WebMark } from "@/components/brand-marks";
import type { CategoryOption } from "@/components/admin/app-form";
import { MdPreviewToggle } from "@/components/admin/md-preview";
import {
  LangTag,
  ScreenshotsEditor,
  SectionHeader,
  StoreUrlField,
  UrlUploadField,
  btnGhost,
  btnPrimary,
  checkChipCls,
  inputCls,
  labelCls,
} from "@/components/admin/app-form-sections";
import { editSubmission } from "@/lib/actions/admin-submissions";
import type { SubmissionDetail } from "@/lib/repo/admin";
import type { SubmissionEditInput } from "@/lib/validation/submission";

type ServerErrors = Record<string, string[]>;

/** Field errors under the matching input (schema keys are snake_case). */
function errorFor(errors: ServerErrors, ...keys: string[]): string[] {
  for (const k of keys) {
    const list = errors[k];
    if (list && list.length > 0) return list;
  }
  return [];
}

function ErrorList({ messages }: { messages: string[] }) {
  if (messages.length === 0) return null;
  return (
    <span className="mt-1 block text-xs text-red-600" role="alert">
      {messages.join("؛ ")}
    </span>
  );
}

/**
 * Prefill EVERY SubmissionEditInput key from the detail row. The edit schema
 * carries .default("")/.default(false) — an omitted key writes empty/false and
 * silently destroys data that approval transfers to the published app — so the
 * form state (and thus the payload) is always the complete object below.
 */
function initialForm(detail: SubmissionDetail): SubmissionEditInput {
  return {
    is_developer: detail.submitter.isDeveloper,
    app_name_en: detail.app.nameEn,
    app_name_ar: detail.app.nameAr,
    short_description_en: detail.app.shortDescriptionEn,
    short_description_ar: detail.app.shortDescriptionAr,
    description_en: detail.app.descriptionEn,
    description_ar: detail.app.descriptionAr,
    google_play_link: detail.links.googlePlay,
    app_store_link: detail.links.appStore,
    app_gallery_link: detail.links.appGallery,
    website_link: detail.links.website,
    categories: detail.categories.map((c) => c.id),
    developer_name_en: detail.developer.nameEn,
    developer_name_ar: detail.developer.nameAr,
    developer_website: detail.developer.website,
    developer_email: detail.developer.email,
    app_icon_url: detail.media.appIconUrl,
    main_image_en: detail.media.mainImageEn,
    main_image_ar: detail.media.mainImageAr,
    screenshots_en: [...detail.media.screenshotsEn],
    screenshots_ar: [...detail.media.screenshotsAr],
    additional_notes: detail.additionalNotes,
  };
}

/**
 * Launcher for the in-place edit modal on the submission review page.
 * Locked once the submission is decided (approved/rejected) or an app was
 * already created from it.
 */
export function SubmissionEditLauncher({
  detail,
  categories,
}: {
  detail: SubmissionDetail;
  categories: CategoryOption[];
}) {
  const [open, setOpen] = useState(false);

  const locked =
    detail.status === "approved" ||
    detail.status === "rejected" ||
    detail.createdApp !== null;
  const lockTitle =
    detail.createdApp !== null
      ? "تعديل البيانات غير متاح: تم إنشاء التطبيق من هذا الطلب"
      : "تعديل البيانات غير متاح: الطلب في حالة نهائية";

  return (
    <section className="flex flex-wrap items-center justify-between gap-3 rounded-app bg-card p-4 shadow-app">
      <p className="text-xs text-text-secondary">
        {locked
          ? lockTitle
          : "يمكن تعديل بيانات الطلب قبل إصدار القرار النهائي."}
      </p>
      <button
        type="button"
        className={`${btnPrimary} inline-flex items-center gap-1.5`}
        disabled={locked}
        title={locked ? lockTitle : undefined}
        onClick={() => setOpen(true)}
      >
        <Pencil aria-hidden className="size-4" />
        تعديل البيانات
      </button>
      {open && (
        <SubmissionEditModal
          detail={detail}
          categories={categories}
          onClose={() => setOpen(false)}
        />
      )}
    </section>
  );
}

function SubmissionEditModal({
  detail,
  categories,
  onClose,
}: {
  detail: SubmissionDetail;
  categories: CategoryOption[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [form, setForm] = useState<SubmissionEditInput>(() => initialForm(detail));
  const [fieldErrors, setFieldErrors] = useState<ServerErrors>({});
  const [topError, setTopError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function set<K extends keyof SubmissionEditInput>(
    key: K,
    value: SubmissionEditInput[K],
  ) {
    setForm((cur) => ({ ...cur, [key]: value }));
  }

  function toggleCategory(id: number, checked: boolean) {
    set(
      "categories",
      checked
        ? [...form.categories, id]
        : form.categories.filter((c) => c !== id),
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setTopError(null);
    setFieldErrors({});
    try {
      // `form` is the complete SubmissionEditInput object — every key is
      // always sent, so schema defaults can never overwrite real data.
      const res = await editSubmission(detail.id, form);
      if (res.ok) {
        onClose();
        router.refresh();
      } else if (res.error === "validation") {
        setFieldErrors(res.fieldErrors);
      } else {
        setTopError(res.message);
      }
    } catch {
      setTopError("حدث خطأ غير متوقع. حاول مرة أخرى.");
    } finally {
      setBusy(false);
    }
  }

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="admin-modal-backdrop fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="تعديل بيانات الطلب"
        className="admin-modal-panel max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-app bg-card p-4 shadow-app"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-base font-bold text-text">تعديل بيانات الطلب</h2>
          <button
            type="button"
            onClick={onClose}
            className={`${btnGhost} inline-flex items-center gap-1`}
            aria-label="إغلاق"
          >
            <X aria-hidden className="size-4" />
          </button>
        </div>

        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          {/* App details */}
          <section className="rounded-app border border-border/70 bg-surface/30 p-4">
            <SectionHeader
              icon={<FileText aria-hidden className="size-4" />}
              title="تفاصيل التطبيق"
              hint="الاسم والأوصاف كما تظهر في الموقع بكلتا اللغتين"
              tone="basics"
            />
            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex min-w-0 flex-col gap-3">
                <label className="flex min-w-0 flex-col gap-1">
                  <span className={labelCls}>
                    الاسم <LangTag lang="EN" /> *
                  </span>
                  <input
                    dir="ltr"
                    value={form.app_name_en}
                    onChange={(e) => set("app_name_en", e.target.value)}
                    maxLength={200}
                    className={inputCls}
                  />
                  <ErrorList messages={errorFor(fieldErrors, "app_name_en")} />
                </label>
                <label className="flex min-w-0 flex-col gap-1">
                  <span className={`${labelCls} flex items-center justify-between`}>
                    <span>
                      الوصف المختصر <LangTag lang="EN" />
                    </span>
                    <span className="tabular-nums text-[10px] font-normal">
                      {form.short_description_en.length}/150
                    </span>
                  </span>
                  <textarea
                    dir="ltr"
                    rows={2}
                    value={form.short_description_en}
                    onChange={(e) => set("short_description_en", e.target.value)}
                    maxLength={150}
                    className={inputCls}
                  />
                  <ErrorList messages={errorFor(fieldErrors, "short_description_en")} />
                </label>
                <div className="flex min-w-0 flex-col gap-1">
                  <span className={labelCls}>
                    الوصف الكامل <LangTag lang="EN" />
                  </span>
                  <textarea
                    dir="ltr"
                    rows={6}
                    value={form.description_en}
                    onChange={(e) => set("description_en", e.target.value)}
                    className={inputCls}
                  />
                  <ErrorList messages={errorFor(fieldErrors, "description_en")} />
                  <MdPreviewToggle dir="ltr" value={form.description_en} />
                </div>
              </div>
              <div className="flex min-w-0 flex-col gap-3 border-t border-border/60 pt-4 md:border-t-0 md:border-s md:pt-0 md:ps-4">
                <label className="flex min-w-0 flex-col gap-1">
                  <span className={labelCls}>
                    الاسم <LangTag lang="AR" />
                  </span>
                  <input
                    value={form.app_name_ar}
                    onChange={(e) => set("app_name_ar", e.target.value)}
                    maxLength={200}
                    className={inputCls}
                  />
                  <ErrorList messages={errorFor(fieldErrors, "app_name_ar")} />
                </label>
                <label className="flex min-w-0 flex-col gap-1">
                  <span className={`${labelCls} flex items-center justify-between`}>
                    <span>
                      الوصف المختصر <LangTag lang="AR" />
                    </span>
                    <span className="tabular-nums text-[10px] font-normal">
                      {form.short_description_ar.length}/150
                    </span>
                  </span>
                  <textarea
                    rows={2}
                    value={form.short_description_ar}
                    onChange={(e) => set("short_description_ar", e.target.value)}
                    maxLength={150}
                    className={inputCls}
                  />
                  <ErrorList messages={errorFor(fieldErrors, "short_description_ar")} />
                </label>
                <div className="flex min-w-0 flex-col gap-1">
                  <span className={labelCls}>
                    الوصف الكامل <LangTag lang="AR" />
                  </span>
                  <textarea
                    rows={6}
                    value={form.description_ar}
                    onChange={(e) => set("description_ar", e.target.value)}
                    className={inputCls}
                  />
                  <ErrorList messages={errorFor(fieldErrors, "description_ar")} />
                  <MdPreviewToggle dir="rtl" value={form.description_ar} />
                </div>
              </div>
            </div>
            <label className="mt-4 flex min-w-0 flex-col gap-1 border-t border-border/60 pt-4">
              <span className={`${labelCls} flex items-center justify-between`}>
                <span>ملاحظات إضافية</span>
                <span className="tabular-nums text-[10px] font-normal">
                  {form.additional_notes.length}/2000
                </span>
              </span>
              <textarea
                rows={3}
                value={form.additional_notes}
                onChange={(e) => set("additional_notes", e.target.value)}
                maxLength={2000}
                className={inputCls}
              />
              <ErrorList messages={errorFor(fieldErrors, "additional_notes")} />
            </label>
          </section>

          {/* Store links */}
          <section className="rounded-app border border-border/70 bg-surface/30 p-4">
            <SectionHeader
              icon={<Store aria-hidden className="size-4" />}
              title="روابط المتاجر"
              hint="يمكن مسح كل الروابط عمدًا — لا يلزم رابط واحد هنا"
              tone="stores"
            />
            <div className="grid min-w-0 gap-3 md:grid-cols-2">
              <StoreUrlField
                label="Google Play"
                hint="رابط play.google.com"
                icon={<GooglePlayMark className="size-4" />}
                value={form.google_play_link}
                onChange={(v) => set("google_play_link", v)}
              />
              <StoreUrlField
                label="App Store"
                hint="رابط apps.apple.com"
                icon={<AppleMark className="size-4" />}
                value={form.app_store_link}
                onChange={(v) => set("app_store_link", v)}
              />
              <StoreUrlField
                label="AppGallery"
                hint="رابط consumer.huawei.com"
                icon={<HuaweiMark className="size-4" />}
                value={form.app_gallery_link}
                onChange={(v) => set("app_gallery_link", v)}
              />
              <StoreUrlField
                label="الموقع الإلكتروني"
                hint="رابط موقع الويب"
                icon={<WebMark className="size-4" />}
                value={form.website_link}
                onChange={(v) => set("website_link", v)}
              />
            </div>
            <div className="mt-3 border-t border-border/60 pt-3">
              <ErrorList
                messages={errorFor(
                  fieldErrors,
                  "google_play_link",
                  "app_store_link",
                  "app_gallery_link",
                  "website_link",
                )}
              />
            </div>
          </section>

          {/* Categories */}
          <section className="rounded-app border border-border/70 bg-surface/30 p-4">
            <SectionHeader
              icon={<Tags aria-hidden className="size-4" />}
              title="الفئات"
              hint="اختر كل الفئات المناسبة"
              tone="cats"
              action={
                <span className="rounded-full bg-surface px-2 py-0.5 text-[11px] font-bold tabular-nums text-text-secondary ring-1 ring-border/60">
                  {form.categories.length} مختارة
                </span>
              }
            />
            <div className="flex flex-wrap gap-2">
              {categories.length === 0 && (
                <p className="text-sm text-text-secondary">لا توجد فئات</p>
              )}
              {categories.map((c) => {
                const checked = form.categories.includes(c.id);
                return (
                  <label key={c.id} className={checkChipCls(checked)}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => toggleCategory(c.id, e.target.checked)}
                      className="sr-only"
                    />
                    {c.nameAr || c.nameEn}
                    {!c.isActive && (
                      <span className="text-[11px] opacity-80">(غير مفعلة)</span>
                    )}
                  </label>
                );
              })}
            </div>
            <div className="mt-3 border-t border-border/60 pt-3">
              <ErrorList messages={errorFor(fieldErrors, "categories")} />
            </div>
          </section>

          {/* Developer */}
          <section className="rounded-app border border-border/70 bg-surface/30 p-4">
            <SectionHeader
              icon={<Building2 aria-hidden className="size-4" />}
              title="بيانات المطور"
              hint="المعلومات المُقدمة عن المطوّر"
              tone="meta"
            />
            <div className="grid gap-4 md:grid-cols-2">
              <label className="flex min-w-0 flex-col gap-1">
                <span className={labelCls}>
                  اسم المطور <LangTag lang="EN" />
                </span>
                <input
                  dir="ltr"
                  value={form.developer_name_en}
                  onChange={(e) => set("developer_name_en", e.target.value)}
                  maxLength={200}
                  className={inputCls}
                />
                <ErrorList messages={errorFor(fieldErrors, "developer_name_en")} />
              </label>
              <label className="flex min-w-0 flex-col gap-1">
                <span className={labelCls}>
                  اسم المطور <LangTag lang="AR" />
                </span>
                <input
                  value={form.developer_name_ar}
                  onChange={(e) => set("developer_name_ar", e.target.value)}
                  maxLength={200}
                  className={inputCls}
                />
                <ErrorList messages={errorFor(fieldErrors, "developer_name_ar")} />
              </label>
              <label className="flex min-w-0 flex-col gap-1">
                <span className={labelCls}>الموقع الإلكتروني</span>
                <input
                  type="url"
                  dir="ltr"
                  value={form.developer_website}
                  onChange={(e) => set("developer_website", e.target.value)}
                  placeholder="https://…"
                  className={inputCls}
                />
                <ErrorList messages={errorFor(fieldErrors, "developer_website")} />
              </label>
              <label className="flex min-w-0 flex-col gap-1">
                <span className={labelCls}>البريد الإلكتروني</span>
                <input
                  type="email"
                  dir="ltr"
                  value={form.developer_email}
                  onChange={(e) => set("developer_email", e.target.value)}
                  maxLength={200}
                  className={inputCls}
                />
                <ErrorList messages={errorFor(fieldErrors, "developer_email")} />
              </label>
            </div>
            <div className="mt-3 border-t border-border/60 pt-3">
              <label className={checkChipCls(form.is_developer)}>
                <input
                  type="checkbox"
                  checked={form.is_developer}
                  onChange={(e) => set("is_developer", e.target.checked)}
                  className="sr-only"
                />
                مقدم الطلب مطوّر
              </label>
            </div>
          </section>

          {/* Media */}
          <section className="rounded-app border border-border/70 bg-surface/30 p-4">
            <SectionHeader
              icon={<ImagePlus aria-hidden className="size-4" />}
              title="الوسائط"
              hint="الأيقونة والصور الرئيسية ولقطات الشاشة"
              tone="media"
            />
            <div className="grid min-w-0 gap-3 sm:grid-cols-3">
              <UrlUploadField
                label="أيقونة التطبيق"
                value={form.app_icon_url}
                onChange={(url) => set("app_icon_url", url)}
                kind="icon"
                imgAlt="أيقونة التطبيق"
                error={errorFor(fieldErrors, "app_icon_url")[0]}
              />
              <UrlUploadField
                label="الصورة الرئيسية"
                lang="EN"
                value={form.main_image_en}
                onChange={(url) => set("main_image_en", url)}
                kind="main"
                imgAlt="الصورة الرئيسية (EN)"
                error={errorFor(fieldErrors, "main_image_en")[0]}
              />
              <UrlUploadField
                label="الصورة الرئيسية"
                lang="AR"
                value={form.main_image_ar}
                onChange={(url) => set("main_image_ar", url)}
                kind="main"
                imgAlt="الصورة الرئيسية (AR)"
                error={errorFor(fieldErrors, "main_image_ar")[0]}
              />
            </div>
            <div className="mt-3 flex flex-col gap-3">
              <ScreenshotsEditor
                title="لقطات الشاشة"
                lang="EN"
                urls={form.screenshots_en}
                onChange={(urls) => set("screenshots_en", urls)}
              />
              <ScreenshotsEditor
                title="لقطات الشاشة"
                lang="AR"
                urls={form.screenshots_ar}
                onChange={(urls) => set("screenshots_ar", urls)}
              />
              <ErrorList
                messages={errorFor(
                  fieldErrors,
                  "screenshots_en",
                  "screenshots_ar",
                )}
              />
            </div>
          </section>

          {/* Footer */}
          <div className="sticky bottom-0 flex flex-wrap items-center gap-3 rounded-app border border-border bg-card/95 p-3 shadow-app backdrop-blur">
            <button
              type="submit"
              disabled={busy}
              className={`${btnPrimary} inline-flex items-center gap-1.5`}
            >
              {busy ? (
                "جارٍ الحفظ…"
              ) : (
                <>
                  <Check aria-hidden className="size-4" />
                  حفظ التعديلات
                </>
              )}
            </button>
            {topError && <span className="text-sm text-red-600">{topError}</span>}
            {!topError && (
              <span className="text-xs text-text-secondary">
                يُسجَّل كل حفظ في سجل حالات الطلب.
              </span>
            )}
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
