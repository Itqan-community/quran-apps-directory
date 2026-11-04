"use client";

import { useState } from "react";
import { AppDescriptionMarkdown } from "@/components/apps/app-description-markdown";
import "@/components/admin/app-md.css";

/**
 * Collapsible markdown preview for an admin description field (Arabic-only
 * admin UI). Sits under the textarea — the textarea is never hidden.
 * `dir` is applied to the preview panel so English content renders LTR even
 * inside the RTL admin shell.
 */
export function MdPreviewToggle({ value, dir }: { value: string; dir: "ltr" | "rtl" }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="self-start rounded-full border border-border bg-surface px-2.5 py-0.5 text-[11px] font-medium text-text-secondary transition hover:border-primary hover:text-primary"
      >
        معاينة يظهر التنسيق
      </button>
      {open && (
        <div
          dir={dir}
          className="max-h-80 overflow-y-auto rounded-app border border-border bg-surface p-3 text-sm text-text"
        >
          <AppDescriptionMarkdown text={value} />
        </div>
      )}
    </>
  );
}
