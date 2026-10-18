import type { Metadata } from "next";
import { connection } from "next/server";
import localFont from "next/font/local";
import { Suspense } from "react";
import { ThemeProvider } from "@/components/theme-provider";
import AdminNav, { AdminMobileBar } from "@/components/admin/admin-nav";
import { auth } from "@/lib/auth";
import { getMetadataTypesNav } from "@/lib/repo/admin";
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

/** Sidebar reads the session (runtime data); Suspense keeps prerendering intact. */
async function AdminShellNav() {
  // connection() first: auth() touches Web Crypto, which the prerender pass flags as unstable.
  await connection();
  const session = await auth();
  // Pass the raw contract through: name may be NULL, the chip falls back to email.
  const name = session?.user?.name ?? null;
  const email = session?.user?.email ?? null;
  const user = name || email ? { name, email } : null;
  const metadataTypes = await getMetadataTypesNav();
  return <AdminNav user={user} metadataTypes={metadataTypes} />;
}

/** Mobile bar shares the same data; it renders atop the content column. */
async function AdminShellMobileBar() {
  await connection();
  const session = await auth();
  const name = session?.user?.name ?? null;
  const email = session?.user?.email ?? null;
  const user = name || email ? { name, email } : null;
  const metadataTypes = await getMetadataTypesNav();
  return <AdminMobileBar user={user} metadataTypes={metadataTypes} />;
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning className={expoArabic.variable}>
      <body>
        <ThemeProvider>
          <div className="flex min-h-screen bg-bg">
            <Suspense
              fallback={
                <aside className="sticky top-0 hidden w-64 shrink-0 border-l border-border bg-surface md:block" />
              }
            >
              <AdminShellNav />
            </Suspense>
            <div className="min-w-0 flex-1 p-4 md:p-8">
              <Suspense fallback={null}>
                <AdminShellMobileBar />
              </Suspense>
              {children}
            </div>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
