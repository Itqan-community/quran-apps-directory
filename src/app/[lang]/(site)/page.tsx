import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getLang } from "@/lib/i18n";
import { getAppsCached } from "@/lib/cache/apps";
import { getCategories } from "@/lib/repo/categories";
import { AppCard } from "@/components/apps/app-card";
import { SearchForm } from "@/components/apps/search-form";
import { JsonLd } from "@/components/site/jsonld-script";
import { websiteJsonLd, itemListJsonLd } from "@/lib/seo/jsonld";

export default async function HomePage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const locale = getLang({ lang });
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "appList" });
  const [{ results: featured }, { results: all }, categories] = await Promise.all([
    getAppsCached({ featured: true, pageSize: 8 }),
    getAppsCached({ pageSize: 100 }),
    getCategories(),
  ]);

  return (
    <main>
      <JsonLd data={websiteJsonLd(locale)} />
      <JsonLd data={itemListJsonLd(all, null, locale)} />
      <section className="relative overflow-hidden px-4 pb-12 pt-16 text-center">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute -top-24 start-1/4 h-72 w-72 rounded-full bg-[var(--hero-warm-soft)] blur-3xl" />
          <div className="absolute top-1/3 end-1/4 h-80 w-80 rounded-full bg-[var(--hero-mint-soft)] blur-3xl" />
        </div>
        <div className="relative mx-auto max-w-3xl">
          <h1 className="text-4xl font-bold text-text sm:text-5xl">{t("hero.title")}</h1>
          <p className="mt-3 text-lg text-text-secondary">{t("hero.subtitle")}</p>
          <SearchForm lang={locale} />
          <div className="mt-8 flex flex-wrap justify-center gap-2">
            {categories.map((c) => (
              <Link
                key={c.id}
                href={`/${locale}/${c.slug}`}
                className="rounded-full border border-border bg-card px-4 py-1.5 text-sm text-text-secondary hover:border-primary hover:text-primary"
              >
                {locale === "ar" ? c.nameAr : c.nameEn}
                <span className="ms-1 text-xs opacity-60">{c.appCount}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {featured.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-8">
          <h2 className="mb-6 text-2xl font-bold text-text">{t("apps.title")}</h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {featured.map((app, i) => (
              <AppCard key={app.id} app={app} lang={locale} index={i} />
            ))}
          </div>
        </section>
      )}

      <section className="mx-auto max-w-7xl px-4 pb-16">
        <h2 className="mb-6 text-2xl font-bold text-text">
          {locale === "ar" ? "جميع التطبيقات" : "All Apps"}
        </h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {all.map((app, i) => (
            <AppCard key={app.id} app={app} lang={locale} index={i} />
          ))}
        </div>
      </section>
    </main>
  );
}
