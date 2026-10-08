import type { Metadata } from "next";
import type { Locale } from "@/lib/i18n";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://quran-apps.itqan.dev";

export function pageMetadata(
  lang: Locale,
  path: string, // without lang prefix, "" for home
  title: string,
  description: string,
  ogImage?: string,
): Metadata {
  return {
    title,
    description,
    alternates: {
      canonical: `/${lang}${path}`,
      languages: { ar: `/ar${path}`, en: `/en${path}`, "x-default": `/en${path}` },
    },
    openGraph: {
      title,
      description,
      url: `${SITE_URL}/${lang}${path}`,
      images: ogImage ? [{ url: ogImage }] : undefined,
      type: "website",
      locale: lang === "ar" ? "ar_SA" : "en_US",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ogImage ? [ogImage] : undefined,
    },
    robots: process.env.NOINDEX === "1" ? { index: false, follow: false } : undefined,
  };
}
