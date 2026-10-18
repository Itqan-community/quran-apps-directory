"use client";

import { useEffect, useMemo, useRef, useState, type ComponentType } from "react";
import {
  Building2,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  ExternalLink,
  ImagePlus,
  Layers,
  Plus,
  Search,
  X,
} from "lucide-react";
import { AppleMark, GooglePlayMark, WebMark } from "@/components/brand-marks";
import UploadButton from "@/components/admin/upload-button";

export const inputCls =
  "w-full rounded-app border border-border bg-surface px-3 py-2 text-sm text-text transition disabled:opacity-50 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25";
export const labelCls = "text-xs font-bold text-text-secondary";
export const btnPrimary =
  "rounded-app bg-primary px-5 py-2 text-sm font-bold text-white transition hover:bg-primary-hover disabled:opacity-50";
export const btnGhost =
  "rounded-app border border-border bg-surface px-3 py-1.5 text-sm text-text transition hover:bg-primary/10 disabled:opacity-50";

const iconBtnCls =
  "inline-flex size-7 shrink-0 items-center justify-center rounded-app border border-border bg-surface text-text-secondary transition hover:bg-primary/10 hover:text-text disabled:opacity-40";

/** Color-coded dossier tone per section: tinted icon tile encodes section meaning. */
export type SectionTone = "basics" | "media" | "stores" | "cats" | "meta" | "status";

const toneTileCls: Record<SectionTone, string> = {
  basics: "bg-[#a0533b]/10 text-[#a0533b] dark:text-[#ff8c42]",
  media: "bg-teal-700/10 text-teal-700 dark:bg-teal-400/15 dark:text-teal-300",
  stores: "bg-violet-600/10 text-violet-700 dark:bg-violet-400/15 dark:text-violet-300",
  cats: "bg-amber-500/15 text-amber-700 dark:bg-amber-400/15 dark:text-amber-300",
  meta: "bg-emerald-600/10 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-300",
  status: "bg-slate-500/10 text-slate-600 dark:bg-slate-400/15 dark:text-slate-300",
};

export const toneBarCls: Record<SectionTone, string> = {
  basics: "bg-[#a0533b]",
  media: "bg-teal-600 dark:bg-teal-400",
  stores: "bg-violet-500 dark:bg-violet-400",
  cats: "bg-amber-500",
  meta: "bg-emerald-600 dark:bg-emerald-400",
  status: "bg-slate-400 dark:bg-slate-500",
};

/** Section heading: color-coded icon tile + title + hint + trailing status, with hairline rule. */
export function SectionHeader({
  icon,
  title,
  hint,
  action,
  tone = "basics",
}: {
  icon: React.ReactNode;
  title: string;
  hint?: string;
  action?: React.ReactNode;
  tone?: SectionTone;
}) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3 border-b border-border/70 pb-3">
      <span className="flex items-center gap-2.5">
        <span
          className={`flex size-8 shrink-0 items-center justify-center rounded-app ${toneTileCls[tone]}`}
        >
          {icon}
        </span>
        <span className="flex min-w-0 flex-col">
          <span className="text-sm font-bold text-text">{title}</span>
          {hint && <span className="text-xs text-text-secondary">{hint}</span>}
        </span>
      </span>
      {action && <span className="flex shrink-0 items-center gap-2 pt-0.5">{action}</span>}
    </div>
  );
}

/** Small bordered island used inside a section to stop fields bleeding full-width. */
export function SubPanel({
  title,
  badge,
  count,
  actions,
  children,
  tone = "default",
}: {
  title: string;
  badge?: React.ReactNode;
  count?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  tone?: "default" | "muted";
}) {
  return (
    <div
      className={`flex min-w-0 flex-col overflow-hidden rounded-xl border border-border/70 ${
        tone === "muted" ? "bg-surface/60" : "bg-surface/30"
      }`}
    >
      <div className="flex items-center justify-between gap-2 border-b border-border/60 px-3 py-2">
        <span className="flex min-w-0 items-center gap-1.5">
          <span className="truncate text-xs font-bold text-text">{title}</span>
          {badge}
          {count && (
            <span className="shrink-0 rounded-full bg-card px-1.5 py-px text-[10px] font-bold tabular-nums text-text-secondary ring-1 ring-border/60">
              {count}
            </span>
          )}
        </span>
        {actions && <span className="flex shrink-0 items-center gap-1.5">{actions}</span>}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-2 p-3">{children}</div>
    </div>
  );
}

