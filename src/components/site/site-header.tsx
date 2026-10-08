import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { CompactSearch } from "./compact-search";
import { LangToggle } from "./lang-toggle";
import { MobileMenu } from "./mobile-menu";
import { NavbarScrollConnector } from "./navbar-scroll-connector";
import { ThemeToggle } from "./theme-toggle";

export async function SiteHeader({ lang }: { lang: "ar" | "en" }) {
  const t = await getTranslations({ locale: lang, namespace: "header" });

  const links = [
    { href: `/${lang}`, label: t("home") },
    { href: `/${lang}/about-us`, label: t("about") },
    { href: `/${lang}/contact-us`, label: t("contact") },
    { href: `/${lang}/submit-app`, label: t("submitApp") },
  ];

  return (
    <header id="site-header" data-header-compact="false"
      className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur">
      <NavbarScrollConnector />
      <div className="header-bar mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4">
        <Link href={`/${lang}`} className="shrink-0" aria-label={t("title")}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/logo.svg" alt={t("title")} height={40} width={120} />
        </Link>
        <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
          {links.map((l) => (
            <Link key={l.href} href={l.href}
              className="rounded-app px-3 py-2 text-sm text-text-secondary transition-colors hover:bg-surface hover:text-primary">
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <a href="https://community.itqan.dev/" target="_blank" rel="noopener noreferrer"
            className="hidden rounded-app border border-primary px-3 py-2 text-sm text-primary hover:bg-primary hover:text-white sm:flex sm:items-center sm:gap-1">
            {t("itqan_community")}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z" />
              <path d="M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7z" />
            </svg>
          </a>
          <LangToggle lang={lang} />
          <ThemeToggle />
          <MobileMenu links={links} communityLabel={t("itqan_community")} />
        </div>
      </div>
      <CompactSearch lang={lang} />
    </header>
  );
}
