import type { Metadata } from "next";
import Image from "next/image";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getLang, isLocale, type Locale } from "@/lib/i18n";
import { pageMetadata } from "@/lib/seo/metadata";

type Props = { params: Promise<{ lang: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const t = await getTranslations({ locale: lang, namespace: "aboutUs" });
  return pageMetadata(lang, "/about-us", t("title"), t("subtitle"));
}

function FeatureCard({ title }: { title: string }) {
  return (
    <div className="rounded-app border border-border bg-card p-5 text-center">
      <h3 className="text-sm font-bold text-text">{title}</h3>
    </div>
  );
}

const FEATURES = [
  "comprehensive",
  "categories",
  "bilingual",
  "quality",
  "search",
  "community",
] as const;

const BENEFITS = [
  "largest",
  "verified",
  "expert",
  "updated",
  "free",
  "opensource",
] as const;

export default async function AboutUsPage({ params }: Props) {
  const { lang } = await params;
  const locale: Locale = getLang({ lang });
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "aboutUs" });
  const tCat = await getTranslations({ locale, namespace: "appList.categories" });
  const tF = await getTranslations({ locale, namespace: "footer" });

  const categoryPills = [
    { icon: "/images/quran-02.svg", label: tCat("mushaf") },
    { icon: "/images/salah.svg", label: tCat("memorize") },
    { icon: "/images/translate.svg", label: tCat("translations") },
    { icon: "/images/mic-01.svg", label: tCat("recite") },
    { icon: "/images/ramadhan-02.svg", label: tCat("tafsir") },
    { icon: "/images/baby-01.svg", label: tCat("kids") },
    { icon: "/images/reminder.svg", label: tCat("audio") },
    { icon: "/images/disability-02.svg", label: tCat("accessibility") },
    { icon: "/images/Elements.svg", label: tCat("tajweed") },
    { icon: "/images/reminder.svg", label: tCat("riwayat") },
  ];

  const VALUES = [
    "accuracyAndAuthenticity",
    "userCentricDesignAndAccessibility",
    "continuousImprovementAndInnovation",
    "communityEngagementAndSupport",
    "transparency",
    "innovation",
  ] as const;

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <section className="mb-10 text-center">
        <Image
          src="/images/logo-with-text.svg"
          alt=""
          width={220}
          height={60}
          className="mx-auto"
          priority
        />
        <h1 className="mt-6 text-3xl font-bold text-text">{t("title")}</h1>
        <p className="mt-3 text-lg text-text-secondary">{t("subtitle")}</p>
        <p className="mt-6 text-sm leading-relaxed text-text-secondary">{t("intro")}</p>
      </section>

      <section className="mb-6 rounded-app border border-border bg-card p-6">
        <h2 className="mb-3 text-xl font-bold text-text">{t("mission")}</h2>
        <p className="text-sm leading-relaxed text-text-secondary">{t("missionDescription")}</p>
      </section>

      <section className="mb-6 rounded-app border border-border bg-card p-6">
        <h2 className="mb-3 text-xl font-bold text-text">{t("vision")}</h2>
        <p className="text-sm leading-relaxed text-text-secondary">{t("visionDescription")}</p>
      </section>

      <section className="mb-6">
        <h2 className="mb-4 text-xl font-bold text-text">{t("whatWeDo")}</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <FeatureCard key={f} title={t(`whatWeDoList.${f}`)} />
          ))}
        </div>
      </section>

      <section className="mb-6">
        <h2 className="mb-4 text-xl font-bold text-text">{t("why")}</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {BENEFITS.map((b) => (
            <div key={b} className="flex items-center gap-3 rounded-app bg-card p-3 text-sm text-text">
              <span className="text-primary">✓</span>
              <span>{t(`whyList.${b}`)}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-6">
        <h2 className="mb-4 text-xl font-bold text-text">{t("categories")}</h2>
        <div className="flex flex-wrap gap-3">
          {categoryPills.map((p) => (
            <div key={p.label} className="flex items-center gap-2 rounded-app border border-border bg-card px-4 py-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.icon} alt="" width={18} height={18} />
              <span className="text-sm text-text">{p.label}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-6">
        <h2 className="mb-4 text-xl font-bold text-text">{t("values")}</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {VALUES.map((v) => (
            <div key={v} className="rounded-app border border-border bg-card p-3 text-sm text-text">
              {t(`values_list.${v}`)}
            </div>
          ))}
        </div>
      </section>

      <section className="mb-6">
        <h2 className="mb-4 text-xl font-bold text-text">{tF("itqan_projects")}</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {[
            { href: `https://itqan.dev/${locale}`, label: tF("main_site") },
            { href: "https://itqan.dev/projects", label: tF("content_management") },
            { href: "https://itqan.dev/resources", label: tF("resources") },
            { href: "https://itqan.dev/resources/fonts", label: tF("mushaf_fonts") },
          ].map((p) => (
            <a
              key={p.href}
              href={p.href}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 rounded-app border border-border bg-card p-4 text-sm text-text hover:border-primary"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/itqan-logo.svg" alt="" width={28} height={28} />
              <span>{p.label}</span>
            </a>
          ))}
        </div>
      </section>

      <section className="mb-6">
        <h2 className="mb-4 text-xl font-bold text-text">{t("acknowledgments")}</h2>
        <p className="text-sm leading-relaxed text-text-secondary">{t("acknowledgementsText")}</p>
      </section>
    </main>
  );
}
