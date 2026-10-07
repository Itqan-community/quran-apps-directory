import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { LOCALES, DEFAULT_LOCALE, type Locale } from "@/i18n/request";

export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}

/** Validate `[lang]` param, 404 on invalid, enable static rendering for next-intl. */
export function getLang(params: { lang: string }): Locale {
  if (!isLocale(params.lang)) notFound();
  setRequestLocale(params.lang);
  return params.lang;
}

export { LOCALES, DEFAULT_LOCALE };
export type { Locale };
