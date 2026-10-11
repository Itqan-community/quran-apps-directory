"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { saveCategory, saveDeveloper } from "@/lib/actions/admin-taxonomy";
import { btnGhost, btnPrimary, inputCls, labelCls } from "@/components/admin/app-form-sections";

const sectionCls = "rounded-app bg-card p-4 shadow-app";
type ServerErrors = Record<string, string[]>;

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

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

export type CategoryInitial = {
  id: number | null;
  nameEn: string;
  nameAr: string;
  slug: string;
  descriptionEn: string;
  descriptionAr: string;
  icon: string;
  color: string;
  sortOrder: number;
  isActive: boolean;
};

export const CATEGORY_CREATE_DEFAULT: CategoryInitial = {
  id: null,
  nameEn: "",
  nameAr: "",
  slug: "",
  descriptionEn: "",
  descriptionAr: "",
  icon: "",
  color: "",
  sortOrder: 0,
  isActive: true,
};

/** Add/edit form for one category (prefilled by the [id] edit page). */
export function CategoryForm({ editing }: { editing: CategoryInitial | null }) {
  const router = useRouter();
  const initial = editing ?? CATEGORY_CREATE_DEFAULT;
  const [f, setF] = useState(() => ({
    nameEn: initial.nameEn,
    nameAr: initial.nameAr,
    slug: initial.slug,
    descriptionEn: initial.descriptionEn,
    descriptionAr: initial.descriptionAr,
    icon: initial.icon,
    color: initial.color,
  }));
  const [sortOrder, setSortOrder] = useState(String(initial.sortOrder));
  const [isActive, setIsActive] = useState(initial.isActive);
  const [busy, setBusy] = useState(false);
  const [topError, setTopError] = useState<string | null>(null);
  const [serverErrors, setServerErrors] = useState<ServerErrors>({});

  const field = (key: keyof typeof f) => (v: string) => setF((cur) => ({ ...cur, [key]: v }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setTopError(null);
    setServerErrors({});

    const payload: Record<string, unknown> = {
      ...f,
      sortOrder: Number.parseInt(sortOrder, 10) || 0,
      isActive,
    };
    if (initial.id) payload.id = initial.id;

    try {
      const res = await saveCategory(payload);
      if (res.ok) {
        router.push("/admin/categories");
        router.refresh();
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
        <h2 className="mb-3 text-sm font-bold text-text-secondary">
          {editing ? "تعديل فئة" : "إضافة فئة"}
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-1">
            <span className={labelCls}>الاسم (EN) *</span>
            <input
              value={f.nameEn}
              onChange={(e) => field("nameEn")(e.target.value)}
              className={inputCls}
              dir="ltr"
              required
              maxLength={200}
            />
            <ErrorList messages={errorFor(serverErrors, "nameEn")} />
          </label>
          <label className="flex flex-col gap-1">
            <span className={labelCls}>الاسم (AR) *</span>
            <input
              value={f.nameAr}
              onChange={(e) => field("nameAr")(e.target.value)}
              className={inputCls}
              required
              maxLength={200}
            />
            <ErrorList messages={errorFor(serverErrors, "nameAr")} />
          </label>
          <label className="flex flex-col gap-1">
            <span className={labelCls}>الرابط (slug)</span>
            <input
              value={f.slug}
              onChange={(e) => field("slug")(e.target.value)}
              className={inputCls}
              dir="ltr"
              maxLength={200}
              placeholder="يُولَّد من الاسم الإنجليزي إذا تُرك فارغًا"
            />
            <ErrorList messages={errorFor(serverErrors, "slug")} />
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
          <label className="flex flex-col gap-1">
            <span className={labelCls}>الأيقونة (اختياري)</span>
            <input
              value={f.icon}
              onChange={(e) => field("icon")(e.target.value)}
              className={inputCls}
              maxLength={200}
              placeholder="اسم أيقونة أو إيموجي"
            />
            <ErrorList messages={errorFor(serverErrors, "icon")} />
          </label>
          <label className="flex flex-col gap-1">
            <span className={labelCls}>اللون (اختياري)</span>
            <input
              value={f.color}
              onChange={(e) => field("color")(e.target.value)}
              className={inputCls}
              dir="ltr"
              maxLength={50}
              placeholder="#RRGGBB"
            />
            <ErrorList messages={errorFor(serverErrors, "color")} />
          </label>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-1">
            <span className={labelCls}>الوصف (EN)</span>
            <textarea
              rows={3}
              value={f.descriptionEn}
              onChange={(e) => field("descriptionEn")(e.target.value)}
              className={inputCls}
              dir="ltr"
            />
            <ErrorList messages={errorFor(serverErrors, "descriptionEn")} />
          </label>
          <label className="flex flex-col gap-1">
            <span className={labelCls}>الوصف (AR)</span>
            <textarea
              rows={3}
              value={f.descriptionAr}
              onChange={(e) => field("descriptionAr")(e.target.value)}
              className={inputCls}
            />
            <ErrorList messages={errorFor(serverErrors, "descriptionAr")} />
          </label>
        </div>
        <label className="mt-4 flex items-center gap-2 text-sm text-text">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="size-4 cursor-pointer"
          />
          فئة مفعّلة (تظهر على الموقع)
        </label>
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={busy} className={btnPrimary}>
          {busy ? "جارٍ الحفظ…" : editing ? "حفظ التعديلات" : "إضافة الفئة"}
        </button>
        {topError && <span className="text-sm text-red-600">{topError}</span>}
        {editing && (
          <Link href="/admin/categories" className="text-sm text-primary hover:underline">
            إلغاء التعديل
          </Link>
        )}
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Developers
// ---------------------------------------------------------------------------

export type DeveloperInitial = {
  id: number | null;
  nameEn: string;
  nameAr: string;
  website: string;
  email: string;
  logoUrl: string;
  descriptionEn: string;
  descriptionAr: string;
  socialUrls: string[];
  isVerified: boolean;
};

export const DEVELOPER_CREATE_DEFAULT: DeveloperInitial = {
  id: null,
  nameEn: "",
  nameAr: "",
  website: "",
  email: "",
  logoUrl: "",
  descriptionEn: "",
  descriptionAr: "",
  socialUrls: [],
  isVerified: false,
};

/** Add/edit form for one developer (prefilled by the [id] edit page). */
export function DeveloperForm({ editing }: { editing: DeveloperInitial | null }) {
  const router = useRouter();
  const initial = editing ?? DEVELOPER_CREATE_DEFAULT;
  const [f, setF] = useState(() => ({
    nameEn: initial.nameEn,
    nameAr: initial.nameAr,
    website: initial.website,
    email: initial.email,
    logoUrl: initial.logoUrl,
    descriptionEn: initial.descriptionEn,
    descriptionAr: initial.descriptionAr,
  }));
  const [socialUrls, setSocialUrls] = useState<string[]>(initial.socialUrls);
  const [isVerified, setIsVerified] = useState(initial.isVerified);
  const [busy, setBusy] = useState(false);
  const [topError, setTopError] = useState<string | null>(null);
  const [serverErrors, setServerErrors] = useState<ServerErrors>({});

  const field = (key: keyof typeof f) => (v: string) => setF((cur) => ({ ...cur, [key]: v }));

  function setSocialUrlAt(i: number, url: string) {
    setSocialUrls((cur) => cur.map((u, idx) => (idx === i ? url : u)));
  }

  function removeSocialUrlAt(i: number) {
    setSocialUrls((cur) => cur.filter((_, idx) => idx !== i));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setTopError(null);
    setServerErrors({});

    const payload: Record<string, unknown> = {
      ...f,
      // Blank rows are dropped here; the action normalizes rows into the record column.
      socialLinks: socialUrls.map((url) => ({ url: url.trim() })).filter((r) => r.url.length > 0),
      isVerified,
    };
    if (initial.id) payload.id = initial.id;

    try {
      const res = await saveDeveloper(payload);
      if (res.ok) {
        router.push("/admin/developers");
        router.refresh();
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
        <h2 className="mb-3 text-sm font-bold text-text-secondary">
          {editing ? "تعديل مطوّر" : "إضافة مطوّر"}
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-1">
            <span className={labelCls}>الاسم (EN) *</span>
            <input
              value={f.nameEn}
              onChange={(e) => field("nameEn")(e.target.value)}
              className={inputCls}
              dir="ltr"
              required
              maxLength={200}
            />
            <ErrorList messages={errorFor(serverErrors, "nameEn")} />
          </label>
          <label className="flex flex-col gap-1">
            <span className={labelCls}>الاسم (AR) *</span>
            <input
              value={f.nameAr}
              onChange={(e) => field("nameAr")(e.target.value)}
              className={inputCls}
              required
              maxLength={200}
            />
            <ErrorList messages={errorFor(serverErrors, "nameAr")} />
          </label>
          <label className="flex flex-col gap-1">
            <span className={labelCls}>الموقع (اختياري)</span>
            <input
              type="url"
              value={f.website}
              onChange={(e) => field("website")(e.target.value)}
              className={inputCls}
              dir="ltr"
            />
            <ErrorList messages={errorFor(serverErrors, "website")} />
          </label>
          <label className="flex flex-col gap-1">
            <span className={labelCls}>البريد الإلكتروني (اختياري)</span>
            <input
              type="email"
              value={f.email}
              onChange={(e) => field("email")(e.target.value)}
              className={inputCls}
              dir="ltr"
            />
            <ErrorList messages={errorFor(serverErrors, "email")} />
          </label>
          <label className="flex flex-col gap-1">
            <span className={labelCls}>رابط الشعار (اختياري)</span>
            <input
              type="url"
              value={f.logoUrl}
              onChange={(e) => field("logoUrl")(e.target.value)}
              className={inputCls}
              dir="ltr"
            />
            <ErrorList messages={errorFor(serverErrors, "logoUrl")} />
          </label>
          <label className="flex items-center gap-2 self-end text-sm text-text">
            <input
              type="checkbox"
              checked={isVerified}
              onChange={(e) => setIsVerified(e.target.checked)}
              className="size-4 cursor-pointer"
            />
            مطوّر موثّق
          </label>
          <label className="flex flex-col gap-1 md:col-span-2">
            <span className={labelCls}>الوصف (EN)</span>
            <textarea
              rows={3}
              value={f.descriptionEn}
              onChange={(e) => field("descriptionEn")(e.target.value)}
              className={inputCls}
              dir="ltr"
            />
            <ErrorList messages={errorFor(serverErrors, "descriptionEn")} />
          </label>
          <label className="flex flex-col gap-1 md:col-span-2">
            <span className={labelCls}>الوصف (AR)</span>
            <textarea
              rows={3}
              value={f.descriptionAr}
              onChange={(e) => field("descriptionAr")(e.target.value)}
              className={inputCls}
            />
            <ErrorList messages={errorFor(serverErrors, "descriptionAr")} />
          </label>
        </div>

        <div className="mt-4 flex flex-col gap-2">
          <span className={labelCls}>روابط التواصل الاجتماعي</span>
          {socialUrls.length === 0 && (
            <p className="text-xs text-text-secondary">لا توجد روابط بعد.</p>
          )}
          {socialUrls.map((url, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                value={url}
                onChange={(e) => setSocialUrlAt(i, e.target.value)}
                className={inputCls}
                dir="ltr"
                placeholder="https://…"
              />
              <button
                type="button"
                onClick={() => removeSocialUrlAt(i)}
                disabled={busy}
                aria-label="إزالة الرابط"
                className="shrink-0 rounded-app border border-red-300 px-2.5 py-1.5 text-xs text-red-600 transition hover:bg-red-50 disabled:opacity-50"
              >
                إزالة
              </button>
            </div>
          ))}
          <div>
            <button type="button" onClick={() => setSocialUrls((cur) => [...cur, ""])} disabled={busy} className={btnGhost}>
              + إضافة رابط
            </button>
          </div>
          <ErrorList messages={errorFor(serverErrors, "socialLinks")} />
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={busy} className={btnPrimary}>
          {busy ? "جارٍ الحفظ…" : editing ? "حفظ التعديلات" : "إضافة المطوّر"}
        </button>
        {topError && <span className="text-sm text-red-600">{topError}</span>}
        {editing && (
          <Link href="/admin/developers" className="text-sm text-primary hover:underline">
            إلغاء التعديل
          </Link>
        )}
      </div>
    </form>
  );
}
