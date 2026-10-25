"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  Check,
  Database,
  FileText,
  ImagePlus,
  Plus,
  Settings2,
  Star,
  Store,
  Tags,
  Trash2,
} from "lucide-react";
import { AppleMark, GooglePlayMark, HuaweiMark } from "@/components/brand-marks";
import { saveApp, deleteApp } from "@/lib/actions/admin-apps";
import { DeveloperModal } from "@/components/admin/taxonomy-editor";
import {
  DeveloperCombobox,
  LangTag,
  MetadataTypeControl,
  PlatformPicker,
  ScreenshotsEditor,
  SectionHeader,
  StoreUrlField,
  UrlUploadField,
  btnPrimary,
  checkChipCls,
  inputCls,
  labelCls,
  toneBarCls,
  type FormMetadataType,
} from "@/components/admin/app-form-sections";

export type DeveloperOption = { id: number; nameEn: string; nameAr: string };
export type CategoryOption = { id: number; nameEn: string; nameAr: string; isActive: boolean };

export type AppFormInitial = {
  slug: string; // current slug as a hint (edit only)
  nameEn: string;
  nameAr: string;
  shortDescriptionEn: string;
  shortDescriptionAr: string;
  descriptionEn: string;
  descriptionAr: string;
  applicationIcon: string;
  mainImageEn: string;
  mainImageAr: string;
  googlePlayLink: string;
  appStoreLink: string;
  appGalleryLink: string;
  screenshotsEn: string[];
  screenshotsAr: string[];
  categoryIds: number[];
  metadataOptionIds: { typeId: number; optionIds: number[] }[];
  developerId: number;
  platform: string;
  status: string;
  featured: boolean;
  sortOrder: number;
  avgRating: string;
  reviewCount: number;
  viewCount: number;
};

export const CREATE_DEFAULT: AppFormInitial = {
  slug: "",
  nameEn: "",
  nameAr: "",
  shortDescriptionEn: "",
  shortDescriptionAr: "",
  descriptionEn: "",
  descriptionAr: "",
  applicationIcon: "",
  mainImageEn: "",
  mainImageAr: "",
  googlePlayLink: "",
  appStoreLink: "",
  appGalleryLink: "",
  screenshotsEn: [],
  screenshotsAr: [],
  categoryIds: [],
  metadataOptionIds: [],
  developerId: 0,
  platform: "cross_platform",
  status: "draft",
  featured: false,
  sortOrder: 0,
  avgRating: "0.00",
  reviewCount: 0,
  viewCount: 0,
};

const STATUSES: { value: string; label: string }[] = [
  { value: "draft", label: "مسودة" },
  { value: "published", label: "منشور" },
  { value: "archived", label: "مؤرشف" },
];

const sectionCls = "relative overflow-hidden rounded-app bg-card p-5 shadow-app md:p-6";
const countPillCls =
  "rounded-full bg-surface px-2 py-0.5 text-[11px] font-bold tabular-nums text-text-secondary ring-1 ring-border/60";
type ServerErrors = Record<string, string[]>;

