"use client";

import UploadButton from "@/components/admin/upload-button";

export const inputCls =
  "w-full rounded-app border border-border bg-surface px-3 py-2 text-sm text-text disabled:opacity-50";
export const labelCls = "text-xs font-bold text-text-secondary";
export const btnPrimary =
  "rounded-app bg-primary px-5 py-2 text-sm font-bold text-white transition hover:bg-primary-hover disabled:opacity-50";
export const btnGhost =
  "rounded-app border border-border bg-surface px-3 py-1.5 text-sm text-text transition hover:bg-primary/10 disabled:opacity-50";

export type FormMetadataType = {
  id: number;
  labelEn: string;
  labelAr: string;
  isMultiSelect: boolean;
  options: { id: number; value: string; labelEn: string; labelAr: string }[];
};

/** Text URL input + an upload island — the form treats uploaded values as plain URL strings. */
export function UrlUploadField({
  label,
  value,
  onChange,
  kind,
  error,
  imgAlt,
}: {
  label: string;
  value: string;
  onChange: (url: string) => void;
  kind: "icon" | "main";
  error?: string;
  imgAlt: string;
}) {
  return (
    <div className="flex gap-3">
      <div className="flex shrink-0 flex-col gap-1">
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={value}
            alt={imgAlt}
            className={`rounded border border-border object-cover ${kind === "icon" ? "size-12" : "h-20 w-28"}`}
          />
        ) : (
          <div
            className={`rounded border border-dashed border-border bg-surface ${kind === "icon" ? "size-12" : "h-20 w-28"}`}
          />
        )}
        <UploadButton kind={kind} onUploaded={(url) => onChange(url)} className="text-xs" />
      </div>
      <div className="flex-1">
        <label className={labelCls}>
          {label}
          <input
            type="url"
            dir="ltr"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className={`mt-1 ${inputCls}`}
          />
          {error && <span className="mt-1 block font-normal text-red-600">{error}</span>}
        </label>
      </div>
    </div>
  );
}

/** Per-language screenshot list: order = list order; rows carry text inputs + upload + remove + reorder. */
export function ScreenshotsEditor({
  title,
  urls,
  onChange,
  onError,
  max = 10,
}: {
  title: string;
  urls: string[];
  onChange: (urls: string[]) => void;
  onError?: (message: string | null) => void;
  max?: number;
}) {
  function replace(list: string[]) {
    if (list.length > max) {
      onError?.(`الحد الأقصى ${max} لقطات لكل لغة.`);
      onChange(list.slice(0, max));
    } else {
      onError?.(null);
      onChange(list);
    }
  }

  function setAt(i: number, url: string) {
    replace([...urls.slice(0, i), url, ...urls.slice(i + 1)]);
  }

  function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= urls.length) return;
    const next = [...urls];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  }

  const capped = urls.length >= max;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <p className={labelCls}>
          {title} <span className="font-normal">({urls.length}/{max})</span>
        </p>
        <div className="flex items-center gap-2">
          <UploadButton
            kind="screenshot"
            onUploaded={(url) => replace([...urls, url])}
            className={capped ? "pointer-events-none opacity-50" : ""}
          />
          <button
            type="button"
            disabled={capped}
            onClick={() => replace([...urls, ""])}
            className={`${btnGhost} text-xs disabled:opacity-50`}
          >
            + رابط
          </button>
        </div>
      </div>
      {urls.length === 0 ? (
        <p className="text-sm text-text-secondary">لا توجد لقطات</p>
      ) : (
        <ol className="flex flex-col gap-2">
          {urls.map((url, i) => (
            <li key={i} className="flex items-center gap-2">
              <span className="w-5 shrink-0 text-xs text-text-secondary">{i + 1}</span>
              <input
                type="url"
                dir="ltr"
                value={url}
                onChange={(e) => setAt(i, e.target.value)}
                placeholder="https://…"
                className={inputCls}
              />
              <div className="flex shrink-0 gap-1">
                <button
                  type="button"
                  disabled={i === 0}
                  onClick={() => move(i, -1)}
                  aria-label="نقل لأعلى"
                  className={`${btnGhost} px-2 py-1 text-xs`}
                >
                  ↑
                </button>
                <button
                  type="button"
                  disabled={i === urls.length - 1}
                  onClick={() => move(i, 1)}
                  aria-label="نقل لأسفل"
                  className={`${btnGhost} px-2 py-1 text-xs`}
                >
                  ↓
                </button>
                <button
                  type="button"
                  onClick={() => replace([...urls.slice(0, i), ...urls.slice(i + 1)])}
                  aria-label={`إزالة اللقطة ${i + 1}`}
                  className={`${btnGhost} px-2 py-1 text-xs text-red-600`}
                >
                  ×
                </button>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

/** One metadata type: single-select → "—" default dropdown; multi-select → checkboxes. */
export function MetadataTypeControl({
  type,
  selected,
  onSelect,
  onToggle,
}: {
  type: FormMetadataType;
  selected: number[];
  onSelect: (id: number | null) => void;
  onToggle: (id: number, checked: boolean) => void;
}) {
  const label = type.labelAr || type.labelEn;

  if (!type.isMultiSelect) {
    const current = selected[0] ?? "";
    return (
      <label className="flex flex-col gap-1">
        <span className={labelCls}>{label}</span>
        <select
          value={current}
          onChange={(e) => onSelect(e.target.value === "" ? null : Number(e.target.value))}
          className={inputCls}
        >
          <option value="">—</option>
          {type.options.map((o) => (
            <option key={o.id} value={o.id}>
              {o.labelAr || o.labelEn}
            </option>
          ))}
        </select>
      </label>
    );
  }

  return (
    <fieldset className="flex flex-col gap-1">
      <legend className={labelCls}>{label}</legend>
      <div className="flex flex-wrap gap-x-4 gap-y-2">
        {type.options.length === 0 ? (
          <span className="text-sm text-text-secondary">لا توجد خيارات</span>
        ) : (
          type.options.map((o) => {
            const checked = selected.includes(o.id);
            const optLabel = o.labelAr || o.labelEn;
            return (
              <label key={o.id} className="flex items-center gap-1.5 text-sm text-text">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) => onToggle(o.id, e.target.checked)}
                  className="size-4 cursor-pointer"
                />
                {optLabel}
              </label>
            );
          })
        )}
      </div>
    </fieldset>
  );
}