/** Tiny EN/AR badge marking bilingual field pairs. */
export function LangTag({ lang }: { lang: "EN" | "AR" }) {
  const en = lang === "EN";
  return (
    <span
      dir="ltr"
      className={`ms-1 inline-block rounded border px-1.5 py-px align-middle text-[10px] font-bold ${
        en
          ? "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-400/30 dark:bg-blue-400/10 dark:text-blue-300"
          : "border-green-200 bg-green-50 text-green-800 dark:border-green-400/30 dark:bg-green-400/10 dark:text-green-300"
      }`}
    >
      {lang}
    </span>
  );
}

export function LangBadge({ lang }: { lang: "EN" | "AR" }) {
  return <LangTag lang={lang} />;
}

/** Checkable pill used for categories + metadata options. */
export function checkChipCls(checked: boolean): string {
  return `inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition ${
    checked
      ? "border-primary bg-primary font-bold text-white shadow-app"
      : "border-border bg-surface text-text hover:border-primary/50 hover:bg-primary/5"
  }`;
}

export type FormMetadataType = {
  id: number;
  labelEn: string;
  labelAr: string;
  isMultiSelect: boolean;
  options: { id: number; value: string; labelEn: string; labelAr: string }[];
};

/** Image tile with a muted placeholder behind it; broken URLs hide gracefully. */
export function ThumbImage({
  src,
  alt,
  tileCls,
}: {
  src: string;
  alt: string;
  tileCls: string;
}) {
  return (
    <span
      className={`relative flex shrink-0 items-center justify-center overflow-hidden border bg-surface ${tileCls} ${
        src ? "border-border" : "border-dashed border-border"
      }`}
    >
      <ImagePlus aria-hidden className="size-5 text-text-secondary opacity-50" />
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          className="absolute inset-0 h-full w-full object-cover"
          onError={(e) => {
            e.currentTarget.style.display = "none";
          }}
        />
      ) : null}
    </span>
  );
}

async function copyText(text: string): Promise<boolean> {
  const t = text.trim();
  if (!t) return false;
  try {
    await navigator.clipboard.writeText(t);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = t;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      return true;
    } catch {
      return false;
    }
  }
}

function useCopiedFlag(): [boolean, (text: string) => void] {
  const [copied, setCopied] = useState(false);
  async function run(text: string) {
    const ok = await copyText(text);
    if (!ok) return;
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }
  return [copied, run];
}

