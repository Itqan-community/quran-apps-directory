import { getRequestConfig } from "next-intl/server";

export const LOCALES = ["ar", "en"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "ar";

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale: Locale =
    requested && (LOCALES as readonly string[]).includes(requested)
      ? (requested as Locale)
      : DEFAULT_LOCALE;

  const messages = (await import(`./${locale}.json`)).default;
  return { locale, messages };
});
