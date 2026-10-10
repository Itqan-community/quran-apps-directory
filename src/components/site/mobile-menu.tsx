"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";

type LinkItem = { href: string; label: string };

const MENU_ICONS = {
  home: "M3 10.5 12 3l9 7.5M5 9.5V21h5v-6h4v6h5V9.5",
  users:
    "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm13 10v-2a4 4 0 0 0-3-3.87M15 3.13a4 4 0 0 1 0 7.75",
  info: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 16v-4M12 8h.01",
  mail: "M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Zm18 2-10 7L2 6",
  plus:
    "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 8v8M8 12h8",
} as const;

export function MobileMenu({ links, communityLabel }: { links: LinkItem[]; communityLabel: string }) {
  const t = useTranslations("header");
  const pathname = usePathname();
  const lang = pathname.split("/")[1] || "ar";
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  function close() {
    setOpen(false);
  }

  const nav = [
    { ...links[0], icon: MENU_ICONS.home, badge: false },
    { href: "https://community.itqan.dev/", label: communityLabel, icon: MENU_ICONS.users, external: true, badge: true },
    { ...links[1], icon: MENU_ICONS.info, badge: false },
    { ...links[2], icon: MENU_ICONS.mail, badge: false },
    { ...links[3], icon: MENU_ICONS.plus, badge: false },
  ];

  return (
    <div>
      <button
        onClick={() => setOpen(true)}
        aria-label="Toggle mobile menu"
        aria-expanded={open}
        aria-controls="mobile-menu"
        className={`mobile-menu-toggle ${open ? "active" : ""}`}
      >
        <span className="hamburger-line" />
        <span className="hamburger-line" />
        <span className="hamburger-line" />
      </button>
      {open && (
        <div
          id="mobile-menu"
          className="mobile-menu-overlay visible"
          onClick={(e) => {
            if (e.target === e.currentTarget) close();
          }}
        >
          <div className="mobile-menu-content">
            <div className="mobile-menu-header">
              <Link href={`/${lang}`} onClick={close} className="flex items-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/images/logo.svg" alt={t("title")} height={40} width={100} />
              </Link>
              <div className="flex items-center gap-2">
                <Link href={`/${lang === "ar" ? "en" : "ar"}${pathname.replace(/^\/(ar|en)/, "")}`} onClick={close} className="mobile-language-toggle" aria-label="Toggle language">
                  {lang === "ar" ? "EN" : "ع"}
                </Link>
                <button onClick={close} aria-label="Close" className="mobile-menu-close">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M18 6 6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <nav className="mobile-nav">
              {nav.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  onClick={() => l.external || close()}
                  target={l.external ? "_blank" : undefined}
                  rel={l.external ? "noopener noreferrer" : undefined}
                  className={l.badge ? "mobile-nav-link mobile-community-badge" : "mobile-nav-link"}
                >
                  <span className="mobile-nav-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d={l.icon} />
                    </svg>
                  </span>
                  {l.label}
                  {l.external && (
                    <span className="external-icon">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M15 3h6v6M10 14 21 3M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5" />
                      </svg>
                    </span>
                  )}
                </a>
              ))}
            </nav>
          </div>
        </div>
      )}
    </div>
  );
}
