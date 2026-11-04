"use client";

import { useState } from "react";
import { UploadCloud } from "lucide-react";
import { uploadImageFile, type UploadKind } from "@/components/admin/image-upload";

/**
 * Upload island for the admin app form: label wraps a hidden file input;
 * onchange uploads via the shared `uploadImageFile` transport — the resulting
 * URL is handed to the form through onUploaded. Reusable for icon / main /
 * screenshot kinds — the form treats uploaded values as plain URL strings.
 * Drag & drop surface lives in `image-upload.tsx` (`ImageDropZone`), wired
 * around these same image sections.
 */
export default function UploadButton({
  kind,
  onUploaded,
  label = "رفع صورة",
  className = "",
}: {
  kind: UploadKind;
  onUploaded?: (url: string) => void;
  label?: string;
  className?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  async function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const input = e.target;
    const file = input.files?.[0];
    input.value = ""; // allow re-picking the same file
    if (!file) return;
    setError(null);
    setBusy(true);
    setProgress(0);
    try {
      const url = await uploadImageFile(file, kind, setProgress);
      onUploaded?.(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل الرفع");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="inline-flex flex-col gap-1">
      <label
        className={`inline-flex cursor-pointer items-center gap-2 rounded-app border border-border bg-surface px-3 py-1.5 text-xs transition hover:bg-primary/10 ${
          busy ? "opacity-50" : ""
        } ${className}`}
      >
        <UploadCloud aria-hidden className="size-3.5 text-text-secondary" />
        <span>{busy ? `جارٍ الرفع… ${progress}%` : label}</span>
        <input
          type="file"
          accept="image/*"
          className="hidden"
          disabled={busy}
          onChange={pick}
        />
      </label>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}
