import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { getCategoriesCached } from "@/lib/cache/categories";
import { CompactSearch } from "./compact-search";
import { LangToggle } from "./lang-toggle";
import { MobileMenu } from "./mobile-menu";

export async function SiteHeader({ lang }: { lang: "ar" | "en" }) {
  const t = await getTranslations({ locale: lang, namespace: "header" });
  const categories = await getCategoriesCached();

  const links = [
    { href: `/${lang}`, label: t("home") },
    { href: `/${lang}/about-us`, label: t("about") },
    { href: `/${lang}/contact-us`, label: t("contact") },
    { href: `/${lang}/submit-app`, label: t("submitApp") },
  ];

  return (
    <header id="site-header" data-header-compact="false" className="modern-header">
      <div className="header-area">
        {/* Normal bar */}
        <div className="header-container">
          <Link href={`/${lang}`} className="shrink-0" aria-label={t("title")}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/logo.svg" alt={t("title")} height={40} className="site-logo" />
          </Link>
          <nav className="nav-menu" aria-label="Main">
            {links.map((l) => (
              <Link key={l.href} href={l.href} className="nav-link">
                {l.label}
              </Link>
            ))}
          </nav>
          <div className="header-actions">
            <a
              href="https://community.itqan.dev/"
              target="_blank"
              rel="noopener noreferrer"
              className="community-btn"
            >
              {t("itqan_community")}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z" />
                <path
                  d="M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7z"
                />
              </svg>
            </a>
            <LangToggle lang={lang} />
            <MobileMenu links={links} communityLabel={t("itqan_community")} />
          </div>
        </div>

        {/* Compact bar (desktop scrolled state of the lists/hero) */}
        <div className="header-container-compact compact-search-row">
          <CompactSearch lang={lang} categories={categories} />
        </div>
      </div>
    </header>
  );
}
