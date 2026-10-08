"use client";

import { useTranslations } from "next-intl";

export function CategoryTags({ slugs }: { slugs: string[] }) {
  const t = useTranslations("appList.categories");
  const shown = slugs.slice(0, 3);
  const more = slugs.slice(3);
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {shown.map((s) => (
        <span key={s} className="rounded-app bg-surface px-2 py-0.5 text-xs text-text-secondary">
          {t(s)}
        </span>
      ))}
      {more.length > 0 && (
        <span className="group relative rounded-app bg-surface px-2 py-0.5 text-xs text-text-secondary">
          +{more.length}
          <span className="invisible absolute bottom-full z-10 flex w-max flex-wrap gap-1 rounded-app border border-border bg-card p-2 opacity-0 shadow-app transition-opacity group-hover:visible group-hover:opacity-100">
            {more.map((s) => (
              <span key={s} className="rounded-app bg-surface px-2 py-0.5 text-xs">
                {t(s)}
              </span>
            ))}
          </span>
        </span>
      )}
    </div>
  );
}
