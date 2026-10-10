"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveApp, deleteApp } from "@/lib/actions/admin-apps";
import {
  MetadataTypeControl,
  ScreenshotsEditor,
  UrlUploadField,
  btnPrimary,
  inputCls,
  labelCls,
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
};

const PLATFORMS: { value: string; label: string }[] = [
  { value: "android", label: "أندرويد" },
  { value: "ios", label: "آي أو إس" },
  { value: "web", label: "ويب" },
  { value: "cross_platform", label: "متعدد المنصات" },
];

const STATUSES: { value: string; label: string }[] = [
  { value: "draft", label: "مسودة" },
  { value: "published", label: "منشور" },
  { value: "archived", label: "مؤرشف" },
];

const sectionCls = "rounded-app bg-card p-4 shadow-app";
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
  const [developerId, setDeveloperId] = useState<number>(initialDeveloper(developers, initial));
  const [platform, setPlatform] = useState(initial.platform);
  const [status, setStatus] = useState(initial.status);
  const [featured, setFeatured] = useState(initial.featured);
  const [sortOrder, setSortOrder] = useState(String(initial.sortOrder));
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

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
      <section className={sectionCls}>
        <h2 className="mb-3 text-sm font-bold text-text-secondary">الأساسيات</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-1">
            <span className={labelCls}>الاسم (EN) *</span>
            <input value={f.nameEn} onChange={(e) => field("nameEn")(e.target.value)} className={inputCls} dir="ltr" required maxLength={200} />
            <ErrorList messages={errorFor(serverErrors, "nameEn", "app_name_en")} />
          </label>
          <label className="flex flex-col gap-1">
            <span className={labelCls}>الاسم (AR) *</span>
            <input value={f.nameAr} onChange={(e) => field("nameAr")(e.target.value)} className={inputCls} required maxLength={200} />
            <ErrorList messages={errorFor(serverErrors, "nameAr", "app_name_ar")} />
          </label>
          <label className="flex flex-col gap-1">
            <span className={labelCls}>الوصف المختصر (EN) *</span>
            <textarea rows={2} value={f.shortDescriptionEn} onChange={(e) => field("shortDescriptionEn")(e.target.value)} className={inputCls} dir="ltr" maxLength={500} required />
            <ErrorList messages={errorFor(serverErrors, "shortDescriptionEn")} />
          </label>
          <label className="flex flex-col gap-1">
            <span className={labelCls}>الوصف المختصر (AR) *</span>
            <textarea rows={2} value={f.shortDescriptionAr} onChange={(e) => field("shortDescriptionAr")(e.target.value)} className={inputCls} maxLength={500} required />
            <ErrorList messages={errorFor(serverErrors, "shortDescriptionAr")} />
          </label>
          <label className="flex flex-col gap-1">
            <span className={labelCls}>الوصف الكامل (EN) *</span>
            <textarea rows={6} value={f.descriptionEn} onChange={(e) => field("descriptionEn")(e.target.value)} className={inputCls} dir="ltr" required />
            <ErrorList messages={errorFor(serverErrors, "descriptionEn")} />
          </label>
          <label className="flex flex-col gap-1">
            <span className={labelCls}>الوصف الكامل (AR) *</span>
            <textarea rows={6} value={f.descriptionAr} onChange={(e) => field("descriptionAr")(e.target.value)} className={inputCls} required />
            <ErrorList messages={errorFor(serverErrors, "descriptionAr")} />
          </label>
        </div>
        {mode === "edit" && (
          <label className="mt-4 flex flex-col gap-1">
            <span className={labelCls}>الرابط (slug) — يُترك فارغًا لإعادة التوليد عند تغيير الاسم</span>
            <input
              type="text"
              dir="ltr"
              value={slugOverride}
              placeholder={initial.slug || "…"}
              onChange={(e) => setSlugOverride(e.target.value)}
              className={inputCls}
            />
            <ErrorList messages={errorFor(serverErrors, "slug")} />
          </label>
        )}
      </section>

      <section className={sectionCls}>
        <h2 className="mb-3 text-sm font-bold text-text-secondary">الصور الأساسية</h2>
        <div className="flex flex-col gap-4">
          <UrlUploadField
            label="أيقونة التطبيق *"
            kind="icon"
            value={applicationIcon}
            onChange={setApplicationIcon}
            imgAlt="أيقونة التطبيق"
            error={errorFor(serverErrors, "applicationIcon")[0]}
          />
          <div className="grid gap-4 md:grid-cols-2">
            <UrlUploadField
              label="الصورة الرئيسية (EN) *"
              kind="main"
              value={mainImageEn}
              onChange={setMainImageEn}
              imgAlt="الصورة الرئيسية (EN)"
              error={errorFor(serverErrors, "mainImageEn")[0]}
            />
            <UrlUploadField
              label="الصورة الرئيسية (AR) *"
              kind="main"
              value={mainImageAr}
              onChange={setMainImageAr}
              imgAlt="الصورة الرئيسية (AR)"
              error={errorFor(serverErrors, "mainImageAr")[0]}
            />
          </div>
          <ScreenshotsEditor title="لقطات الشاشة (EN)" urls={screenshotsEn} onChange={setScreenshotsEn} onError={setScreenshotsError} />
          <ErrorList messages={errorFor(serverErrors, "screenshotsEn")} />
          <ScreenshotsEditor title="لقطات الشاشة (AR)" urls={screenshotsAr} onChange={setScreenshotsAr} onError={setScreenshotsError} />
          <ErrorList messages={errorFor(serverErrors, "screenshotsAr")} />
          {screenshotsError && <ErrorList messages={[screenshotsError]} />}
        </div>
      </section>

      <section className={sectionCls}>
        <h2 className="mb-3 text-sm font-bold text-text-secondary">روابط المتاجر *</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {(
            [
              ["googlePlayLink", "Google Play"],
              ["appStoreLink", "App Store"],
              ["appGalleryLink", "AppGallery"],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="flex flex-col gap-1">
              <span className={labelCls}>{label}</span>
              <input type="url" dir="ltr" value={f[key]} onChange={(e) => field(key)(e.target.value)} className={inputCls} />
            </label>
          ))}
        </div>
        <ErrorList messages={errorFor(serverErrors, "googlePlayLink", "appStoreLink", "appGalleryLink")} />
        <p className="mt-1 text-xs text-text-secondary">يلزم إدخال رابط واحد على الأقل.</p>
      </section>

      <section className={sectionCls}>
        <h2 className="mb-3 text-sm font-bold text-text-secondary">الفئات</h2>
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          {categories.length === 0 && <p className="text-sm text-text-secondary">لا توجد فئات</p>}
          {categories.map((c) => {
            const checked = categoryIds.includes(c.id);
            return (
              <label key={c.id} className={`flex items-center gap-1.5 text-sm ${c.isActive ? "text-text" : "text-text-secondary"}`}>
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) => toggleCategory(c.id, e.target.checked)}
                  className="size-4 cursor-pointer"
                />
                {c.nameAr || c.nameEn}
                {!c.isActive && <span className="text-xs">(غير مفعلة)</span>}
              </label>
            );
          })}
        </div>
        <ErrorList messages={errorFor(serverErrors, "categoryIds")} />
      </section>

      <section className={sectionCls}>
        <h2 className="mb-3 text-sm font-bold text-text-secondary">البيانات الوصفية</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {metadataTypes.map((t) => (
            <MetadataTypeControl
              key={t.id}
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
            />
          ))}
        </div>
        <ErrorList messages={errorFor(serverErrors, "metadata")} />
      </section>

      <section className={sectionCls}>
        <h2 className="mb-3 text-sm font-bold text-text-secondary">المطور والحالة</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <label className="flex flex-col gap-1">
            <span className={labelCls}>المطور *</span>
            <select value={developerId} onChange={(e) => setDeveloperId(Number(e.target.value))} className={inputCls}>
              {developers.length === 0 && <option value={0}>لا يوجد مطورون</option>}
              {developers.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.nameEn} {d.nameAr ? `— ${d.nameAr}` : ""}
                </option>
              ))}
            </select>
            <ErrorList messages={errorFor(serverErrors, "developerId")} />
          </label>
          <label className="flex flex-col gap-1">
            <span className={labelCls}>المنصة</span>
            <select value={platform} onChange={(e) => setPlatform(e.target.value)} className={inputCls}>
              {PLATFORMS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
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
          <label className="flex flex-col gap-1">
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
          <label className="flex items-center gap-2 self-end text-sm text-text">
            <input type="checkbox" checked={featured} onChange={(e) => setFeatured(e.target.checked)} className="size-4 cursor-pointer" />
            تطبيق مميز
          </label>
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={busy} className={btnPrimary}>
          {busy ? "جارٍ الحفظ…" : mode === "create" ? "إنشاء التطبيق" : "حفظ التعديلات"}
        </button>
        {saved && <span className="text-sm font-medium text-green-600">تم حفظ التطبيق بنجاح.</span>}
        {topError && <span className="text-sm text-red-600">{topError}</span>}
      </div>
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
          className="rounded-app border border-red-300 bg-red-50 px-4 py-2 text-sm font-bold text-red-600 transition hover:bg-red-100 disabled:opacity-50"
        >
          {busy ? "جارٍ الحذف…" : "حذف التطبيق"}
        </button>
        {error && <span className="text-sm text-red-600">{error}</span>}
      </div>
    </form>
  );
}
