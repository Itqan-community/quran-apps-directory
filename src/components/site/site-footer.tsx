import { getTranslations } from "next-intl/server";

export async function SiteFooter({ lang }: { lang: "ar" | "en" }) {
  const t = await getTranslations({ locale: lang, namespace: "footer" });
  const links = [
    { href: `https://itqan.dev/${lang}`, label: t("main_site") },
    { href: "https://itqan.dev/projects", label: t("content_management") },
    { href: "https://itqan.dev/resources", label: t("resources") },
  ];
  return (
    <footer className="border-t border-border bg-surface">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <p className="text-sm text-text-secondary">{t("copyright")}</p>
          <div className="flex items-center gap-3">
            <span className="text-xs text-text-secondary">{t("sponsored_by")}</span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/charity.svg" alt="" width={28} height={28} />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/maknon.png" alt="" width={72} height={28} />
          </div>
        </div>
        <div>
          <h4 className="mb-2 text-sm font-bold">{t("itqan_projects")}</h4>
          <ul className="flex flex-col gap-2">
            {links.map((l) => (
              <li key={l.href} className="flex items-center gap-2 text-sm">
                <a href={l.href} target="_blank" rel="noopener noreferrer" className="text-text-secondary hover:text-primary">
                  {l.label}
                </a>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/images/link-square.svg" alt="" width={12} height={12} />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}
