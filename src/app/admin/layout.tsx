import type { Metadata } from "next";
import localFont from "next/font/local";
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
  title: "Admin",
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning className={expoArabic.variable}>
      <body>
        <ThemeProvider>
          <div className="min-h-screen bg-bg">{children}</div>
        </ThemeProvider>
      </body>
    </html>
  );
}
