import Link from "next/link";
import Image from "next/image";
import { getTranslations } from "next-intl/server";
import type { AppListItem } from "@/lib/repo/apps-rows";
import { Badge } from "./badge";
import { StatItem } from "./stat-item";
import { CardActions } from "./card-actions";

const NEW_APP_THRESHOLD_DAYS = 30;

function isNewApp(createdAt: Date): boolean {
  const threshold = new Date();
  threshold.setDate(threshold.getDate() - NEW_APP_THRESHOLD_DAYS);
  return createdAt >= threshold;
}

export function appUrlParam(app: { slug: string; id: number }): string {
  return `${app.slug}_${app.id}`;
}

export async function AppCard({
  app,
  lang,
  index,
}: {
  app: AppListItem;
  lang: "ar" | "en";
  index: number;
}) {
  const t = await getTranslations({ locale: lang, namespace: "appList" });
  const isAr = lang === "ar";
  const name = isAr ? app.nameAr : app.nameEn;
  const description = isAr ? app.shortDescriptionAr : app.shortDescriptionEn;
  const cover = (isAr ? app.mainImageAr : app.mainImageEn) || app.applicationIcon;
  const isNew = isNewApp(app.createdAt);
  const eager = index < 4;
  const platformLabel: Record<string, string> = {
    android: isAr ? "أندرويد" : "Android",
    ios: isAr ? "آيفون" : "iOS",
    web: isAr ? "ويب" : "Web",
    cross_platform: isAr ? "متعدد المنصات" : "Cross Platform",
  };

  return (
    <article className="overflow-hidden rounded-app border border-border bg-card shadow-app transition-shadow hover:shadow-lg">
      <Link href={`/${lang}/app/${appUrlParam(app)}`} className="block">
        <div className="relative aspect-[5/3] bg-surface">
          {(app.featured || isNew) && (
            <div className="absolute start-2 top-2 z-10 flex gap-1.5">
              {app.featured && (
                <Badge variant="featured">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                  {t("badges.featured")}
                </Badge>
              )}
              {isNew && <Badge variant="new">{t("badges.new")}</Badge>}
            </div>
          )}
          <Image
            src={cover}
            alt={`${app.nameEn} cover`}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            priority={index === 0}
            loading={eager ? "eager" : "lazy"}
            className="object-cover"
          />
        </div>
      </Link>
      <div className="flex flex-col gap-3 p-4">
        <Link href={`/${lang}/app/${appUrlParam(app)}`} className="flex items-center gap-3">
          <Image
            src={app.applicationIcon}
            alt={`${app.nameEn} icon`}
            width={56}
            height={56}
            loading="lazy"
            className="rounded-app border border-border object-cover"
          />
          <div className="min-w-0">
            <h3 className="truncate font-bold text-text">{name}</h3>
            <p className="line-clamp-2 text-sm text-text-secondary">{description}</p>
          </div>
        </Link>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/starr.svg" alt="" width={14} height={14} />
            <span className="text-sm font-bold">{Number(app.avgRating).toFixed(1)}</span>
          </div>
          <StatItem
            value={platformLabel[app.platform] ?? app.platform}
            label={isAr ? "المنصة" : "Platform"}
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {app.categories.map((c) => (
            <span
              key={c.slug}
              className="rounded-app bg-surface px-2 py-0.5 text-xs text-text-secondary"
            >
              {isAr ? c.nameAr : c.nameEn}
            </span>
          ))}
        </div>
        <CardActions urlParam={appUrlParam(app)} lang={lang} />
      </div>
    </article>
  );
}
