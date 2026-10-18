"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Check, Pencil, Plus, Search, Settings2, X } from "lucide-react";
import { saveMetadataType, saveMetadataOption, deleteMetadataType } from "@/lib/actions/admin-metadata";
import ConfirmSubmit from "@/components/admin/confirm-submit";
import { btnGhost, btnPrimary, inputCls, labelCls } from "@/components/admin/app-form-sections";
import {
  StatusPill,
  adminBodyRow,
  adminCount,
  adminHeadRow,
  adminTable,
  adminTableWrap,
  adminTh,
} from "@/components/admin/ui";
import type { AdminMetadataOptionRow, MetadataTypeSummary } from "@/lib/repo/admin";

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
// Metadata types (add/edit form at the top of the page)
// ---------------------------------------------------------------------------

export type MetadataTypeInitial = {
  id: number | null;
  name: string;
  labelEn: string;
  labelAr: string;
  descriptionEn: string;
  descriptionAr: string;
  isMultiSelect: boolean;
  sortOrder: number;
  isActive: boolean;
  icon: string;
};

export const METADATA_TYPE_CREATE_DEFAULT: MetadataTypeInitial = {
  id: null,
  name: "",
  labelEn: "",
  labelAr: "",
  descriptionEn: "",
  descriptionAr: "",
  isMultiSelect: true,
  sortOrder: 0,
  isActive: true,
  icon: "",
};

