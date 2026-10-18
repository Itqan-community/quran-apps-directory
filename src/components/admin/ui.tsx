import Link from "next/link";
import { ArrowRight, Plus } from "lucide-react";
import type { ReactNode } from "react";

/** Shared admin console primitives: one table language, one pill language. */

export const adminTh = "px-3 py-2 text-start font-medium";
export const adminTd = "px-3 py-2 text-text";
export const adminTableWrap = "overflow-x-auto rounded-app bg-card shadow-app";
export const adminTable = "w-full text-start text-sm";
export const adminHeadRow = "border-b border-border text-xs text-text-secondary";
export const adminBodyRow = "border-b border-border transition last:border-b-0 hover:bg-primary/[0.04]";

export const adminIconAction =
  "inline-flex items-center gap-1.5 rounded-app border border-border bg-surface px-3 py-1.5 text-xs text-text transition hover:bg-primary/10";

export const adminAddButton =
  "inline-flex items-center gap-1.5 rounded-app bg-primary px-4 py-2 text-sm font-bold text-white transition hover:bg-primary-hover";

export const adminCount = "inline-block min-w-7 rounded-full bg-surface px-2 py-0.5 text-center text-xs font-bold text-text tabular-nums";

/** Green/gray status pill replacing the old ✓/— glyphs. */
export function StatusPill({ active, on = "مفعّل", off = "موقوف" }: { active: boolean; on?: string; off?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
        active ? "bg-green-100 text-green-800 dark:bg-green-500/15 dark:text-green-300" : "bg-surface text-text-secondary"
      }`}
    >
      <span aria-hidden className={`size-1.5 rounded-full ${active ? "bg-green-600 dark:bg-green-400" : "bg-current opacity-50"}`} />
      {active ? on : off}
    </span>
  );
}

/** Primary "+ إضافة…" header button with a leading icon. */
export function AddButtonLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className={adminAddButton}>
      <Plus aria-hidden className="size-4" />
      {children}
    </Link>
  );
}

/** "Back to list" link with an RTL-correct arrow. */
export function BackLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline">
      <ArrowRight aria-hidden className="size-4" />
      {children}
    </Link>
  );
}

/** Empty table state: icon medallion, message, optional action. */
export function EmptyState({
  icon,
  message,
  action,
}: {
  icon: ReactNode;
  message: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-app bg-card p-8 text-center shadow-app">
      <span className="flex size-11 items-center justify-center rounded-full bg-primary/10 text-primary">
        {icon}
      </span>
      <p className="text-sm text-text-secondary">{message}</p>
      {action}
    </div>
  );
}
