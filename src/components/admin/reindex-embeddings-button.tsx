"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DatabaseZap } from "lucide-react";
import { reindexAllEmbeddingsAction } from "@/lib/actions/admin-apps";

/** Toolbar island: regenerate embeddings for all published apps (confirm-guarded, busy state). */
export default function ReindexEmbeddingsButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function run() {
    if (!window.confirm("إعادة توليد الترميزات؟")) return;
    setBusy(true);
    try {
      const report = await reindexAllEmbeddingsAction();
      router.refresh();
      alert(
        `اكتمل إعادة الترميز: ${report.embedded} تم ترميزه، ${report.skipped} بدون تغيير، ${report.failed} فاشل.`
      );
    } catch {
      alert("حدث خطأ غير متوقع أثناء إعادة الترميز.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      disabled={busy}
      onClick={() => void run()}
      className="inline-flex items-center gap-2 rounded-app border border-border bg-surface px-4 py-2 text-sm font-bold text-text transition hover:bg-primary/10 disabled:opacity-50"
    >
      <DatabaseZap className="size-4" />
      {busy ? "جارٍ إعادة الترميز…" : "إعادة توليد الترميزات"}
    </button>
  );
}
