import Link from "next/link";
import Image from "next/image";
import { getTranslations } from "next-intl/server";
import type { MatchReason } from "@/lib/ai/rank";
import type { AppListItem } from "@/lib/repo/apps-rows";
import { formatRating } from "@/lib/services/arabic";
import { StatItem } from "./stat-item";
import { CardActions } from "./card-actions";

const NEW_APP_THRESHOLD_DAYS = 30; // enforced in getAppListRows (SQL: now() - 30d)

export function appUrlParam(app: { slug: string; id: number }): string {
  return `${app.slug}_${app.id}`;
}

export async function AppCard({
  app,
  lang,
  index,
  matchReasons,
}: {
  app: AppListItem;
  lang: "ar" | "en";
  index: number;
  matchReasons?: MatchReason[];
}) {
  const t = await getTranslations({ locale: lang, namespace: "appList" });
  const isAr = lang === "ar";
  const name = isAr ? app.nameAr : app.nameEn;
  const description = isAr ? app.shortDescriptionAr : app.shortDescriptionEn;
  const cover = (isAr ? app.mainImageAr : app.mainImageEn) || app.applicationIcon;
  const isNew = app.isNew;
  const eager = index < 4;
  const platformLabel: Record<string, string> = {
    android: isAr ? "أندرويد" : "Android",
    ios: isAr ? "آيفون" : "iOS",
    web: isAr ? "ويب" : "Web",
    cross_platform: isAr ? "متعدد المنصات" : "All",
  };
  const detailHref = `/${lang}/app/${appUrlParam(app)}`;
  const visibleTags = app.categories.slice(0, 3);
  const extraTags = app.categories.slice(3);
  const allTags = [...visibleTags, ...extraTags];

  return (
    <article
      className="app-card"
      itemScope
      itemType="https://schema.org/SoftwareApplication"
      data-app-id={app.id}
    >
      {/* Cover */}
      <div className="card-cover">
        {(app.featured || isNew) && (
          <div className="card-badges">
            {app.featured && (
              <span className="badge badge--featured">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
                {t("badges.featured")}
              </span>
            )}
            {isNew && <span className="badge badge--new">{t("badges.new")}</span>}
          </div>
        )}
        <Link href={detailHref} className="absolute inset-0 z-[1]" aria-label={name} />
        <Image
          src={cover}
          alt={`${app.nameEn} screenshot`}
          width={400}
          height={240}
          priority={eager}
          loading={eager ? "eager" : "lazy"}
          fetchPriority={index === 0 ? "high" : "low"}
          sizes="(max-width: 640px) 50vw, 33vw"
          className="cover-image"
        />
      </div>

      {/* Body */}
      <div className="card-body">
        <div className="app-info">
          <Link href={detailHref} className="app-icon-wrapper" aria-label={name}>
            <Image
              src={app.applicationIcon}
              alt={`${app.nameEn} icon`}
              width={56}
              height={56}
              loading="lazy"
              className="app-icon"
            />
          </Link>
          <Link href={detailHref} className="app-details">
            <h3 className="app-name" itemProp="name">
              {name}
            </h3>
            <p className="app-description" itemProp="description">
              {description}
            </p>
          </Link>
        </div>

        {/* Category tags */}
        {allTags.length > 0 && (
          <div className="category-tags">
            {visibleTags.map((c) => (
              <span key={c.slug} className="category-tag">
                {isAr ? c.nameAr : c.nameEn}
              </span>
            ))}
            {extraTags.length > 0 && (
              <span className="category-tag category-more">
                +{extraTags.length}
                <span className="category-tooltip">
                  {extraTags.map((c) => (
                    <span key={c.slug} className="tooltip-tag">
                      {isAr ? c.nameAr : c.nameEn}
                    </span>
                  ))}
                </span>
              </span>
            )}
          </div>
        )}

        {/* Match reasons (smart search only) — up to 3 chips, localized by lang */}
        {matchReasons && matchReasons.length > 0 && (
          <div className="match-reasons category-tags">
            {matchReasons.slice(0, 3).map((mr, i) => (
              <span
                key={`${mr.type}:${mr.value}:${i}`}
                className="match-reason-chip category-tag"
                title={t("search.aiReasoning")}
              >
                {isAr ? mr.labelAr : mr.labelEn}
              </span>
            ))}
          </div>
        )}

        {/* Stats row */}
        <div className="stats-row">
          <StatItem
            value={formatRating(Number(app.avgRating || 0), lang)}
            label={isAr ? "التقييم" : "Rating"}
            iconSrc="/images/starr.svg"
          />
          <StatItem
            value={platformLabel[app.platform] ?? app.platform}
            label={isAr ? "المنصة" : "Platform"}
          />
        </div>

        {/* Actions */}
        <CardActions urlParam={appUrlParam(app)} lang={lang} />
      </div>

      <meta itemProp="applicationCategory" content="Islamic Application" />
      <meta itemProp="operatingSystem" content="Mobile App" />
    </article>
  );
}
