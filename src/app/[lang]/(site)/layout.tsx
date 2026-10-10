import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { SupportWidget } from "@/components/site/support-widget";
import { isLocale, type Locale } from "@/lib/i18n";

export default async function SiteGroupLayout({
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
    <div className="flex min-h-screen flex-col bg-bg text-text">
      <SiteHeader lang={locale} />
      <div className="flex-1">{children}</div>
      <SiteFooter lang={locale} />
      <SupportWidget />
    </div>
  );
}
