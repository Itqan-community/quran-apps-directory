import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getLang, isLocale } from "@/lib/i18n";
import { getDeveloperApps, getDeveloperByNameSlug } from "@/lib/repo/developers";
import { getAppListRows } from "@/lib/repo/apps-rows";
import { AppCard } from "@/components/apps/app-card";
import { JsonLd } from "@/components/site/jsonld-script";
import { developerJsonLd } from "@/lib/seo/jsonld";
import { pageMetadata } from "@/lib/seo/metadata";

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
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "developer" });
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

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <JsonLd data={developerJsonLd(dev, locale)} />
      <div className="mb-8 flex items-center gap-4">
        {dev.logo && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={dev.logo} alt={dev.nameEn} width={64} height={64} className="rounded-app border border-border" />
        )}
        <div>
          <h1 className="text-2xl font-bold text-text">{isAr ? dev.nameAr : dev.nameEn}</h1>
          {dev.website && (
            <a
              href={dev.website}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary hover:underline"
            >
              {t("visitWebsite")}
            </a>
          )}
        </div>
        <span className="ms-auto text-sm text-text-secondary">
          {results.length} {results.length === 1 ? t("app") : t("apps")}
        </span>
      </div>
      {results.length === 0 ? (
        <p className="py-16 text-center text-text-secondary">{t("noApps")}</p>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {results.map((app, i) => (
            <AppCard key={app.id} app={app} lang={locale} index={i} />
          ))}
        </div>
      )}
    </main>
  );
}