/** Preview-first media card: image leads, URL follows. Keeps icon + mains to 1/3 width each. */
export function UrlUploadField({
  label,
  value,
  onChange,
  kind,
  error,
  imgAlt,
  lang,
}: {
  label: string;
  value: string;
  onChange: (url: string) => void;
  kind: "icon" | "main";
  error?: string;
  imgAlt: string;
  lang?: "EN" | "AR";
}) {
  const trimmed = value.trim();
  const [copied, copy] = useCopiedFlag();
  const valid = /^https?:\/\//i.test(trimmed);

  return (
    <div className="flex min-w-0 flex-col overflow-hidden rounded-xl border border-border/70 bg-surface/30">
      <div
        className={
          kind === "icon"
            ? "flex h-32 items-center justify-center bg-surface/60 p-3"
            : "relative h-36 bg-surface/60"
        }
      >
        {kind === "icon" ? (
          <ThumbImage src={trimmed} alt={imgAlt} tileCls="size-20 rounded-2xl" />
        ) : trimmed ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={trimmed}
            alt={imgAlt}
            className="absolute inset-0 h-full w-full object-cover"
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
        ) : (
          <span className="flex h-full w-full flex-col items-center justify-center gap-1 text-text-secondary">
            <ImagePlus aria-hidden className="size-5 opacity-50" />
            <span className="text-[11px]">لا توجد صورة بعد</span>
          </span>
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-2 border-t border-border/60 p-3">
        <span className={`${labelCls} flex items-center justify-between gap-2`}>
          <span className="flex min-w-0 items-center">
            <span className="truncate">{label}</span>
            {lang && <LangTag lang={lang} />}
          </span>
          {trimmed && (
            <span
              className={`inline-flex shrink-0 items-center gap-1 rounded-full px-1.5 py-px text-[10px] font-bold ${
                valid
                  ? "bg-green-100 text-green-800 dark:bg-green-500/15 dark:text-green-300"
                  : "bg-surface text-text-secondary ring-1 ring-border"
              }`}
            >
              <span
                aria-hidden
                className={`size-1.5 rounded-full ${valid ? "bg-green-600 dark:bg-green-400" : "bg-current opacity-50"}`}
              />
              {valid ? "مرتبط" : "نص"}
            </span>
          )}
        </span>
        <input
          type="url"
          dir="ltr"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://…"
          aria-label={label}
          className={`${inputCls} font-mono text-xs`}
        />
        <span className="flex items-center gap-1.5">
          <UploadButton kind={kind} onUploaded={(url) => onChange(url)} />
          <span className="flex-1" />
          <button
            type="button"
            title="نسخ الرابط"
            aria-label="نسخ الرابط"
            disabled={!trimmed}
            onClick={() => copy(value)}
            className={iconBtnCls}
          >
            {copied ? <Check aria-hidden className="size-3.5 text-green-600" /> : <Copy aria-hidden className="size-3.5" />}
          </button>
          <a
            href={valid ? trimmed : undefined}
            target="_blank"
            rel="noreferrer"
            aria-label="فتح في تبويب جديد"
            title="فتح في تبويب جديد"
            onClick={(e) => {
              if (!valid) e.preventDefault();
            }}
            className={`${iconBtnCls} ${valid ? "" : "pointer-events-none opacity-40"}`}
          >
            <ExternalLink aria-hidden className="size-3.5" />
          </a>
          <button
            type="button"
            title="مسح"
            aria-label="مسح الرابط"
            disabled={!value}
            onClick={() => onChange("")}
            className={`${iconBtnCls} hover:!bg-red-50 hover:!text-red-600`}
          >
            <X aria-hidden className="size-3.5" />
          </button>
        </span>
        {error && <span className="block text-xs font-normal text-red-600">{error}</span>}
      </div>
    </div>
  );
}

/** One store link as a self-contained card: icon tile + status + URL + open/copy/clear. */
export function StoreUrlField({
  label,
  hint,
  icon,
  value,
  onChange,
  suggested = false,
  dimmed = false,
}: {
  label: string;
  hint: string;
  icon: React.ReactNode;
  value: string;
  onChange: (v: string) => void;
  suggested?: boolean;
  dimmed?: boolean;
}) {
  const trimmed = value.trim();
  const connected = /^https?:\/\//i.test(trimmed);
  const [copied, copy] = useCopiedFlag();

  return (
    <div
      className={`flex min-w-0 flex-col gap-2 rounded-xl border p-3 transition ${
        suggested
          ? "border-primary/60 bg-primary/[0.04]"
          : "border-border/70 bg-surface/30"
      } ${dimmed ? "opacity-70 saturate-50" : ""}`}
    >
      <span className="flex items-center gap-2">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-app bg-card text-primary ring-1 ring-border/60">
          {icon}
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="flex items-center gap-1.5 text-xs font-bold text-text">
            <span className="truncate">{label}</span>
            <span
              className={`inline-flex shrink-0 items-center gap-1 rounded-full px-1.5 py-px text-[10px] font-bold ${
                connected
                  ? "bg-green-100 text-green-800 dark:bg-green-500/15 dark:text-green-300"
                  : "bg-surface text-text-secondary ring-1 ring-border"
              }`}
            >
              <span
                aria-hidden
                className={`size-1.5 rounded-full ${connected ? "bg-green-600 dark:bg-green-400" : "bg-current opacity-50"}`}
              />
              {connected ? "مرتبط" : "فارغ"}
            </span>
            {suggested && (
              <span className="inline-flex shrink-0 items-center rounded-full bg-primary/10 px-1.5 py-px text-[10px] font-bold text-primary">
                مقترح للمنصة
              </span>
            )}
          </span>
          <span className="truncate text-[11px] text-text-secondary">{hint}</span>
        </span>
      </span>
      <span className="flex min-w-0 items-center gap-1.5">
        <input
          type="url"
          dir="ltr"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://…"
          aria-label={label}
          className={`${inputCls} min-w-0 flex-1 font-mono text-xs`}
        />
        <a
          href={connected ? trimmed : undefined}
          target="_blank"
          rel="noreferrer"
          aria-label={`فتح ${label}`}
          title="فتح"
          onClick={(e) => {
            if (!connected) e.preventDefault();
          }}
          className={`${iconBtnCls} ${connected ? "" : "pointer-events-none opacity-40"}`}
        >
          <ExternalLink aria-hidden className="size-3.5" />
        </a>
        <button
          type="button"
          title="نسخ"
          aria-label="نسخ الرابط"
          disabled={!trimmed}
          onClick={() => copy(value)}
          className={iconBtnCls}
        >
          {copied ? <Check aria-hidden className="size-3.5 text-green-600" /> : <Copy aria-hidden className="size-3.5" />}
        </button>
        <button
          type="button"
          title="مسح"
          aria-label="مسح الرابط"
          disabled={!value}
          onClick={() => onChange("")}
          className={`${iconBtnCls} hover:!bg-red-50 hover:!text-red-600`}
        >
          <X aria-hidden className="size-3.5" />
        </button>
      </span>
    </div>
  );
}

/** Per-language screenshot list: order = list order; compact rows with icon-only controls. */
export function ScreenshotsEditor({
  title,
  lang,
  urls,
  onChange,
  onError,
  max = 10,
}: {
  title: string;
  lang: "EN" | "AR";
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
    [next[i], next[j]] = [next[j]!, next[i]!];
    onChange(next);
  }

  const capped = urls.length >= max;

  return (
    <SubPanel
      title={title}
      badge={<LangBadge lang={lang} />}
      count={`${urls.length}/${max}`}
      tone="muted"
      actions={
        <>
          <UploadButton
            kind="screenshot"
            onUploaded={(url) => replace([...urls, url])}
            className={capped ? "pointer-events-none opacity-50" : ""}
          />
          <button
            type="button"
            disabled={capped}
            onClick={() => replace([...urls, ""])}
            className={`${btnGhost} inline-flex items-center gap-1 !px-2.5 !py-1.5 text-xs disabled:opacity-50`}
          >
            <Plus aria-hidden className="size-3.5" />
            رابط
          </button>
        </>
      }
    >
      {urls.length === 0 ? (
        <p className="rounded-app border border-dashed border-border px-3 py-6 text-center text-xs text-text-secondary">
          لا توجد لقطات بعد — ارفع صورة أو أضف رابطًا.
        </p>
      ) : (
        <ol className="flex flex-col gap-2">
          {urls.map((url, i) => {
            const t = url.trim();
            const valid = /^https?:\/\//i.test(t);
            return (
              <li
                key={i}
                className="flex min-w-0 items-center gap-2 rounded-app border border-border/60 bg-card p-2"
              >
                <span className="w-5 shrink-0 text-center text-xs font-bold tabular-nums text-text-secondary">
                  {i + 1}
                </span>
                <ThumbImage
                  src={t}
                  alt={`لقطة الشاشة ${i + 1}`}
                  tileCls="h-14 w-8 rounded-md"
                />
                <input
                  type="url"
                  dir="ltr"
                  value={url}
                  onChange={(e) => setAt(i, e.target.value)}
                  placeholder="https://…"
                  title={url || "https://…"}
                  aria-label={`رابط اللقطة ${i + 1}`}
                  className={`${inputCls} min-w-0 flex-1 font-mono !text-xs`}
                />
                <span className="flex shrink-0 items-center gap-1">
                  {valid && (
                    <a
                      href={t}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={`فتح اللقطة ${i + 1}`}
                      title="فتح"
                      className={iconBtnCls}
                    >
                      <ExternalLink aria-hidden className="size-3.5" />
                    </a>
                  )}
                  <button
                    type="button"
                    disabled={i === 0}
                    onClick={() => move(i, -1)}
                    aria-label="نقل لأعلى"
                    title="نقل لأعلى"
                    className={`${btnGhost} !px-2 !py-1.5 text-xs`}
                  >
                    <ChevronUp aria-hidden className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    disabled={i === urls.length - 1}
                    onClick={() => move(i, 1)}
                    aria-label="نقل لأسفل"
                    title="نقل لأسفل"
                    className={`${btnGhost} !px-2 !py-1.5 text-xs`}
                  >
                    <ChevronDown aria-hidden className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => replace([...urls.slice(0, i), ...urls.slice(i + 1)])}
                    aria-label={`إزالة اللقطة ${i + 1}`}
                    title="إزالة"
                    className={`${btnGhost} !px-2 !py-1.5 text-xs !text-red-600 hover:!bg-red-50`}
                  >
                    <X aria-hidden className="size-3.5" />
                  </button>
                </span>
              </li>
            );
          })}
        </ol>
      )}
    </SubPanel>
  );
}

