"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";

type ActionResult = { ok: boolean; message?: string };

export const confirmBtnCls =
  "rounded-app border border-red-300 bg-red-50 px-3 py-1.5 text-xs font-bold text-red-600 transition hover:bg-red-100 disabled:opacity-50";

/** Client island for delete flows: window.confirm (binding warning message), then run, then refresh or surface failure. */
export default function ConfirmSubmit({
  confirmMessage,
  label,
  action,
  className = confirmBtnCls,
  redirectTo,
}: {
  confirmMessage: string;
  label: string;
  action: () => Promise<ActionResult>;
  className?: string;
  /** When provided, navigate here on success instead of refreshing in place. */
  redirectTo?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    if (!window.confirm(confirmMessage)) return;
    setBusy(true);
    setError(null);
    try {
      const res = await action();
      if (res.ok) {
        // redirectTo follows a destructive action (e.g. hub deleted its own
        // type): a full load guarantees fresh page + layout (the sidebar
        // submenu is layout data). Client push() reuses the cached layout and
        // races refresh(), repainting stale payloads over the target URL.
        if (redirectTo) window.location.href = redirectTo;
        else router.refresh();
      } else setError(res.message ?? "تعذر تنفيذ الإجراء.");
    } catch {
      setError("حدث خطأ غير متوقع. حاول مرة أخرى.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      className="inline-flex flex-col"
      onSubmit={(e) => {
        e.preventDefault();
        void run();
      }}
    >
      <button type="submit" disabled={busy} className={`inline-flex items-center gap-1.5 ${className}`}>
        {busy ? "…" : <Trash2 aria-hidden className="size-3.5" />}
        {busy ? null : label}
      </button>
      {error && (
        <span className="text-xs text-red-600" role="alert">
          {error}
        </span>
      )}
    </form>
  );
}
