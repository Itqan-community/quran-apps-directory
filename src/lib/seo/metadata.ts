import type { Metadata } from "next";
import type { Locale } from "@/lib/i18n";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://quran-apps.itqan.dev";

// Default share (Open Graph / Twitter) images, copied from the legacy app.
// The paths are relative and resolved against the `metadataBase` declared in
// src/app/[lang]/layout.tsx, so they must stay in the same segment or below it.
export const SHARE_IMAGE_ALT = "دليل التطبيقات القرآنية الشامل";
export const DEFAULT_OG_IMAGE = "/images/Social-Media-Thumnail-2x.jpg";
export const DEFAULT_TWITTER_IMAGE = "/images/Social-Media-Thumnail.png";

export const defaultOgImages = [
  { url: DEFAULT_OG_IMAGE, width: 2400, height: 1260, alt: SHARE_IMAGE_ALT },
];

export const defaultTwitterImages = [
  { url: DEFAULT_TWITTER_IMAGE, width: 1200, height: 630, alt: SHARE_IMAGE_ALT },
];

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
      images: ogImage ? [{ url: ogImage }] : defaultOgImages,
      type: "website",
      locale: lang === "ar" ? "ar_SA" : "en_US",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ogImage ? [ogImage] : defaultTwitterImages,
    },
    robots: process.env.NOINDEX === "1" ? { index: false, follow: false } : undefined,
  };
}
