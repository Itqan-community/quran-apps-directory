import type { Metadata } from "next";
import { notFound } from "next/navigation";
import localFont from "next/font/local";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { isLocale, LOCALES } from "@/lib/i18n";
import { defaultOgImages, defaultTwitterImages } from "@/lib/seo/metadata";
import { ThemeProvider } from "@/components/theme-provider";
import "../globals.css";

const expoArabic = localFont({
  src: [
    { path: "../../../public/fonts/ExpoArabic-Book.woff2", weight: "400", style: "normal" },
    { path: "../../../public/fonts/ExpoArabic-Medium.woff2", weight: "500", style: "normal" },
    { path: "../../../public/fonts/ExpoArabic-Bold.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-expo",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "دليل التطبيقات القرآنية الشامل - أفضل تطبيقات القرآن الكريم",
    template: "%s | دليل التطبيقات القرآنية",
  },
  description:
    "الدليل الشامل لأفضل تطبيقات القرآن الكريم - تطبيقات المصحف، التفسير، التلاوة، التحفيظ والتدبر",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  alternates: {
    canonical: "./",
    languages: { ar: "/ar", en: "/en", "x-default": "/en" },
  },
  openGraph: {
    images: defaultOgImages,
  },
  twitter: {
    card: "summary_large_image",
    images: defaultTwitterImages,
  },
};

export function generateStaticParams() {
  return LOCALES.map((lang) => ({ lang }));
}

// The root layout needs the runtime [lang] param to set html lang/dir and
// validate the locale — there is no useful static shell for unknown params, so
// this segment renders blocking per-request instead of streaming a 200 shell
// for invalid locales (which would break the 404 status code).
export const instant = false;

export default async function LangLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  setRequestLocale(lang);
  const dir = lang === "ar" ? "rtl" : "ltr";
  const messages = await getMessages();

  return (
    <html lang={lang} dir={dir} suppressHydrationWarning className={expoArabic.variable}>
      <body>
        <ThemeProvider>
          {/* Site chrome lives in the `(site)` route group layout so ramadan
              can ship its own footer (matches old hideFooter behavior). */}
          <NextIntlClientProvider messages={messages}>{children}</NextIntlClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
