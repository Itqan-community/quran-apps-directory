"use client";

import { createContext, useContext, useState } from "react";
import { useRouter } from "next/navigation";
import { bulkSetApps } from "@/lib/actions/admin-apps";

type SelectionState = {
  selected: Set<number>;
  toggle: (id: number) => void;
  clear: () => void;
};

const SelectionCtx = createContext<SelectionState | null>(null);

/** Shared selection for the apps table: server-rendered rows host the client checkboxes. */
export function BulkSelectionProvider({ children }: { children: React.ReactNode }) {
  const [selected, setSelected] = useState<Set<number>>(new Set());

  return (
    <SelectionCtx.Provider
      value={{
        selected,
        toggle: (id: number) =>
          setSelected((cur) => {
            const next = new Set(cur);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
          }),
        clear: () => setSelected(new Set()),
      }}
    >
      {children}
    </SelectionCtx.Provider>
  );
}

export function BulkCheckbox({ id }: { id: number }) {
  const ctx = useContext(SelectionCtx);
  if (!ctx) return null;

  return (
    <td className="px-3 py-2 align-middle">
      <input
        type="checkbox"
        aria-label={`تحديد صف ${id}`}
        checked={ctx.selected.has(id)}
        onChange={() => ctx.toggle(id)}
        className="size-4 cursor-pointer"
      />
    </td>
  );
}

const ACTIONS: { key: string; label: string; status: string; featured: boolean | null; cls: string }[] = [
  { key: "publish", label: "نشر", status: "published", featured: null, cls: "bg-green-600 hover:bg-green-700 text-white" },
  { key: "draft", label: "مسودة", status: "draft", featured: null, cls: "border border-border text-text hover:bg-primary/10" },
  { key: "archive", label: "أرشفة", status: "archived", featured: null, cls: "bg-amber-700 hover:bg-amber-800 text-white" },
  { key: "feature", label: "تمييز", status: "", featured: true, cls: "border border-border text-text hover:bg-primary/10" },
  { key: "unfeature", label: "إلغاء التمييز", status: "", featured: false, cls: "border border-border text-text hover:bg-primary/10" },
];

const btnCls = "rounded-app px-3 py-1.5 text-xs font-bold transition disabled:opacity-50";

/** Bulk island above the apps table: status + featured only (per the brief). */
export default function BulkBar() {
  const ctx = useContext(SelectionCtx);
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!ctx || ctx.selected.size === 0) return null;

  async function run(status: string, featured: boolean | null) {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await bulkSetApps([...ctx!.selected], status, featured);
      if (!res.ok) setError("تعذر تنفيذ الإجراء المجمع.");
      ctx!.clear();
      router.refresh();
    } catch {
      setError("حدث خطأ غير متوقع.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      role="toolbar"
      aria-label="إجراءات موحدة للتطبيقات المحددة"
      className="sticky top-2 z-10 flex flex-wrap items-center gap-2 rounded-app border border-border bg-card p-3 shadow-app"
    >
      <span className="text-xs font-bold text-text-secondary">
        {ctx.selected.size} تطبيق محدد:
      </span>
      {ACTIONS.map((a) => (
        <button
          key={a.key}
          type="button"
          disabled={busy}
          onClick={() => void run(a.status, a.featured)}
          className={`${btnCls} ${a.cls}`}
        >
          {a.label}
        </button>
      ))}
      <button type="button" disabled={busy} onClick={ctx.clear} className={`${btnCls} text-text-secondary`}>
        مسح التحديد
      </button>
      {busy && <span className="text-xs text-text-secondary">جارٍ التنفيذ…</span>}
      {error && <span className="text-sm text-red-600">{error}</span>}
    </div>
  );
}
