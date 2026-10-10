"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { saveMetadataType, saveMetadataOption, deleteMetadataType, deleteMetadataOption } from "@/lib/actions/admin-metadata";
import ConfirmSubmit from "@/components/admin/confirm-submit";
import { btnGhost, btnPrimary, inputCls, labelCls } from "@/components/admin/app-form-sections";
import type { AdminMetadataOptionRow, AdminMetadataTypeWithAllOptions } from "@/lib/repo/admin";

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

/** Add/edit form for one metadata type (prefilled when the page resolves ?edit=<id>). */
export function MetadataTypeForm({ editing }: { editing: MetadataTypeInitial | null }) {
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
        <button type="submit" disabled={busy} className={btnPrimary}>
          {busy ? "جارٍ الحفظ…" : editing ? "حفظ التعديلات" : "إضافة النوع"}
        </button>
        {saved && <span className="text-sm font-medium text-green-600">تم حفظ نوع البيانات بنجاح.</span>}
        {topError && <span className="text-sm text-red-600">{topError}</span>}
        {editing && (
          <Link href="/admin/metadata" className="text-sm text-primary hover:underline">
            إلغاء التعديل
          </Link>
        )}
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Metadata options (inline add/edit form within a type card)
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

function OptionForm({
  typeId,
  editing,
  onDone,
}: {
  typeId: number;
  editing: AdminMetadataOptionRow | null;
  onDone: () => void;
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
        router.refresh();
        if (editing) {
          onDone(); // back to add mode (the card remounts this form fresh)
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
        <button type="submit" disabled={busy} className={btnPrimary}>
          {busy ? "جارٍ الحفظ…" : editing ? "حفظ التعديلات" : "إضافة الخيار"}
        </button>
        {saved && <span className="text-sm font-medium text-green-600">تم حفظ الخيار بنجاح.</span>}
        {topError && <span className="text-sm text-red-600">{topError}</span>}
        {editing && (
          <button type="button" onClick={onDone} disabled={busy} className={btnGhost}>
            إلغاء التعديل
          </button>
        )}
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// One metadata type card: header + options table + inline option form
// ---------------------------------------------------------------------------

const TYPE_DELETE_CONFIRM_APPS =
  "سيتم حذف نوع البيانات نهائيًا مع جميع خياراته وارتباطات التطبيقات بها. هل تريد المتابعة؟";
const TYPE_DELETE_CONFIRM_EMPTY =
  "سيتم حذف نوع البيانات نهائيًا مع جميع خياراته. هل تريد المتابعة؟";
const OPT_DELETE_CONFIRM_APPS =
  "سيتم حذف الخيار نهائيًا مع ارتباطات التطبيقات به. هل تريد المتابعة؟";
const OPT_DELETE_CONFIRM_EMPTY = "سيتم حذف الخيار نهائيًا. هل تريد المتابعة؟";

const thCls = "px-3 py-2 text-start font-medium";

export function MetadataTypeCard({
  type,
  highlighted,
}: {
  type: AdminMetadataTypeWithAllOptions;
  highlighted?: boolean;
}) {
  const [editingOption, setEditingOption] = useState<AdminMetadataOptionRow | null>(null);
  const appsTotal = type.options.reduce((sum, o) => sum + o.appCount, 0);

  function clearEditing() {
    setEditingOption(null);
  }

  return (
    <section className={`rounded-app bg-card p-4 shadow-app ${highlighted ? "bg-primary/5" : ""}`}>
      <header className="flex flex-wrap items-center gap-2 border-b border-border pb-3">
        <h2 className="text-base font-bold text-text">{type.labelAr}</h2>
        <span className="text-xs text-text-secondary" dir="ltr">
          {type.labelEn}
        </span>
        <span className="font-mono text-xs text-text-secondary" dir="ltr">
          {type.name}
        </span>
        <span className="text-xs text-text-secondary">
          {type.isMultiSelect ? "اختيار متعدد" : "اختيار واحد"}
        </span>
        <span className={type.isActive ? "text-xs text-green-600" : "text-xs text-text-secondary"}>
          {type.isActive ? "مفعّل" : "موقوف"}
        </span>
        <div className="ms-auto flex items-center gap-2">
          <Link
            href={`/admin/metadata?edit=${type.id}`}
            aria-current={highlighted ? "true" : undefined}
            className="rounded-app border border-border bg-surface px-3 py-1.5 text-xs text-text transition hover:bg-primary/10"
          >
            تعديل النوع
          </Link>
          <ConfirmSubmit
            confirmMessage={appsTotal > 0 ? TYPE_DELETE_CONFIRM_APPS : TYPE_DELETE_CONFIRM_EMPTY}
            label="حذف النوع"
            action={() => deleteMetadataType(type.id)}
          />
        </div>
      </header>

      {type.options.length === 0 ? (
        <p className="py-4 text-center text-xs text-text-secondary">
          لا توجد خيارات بعد — أضف الخيار الأول من النموذج أدناه.
        </p>
      ) : (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-start text-sm">
            <thead>
              <tr className="border-b border-border text-xs text-text-secondary">
                <th className={thCls}>القيمة</th>
                <th className={thCls}>التسمية (EN)</th>
                <th className={thCls}>التسمية (AR)</th>
                <th className={thCls}>الاستخدام</th>
                <th className={thCls}>مفعلة</th>
                <th className={thCls}>الترتيب</th>
                <th className={thCls}>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {type.options.map((o) => (
                <tr
                  key={o.id}
                  className={`border-b border-border last:border-b-0 ${
                    o.id === editingOption?.id ? "bg-primary/5" : ""
                  }`}
                >
                  <td className="px-3 py-2 font-mono text-xs text-text" dir="ltr">
                    {o.value}
                  </td>
                  <td className="px-3 py-2 text-text" dir="ltr">
                    {o.labelEn}
                  </td>
                  <td className="px-3 py-2 text-text">{o.labelAr}</td>
                  <td className="px-3 py-2 text-text">
                    {o.appCount > 0 ? (
                      <span className="font-bold">
                        {o.appCount} تطبيقات
                      </span>
                    ) : (
                      <span className="text-text-secondary">0 تطبيقات</span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <span className={o.isActive ? "text-green-600" : "text-text-secondary"}>
                      {o.isActive ? "✓" : "—"}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-text">{o.sortOrder}</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setEditingOption(o)}
                        className="rounded-app border border-border bg-surface px-3 py-1.5 text-xs text-text transition hover:bg-primary/10"
                      >
                        تعديل
                      </button>
                      <ConfirmSubmit
                        confirmMessage={o.appCount > 0 ? OPT_DELETE_CONFIRM_APPS : OPT_DELETE_CONFIRM_EMPTY}
                        label="حذف"
                        action={() => deleteMetadataOption(o.id)}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-4 border-t border-border pt-4">
        {/* key: remount so a switched option re-reads its prefill */}
        <OptionForm
          key={editingOption?.id ?? "new"}
          typeId={type.id}
          editing={editingOption}
          onDone={clearEditing}
        />
      </div>
    </section>
  );
}