/** Field errors under the matching input; the mirrored public-form keys land on the right name field. */
function errorFor(errors: ServerErrors, key: string, ...aliases: string[]): string[] {
  for (const k of [key, ...aliases]) {
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

export default function AppForm({
  mode,
  appId,
  developers,
  categories,
  metadataTypes,
  initial = CREATE_DEFAULT,
}: {
  mode: "create" | "edit";
  appId?: number;
  developers: DeveloperOption[];
  categories: CategoryOption[];
  metadataTypes: FormMetadataType[];
  initial?: AppFormInitial;
}) {
  const router = useRouter();
  const [f, setF] = useState({
    nameEn: initial.nameEn,
    nameAr: initial.nameAr,
    shortDescriptionEn: initial.shortDescriptionEn,
    shortDescriptionAr: initial.shortDescriptionAr,
    descriptionEn: initial.descriptionEn,
    descriptionAr: initial.descriptionAr,
    googlePlayLink: initial.googlePlayLink,
    appStoreLink: initial.appStoreLink,
    appGalleryLink: initial.appGalleryLink,
  });
  const [applicationIcon, setApplicationIcon] = useState(initial.applicationIcon);
  const [mainImageEn, setMainImageEn] = useState(initial.mainImageEn);
  const [mainImageAr, setMainImageAr] = useState(initial.mainImageAr);
  const [screenshotsEn, setScreenshotsEn] = useState<string[]>(initial.screenshotsEn);
  const [screenshotsAr, setScreenshotsAr] = useState<string[]>(initial.screenshotsAr);
  const [screenshotsError, setScreenshotsError] = useState<string | null>(null);
  const [categoryIds, setCategoryIds] = useState<number[]>(initial.categoryIds);
  const [metadata, setMetadata] = useState<Record<string, number[]>>(() => {
    const rec: Record<string, number[]> = {};
    for (const t of metadataTypes) {
      const fromApp = initial.metadataOptionIds.find((m) => m.typeId === t.id)?.optionIds ?? [];
      rec[String(t.id)] = t.isMultiSelect ? fromApp : fromApp.slice(0, 1);
    }
    return rec;
  });
  const [developerList, setDeveloperList] = useState<DeveloperOption[]>(developers);
  const [developerId, setDeveloperId] = useState<number>(initialDeveloper(developers, initial));
  const [developerModalOpen, setDeveloperModalOpen] = useState(false);
  const [platform, setPlatform] = useState(initial.platform);
  const [status, setStatus] = useState(initial.status);
  const [featured, setFeatured] = useState(initial.featured);
  const [sortOrder, setSortOrder] = useState(String(initial.sortOrder));
  const [avgRating, setAvgRating] = useState(String(initial.avgRating));
  const [reviewCount, setReviewCount] = useState(String(initial.reviewCount));
  const [viewCount, setViewCount] = useState(String(initial.viewCount));
  const [slugOverride, setSlugOverride] = useState("");

  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [topError, setTopError] = useState<string | null>(null);
  const [serverErrors, setServerErrors] = useState<ServerErrors>({});

  const field = (key: keyof typeof f) => (v: string) => setF((cur) => ({ ...cur, [key]: v }));

  function toggleCategory(id: number, checked: boolean) {
    setCategoryIds((cur) => (checked ? [...cur, id] : cur.filter((c) => c !== id)));
  }

  function setMetadataSelection(typeId: number, ids: number[]) {
    setMetadata((cur) => ({ ...cur, [String(typeId)]: ids }));
  }

  /** Single-select types enforce exactly 1 by construction here; empty selections are omitted. */
  function buildMetadata(): Record<string, number[]> {
    const out: Record<string, number[]> = {};
    for (const t of metadataTypes) {
      const ids = metadata[String(t.id)] ?? [];
      if (t.isMultiSelect) {
        if (ids.length > 0) out[String(t.id)] = ids;
      } else if (ids.length >= 1) {
        out[String(t.id)] = [ids[0]!];
      }
    }
    return out;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setSaved(false);
    setTopError(null);
    setServerErrors({});

    const payload: Record<string, unknown> = {
      ...f,
      applicationIcon: applicationIcon.trim(),
      mainImageEn: mainImageEn.trim(),
      mainImageAr: mainImageAr.trim(),
      screenshotsEn: screenshotsEn.map((s) => s.trim()).filter(Boolean),
      screenshotsAr: screenshotsAr.map((s) => s.trim()).filter(Boolean),
      categoryIds,
      metadata: buildMetadata(),
      developerId,
      platform,
      status,
      featured,
      sortOrder: Number.parseInt(sortOrder, 10) || 0,
      avgRating: Math.round((Number.parseFloat(avgRating) || 0) * 100) / 100,
      reviewCount: Number.parseInt(reviewCount, 10) || 0,
      viewCount: Number.parseInt(viewCount, 10) || 0,
    };
    if (mode === "edit" && appId) payload.id = appId;
    if (mode === "edit" && slugOverride.trim()) payload.slug = slugOverride.trim();

    try {
      const res = await saveApp(payload);
      if (res.ok) {
        if (mode === "edit") {
          setSaved(true);
          setSlugOverride("");
          router.refresh();
        } else {
          router.push(`/admin/apps/${res.id}`);
        }
      } else {
        setServerErrors(res.fieldErrors ?? {});
        setTopError(res.message ?? null);
      }
    } catch {
      setTopError("حدث خطأ غير متوقع. حاول مرة أخرى.");
    } finally {
      setBusy(false);
    }
  }

  const mediaCount =
    (applicationIcon.trim() ? 1 : 0) +
    (mainImageEn.trim() ? 1 : 0) +
    (mainImageAr.trim() ? 1 : 0) +
    screenshotsEn.filter((s) => s.trim()).length +
    screenshotsAr.filter((s) => s.trim()).length;
  const storeConnected = [f.googlePlayLink, f.appStoreLink, f.appGalleryLink].filter((u) =>
    /^https?:\/\//i.test(u.trim())
  ).length;
  const metadataSelected = metadataTypes.reduce(
    (n, t) => n + (metadata[String(t.id)] ?? []).length,
    0
  );

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
      <section className={sectionCls}>
        <span aria-hidden className={`absolute inset-x-0 top-0 h-1 ${toneBarCls.basics}`} />
        <SectionHeader
          icon={<FileText aria-hidden className="size-4" />}
          title="الأساسيات"
          hint="الاسم والأوصاف كما تظهر في الموقع بكلتا اللغتين"
          tone="basics"
        />
        <div className="flex flex-col divide-y divide-border/60">
          <div className="grid gap-4 pb-4 md:grid-cols-2">
            <label className="flex min-w-0 flex-col gap-1">
              <span className={labelCls}>
                الاسم <LangTag lang="EN" /> *
              </span>
              <input value={f.nameEn} onChange={(e) => field("nameEn")(e.target.value)} className={inputCls} dir="ltr" required maxLength={200} />
              <ErrorList messages={errorFor(serverErrors, "nameEn", "app_name_en")} />
            </label>
            <label className="flex min-w-0 flex-col gap-1">
              <span className={labelCls}>
                الاسم <LangTag lang="AR" /> *
              </span>
              <input value={f.nameAr} onChange={(e) => field("nameAr")(e.target.value)} className={inputCls} required maxLength={200} />
              <ErrorList messages={errorFor(serverErrors, "nameAr", "app_name_ar")} />
            </label>
          </div>
          <div className="grid gap-4 py-4 md:grid-cols-2">
            <label className="flex min-w-0 flex-col gap-1">
              <span className={labelCls}>
                الوصف المختصر <LangTag lang="EN" /> *
              </span>
              <textarea rows={2} value={f.shortDescriptionEn} onChange={(e) => field("shortDescriptionEn")(e.target.value)} className={inputCls} dir="ltr" maxLength={500} required />
              <ErrorList messages={errorFor(serverErrors, "shortDescriptionEn")} />
            </label>
            <label className="flex min-w-0 flex-col gap-1">
              <span className={labelCls}>
                الوصف المختصر <LangTag lang="AR" /> *
              </span>
              <textarea rows={2} value={f.shortDescriptionAr} onChange={(e) => field("shortDescriptionAr")(e.target.value)} className={inputCls} maxLength={500} required />
              <ErrorList messages={errorFor(serverErrors, "shortDescriptionAr")} />
            </label>
          </div>
          <div className="grid gap-4 pt-4 md:grid-cols-2">
            <label className="flex min-w-0 flex-col gap-1">
              <span className={labelCls}>
                الوصف الكامل <LangTag lang="EN" /> *
              </span>
              <textarea rows={6} value={f.descriptionEn} onChange={(e) => field("descriptionEn")(e.target.value)} className={inputCls} dir="ltr" required />
              <ErrorList messages={errorFor(serverErrors, "descriptionEn")} />
            </label>
            <label className="flex min-w-0 flex-col gap-1">
              <span className={labelCls}>
                الوصف الكامل <LangTag lang="AR" /> *
              </span>
              <textarea rows={6} value={f.descriptionAr} onChange={(e) => field("descriptionAr")(e.target.value)} className={inputCls} required />
              <ErrorList messages={errorFor(serverErrors, "descriptionAr")} />
            </label>
          </div>
        </div>
        {mode === "edit" && (
          <label className="mt-4 flex flex-col gap-1 border-t border-border/60 pt-4">
            <span className={labelCls}>الرابط (slug) — يُترك فارغًا لإعادة التوليد عند تغيير الاسم</span>
            <input
              type="text"
              dir="ltr"
              value={slugOverride}
              placeholder={initial.slug || "…"}
              onChange={(e) => setSlugOverride(e.target.value)}
              className={`${inputCls} font-mono text-xs`}
            />
            <ErrorList messages={errorFor(serverErrors, "slug")} />
          </label>
        )}
      </section>

      <section className={sectionCls}>
        <span aria-hidden className={`absolute inset-x-0 top-0 h-1 ${toneBarCls.media}`} />
        <SectionHeader
          icon={<ImagePlus aria-hidden className="size-4" />}
          title="الصور الأساسية"
          hint="المعاينة أولًا — الأيقونة والرئيسيتان بطاقات متجاورة، ثم لقطات كل لغة في لوحتها"
          tone="media"
          action={<span className={countPillCls}>{mediaCount} صورة</span>}
        />
        <div className="flex flex-col gap-4">
          <div className="grid min-w-0 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <UrlUploadField
              label="أيقونة التطبيق *"
              kind="icon"
              value={applicationIcon}
              onChange={setApplicationIcon}
              imgAlt="أيقونة التطبيق"
              error={errorFor(serverErrors, "applicationIcon")[0]}
            />
            <UrlUploadField
              label="الصورة الرئيسية *"
              lang="EN"
              kind="main"
              value={mainImageEn}
              onChange={setMainImageEn}
              imgAlt="الصورة الرئيسية (EN)"
              error={errorFor(serverErrors, "mainImageEn")[0]}
            />
            <UrlUploadField
              label="الصورة الرئيسية *"
              lang="AR"
              kind="main"
              value={mainImageAr}
              onChange={setMainImageAr}
              imgAlt="الصورة الرئيسية (AR)"
              error={errorFor(serverErrors, "mainImageAr")[0]}
            />
          </div>
          <hr className="border-border/60" />
          <div className="grid min-w-0 gap-4 xl:grid-cols-2">
            <ScreenshotsEditor title="لقطات الشاشة" lang="EN" urls={screenshotsEn} onChange={setScreenshotsEn} onError={setScreenshotsError} />
            <ScreenshotsEditor title="لقطات الشاشة" lang="AR" urls={screenshotsAr} onChange={setScreenshotsAr} onError={setScreenshotsError} />
          </div>
          <ErrorList messages={errorFor(serverErrors, "screenshotsEn")} />
          <ErrorList messages={errorFor(serverErrors, "screenshotsAr")} />
          {screenshotsError && <ErrorList messages={[screenshotsError]} />}
        </div>
      </section>

      <section className={sectionCls}>
        <span aria-hidden className={`absolute inset-x-0 top-0 h-1 ${toneBarCls.stores}`} />
        <SectionHeader
          icon={<Store aria-hidden className="size-4" />}
          title="المنصات والمتاجر"
          hint="المنصة تحدد أين يعمل التطبيق، والروابط تحدد من أين يُحمّل — اختر المنصة ثم الصق روابطها"
          tone="stores"
          action={<span className={countPillCls}>{storeConnected}/3 مرتبط</span>}
        />
        <div className="flex min-w-0 flex-col gap-2">
          <span className={labelCls}>المنصة</span>
          <PlatformPicker value={platform} onChange={setPlatform} />
        </div>
        <div className="mt-4 border-t border-border/60 pt-4">
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className={labelCls}>روابط المتاجر</span>
            {platform === "web" && (
              <span className="text-[11px] text-text-secondary">تطبيق ويب — يكفي رابط واحد للوصول إليه</span>
            )}
          </div>
          <div className="grid min-w-0 gap-3 md:grid-cols-3">
            <StoreUrlField
              label="Google Play"
              hint="رابط play.google.com"
              icon={<GooglePlayMark className="size-4" />}
              value={f.googlePlayLink}
              onChange={field("googlePlayLink")}
              suggested={platform === "android"}
              dimmed={platform === "ios"}
            />
            <StoreUrlField
              label="App Store"
              hint="رابط apps.apple.com"
              icon={<AppleMark className="size-4" />}
              value={f.appStoreLink}
              onChange={field("appStoreLink")}
              suggested={platform === "ios"}
              dimmed={platform === "android"}
            />
            <StoreUrlField
              label="AppGallery"
              hint="رابط consumer.huawei.com"
              icon={<HuaweiMark className="size-4" />}
              value={f.appGalleryLink}
              onChange={field("appGalleryLink")}
              dimmed={platform === "ios"}
            />
          </div>
        </div>
        <div className="mt-3 border-t border-border/60 pt-3">
          <ErrorList messages={errorFor(serverErrors, "googlePlayLink", "appStoreLink", "appGalleryLink")} />
          <p className="mt-1 text-xs text-text-secondary">يلزم إدخال رابط واحد على الأقل — تُعرض أزرار التحميل منه.</p>
        </div>
      </section>

      <section className={sectionCls}>
        <span aria-hidden className={`absolute inset-x-0 top-0 h-1 ${toneBarCls.cats}`} />
        <SectionHeader
          icon={<Tags aria-hidden className="size-4" />}
          title="الفئات"
          hint="اختر كل الفئات المناسبة — تظهر شاراتها على بطاقة التطبيق"
          tone="cats"
          action={<span className={countPillCls}>{categoryIds.length} مختارة</span>}
        />
        <div className="flex flex-wrap gap-2">
          {categories.length === 0 && <p className="text-sm text-text-secondary">لا توجد فئات</p>}
          {categories.map((c) => {
            const checked = categoryIds.includes(c.id);
            return (
              <label key={c.id} className={checkChipCls(checked)}>
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) => toggleCategory(c.id, e.target.checked)}
                  className="sr-only"
                />
                {c.nameAr || c.nameEn}
                {!c.isActive && <span className="text-[11px] opacity-80">(غير مفعلة)</span>}
              </label>
            );
          })}
        </div>
        <div className="mt-3 border-t border-border/60 pt-3">
          <ErrorList messages={errorFor(serverErrors, "categoryIds")} />
        </div>
      </section>

      <section className={sectionCls}>
        <span aria-hidden className={`absolute inset-x-0 top-0 h-1 ${toneBarCls.meta}`} />
        <SectionHeader
          icon={<Database aria-hidden className="size-4" />}
          title="البيانات الوصفية"
          hint="كل نوع في بطاقته — النوع الأحادي اختيار واحد، والمتعدد شارات بعدّاد"
          tone="meta"
          action={<span className={countPillCls}>{metadataSelected} محددة</span>}
        />
        {metadataTypes.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border px-3 py-6 text-center text-sm text-text-secondary">
            لا توجد أنواع بيانات بعد.
          </p>
        ) : (
          <div className="flex min-w-0 flex-col gap-3">
            {metadataTypes.map((t) => (
              <div key={t.id} className="min-w-0">
                <MetadataTypeControl
                  type={t}
                  selected={metadata[String(t.id)] ?? []}
                  onSelect={(id) => setMetadataSelection(t.id, id === null ? [] : [id])}
                  onToggle={(id, checked) => {
                    const cur = metadata[String(t.id)] ?? [];
                    setMetadataSelection(
                      t.id,
                      checked ? [...cur, id] : cur.filter((o) => o !== id)
                    );
                  }}
                  onClear={() => setMetadataSelection(t.id, [])}
                />
              </div>
            ))}
          </div>
        )}
        <div className="mt-3 border-t border-border/60 pt-3">
          <ErrorList messages={errorFor(serverErrors, "metadata")} />
        </div>
      </section>

      <section className={sectionCls}>
        <span aria-hidden className={`absolute inset-x-0 top-0 h-1 ${toneBarCls.cats}`} />
        <SectionHeader
          icon={<Star aria-hidden className="size-4" />}
          title="التقييم والإحصائيات"
          hint="تظهر على البطاقة وصفحة التطبيق وتؤثر على الترتيب الذكي"
          tone="cats"
        />
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="flex min-w-0 flex-col gap-1">
            <span className={labelCls}>متوسط التقييم (0 – 5)</span>
            <input
              type="number"
              min={0}
              max={5}
              step={0.01}
              dir="ltr"
              value={avgRating}
              onChange={(e) => setAvgRating(e.target.value)}
              className={inputCls}
            />
            <ErrorList messages={errorFor(serverErrors, "avgRating")} />
          </label>
          <label className="flex min-w-0 flex-col gap-1">
            <span className={labelCls}>عدد المراجعات</span>
            <input
              type="number"
              min={0}
              step={1}
              dir="ltr"
              value={reviewCount}
              onChange={(e) => setReviewCount(e.target.value)}
              className={inputCls}
            />
            <ErrorList messages={errorFor(serverErrors, "reviewCount")} />
          </label>
          <label className="flex min-w-0 flex-col gap-1">
            <span className={labelCls}>عدد المشاهدات</span>
            <input
              type="number"
              min={0}
              step={1}
              dir="ltr"
              value={viewCount}
              onChange={(e) => setViewCount(e.target.value)}
              className={inputCls}
            />
            <ErrorList messages={errorFor(serverErrors, "viewCount")} />
          </label>
        </div>
      </section>

      <section className={sectionCls}>
        <span aria-hidden className={`absolute inset-x-0 top-0 h-1 ${toneBarCls.status}`} />
        <SectionHeader
          icon={<Settings2 aria-hidden className="size-4" />}
          title="المطور والحالة"
          hint="النشر والتمييز والترتيب — مسودة حتى المراجعة"
          tone="status"
        />
        <div className="flex min-w-0 flex-col gap-4">
          <div className="flex min-w-0 flex-col gap-1">
            <span className={labelCls}>المطور *</span>
            <DeveloperCombobox
              developers={developerList}
              value={developerId}
              onChange={setDeveloperId}
              onCreateClick={() => setDeveloperModalOpen(true)}
            />
            <ErrorList messages={errorFor(serverErrors, "developerId")} />
          </div>
          <div className="grid gap-4 border-t border-border/60 pt-4 sm:grid-cols-2">
            <label className="flex min-w-0 flex-col gap-1">
              <span className={labelCls}>الحالة</span>
              <select value={status} onChange={(e) => setStatus(e.target.value)} className={inputCls}>
                {STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
              <ErrorList messages={errorFor(serverErrors, "status")} />
            </label>
            <label className="flex min-w-0 flex-col gap-1">
              <span className={labelCls}>ترتيب العرض</span>
              <input
                type="number"
                min={0}
                step={1}
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                className={inputCls}
              />
              <ErrorList messages={errorFor(serverErrors, "sortOrder")} />
            </label>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-4">
          <label
            className={`flex cursor-pointer items-center gap-2 rounded-app border px-3 py-2 text-sm transition ${
              featured
                ? "border-amber-400 bg-amber-50 font-bold text-amber-700 dark:bg-amber-400/10 dark:text-amber-300"
                : "border-border bg-surface text-text hover:border-amber-400/60"
            }`}
          >
            <input type="checkbox" checked={featured} onChange={(e) => setFeatured(e.target.checked)} className="sr-only" />
            <Star aria-hidden className={`size-4 ${featured ? "fill-amber-400 text-amber-400" : "text-text-secondary"}`} />
            تطبيق مميز
          </label>
          <span className="text-xs text-text-secondary">المميز يظهر بشارة أعلى البطاقة.</span>
        </div>
      </section>

      <div className="sticky bottom-4 z-10 flex flex-wrap items-center gap-3 rounded-app border border-border bg-card/95 p-3 shadow-app backdrop-blur">
        <button type="submit" disabled={busy} className={`${btnPrimary} inline-flex items-center gap-1.5`}>
          {busy ? (
            "جارٍ الحفظ…"
          ) : mode === "create" ? (
            <>
              <Plus aria-hidden className="size-4" />
              إنشاء التطبيق
            </>
          ) : (
            <>
              <Check aria-hidden className="size-4" />
              حفظ التعديلات
            </>
          )}
        </button>
        {saved && (
          <span className="inline-flex items-center gap-1 text-sm font-medium text-green-600">
            <Check aria-hidden className="size-4" />
            تم حفظ التطبيق بنجاح.
          </span>
        )}
        {topError && <span className="text-sm text-red-600">{topError}</span>}
        {!saved && !topError && (
          <span className="text-xs text-text-secondary">
            {mode === "create" ? "املأ الحقول الإلزامية ثم أنشئ التطبيق" : "التعديلات غير محفوظة بعد"}
          </span>
        )}
      </div>
      {/* Portal: a <form> cannot be nested inside the app form. */}
      {developerModalOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <DeveloperModal
            open={developerModalOpen}
            onClose={() => setDeveloperModalOpen(false)}
            onSaved={(id, developer) => {
              if (!id || !developer) return;
              setDeveloperList((cur) =>
                cur.some((d) => d.id === id)
                  ? cur
                  : [...cur, { id, ...developer }].sort((a, b) => a.nameEn.localeCompare(b.nameEn))
              );
              setDeveloperId(id);
            }}
          />,
          document.body
        )}
    </form>
  );
}

