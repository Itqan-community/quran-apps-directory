import Image from "next/image";
import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { AppListItem } from "@/lib/repo/apps-rows";
import { getLang } from "@/lib/i18n";
import { getAppCached, getAppsCached } from "@/lib/cache/apps";
import { getCategoriesCached } from "@/lib/cache/categories";
import { devUrlParam } from "@/lib/repo/developers";
import { StoreButtons } from "@/components/apps/store-buttons";
import { ScreenshotSwiper } from "@/components/apps/screenshot-swiper";
import { HeroActions, RelatedScroll } from "@/components/apps/hero-actions";
import { ViewTracker } from "@/components/apps/view-tracker";
import { JsonLd } from "@/components/site/jsonld-script";
import { appJsonLd } from "@/lib/seo/jsonld";
import { parseAppParam } from "@/lib/app-params";
import { formatRating } from "@/lib/services/arabic";
import { appUrlParam } from "@/components/apps/app-card";
import { RelatedActions } from "@/components/apps/related-actions";
import { PlatformMarks, getPlatformLabel } from "@/components/apps/platform-marks";
import { DescriptionTextClient } from "./description-text";
import "@/components/apps/app-detail.css";

export default async function AppDetail({
  params,
}: {
  params: Promise<{ lang: string; id: string }>;
}) {
  const { lang, id } = await params;
  const locale = getLang({ lang });
  setRequestLocale(locale);
  const app = (await getAppCached(parseAppParam(id))) ?? (await getAppCached(id));
  const isAr = locale === "ar";
  const [t, tApp, tCategories] = await Promise.all([
    getTranslations({ locale, namespace: "appDetail" }),
    getTranslations({ locale, namespace: "APP" }),
    getTranslations({ locale, namespace: "appList.categories" }),
  ]);

  if (!app) {
    // notFound() inside a streamed boundary doesn't paint in Next 16.4 —
    // render the in-page not-found view instead (matches the category route).
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center py-40 text-center">
        <h1 className="text-3xl font-bold text-text">{tApp("NOT_FOUND_TITLE")}</h1>
        <p className="mt-3 text-sm text-text-secondary">{tApp("NOT_FOUND_MESSAGE")}</p>
        <a
          href={`/${locale}`}
          className="mt-6 rounded-app bg-primary px-4 py-2 text-sm font-bold text-white hover:bg-primary-hover"
        >
          {tApp("BACK_HOME")}
        </a>
      </div>
    );
  }

  const categoryIcons = await getCategoriesCached();
  const related = app.categories[0]
    ? (await getAppsCached({ categorySlugs: [app.categories[0].slug], pageSize: 100 })).results.filter((a) => a.id !== app.id)
    : [];

  const storeCount = [app.googlePlayLink, app.appStoreLink, app.appGalleryLink].filter(Boolean).length;
  const platformLabel: Record<string, string> = {
    android: isAr ? "أندرويد" : "Android",
    ios: isAr ? "آيفون" : "iOS",
    web: isAr ? "ويب" : "Web",
    cross_platform: isAr ? "متعدد المنصات" : "All",
  };

  const screenshots = isAr ? app.screenshotsAr : app.screenshotsEn;
  const description = isAr ? app.descriptionAr : app.descriptionEn;

  return (
    <div>
      <ViewTracker appId={app.id} />
      <JsonLd data={appJsonLd(app, locale)} />

      {/* Hero */}
      <section className="app-hero-section">
        <div className="hero-background" aria-hidden />
        <div className="hero-container">
          <Image
            src={app.applicationIcon}
            alt={isAr ? app.nameAr : app.nameEn}
            width={130}
            height={130}
            priority
            className="app-hero-icon"
          />
          <div className="hero-details-col">
            <h1 className="app-hero-title">{isAr ? app.nameAr : app.nameEn}</h1>
            <p className="app-hero-subtitle">{isAr ? app.shortDescriptionAr : app.shortDescriptionEn}</p>

            <div className="hero-actions-stats-row">
              <HeroActions />
              <div className="hero-stats">
                <div className="stat-item">
                  <span className="stat-value">
                    <span className="rating-star">★</span>
                    {formatRating(Number(app.avgRating), locale)}
                  </span>
                  <span className="stat-label">{t("stats.rating")}</span>
                </div>
                <div className="stat-divider" aria-hidden />
                <div className="stat-item">
                  <span className="stat-value">{storeCount}</span>
                  <span className="stat-label">{isAr ? "متاجر" : "Stores"}</span>
                </div>
                <div className="stat-divider" aria-hidden />
                <div className="stat-item">
                  <span className="stat-value">{platformLabel[app.platform] ?? app.platform}</span>
                  <span className="stat-label">{t("stats.platform")}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Content */}
      <div className="content-section">
        <div className="site-container">
          <div className="details-grid">
            <div className="details-main">
              <h2>{t("description")}</h2>
              <div className="app-description">
                <DescriptionTextClient text={description} labels={{ more: t("readMore"), less: t("readLess") }} />
              </div>
            </div>
            <aside className="details-side">
              <div className="side-block">
                <Link
                  href={`/${locale}/developer/${devUrlParam(app.developer)}`}
                  className="dev-container"
                  aria-label={`${isAr ? "جميع تطبيقات" : "View all apps by"} ${isAr ? app.developer.nameAr : app.developer.nameEn}`}
                >
                  <span className="icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <rect x="2" y="7" width="20" height="14" rx="2" />
                      <path d="M16 3h-8" />
                    </svg>
                  </span>
                  <div className="dev-data">
                    <h2 style={{ marginBottom: 0 }}>{t("developer")}</h2>
                    <p style={{ marginBottom: 0 }}>
                      {isAr ? app.developer.nameAr : app.developer.nameEn}
                    </p>
                  </div>
                </Link>
              </div>
              <div className="side-block">
                <h3 className="side-title">{t("downloadLinks")}</h3>
                <StoreButtons links={app} />
              </div>
            </aside>
          </div>

          <div className="detail-page-divider" aria-hidden />

          <ScreenshotSwiper
            images={screenshots}
            alt={app.nameEn}
            title={t("screenshots")}
            dir={isAr ? "rtl" : "ltr"}
          />

          <div className="detail-page-divider" aria-hidden />

          <div className="categories-section">
            <h2>{tCategories("title")}</h2>
            <div className="categories">
              {app.categories.map((category) => (
                <Link
                  key={category.slug}
                  href={`/${locale}/${category.slug}`}
                  className="category-badge"
                  aria-label={`${isAr ? "تصفية حسب" : "Filter by"} ${isAr ? category.nameAr : category.nameEn}`}
                >
                  <CategoryIconBadge svg={categoryIcons.find((c) => c.slug === category.slug)?.icon ?? null} />
                  <span className="badge-name">{isAr ? category.nameAr : category.nameEn}</span>
                </Link>
              ))}
            </div>
          </div>

          <div className="detail-page-divider" aria-hidden />

          {related.length > 0 && (
            <section>
              <RelatedScroll dir={isAr ? "rtl" : "ltr"} headerTitle={t("relevantApps")}>
                {related.slice(0, 12).map((r) => (
                  <AppLink key={r.id} app={r} lang={locale} />
                ))}
              </RelatedScroll>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

function CategoryIconBadge({ svg }: { svg: string | null }) {
  return <span className="badge-icon" dangerouslySetInnerHTML={{ __html: svg ?? "" }} />;
}

/** Server-rendered related app card, ported from the old related-app-card markup. */
function AppLink({ app, lang }: { app: AppListItem; lang: "ar" | "en" }) {
  const isAr = lang === "ar";
  const cover = (isAr ? app.mainImageAr : app.mainImageEn) || app.applicationIcon;
  const visibleTags = app.categories.slice(0, 3);
  const extraTags = app.categories.slice(3);
  const allTags = [...visibleTags, ...extraTags];
  const detailHref = `/${lang}/app/${appUrlParam(app)}`;

  return (
    <article className="related-app-card">
      <div className="related-card-cover">
        <Link href={detailHref} className="absolute inset-0 z-[1]" aria-label={app.nameEn} />
        <Image
          src={cover}
          alt={`${app.nameEn} screenshot`}
          width={400}
          height={240}
          loading="lazy"
          sizes="300px"
          className="related-cover-image"
        />
      </div>
      <div className="related-card-body">
        <div className="related-app-info">
          <Link href={detailHref} className="related-app-icon-wrapper" aria-label={app.nameEn}>
            <Image
              src={app.applicationIcon}
              alt={`${app.nameEn} icon`}
              width={56}
              height={56}
              loading="lazy"
            />
          </Link>
          <Link href={detailHref} className="related-app-details">
            <h3 className="related-app-name">{isAr ? app.nameAr : app.nameEn}</h3>
            <p className="related-app-description">{isAr ? app.shortDescriptionAr : app.shortDescriptionEn}</p>
          </Link>
        </div>

        {allTags.length > 0 && (
          <div className="related-category-tags">
            {visibleTags.map((c) => (
              <span key={c.slug} className="related-category-tag">
                {isAr ? c.nameAr : c.nameEn}
              </span>
            ))}
            {extraTags.length > 0 && (
              <span className="related-category-tag related-category-more">
                +{extraTags.length}
                <span className="related-category-tooltip">
                  {extraTags.map((c) => (
                    <span key={c.slug} className="related-tooltip-tag">
                      {isAr ? c.nameAr : c.nameEn}
                    </span>
                  ))}
                </span>
              </span>
            )}
          </div>
        )}

        <div className="related-stats-row">
          <div className="related-stat-item">
            <div>
              <span className="related-stat-icon">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/images/starr.svg" alt="" />
              </span>
              <span className="related-stat-value">{formatRating(Number(app.avgRating || 0), lang)}</span>
            </div>
            <span className="related-stat-label">{isAr ? "التقييمات" : "Rating"}</span>
          </div>
          <div className="related-stat-item">
            <div title={getPlatformLabel(app.platform, lang)}>
              <PlatformMarks platform={app.platform} />
              <span className="sr-only">{getPlatformLabel(app.platform, lang)}</span>
            </div>
            <span className="related-stat-label">{isAr ? "المنصة" : "Platform"}</span>
          </div>
        </div>

        <RelatedActions urlParam={appUrlParam(app)} lang={lang} />
      </div>
    </article>
  );
}
