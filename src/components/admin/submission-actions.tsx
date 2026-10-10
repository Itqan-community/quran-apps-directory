"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  approveSubmission,
  markUnderReview,
  rejectSubmission,
  requestInfo,
  saveAdminNotes,
  type ReviewResult,
} from "@/lib/actions/admin-submissions";

const CONFIRM_APPROVE = "سيتم إنشاء التطبيق ونشره في الدليل. هل تريد المتابعة؟";

type OkResult = Extract<ReviewResult, { ok: true }>;

function ErrorAlert({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <div
      role="alert"
      className="flex items-start justify-between gap-3 rounded-app border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700"
    >
      <span>{message}</span>
      <button
        type="button"
        onClick={onClose}
        aria-label="إغلاق التنبيه"
        className="shrink-0 font-bold leading-none text-red-700 hover:text-red-900"
      >
        ×
      </button>
    </div>
  );
}

const inputCls =
  "w-full rounded-app border border-border bg-surface px-3 py-2 text-sm text-text disabled:opacity-50";
const btnPrimary =
  "rounded-app bg-primary px-4 py-2 text-sm font-bold text-white transition hover:bg-primary-hover disabled:opacity-50";
const btnGhost =
  "rounded-app border border-border bg-surface px-3 py-1.5 text-sm text-text transition hover:bg-primary/10 disabled:opacity-50";

/** Sticky top action bar for one submission: buttons render per the CURRENT status
 * (old admin visibility rules); reject/info-request expand inline forms. */
