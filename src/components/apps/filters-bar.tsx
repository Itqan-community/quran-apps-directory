"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type { Locale } from "@/lib/i18n";
import type { MetadataValuesResponse } from "@/lib/repo/metadata";
import type { CategoryItem } from "@/lib/repo/categories";
import type { AppsFilters } from "@/lib/repo/apps-rows";

type FieldKey = "platforms" | "riwayah" | "mushafType" | "features";

const FIELD_LABELS: Record<FieldKey, { ar: string; en: string }> = {
  platforms: { ar: "المنصة", en: "Platform" },
  riwayah: { ar: "الرواية", en: "Riwayah" },
  mushafType: { ar: "نوع المصحف", en: "Mushaf Type" },
  features: { ar: "الميزات", en: "Features" },
};

const PARAM_NAMES: Record<FieldKey, string> = {
  platforms: "platform",
  riwayah: "riwayah",
  mushafType: "mushaf_type",
  features: "features",
};

export function FiltersBar({
  lang,
  current,
  categories,
  metadata,
}: {
  lang: Locale;
  current: AppsFilters;
  categories: CategoryItem[];
  metadata: MetadataValuesResponse;
}) {
  const router = useRouter();
  const t = useTranslations("appList");

  function push(next: Partial<AppsFilters>) {
    const merged = { ...current, ...next, page: 1 };
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(merged)) {
      if (!value || (Array.isArray(value) && value.length === 0)) continue;
      if (key === "status" || key === "pageSize" || key === "ordering" || key === "includeCategories") continue;
      const serialized = Array.isArray(value) ? value.join(",") : String(value);
      const paramName = key === "categorySlugs" ? "category" : key === "mushafType" ? "mushaf_type" : key;
      params.set(paramName, serialized);
    }
    router.push(`/${lang}/apps?${params.toString()}`);
  }

  return (
    <div className="mb-6 flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => push({ categorySlugs: undefined })}
          className={`rounded-full border px-3 py-1 text-sm ${
            !current.categorySlugs?.length
              ? "border-primary bg-primary text-white"
              : "border-border bg-card text-text-secondary hover:border-primary"
          }`}
        >
          {t("categories.all")}
        </button>
        {categories.map((c) => {
          const active = current.categorySlugs?.includes(c.slug);
          return (
            <button
              key={c.id}
              onClick={() => push({ categorySlugs: active ? undefined : [c.slug] })}
              className={`rounded-full border px-3 py-1 text-sm ${
                active
                  ? "border-primary bg-primary text-white"
                  : "border-border bg-card text-text-secondary hover:border-primary"
              }`}
            >
              {lang === "ar" ? c.nameAr : c.nameEn} <span className="opacity-60">{c.appCount}</span>
            </button>
          );
        })}
      </div>
      {(["platforms", "riwayah", "mushafType", "features"] as FieldKey[]).map((field) => {
        const options =
          field === "platforms"
            ? metadata.platforms
            : field === "mushafType"
              ? metadata.mushaf_type
              : metadata[field];
        if (!options?.length) return null;
        const selected = (current[field] as string[] | undefined) ?? [];
        return (
          <div key={field} className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-text-secondary">
              {lang === "ar" ? FIELD_LABELS[field].ar : FIELD_LABELS[field].en}
            </span>
            {options.map((o) => {
              const active = selected.includes(o.value);
              return (
                <button
                  key={o.value}
                  onClick={() =>
                    push({
                      [field]: active ? selected.filter((v) => v !== o.value) : [...selected, o.value],
                    } as Partial<AppsFilters>)
                  }
                  className={`rounded-app border px-2 py-0.5 text-xs ${
                    active
                      ? "border-primary bg-primary text-white"
                      : "border-border bg-card text-text-secondary hover:border-primary"
                  }`}
                >
                  {lang === "ar" ? o.labelAr : o.labelEn} ({o.count})
                </button>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
