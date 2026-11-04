"use client";

import { useRef, useState } from "react";
import type { ReactNode } from "react";
import { UploadCloud } from "lucide-react";

/**
 * Shared admin image upload plumbing.
 *
 * `uploadImageFile` POSTs FormData {file, kind} to /upload over XHR (progress
 * via callback) and resolves the resulting URL — the single transport used by
 * both the button picker and the drag-and-drop zones.
 *
 * `ImageDropZone` wraps arbitrary children with drop-zone affordance: dashed
 * ring + Arabic overlay while a file hovers, image/* filtering, multi-file
 * sequential upload, inline errors. Self-contained (busy state internal), so
 * each image section renders its own drop surface without extra wiring.
 */
export type UploadKind = "icon" | "main" | "screenshot";
export type UploadProgress = (percent: number) => void;

export function uploadImageFile(
  file: File,
  kind: UploadKind,
  onProgress?: UploadProgress,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("kind", kind);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/upload");
    xhr.upload.onprogress = (ev) => {
      if (ev.lengthComputable && ev.total > 0) onProgress?.(Math.round((ev.loaded / ev.total) * 100));
    };
    xhr.onload = () => {
      try {
        const data = JSON.parse(xhr.responseText) as { ok?: boolean; url?: string; message?: string };
        if (xhr.status === 200 && data.ok && data.url) resolve(data.url);
        else reject(new Error(data.message || "فشل الرفع"));
      } catch {
        reject(new Error("فشل الرفع"));
      }
    };
    xhr.onerror = () => reject(new Error("فشل الرفع"));
    xhr.send(fd);
  });
}

function isImage(file: File): boolean {
  return file.type.startsWith("image/");
}

export function ImageDropZone({
  kind,
  onUploaded,
  disabled = false,
  overlayLabel = "أفلت الصورة للرفع",
  className = "",
  children,
}: {
  kind: UploadKind;
  onUploaded: (url: string) => void;
  disabled?: boolean;
  overlayLabel?: string;
  className?: string;
  children: ReactNode;
}) {
  const [dragover, setDragover] = useState(false);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const dragDepth = useRef(0);

  async function drop(e: React.DragEvent) {
    e.preventDefault();
    dragDepth.current = 0;
    setDragover(false);
    if (disabled || busy) return;

    const files = Array.from(e.dataTransfer.files).filter(isImage);
    if (files.length === 0) {
      setError("ملفات الصور فقط");
      return;
    }
    setError(null);
    setBusy(true);
    try {
      for (let i = 0; i < files.length; i++) {
        setProgress(0);
        const url = await uploadImageFile(files[i]!, kind, setProgress);
        onUploaded(url);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل الرفع");
    } finally {
      setBusy(false);
    }
  }

  const overlayVisible = dragover || busy;

  return (
    <div
      className={`relative transition-shadow ${className}`}
      onDragEnter={(e) => {
        e.preventDefault();
        dragDepth.current += 1;
        if (!disabled && !busy) setDragover(true);
      }}
      onDragOver={(e) => e.preventDefault()}
      onDragLeave={(e) => {
        e.preventDefault();
        dragDepth.current = Math.max(0, dragDepth.current - 1);
        if (dragDepth.current === 0) setDragover(false);
      }}
      onDrop={drop}
      aria-disabled={disabled}
    >
      {overlayVisible && (
        <span
          className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center gap-1 rounded-[inherit] bg-card/60 text-xs font-bold text-text backdrop-blur-[2px] outline-2 outline-dashed outline-offset-[-3px] outline-primary"
          role="status"
        >
          <UploadCloud aria-hidden className="size-5" />
          <span>{busy ? `جارٍ الرفع… ${progress}%` : overlayLabel}</span>
        </span>
      )}
      {children}
      {error && (
        <span className="block text-xs font-normal text-red-600" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}
