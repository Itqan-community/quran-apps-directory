import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getLang, isLocale, type Locale } from "@/lib/i18n";
import { pageMetadata } from "@/lib/seo/metadata";
import "./contact-us.css";

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
    <main className="contact-us-page">
      <div className="page-background-left" aria-hidden>
        <span className="ellipse-small" />
      </div>
      <div className="page-background-right" aria-hidden>
        <span className="ellipse-small" />
      </div>

      <section className="contact-hero">
        <div className="hero-content">
          <h1 className="contact-title">{t("title")}</h1>
          <p className="description">{t("message")}</p>
        </div>
      </section>

      <div className="cards-container">
        <div className="contact-cards">
          {cards.map((c) => {
            const content = (
              <>
                <span className="card-arrow" aria-hidden>
                  &#x203a;
                </span>
                <div className="card-content">
                  <h3>{c.title}</h3>
                  <p>{c.sub}</p>
                </div>
                <span className="card-icon">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/images/mail-02.svg" alt="" />
                </span>
              </>
            );
            return c.external ? (
              <a key={c.href} href={c.href} target="_blank" rel="noopener noreferrer" className="contact-card">
                {content}
              </a>
            ) : (
              <Link key={c.href} href={c.href} className="contact-card">
                {content}
              </Link>
            );
          })}
        </div>
      </div>
    </main>
  );
}
