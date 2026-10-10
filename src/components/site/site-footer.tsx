import { getTranslations } from "next-intl/server";

export async function SiteFooter({ lang }: { lang: "ar" | "en" }) {
  const t = await getTranslations({ locale: lang, namespace: "footer" });
  const links = [
    { href: `https://itqan.dev/${lang}`, label: t("main_site") },
    { href: "https://itqan.dev/projects", label: t("content_management") },
    { href: "https://itqan.dev/resources", label: t("resources") },
  ];
  return (
    <footer className="main-footer">
      <div className="footer-content">
        <div className="footer-info-row">
          <p className="footer-open-source">{t("copyright")}</p>
          <div className="footer-sponsor">
            <span className="footer-sponsor-label">{t("sponsored_by")}</span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/charity.svg" alt="" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="footer-sponsor-maknon" src="/images/maknon.png" alt="" />
          </div>
        </div>
        <div className="footer-links-row">
          <h4 className="footer-links-title">{t("itqan_projects")}</h4>
          <ul className="footer-links-list">
            {links.map((l) => (
              <li key={l.href}>
                <a href={l.href} target="_blank" rel="noopener noreferrer">
                  {l.label}
                </a>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/images/link-square.svg" alt="" />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}
