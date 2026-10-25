import type { ComponentType } from "react";
import { AppleMark, GooglePlayMark, WebMark } from "@/components/brand-marks";

export type PlatformMark = {
  Icon: ComponentType<{ className?: string }>;
  chip: string;
  label: Record<"ar" | "en", string>;
};

/** Neutral tile letting full-color brand marks show true colors. */
export const brandChip = "bg-white ring-1 ring-black/10 dark:ring-white/25";

/**
 * Authentic brand marks by platform (see `brand-marks.tsx`). Each platform
 * value expands to every OS mark it covers, so `cross_platform` reads as
 * Play + Apple + Globe instead of one abstract glyph.
 */
export const platformMarks: Record<string, PlatformMark[]> = {
  android: [
    { Icon: GooglePlayMark, chip: brandChip, label: { ar: "أندرويد", en: "Android" } },
  ],
  ios: [
    {
      Icon: AppleMark,
      chip: "bg-slate-500/10 text-slate-800 dark:bg-white/10 dark:text-slate-100",
      label: { ar: "آيفون", en: "iOS" },
    },
  ],
  web: [
    { Icon: WebMark, chip: brandChip, label: { ar: "ويب", en: "Web" } },
  ],
  cross_platform: [
    { Icon: GooglePlayMark, chip: brandChip, label: { ar: "أندرويد", en: "Android" } },
    {
      Icon: AppleMark,
      chip: "bg-slate-500/10 text-slate-800 dark:bg-white/10 dark:text-slate-100",
      label: { ar: "آيفون", en: "iOS" },
    },
    { Icon: WebMark, chip: brandChip, label: { ar: "ويب", en: "Web" } },
  ],
};

export function getPlatformLabel(platform: string, lang: "ar" | "en"): string {
  const marks = platformMarks[platform] ?? [];
  if (marks.length === 0) return platform;
  return marks.map((mark) => mark.label[lang]).join(lang === "ar" ? "، " : ", ");
}

export function PlatformMarks({
  platform,
  className = "",
}: {
  platform: string;
  className?: string;
}) {
  const marks = platformMarks[platform] ?? [];
  if (marks.length === 0) return null;

  return (
    <span className={`flex items-center gap-1 ${className}`}>
      {marks.map(({ Icon, chip }, index) => (
        <span
          key={index}
          className={`flex size-6 items-center justify-center rounded-lg ${chip}`}
        >
          <Icon className="size-3.5" />
        </span>
      ))}
    </span>
  );
}
