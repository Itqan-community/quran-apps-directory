import Link from "next/link";
import type { Locale } from "@/lib/i18n";

export function Pagination({
  lang,
  page,
  totalPages,
  searchParams,
  basePath,
}: {
  lang: Locale;
  page: number;
  totalPages: number;
  searchParams: Record<string, unknown>;
  /** Route the page links point at; defaults to the /apps listing. */
  basePath?: string;
}) {
  if (totalPages <= 1) return null;
  const root = basePath ?? `/${lang}/apps`;
  // Internal filter keys use the repo's camelCase names; the public routes
  // read the snake_case query params (same mapping as FiltersBar).
  const paramName = (key: string) =>
    key === "categorySlugs" ? "category" : key === "mushafType" ? "mushaf_type" : key;
  function href(p: number) {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(searchParams)) {
      // internal-only keys never belong in the public URL
      if (k === "page" || k === "ordering" || k === "pageSize" || k === "status") continue;
      if (!v || (Array.isArray(v) && v.length === 0)) continue;
      params.set(paramName(k), Array.isArray(v) ? v.join(",") : String(v));
    }
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    return `${root}${qs ? `?${qs}` : ""}`;
  }
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);
  return (
    <nav className="mt-8 flex items-center justify-center gap-2" aria-label="Pagination">
      {page > 1 && (
        <Link href={href(page - 1)} className="rounded-app border border-border px-3 py-1.5 text-sm">
          {lang === "ar" ? "السابق" : "Prev"}
        </Link>
      )}
      {pages.map((p) => (
        <Link
          key={p}
          href={href(p)}
          aria-current={p === page ? "page" : undefined}
          className={`rounded-app px-3 py-1.5 text-sm ${
            p === page
              ? "bg-primary text-white"
              : "border border-border text-text-secondary hover:border-primary"
          }`}
        >
          {p}
        </Link>
      ))}
      {page < totalPages && (
        <Link href={href(page + 1)} className="rounded-app border border-border px-3 py-1.5 text-sm">
          {lang === "ar" ? "التالي" : "Next"}
        </Link>
      )}
    </nav>
  );
}