function initialDeveloper(developers: DeveloperOption[], initial: AppFormInitial): number {
  if (initial.developerId) return initial.developerId;
  return developers.length > 0 ? developers[0]!.id : 0;
}

/** Danger zone for the edit page: confirm + delete → back to the apps list. */
export function DeleteAppButton({ appId, appName }: { appId: number; appName: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!window.confirm(`سيتم حذف التطبيق "${appName}" نهائيًا مع فئاته ولقطاته وبياناته الوصفية. هل تريد المتابعة؟`)) return;
        void (async () => {
          setBusy(true);
          setError(null);
          try {
            const res = await deleteApp(appId);
            if (res.ok) router.push("/admin/apps");
            else setError(res.message ?? "تعذر حذف التطبيق.");
          } catch {
            setError("حدث خطأ غير متوقع.");
          } finally {
            setBusy(false);
          }
        })();
      }}
    >
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-app border border-red-300 bg-red-50 px-4 py-2 text-sm font-bold text-red-600 transition hover:bg-red-100 disabled:opacity-50"
        >
          {busy ? "جارٍ الحذف…" : <Trash2 aria-hidden className="size-4" />}
          {busy ? null : "حذف التطبيق"}
        </button>
        {error && <span className="text-sm text-red-600">{error}</span>}
      </div>
    </form>
  );
}