/** Add/edit form for one metadata type (prefilled when editing). */
export function MetadataTypeForm({
  editing,
  onSaved,
}: {
  editing: MetadataTypeInitial | null;
  /** When provided (modal use), replaces the default post-save navigation. */
  onSaved?: (id?: number) => void;
}) {
  const router = useRouter();
  const initial = editing ?? METADATA_TYPE_CREATE_DEFAULT;
  const [f, setF] = useState(() => ({
    name: initial.name,
    labelEn: initial.labelEn,
    labelAr: initial.labelAr,
    descriptionEn: initial.descriptionEn,
    descriptionAr: initial.descriptionAr,
    icon: initial.icon,
  }));
  const [isMultiSelect, setIsMultiSelect] = useState(initial.isMultiSelect);
  const [isActive, setIsActive] = useState(initial.isActive);
  const [sortOrder, setSortOrder] = useState(String(initial.sortOrder));
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [topError, setTopError] = useState<string | null>(null);
  const [serverErrors, setServerErrors] = useState<ServerErrors>({});

  const field = (key: keyof typeof f) => (v: string) => setF((cur) => ({ ...cur, [key]: v }));

  function reset() {
    setF({ name: "", labelEn: "", labelAr: "", descriptionEn: "", descriptionAr: "", icon: "" });
    setIsMultiSelect(true);
    setIsActive(true);
    setSortOrder("0");
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
      isMultiSelect,
      isActive,
      sortOrder: Number.parseInt(sortOrder, 10) || 0,
    };
    if (initial.id) payload.id = initial.id;

    try {
      const res = await saveMetadataType(payload);
      if (res.ok) {
        if (onSaved) {
          onSaved(res.id);
          return;
        }
        if (editing) {
          router.push("/admin/metadata");
        } else {
          setSaved(true);
          reset();
          router.refresh();
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
        <h2 className="mb-3 text-sm font-bold text-text-secondary">
          {editing ? "تعديل نوع البيانات" : "إضافة نوع بيانات"}
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-1">
            <span className={labelCls}>الاسم التقني * (يُستخدم في الكود)</span>
            <input
              value={f.name}
              onChange={(e) => field("name")(e.target.value)}
              className={inputCls}
              dir="ltr"
              required
              maxLength={200}
            />
            <ErrorList messages={errorFor(serverErrors, "name")} />
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
            <span className={labelCls}>التسمية (EN) *</span>
            <input
              value={f.labelEn}
              onChange={(e) => field("labelEn")(e.target.value)}
              className={inputCls}
              dir="ltr"
              required
              maxLength={200}
            />
            <ErrorList messages={errorFor(serverErrors, "labelEn")} />
          </label>
          <label className="flex flex-col gap-1">
            <span className={labelCls}>التسمية (AR) *</span>
            <input
              value={f.labelAr}
              onChange={(e) => field("labelAr")(e.target.value)}
              className={inputCls}
              required
              maxLength={200}
            />
            <ErrorList messages={errorFor(serverErrors, "labelAr")} />
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
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-1">
            <span className={labelCls}>الوصف (EN)</span>
            <textarea
              rows={2}
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
              rows={2}
              value={f.descriptionAr}
              onChange={(e) => field("descriptionAr")(e.target.value)}
              className={inputCls}
            />
            <ErrorList messages={errorFor(serverErrors, "descriptionAr")} />
          </label>
        </div>
        <div className="mt-4 flex flex-wrap gap-6">
          <label className="flex items-center gap-2 text-sm text-text">
            <input
              type="checkbox"
              checked={isMultiSelect}
              onChange={(e) => setIsMultiSelect(e.target.checked)}
              className="size-4 cursor-pointer"
            />
            اختيار متعدد (غير مفعّل = اختيار واحد)
          </label>
          <label className="flex items-center gap-2 text-sm text-text">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="size-4 cursor-pointer"
            />
            نوع مفعّل (يظهر على الموقع)
          </label>
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={busy} className={`${btnPrimary} inline-flex items-center gap-1.5`}>
          {busy ? (
            "جارٍ الحفظ…"
          ) : editing ? (
            <>
              <Check aria-hidden className="size-4" />
              حفظ التعديلات
            </>
          ) : (
            <>
              <Plus aria-hidden className="size-4" />
              إضافة النوع
            </>
          )}
        </button>
        {saved && <span className="text-sm font-medium text-green-600">تم حفظ نوع البيانات بنجاح.</span>}
        {topError && <span className="text-sm text-red-600">{topError}</span>}
        {editing && !onSaved && (
          <Link href="/admin/metadata" className="text-sm text-primary hover:underline">
            إلغاء التعديل
          </Link>
        )}
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Shared add/edit modal for a metadata type (sidebar add + list/hub edit)
// ---------------------------------------------------------------------------

export function MetadataTypeModal({
  open,
  editing,
  onClose,
  onSaved,
}: {
  open: boolean;
  editing: MetadataTypeInitial | null;
  onClose: () => void;
  onSaved: (id?: number) => void;
}) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="admin-modal-backdrop fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={editing ? "تعديل نوع البيانات" : "إضافة نوع بيانات"}
        className="admin-modal-panel max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-app bg-card p-4 shadow-app"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-base font-bold text-text">
            {editing ? "تعديل نوع البيانات" : "إضافة نوع بيانات"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className={`${btnGhost} inline-flex items-center gap-1`}
            aria-label="إغلاق"
          >
            <X aria-hidden className="size-4" />
          </button>
        </div>
        {/* key: fresh state per open + per edited row */}
        <MetadataTypeForm
          key={editing?.id ?? "new"}
          editing={editing}
          onSaved={(id) => {
            onSaved(id);
            onClose();
          }}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Metadata options (standalone form for the option sub-pages)
// ---------------------------------------------------------------------------

type OptionFormState = {
  value: string;
  labelEn: string;
  labelAr: string;
  descriptionEn: string;
  descriptionAr: string;
  icon: string;
  color: string;
};

const OPTION_CREATE_DEFAULT: OptionFormState = {
  value: "",
  labelEn: "",
  labelAr: "",
  descriptionEn: "",
  descriptionAr: "",
  icon: "",
  color: "",
};

export function OptionForm({
  typeId,
  editing,
  onDone,
  onSaved,
}: {
  typeId: number;
  editing: AdminMetadataOptionRow | null;
  onDone?: () => void;
  /** When provided (sub-page use), replaces the default inline post-save behavior. */
  onSaved?: () => void;
}) {
  const router = useRouter();
  const [f, setF] = useState(() =>
    editing
      ? {
          value: editing.value,
          labelEn: editing.labelEn,
          labelAr: editing.labelAr,
          descriptionEn: editing.descriptionEn,
          descriptionAr: editing.descriptionAr,
          icon: editing.icon ?? "",
          color: editing.color ?? "",
        }
      : { ...OPTION_CREATE_DEFAULT }
  );
  const [isActive, setIsActive] = useState(editing ? editing.isActive : true);
  const [sortOrder, setSortOrder] = useState(String(editing ? editing.sortOrder : 0));
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [topError, setTopError] = useState<string | null>(null);
  const [serverErrors, setServerErrors] = useState<ServerErrors>({});

  const field = (key: keyof OptionFormState) => (v: string) => setF((cur) => ({ ...cur, [key]: v }));

  function reset() {
    setF({ ...OPTION_CREATE_DEFAULT });
    setIsActive(true);
    setSortOrder("0");
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
      isActive,
      sortOrder: Number.parseInt(sortOrder, 10) || 0,
    };
    if (editing) payload.id = editing.id;

    try {
      const res = await saveMetadataOption(typeId, payload);
      if (res.ok) {
        if (onSaved) {
          onSaved();
          return;
        }
        router.refresh();
        if (editing) {
          onDone?.(); // back to add mode (the card remounts this form fresh)
        } else {
          setSaved(true);
          reset();
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
    <form className="flex flex-col gap-3" onSubmit={handleSubmit}>
      <h3 className="text-sm font-bold text-text-secondary">{editing ? "تعديل الخيار" : "إضافة خيار"}</h3>
      <div className="grid gap-3 md:grid-cols-2">
        <label className="flex flex-col gap-1">
          <span className={labelCls}>القيمة *</span>
          <input
            value={f.value}
            onChange={(e) => field("value")(e.target.value)}
            className={inputCls}
            dir="ltr"
            required
            maxLength={200}
            placeholder="قيمة فريدة داخل النوع"
          />
          <ErrorList messages={errorFor(serverErrors, "value")} />
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
          <span className={labelCls}>التسمية (EN) *</span>
          <input
            value={f.labelEn}
            onChange={(e) => field("labelEn")(e.target.value)}
            className={inputCls}
            dir="ltr"
            required
            maxLength={200}
          />
          <ErrorList messages={errorFor(serverErrors, "labelEn")} />
        </label>
        <label className="flex flex-col gap-1">
          <span className={labelCls}>التسمية (AR) *</span>
          <input
            value={f.labelAr}
            onChange={(e) => field("labelAr")(e.target.value)}
            className={inputCls}
            required
            maxLength={200}
          />
          <ErrorList messages={errorFor(serverErrors, "labelAr")} />
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
          <span className={labelCls}>الوصف (EN)</span>
          <textarea
            rows={2}
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
            rows={2}
            value={f.descriptionAr}
            onChange={(e) => field("descriptionAr")(e.target.value)}
            className={inputCls}
          />
          <ErrorList messages={errorFor(serverErrors, "descriptionAr")} />
        </label>
      </div>
      <label className="flex items-center gap-2 text-sm text-text">
        <input
          type="checkbox"
          checked={isActive}
          onChange={(e) => setIsActive(e.target.checked)}
          className="size-4 cursor-pointer"
        />
        خيار مفعّل (يظهر على الموقع)
      </label>

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={busy} className={`${btnPrimary} inline-flex items-center gap-1.5`}>
          {busy ? (
            "جارٍ الحفظ…"
          ) : editing ? (
            <>
              <Check aria-hidden className="size-4" />
              حفظ التعديلات
            </>
          ) : (
            <>
              <Plus aria-hidden className="size-4" />
              إضافة الخيار
            </>
          )}
        </button>
        {saved && <span className="text-sm font-medium text-green-600">تم حفظ الخيار بنجاح.</span>}
        {topError && <span className="text-sm text-red-600">{topError}</span>}
        {editing && !onSaved && (
          <button type="button" onClick={onDone} disabled={busy} className={btnGhost}>
            إلغاء التعديل
          </button>
        )}
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Page islands: list / hub / option sub-pages (modal state lives here)
// ---------------------------------------------------------------------------

const TYPE_DELETE_CONFIRM_APPS =
  "سيتم حذف نوع البيانات نهائيًا مع جميع خياراته وارتباطات التطبيقات بها. هل تريد المتابعة؟";
const TYPE_DELETE_CONFIRM_EMPTY =
  "سيتم حذف نوع البيانات نهائيًا مع جميع خياراته. هل تريد المتابعة؟";

const rowActionCls =
  "inline-flex items-center gap-1.5 rounded-app border border-border bg-surface px-3 py-1.5 text-xs text-text transition hover:bg-primary/10";

/** Header button on the list page: opens the add-type modal, jumps to the new hub. */
export function AddMetadataTypeButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-app bg-primary px-4 py-2 text-sm font-bold text-white transition hover:bg-primary-hover"
      >
        <Plus aria-hidden className="size-4" />
        إضافة نوع بيانات
      </button>
      <MetadataTypeModal
        open={open}
        editing={null}
        onClose={() => setOpen(false)}
        onSaved={(id) => {
          router.refresh();
          if (id !== undefined) router.push(`/admin/metadata/${id}`);
        }}
      />
    </>
  );
}

/** Per-row actions on the list page: manage hub, edit in modal, delete in place. */
export function MetadataTypeRowActions({
  initial,
  appsTotal,
}: {
  initial: MetadataTypeInitial & { id: number };
  appsTotal: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <div className="flex items-center gap-2">
      <Link href={`/admin/metadata/${initial.id}`} className={rowActionCls}>
        <Settings2 aria-hidden className="size-3.5" />
        إدارة
      </Link>
      <button type="button" onClick={() => setOpen(true)} className={rowActionCls}>
        <Pencil aria-hidden className="size-3.5" />
        تعديل
      </button>
      <ConfirmSubmit
        confirmMessage={appsTotal > 0 ? TYPE_DELETE_CONFIRM_APPS : TYPE_DELETE_CONFIRM_EMPTY}
        label="حذف"
        action={() => deleteMetadataType(initial.id)}
      />
      <MetadataTypeModal
        open={open}
        editing={initial}
        onClose={() => setOpen(false)}
        onSaved={() => router.refresh()}
      />
    </div>
  );
}

function toRowInitial(t: MetadataTypeSummary): MetadataTypeInitial & { id: number } {
  return {
    id: t.id,
    name: t.name,
    labelEn: t.labelEn,
    labelAr: t.labelAr,
    descriptionEn: t.descriptionEn,
    descriptionAr: t.descriptionAr,
    isMultiSelect: t.isMultiSelect,
    sortOrder: t.sortOrder,
    isActive: t.isActive,
    icon: t.icon ?? "",
  };
}

/** List-page table with a search box filtering by either label or technical name. */
export function MetadataTypesTable({ types }: { types: MetadataTypeSummary[] }) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return types;
    return types.filter((t) =>
      `${t.labelAr} ${t.labelEn} ${t.name}`.toLowerCase().includes(q)
    );
  }, [types, query]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 rounded-app border border-border bg-card px-3 py-2 shadow-app transition focus-within:border-primary">
        <Search aria-hidden className="size-4 shrink-0 text-text-secondary" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="ابحث بالتسمية العربية أو الإنجليزية أو الاسم التقني…"
          aria-label="البحث في أنواع البيانات"
          className="w-full bg-transparent text-sm text-text outline-none placeholder:text-text-secondary"
        />
        {query && (
          <button
            type="button"
            aria-label="مسح البحث"
            onClick={() => setQuery("")}
            className="shrink-0 text-text-secondary hover:text-text"
          >
            <X aria-hidden className="size-3.5" />
          </button>
        )}
        <span className="shrink-0 rounded-full bg-surface px-2 py-0.5 text-[11px] font-bold tabular-nums text-text-secondary ring-1 ring-border/60">
          {filtered.length} من {types.length}
        </span>
      </div>
      {filtered.length === 0 ? (
        <p className="rounded-app border border-dashed border-border bg-card px-3 py-8 text-center text-sm text-text-secondary shadow-app">
          لا نتائج لـ «{query.trim()}» — جرّب تسمية أو اسمًا تقنيًا آخر.
        </p>
      ) : (
        <div className={adminTableWrap}>
          <table className={adminTable}>
            <thead>
              <tr className={adminHeadRow}>
                <th className={adminTh}>التسمية (AR)</th>
                <th className={adminTh}>التسمية (EN)</th>
                <th className={adminTh}>الاسم التقني</th>
                <th className={adminTh}>النوع</th>
                <th className={adminTh}>الخيارات</th>
                <th className={adminTh}>الاستخدام</th>
                <th className={adminTh}>الحالة</th>
                <th className={adminTh}>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => (
                <tr key={t.id} className={adminBodyRow}>
                  <td className="px-3 py-2 font-bold text-text">{t.labelAr}</td>
                  <td className="px-3 py-2 text-text" dir="ltr">
                    {t.labelEn}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs text-text-secondary" dir="ltr">
                    {t.name}
                  </td>
                  <td className="px-3 py-2 text-xs text-text-secondary">
                    {t.isMultiSelect ? "اختيار متعدد" : "اختيار واحد"}
                  </td>
                  <td className="px-3 py-2">
                    <span className={adminCount}>{t.optionsCount}</span>
                  </td>
                  <td className="px-3 py-2 text-text">
                    {t.appsTotal > 0 ? (
                      <span className="font-bold tabular-nums">{t.appsTotal} تطبيقات</span>
                    ) : (
                      <span className="text-text-secondary">0 تطبيقات</span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <StatusPill active={t.isActive} />
                  </td>
                  <td className="px-3 py-2">
                    <MetadataTypeRowActions initial={toRowInitial(t)} appsTotal={t.appsTotal} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-xs text-text-secondary">الإجمالي: {types.length}</p>
    </div>
  );
}

/** Hub header edit button: the type form lives only in this modal (option C). */
export function EditMetadataTypeButton({ initial }: { initial: MetadataTypeInitial }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={rowActionCls}>
        <Pencil aria-hidden className="size-3.5" />
        تعديل النوع
      </button>
      <MetadataTypeModal
        open={open}
        editing={initial}
        onClose={() => setOpen(false)}
        onSaved={() => router.refresh()}
      />
    </>
  );
}

/** Option sub-page body: standalone form, back to the hub on save. */
export function OptionFormPage({
  typeId,
  editing,
}: {
  typeId: number;
  editing: AdminMetadataOptionRow | null;
}) {
  const router = useRouter();
  return (
    <OptionForm
      typeId={typeId}
      editing={editing}
      onSaved={() => router.push(`/admin/metadata/${typeId}`)}
    />
  );
}