/** One metadata type as a self-contained card: header (type + count + clear) + chips/select. */
export function MetadataTypeControl({
  type,
  selected,
  onSelect,
  onToggle,
  onClear,
}: {
  type: FormMetadataType;
  selected: number[];
  onSelect: (id: number | null) => void;
  onToggle: (id: number, checked: boolean) => void;
  onClear?: () => void;
}) {
  const label = type.labelAr || type.labelEn;

  if (!type.isMultiSelect) {
    const current: number | "" = selected.length > 0 ? selected[0]! : "";
    return (
      <div className="flex min-w-0 flex-col gap-2 rounded-xl border border-border/70 bg-surface/30 p-3">
        <span className="flex items-center justify-between gap-2 border-b border-border/60 pb-2">
          <span className={`${labelCls} !text-text truncate`}>{label}</span>
          <span className="flex shrink-0 items-center gap-1.5">
            <span className="rounded-full bg-surface px-1.5 py-px text-[10px] font-bold text-text-secondary ring-1 ring-border">
              اختيار واحد
            </span>
            {current !== "" && onClear && (
              <button
                type="button"
                onClick={onClear}
                className="text-[11px] text-text-secondary underline-offset-2 hover:text-red-600 hover:underline"
              >
                مسح
              </button>
            )}
          </span>
        </span>
        <select value={current} onChange={(e) => onSelect(e.target.value === "" ? null : Number(e.target.value))} className={inputCls}>
          <option value="">— بدون تحديد —</option>
          {type.options.map((o) => (
            <option key={o.id} value={o.id}>
              {o.labelAr || o.labelEn}
            </option>
          ))}
        </select>
      </div>
    );
  }

  const total = type.options.length;
  return (
    <fieldset className="flex min-w-0 flex-col gap-2 rounded-xl border border-border/70 bg-surface/30 p-3">
      <span className="flex items-center justify-between gap-2 border-b border-border/60 pb-2">
        <legend className={`${labelCls} !text-text flex min-w-0 items-center gap-1.5 p-0`}>
          <span className="truncate">{label}</span>
          <span className="shrink-0 rounded-full bg-card px-1.5 py-px text-[10px] font-bold tabular-nums text-text-secondary ring-1 ring-border/60">
            {selected.length}/{total}
          </span>
        </legend>
        <span className="flex shrink-0 items-center gap-1.5">
          <span className="rounded-full bg-primary/10 px-1.5 py-px text-[10px] font-bold text-primary">
            متعدد
          </span>
          {selected.length > 0 && onClear && (
            <button
              type="button"
              onClick={onClear}
              className="text-[11px] text-text-secondary underline-offset-2 hover:text-red-600 hover:underline"
            >
              مسح الكل
            </button>
          )}
        </span>
      </span>
      <div className="flex flex-wrap gap-1.5">
        {total === 0 ? (
          <span className="text-xs text-text-secondary">لا توجد خيارات</span>
        ) : (
          type.options.map((o) => {
            const checked = selected.includes(o.id);
            const optLabel = o.labelAr || o.labelEn;
            return (
              <label key={o.id} className={checkChipCls(checked)} title={optLabel}>
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) => onToggle(o.id, e.target.checked)}
                  className="sr-only"
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

/** Platform as logo tiles, not a dropdown: the OS mark is the fastest scan cue. */
export function PlatformPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const tiles: { v: string; ar: string; en: string; Icon: ComponentType<{ className?: string }>; wrap: string }[] = [
    { v: "android", ar: "أندرويد", en: "Android", Icon: GooglePlayMark, wrap: "bg-white ring-1 ring-black/10" },
    { v: "ios", ar: "آي أو إس", en: "iOS", Icon: AppleMark, wrap: "bg-slate-500/10 text-slate-800 dark:bg-white/10 dark:text-slate-100" },
    { v: "web", ar: "ويب", en: "Web", Icon: WebMark, wrap: "bg-white ring-1 ring-black/10" },
    { v: "cross_platform", ar: "متعدد المنصات", en: "Cross", Icon: Layers, wrap: "bg-card text-primary ring-1 ring-border/60" },
  ];
  return (
    <div role="radiogroup" aria-label="المنصة" className="grid grid-cols-2 gap-2 lg:grid-cols-4">
      {tiles.map(({ v, ar, en, Icon, wrap }) => {
        const active = value === v;
        return (
          <button
            key={v}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(v)}
            className={`flex min-w-0 items-center gap-2.5 rounded-xl border px-3 py-2.5 text-start transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
              active
                ? "border-primary bg-primary font-bold text-white shadow-app"
                : "border-border bg-surface text-text hover:border-primary/50 hover:bg-primary/5"
            }`}
          >
            <span
              className={`flex size-9 shrink-0 items-center justify-center rounded-app ${
                active ? "bg-white/15 text-white" : wrap
              }`}
            >
              <Icon className="size-4" />
            </span>
            <span className="flex min-w-0 flex-1 flex-col leading-tight">
              <span className="truncate text-sm">{ar}</span>
              <span dir="ltr" className={`truncate text-[11px] ${active ? "text-white/80" : "text-text-secondary"}`}>
                {en}
              </span>
            </span>
            {active && <Check aria-hidden className="size-4 shrink-0" />}
          </button>
        );
      })}
    </div>
  );
}

export type DeveloperOptionLite = { id: number; nameEn: string; nameAr: string };

/** Spotlight-style searchable developer picker: type to filter EN+AR, Enter picks first. */
export function DeveloperCombobox({
  developers,
  value,
  onChange,
  placeholder = "ابحث واختر المطور…",
}: {
  developers: DeveloperOptionLite[];
  value: number;
  onChange: (id: number) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const selected = developers.find((d) => d.id === value) ?? null;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return developers;
    return developers.filter((d) =>
      `${d.nameEn} ${d.nameAr} ${d.id}`.toLowerCase().includes(q)
    );
  }, [developers, query]);

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => searchRef.current?.focus(), 30);
    function onDoc(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(t);
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open ]);

  function pick(id: number) {
    onChange(id);
    setOpen(false);
    setQuery("");
  }

  const label = selected
    ? `${selected.nameEn}${selected.nameAr ? ` — ${selected.nameAr}` : ""}`
    : "";

  return (
    <div ref={rootRef} className="relative min-w-0">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => (developers.length === 0 ? null : setOpen((o) => !o))}
        disabled={developers.length === 0}
        className={`${inputCls} flex !w-full items-center gap-2 text-start disabled:opacity-50`}
      >
        <Building2 aria-hidden className="size-4 shrink-0 text-text-secondary" />
        <span className={`min-w-0 flex-1 truncate ${selected ? "text-text" : "text-text-secondary"}`}>
          {developers.length === 0 ? "لا يوجد مطورون" : selected ? label : placeholder}
        </span>
        {selected && (
          <span
            role="button"
            tabIndex={0}
            aria-label="مسح المطور"
            title="مسح"
            onClick={(e) => {
              e.stopPropagation();
              onChange(developers[0]?.id ?? 0);
              setQuery("");
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                e.stopPropagation();
                onChange(developers[0]?.id ?? 0);
              }
            }}
            className="flex size-5 shrink-0 items-center justify-center rounded-full text-text-secondary hover:bg-primary/10 hover:text-red-600"
          >
            <X aria-hidden className="size-3.5" />
          </span>
        )}
        <ChevronDown
          aria-hidden
          className={`size-4 shrink-0 text-text-secondary transition ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="absolute inset-x-0 top-full z-30 mt-1 overflow-hidden rounded-app border border-border bg-card shadow-app">
          <div className="flex items-center gap-2 border-b border-border/60 px-3 py-2">
            <Search aria-hidden className="size-4 shrink-0 text-text-secondary" />
            <input
              ref={searchRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && filtered.length > 0) {
                  e.preventDefault();
                  pick(filtered[0]!.id);
                }
              }}
              placeholder="اكتب للبحث بالعربية أو الإنجليزية…"
              aria-label="البحث عن مطور"
              className="w-full bg-transparent text-sm text-text outline-none placeholder:text-text-secondary"
            />
            {query && (
              <button
                type="button"
                aria-label="مسح البحث"
                onClick={() => setQuery("")}
                className="text-text-secondary hover:text-text"
              >
                <X aria-hidden className="size-3.5" />
              </button>
            )}
          </div>
          <ul role="listbox" aria-label="المطورون" className="max-h-60 overflow-y-auto p-1">
            {filtered.length === 0 ? (
              <li className="px-3 py-6 text-center text-xs text-text-secondary">
                لا نتائج لـ «{query.trim()}»
              </li>
            ) : (
              filtered.map((d) => {
                const active = d.id === value;
                return (
                  <li key={d.id}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={active}
                      onClick={() => pick(d.id)}
                      className={`flex w-full items-center gap-2 rounded-app px-2.5 py-2 text-start text-sm transition ${
                        active
                          ? "bg-primary font-bold text-white"
                          : "text-text hover:bg-primary/10"
                      }`}
                    >
                      <span className="min-w-0 flex-1 truncate">
                        {d.nameEn}
                        {d.nameAr ? <span className={active ? "text-white/80" : "text-text-secondary"}> — {d.nameAr}</span> : null}
                      </span>
                      {active && <Check aria-hidden className="size-4 shrink-0" />}
                    </button>
                  </li>
                );
              })
            )}
          </ul>
          <div className="flex items-center justify-between border-t border-border/60 px-3 py-1.5 text-[11px] text-text-secondary">
            <span className="tabular-nums">{filtered.length} من {developers.length}</span>
            <span>Enter يختار الأول • Esc يغلق</span>
          </div>
        </div>
      )}
    </div>
  );
}