export default function SubmissionActions({
  submissionId,
  status,
  hasCreatedApp,
}: {
  submissionId: number;
  status: string;
  hasCreatedApp: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openForm, setOpenForm] = useState<"reject" | "info" | null>(null);
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");

  // Old admin visibility rules (binding).
  const canApprove =
    ["pending", "under_review", "info_requested"].includes(status) && !hasCreatedApp;
  const canReject = status !== "approved" && status !== "rejected";
  const canRequestInfo = ["pending", "under_review"].includes(status);
  const canUnderReview = status === "pending";
  const anyButton = canApprove || canReject || canRequestInfo || canUnderReview;

  async function run(action: () => Promise<ReviewResult>, after?: (result: OkResult) => void) {
    setBusy(true);
    setError(null);
    try {
      const result = await action();
      if (result.ok) {
        setOpenForm(null);
        if (after) after(result);
        else router.refresh();
      } else {
        setError(result.message);
      }
    } catch {
      // Server actions reject only on unexpected failures (the domain errors come back as ReviewResult).
      setError("حدث خطأ غير متوقع. حاول مرة أخرى.");
    } finally {
      setBusy(false);
    }
  }

  function toggleForm(kind: "reject" | "info") {
    setError(null);
    setOpenForm((cur) => (cur === kind ? null : kind));
  }

  return (
    <div className="sticky top-2 z-10 rounded-app bg-card p-4 shadow-app">
      <div className="flex flex-wrap items-center gap-2">
        <span className="me-2 text-xs font-bold text-text-secondary">الإجراءات:</span>
        {canApprove && (
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              if (!window.confirm(CONFIRM_APPROVE)) return;
              void run(
                () => approveSubmission(submissionId),
                (result) => {
                  if (result.appId) router.push(`/admin/apps/${result.appId}`);
                  else router.refresh();
                }
              );
            }}
            className="rounded-app bg-green-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-green-700 disabled:opacity-50"
          >
            موافقة
          </button>
        )}
        {canUnderReview && (
          <button
            type="button"
            disabled={busy}
            onClick={() => void run(() => markUnderReview(submissionId))}
            className={btnGhost}
          >
            قيد المراجعة
          </button>
        )}
        {canRequestInfo && (
          <button
            type="button"
            disabled={busy}
            onClick={() => toggleForm("info")}
            aria-expanded={openForm === "info"}
            className={btnGhost}
          >
            طلب معلومات
          </button>
        )}
        {canReject && (
          <button
            type="button"
            disabled={busy}
            onClick={() => toggleForm("reject")}
            aria-expanded={openForm === "reject"}
            className="rounded-app border border-red-300 px-3 py-1.5 text-sm text-red-600 transition hover:bg-red-50 disabled:opacity-50"
          >
            رفض
          </button>
        )}
        {busy && <span className="text-xs text-text-secondary">جارٍ التنفيذ…</span>}
        {!anyButton && (
          <span className="text-xs text-text-secondary">
            لا توجد إجراءات متاحة في الحالة الحالية.
          </span>
        )}
      </div>

      {openForm === "reject" && (
        <form
          className="mt-3 flex flex-col gap-2 border-t border-border pt-3"
          onSubmit={(e) => {
            e.preventDefault();
            void run(() => rejectSubmission(submissionId, reason.trim()));
          }}
        >
          <label className="text-xs font-bold text-text-secondary" htmlFor="reject-reason">
            سبب الرفض (سيُرسل إلى مقدم الطلب)
          </label>
          <textarea
            id="reject-reason"
            required
            rows={4}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            disabled={busy}
            className={inputCls}
          />
          <div className="flex gap-2">
            <button type="submit" disabled={busy} className={btnPrimary}>
              تأكيد الرفض
            </button>
            <button type="button" disabled={busy} onClick={() => toggleForm("reject")} className={btnGhost}>
              إلغاء
            </button>
          </div>
        </form>
      )}

      {openForm === "info" && (
        <form
          className="mt-3 flex flex-col gap-2 border-t border-border pt-3"
          onSubmit={(e) => {
            e.preventDefault();
            void run(() => requestInfo(submissionId, message.trim()));
          }}
        >
          <label className="text-xs font-bold text-text-secondary" htmlFor="info-message">
            المعلومات المطلوبة (سيُرسل إلى مقدم الطلب)
          </label>
          <textarea
            id="info-message"
            required
            rows={4}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            disabled={busy}
            className={inputCls}
          />
          <div className="flex gap-2">
            <button type="submit" disabled={busy} className={btnPrimary}>
              إرسال طلب المعلومات
            </button>
            <button type="button" disabled={busy} onClick={() => toggleForm("info")} className={btnGhost}>
              إلغاء
            </button>
          </div>
        </form>
      )}

      {error && <div className="mt-3"><ErrorAlert message={error} onClose={() => setError(null)} /></div>}
    </div>
  );
}

/** Admin-only internal notes: textarea + save → saveAdminNotes, no log/email. */
export function AdminNotesEditor({
  submissionId,
  initialNotes,
}: {
  submissionId: number;
  initialNotes: string;
}) {
  const [notes, setNotes] = useState(initialNotes);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      const result = await saveAdminNotes(submissionId, notes);
      if (result.ok) setSaved(true);
      else setError(result.message);
    } catch {
      setError("حدث خطأ غير متوقع. حاول مرة أخرى.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="flex flex-col gap-2" onSubmit={(e) => void onSubmit(e)}>
      <label className="text-xs font-bold text-text-secondary" htmlFor="admin-notes">
        ملاحظات المشرف (داخلية، لا تُرسل لمقدم الطلب)
      </label>
      <textarea
        id="admin-notes"
        rows={4}
        value={notes}
        onChange={(e) => {
          setNotes(e.target.value);
          setSaved(false);
        }}
        disabled={busy}
        className={inputCls}
      />
      <div className="flex items-center gap-3">
        <button type="submit" disabled={busy} className={btnPrimary}>
          {busy ? "جارٍ الحفظ…" : "حفظ الملاحظات"}
        </button>
        {saved && <span className="text-sm font-medium text-green-600">تم حفظ الملاحظات بنجاح.</span>}
        {error && <span className="text-sm text-red-600">{error}</span>}
      </div>
    </form>
  );
}
