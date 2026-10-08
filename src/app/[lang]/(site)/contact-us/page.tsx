import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getLang, isLocale, type Locale } from "@/lib/i18n";
import { pageMetadata } from "@/lib/seo/metadata";

type Props = { params: Promise<{ lang: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const t = await getTranslations({ locale: lang, namespace: "contactUs" });
  return pageMetadata(lang, "/contact-us", t("title"), t("message"));
}

export default async function ContactUsPage({ params }: Props) {
  const { lang } = await params;
  const locale: Locale = getLang({ lang });
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "contactUs" });

  const cards = [
    {
      href: "https://itqan.dev",
      external: true,
      title: "www.itqan.dev",
      sub: t("appRequests"),
    },
    {
      href: `/${locale}/submit-app`,
      external: false,
      title: t("app-request-form"),
      sub: t("app-request"),
    },
    {
      href: "mailto:connect@itqan.dev",
      external: true,
      title: "connect@itqan.dev",
      sub: t("email"),
    },
  ];

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-center text-3xl font-bold text-text">{t("title")}</h1>
      <p className="mx-auto mt-4 max-w-xl text-center text-sm leading-relaxed text-text-secondary">
        {t("message")}
      </p>
      <div className="mt-10 flex flex-col gap-4">
        {cards.map((c) => {
          const className =
            "flex items-center justify-between rounded-app border border-border bg-card p-5 transition-colors hover:border-primary";
          const content = (
            <>
              <span className="text-lg text-primary" aria-hidden>
                ›
              </span>
              <div className="flex-1 mx-3">
                <h3 className="font-bold text-text">{c.title}</h3>
                <p className="text-sm text-text-secondary">{c.sub}</p>
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/mail-02.svg" alt="" width={22} height={22} />
            </>
          );
          return c.external ? (
            <a key={c.href} href={c.href} target="_blank" rel="noopener noreferrer" className={className}>
              {content}
            </a>
          ) : (
            <Link key={c.href} href={c.href} className={className}>
              {content}
            </Link>
          );
        })}
      </div>
    </main>
  );
}
