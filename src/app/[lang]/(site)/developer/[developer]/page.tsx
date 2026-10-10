import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getLang, isLocale } from "@/lib/i18n";
import { getDeveloperApps, getDeveloperByNameSlug } from "@/lib/repo/developers";
import { getAppListRows } from "@/lib/repo/apps-rows";
import { JsonLd } from "@/components/site/jsonld-script";
import { developerJsonLd } from "@/lib/seo/jsonld";
import { pageMetadata } from "@/lib/seo/metadata";
import { formatRating } from "@/lib/services/arabic";
import "./developer.css";

// DB-driven route: no instant prefetch shell — the validator reruns cached
// queries in an isolated scope and trips on postgres.js's Math.random ids
// (same workaround as the category route).
export const instant = false;

type Props = { params: Promise<{ lang: string; developer: string }> };

function parseDeveloperParam(
  param: string
): { id?: number; nameSlug: string } {
  const lastUnderscore = param.lastIndexOf("_");
  if (lastUnderscore !== -1) {
    const suffix = param.substring(lastUnderscore + 1);
    if (/^\d+$/.test(suffix)) {
      return { id: Number(suffix), nameSlug: param.substring(0, lastUnderscore) };
    }
  }
  return { nameSlug: param };
}

function ratingClass(rating: number): string {
  if (!rating || rating === 0) return "poor";
  if (rating >= 4.5) return "excellent";
  if (rating >= 4.0) return "very-good";
  if (rating >= 3.5) return "good";
  if (rating >= 2.5) return "fair";
  return "poor";
}

function starArray(rating: number): number[] {
  const safeRating = Math.round((Number(rating) || 0) * 10) / 10;
  const stars: number[] = [];
  const fullStars = Math.floor(safeRating);
  const remainder = safeRating % 1;
  for (let i = 0; i < fullStars; i++) stars.push(100);
  if (remainder > 0 && fullStars < 5) stars.push(Math.round(remainder * 100));
  while (stars.length < 5) stars.push(0);
  return stars;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang, developer } = await params;
  if (!isLocale(lang)) return {};
  const parsed = parseDeveloperParam(developer);
  const dev =
    (parsed.id ? (await getDeveloperApps(parsed.id)).developer : null) ??
    (await getDeveloperByNameSlug(parsed.nameSlug));
  if (!dev) return {};
  const isAr = lang === "ar";
  const name = isAr ? dev.nameAr : dev.nameEn;
  return pageMetadata(lang, `/developer/${developer}`, name, "Quran app developer");
}

export default async function DeveloperPage({ params }: Props) {
  const { lang, developer } = await params;
  const locale = getLang({ lang });
  const siteLocale = isLocale(lang) ? locale : null;
  if (!siteLocale) return null as never;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "developer" });
  const tDetail = await getTranslations({ locale, namespace: "appDetail" });
  const parsed = parseDeveloperParam(developer);

  const byId = parsed.id ? await getDeveloperApps(parsed.id) : null;
  let dev = byId?.developer ?? null;
  if (!dev) {
    const row = await getDeveloperByNameSlug(parsed.nameSlug);
    if (!row) notFound();
    dev = {
      id: row.id,
      nameEn: row.nameEn,
      nameAr: row.nameAr,
      website: row.website,
      logo: row.logoUrl,
    };
  }
  const results =
    byId && byId.developer?.id === dev.id
      ? byId.results
      : (await getAppListRows({ developerId: dev.id })).results;
  const isAr = locale === "ar";
  const name = isAr ? dev.nameAr : dev.nameEn;
  const logo = dev.logo ?? "/images/Elements.svg";

  return (
    <main className="developer-page">
      <JsonLd data={developerJsonLd(dev, locale)} />
      <div className="site-container">
        <div className="page-header">
          <Link href={`/${locale}`} className="back-btn" aria-label={isAr ? "رجوع" : "Back to apps list"}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1>{isAr ? `تطبيقات ${name}` : `Apps by ${name}`}</h1>
        </div>

        <div className="developer-info">
          <div className="dev-container">
            <div className="icon">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={logo}
                alt={`${name} logo`}
                className="developer-logo"
              />
            </div>
            <div className="dev-data">
              <h2 style={{ marginBottom: 8 }}>{name}</h2>
              <p style={{ marginBottom: 8 }}>{tDetail("developer")}</p>
              {dev.website && (
                <a href={dev.website} target="_blank" rel="noopener noreferrer" className="visit-btn">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                  </svg>
                  {t("visitWebsite")}
                </a>
              )}
            </div>
          </div>
        </div>

        <div className="detail-divider" aria-hidden />

        <div className="apps-count">
          <h3>
            {results.length} {results.length === 1 ? t("app") : t("apps")}
          </h3>
        </div>

        {results.length === 0 ? (
          <div className="no-apps">
            <p>{t("noApps")}</p>
          </div>
        ) : (
          <div className="dev-grid">
            {results.map((app) => {
              const cls = ratingClass(Number(app.avgRating));
              return (
                <Link
                  key={app.id}
                  href={`/${locale}/app/${app.slug}_${app.id}`}
                  className="dev-card"
                  aria-label={`${isAr ? "عرض تفاصيل" : "View details for"} ${app.nameEn}`}
                >
                  <div style={{ maxHeight: 220, overflow: "hidden" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      alt={`${app.nameEn} screenshot`}
                      src={(isAr ? app.mainImageAr : app.mainImageEn) || app.applicationIcon}
                      style={{ width: "100%", display: "block" }}
                      loading="lazy"
                      decoding="async"
                    />
                  </div>
                  <div className="dev-card-body">
                    <div className="dev-card-row">
                      <div className="app-icon-container">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img className="app-icon" src={app.applicationIcon} alt={`${app.nameEn} icon`} loading="lazy" decoding="async" />
                      </div>
                      <div className="card-data-container">
                        <h3>{isAr ? app.nameAr : app.nameEn}</h3>
                        <p>{isAr ? app.shortDescriptionAr : app.shortDescriptionEn}</p>
                      </div>
                    </div>
                    <div className="dev-rating">
                      <span className={`rating-number ${cls}`}>{formatRating(Number(app.avgRating || 0), locale)}</span>
                      <span className={`custom-stars ${cls}`}>
                        {starArray(Number(app.avgRating || 0)).map((fill, i) => (
                          <span key={i} className="star-container">
                            <span className="star-base" aria-hidden>★</span>
                            <span className="star-fill" aria-hidden style={{ width: `${fill}%` }}>★</span>
                          </span>
                        ))}
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
