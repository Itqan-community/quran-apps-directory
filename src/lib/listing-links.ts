import type { Locale } from "@/lib/i18n";

export function sortQuery(sort?: string): string {
  return sort && sort !== "featured" ? `?sort=${encodeURIComponent(sort)}` : "";
}

export function categoryHref(
  lang: Locale,
  slug?: string | null,
  sort?: string,
): string {
  const base = slug ? `/${lang}/${slug}` : `/${lang}`;
  return `${base}${sortQuery(sort)}`;
}

export function searchHref(
  lang: Locale,
  query: string,
  mode: "traditional" | "smart" = "traditional",
  sort?: string,
): string {
  const q = query.trim();
  if (!q) return `/${lang}/apps`;
  const modeQuery = mode === "smart" ? "&mode=smart" : "";
  // `?sort=` must survive a search submit / did-you-mean hop: the results
  // page keeps the dock's sort (and its own `sortQuery` skips the default).
  const sortPart = sort && sort !== "featured" ? `&sort=${encodeURIComponent(sort)}` : "";
  return `/${lang}/apps?search=${encodeURIComponent(q)}${modeQuery}${sortPart}`;
}
