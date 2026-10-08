import { SiteHeader } from "@/components/site/site-header";
import { isLocale, type Locale } from "@/lib/i18n";

/** Ramadan ships its own footer (old hideFooter behavior) — header only here. */
export default async function RamadanGroupLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!isLocale(lang)) return null as never;
  const locale = lang as Locale;
  return (
    <div className="dark min-h-screen bg-[#0f0f0f] text-white" data-ramadan="true">
      <SiteHeader lang={locale} />
      <div>{children}</div>
    </div>
  );
}
