"use client";

import { useRef, useState } from "react";

/**
 * Upload island for the admin app form: label wraps a hidden file input;
 * onchange POSTs FormData {file, kind} to /upload via XHR (progress shown);
 * the resulting URL is handed to the form through onUploaded. Reusable for
 * icon / main / screenshot kinds — the form treats uploaded values as plain
 * URL strings, so a route-fulfilled fake also works.
 */
export default function UploadButton({
  kind,
  onUploaded,
  label = "رفع صورة",
  className = "",
}: {
  kind: "icon" | "main" | "screenshot";
  onUploaded?: (url: string) => void;
  label?: string;
  className?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const input = e.target;
    const file = input.files?.[0];
    input.value = ""; // allow re-picking the same file
    if (!file) return;
    setError(null);
    setBusy(true);
    setProgress(0);

    const fd = new FormData();
    fd.append("file", file);
    fd.append("kind", kind);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/upload");
    xhr.upload.onprogress = (ev) => {
      if (ev.lengthComputable && ev.total > 0) {
        setProgress(Math.round((ev.loaded / ev.total) * 100));
      }
    };
    xhr.onload = () => {
      setBusy(false);
      try {
        const data = JSON.parse(xhr.responseText) as { ok?: boolean; url?: string; message?: string };
        if (xhr.status === 200 && data.ok && data.url) {
          onUploaded?.(data.url);
        } else {
          setError(data.message || "فشل الرفع");
        }
      } catch {
        setError("فشل الرفع");
      }
    };
    xhr.onerror = () => {
      setBusy(false);
      setError("فشل الرفع");
    };
    xhr.send(fd);
  }

  return (
    <div className="inline-flex flex-col gap-1">
      <label
        className={`inline-flex cursor-pointer items-center gap-2 rounded-app border border-border bg-surface px-3 py-1.5 text-xs transition hover:bg-primary/10 ${
          busy ? "opacity-50" : ""
        } ${className}`}
      >
        <span>{busy ? `جارٍ الرفع… ${progress}%` : label}</span>
        <input
          ref={inputRef}
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
