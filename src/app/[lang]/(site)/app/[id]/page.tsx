import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getLang, isLocale } from "@/lib/i18n";
import { getAppCached } from "@/lib/cache/apps";
import { devUrlParam } from "@/lib/repo/developers";
import { StoreButtons } from "@/components/apps/store-buttons";
import { ScreenshotSwiper } from "@/components/apps/screenshot-swiper";
import { ViewTracker } from "@/components/apps/view-tracker";
import { JsonLd } from "@/components/site/jsonld-script";
import { appJsonLd } from "@/lib/seo/jsonld";
import { pageMetadata } from "@/lib/seo/metadata";

import { parseAppParam } from "@/lib/app-params";

type Props = { params: Promise<{ lang: string; id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang, id } = await params;
  if (!isLocale(lang)) return {};
  const app = await getAppCached(parseAppParam(id));
  if (!app) return {};
  const isAr = lang === "ar";
  const title = isAr ? app.nameAr : app.nameEn;
  const description = isAr ? app.shortDescriptionAr : app.shortDescriptionEn;
  return pageMetadata(lang, `/app/${id}`, title, description, app.mainImageEn);
}

export default async function AppDetailPage({ params }: Props) {
  const { lang, id } = await params;
  const locale = getLang({ lang });
  setRequestLocale(locale);
  const app = (await getAppCached(parseAppParam(id))) ?? (await getAppCached(id));
  if (!app) notFound();
  const isAr = locale === "ar";
  const t = await getTranslations({ locale, namespace: "appDetail" });

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <ViewTracker appId={app.id} />
      <JsonLd data={appJsonLd(app, locale)} />
      <div className="grid gap-8 md:grid-cols-[1fr_2fr]">
        <div className="flex flex-col gap-4">
          <Image
            src={isAr ? app.mainImageAr : app.mainImageEn}
            alt={app.nameEn}
            width={640}
            height={360}
            priority
            className="w-full rounded-app border border-border object-cover"
          />
          <StoreButtons links={app} lang={locale} />
        </div>
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <Image
              src={app.applicationIcon}
              alt={app.nameEn}
              width={72}
              height={72}
              className="rounded-app border border-border"
            />
            <div>
              <h1 className="text-2xl font-bold text-text">{isAr ? app.nameAr : app.nameEn}</h1>
              <Link
                href={`/${locale}/developer/${devUrlParam(app.developer)}`}
                className="text-sm text-primary hover:underline"
              >
                {isAr ? app.developer.nameAr : app.developer.nameEn}
              </Link>
            </div>
            <div className="ms-auto text-center">
              <div className="flex items-center gap-1">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/images/starr.svg" alt="" width={16} height={16} />
                <span className="font-bold">{Number(app.avgRating).toFixed(1)}</span>
              </div>
              <span className="text-xs text-text-secondary">{t("stats.rating")}</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {app.categories.map((c) => (
              <Link
                key={c.slug}
                href={`/${locale}/${c.slug}`}
                className="rounded-app bg-surface px-2 py-0.5 text-xs text-text-secondary hover:text-primary"
              >
                {isAr ? c.nameAr : c.nameEn}
              </Link>
            ))}
          </div>
          <div className="whitespace-pre-line text-text">
            <h2 className="mb-2 text-lg font-bold">{t("description")}</h2>
            {isAr ? app.descriptionAr : app.descriptionEn}
          </div>
          {app.developer.website && (
            <a
              href={app.developer.website}
              target="_blank"
              rel="noopener noreferrer"
              className="w-max rounded-app border border-border px-3 py-2 text-sm text-text-secondary hover:border-primary hover:text-primary"
            >
              {isAr ? "زيارة الموقع" : "Visit website"}
            </a>
          )}
        </div>
      </div>
      <section className="mt-8">
        <h2 className="mb-4 text-lg font-bold">{t("screenshots")}</h2>
        <ScreenshotSwiper images={isAr ? app.screenshotsAr : app.screenshotsEn} alt={app.nameEn} />
      </section>
    </main>
  );
}
