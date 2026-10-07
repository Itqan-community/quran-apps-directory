import type { Metadata } from "next";
import localFont from "next/font/local";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

const expoArabic = localFont({
  src: [
    { path: "../../public/fonts/ExpoArabic-Book.woff2", weight: "400", style: "normal" },
    { path: "../../public/fonts/ExpoArabic-Medium.woff2", weight: "500", style: "normal" },
    { path: "../../public/fonts/ExpoArabic-Bold.woff2", weight: "700", style: "normal" },
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
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning className={expoArabic.variable}>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
