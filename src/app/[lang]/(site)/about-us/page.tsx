import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getLang, isLocale, type Locale } from "@/lib/i18n";
import { pageMetadata } from "@/lib/seo/metadata";
import { getCategoriesCached } from "@/lib/cache/categories";
import { CategoryIcon } from "@/components/apps/category-icon";
import "./about-us.css";

type Props = { params: Promise<{ lang: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const t = await getTranslations({ locale: lang, namespace: "aboutUs" });
  return pageMetadata(lang, "/about-us", t("title"), t("subtitle"));
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

const VALUES = [
  "accuracyAndAuthenticity",
  "userCentricDesignAndAccessibility",
  "continuousImprovementAndInnovation",
  "communityEngagementAndSupport",
  "transparency",
  "innovation",
] as const;

export default async function AboutUsPage({ params }: Props) {
  const { lang } = await params;
  const locale: Locale = getLang({ lang });
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "aboutUs" });
  const tF = await getTranslations({ locale, namespace: "footer" });
  const categories = await getCategoriesCached();

  return (
    <main className="about-us-page">
      <div className="page-background-left" aria-hidden>
        <span className="ellipse-small" />
      </div>
      <div className="page-background-right" aria-hidden>
        <span className="ellipse-small" />
      </div>

      <section className="about-hero">
        <div className="hero-content">
          <div className="logo-container">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/logo-with-text.svg" alt={t("title")} className="logo" />
          </div>
          <h1 className="about-title">{t("title")}</h1>
          <p className="subtitle">{t("subtitle")}</p>
          <p className="intro">{t("intro")}</p>
        </div>
      </section>

      <div className="about-content">
        <section className="card-section">
          <h2>{t("mission")}</h2>
          <p>{t("missionDescription")}</p>
        </section>

        <section className="card-section">
          <h2>{t("vision")}</h2>
          <p>{t("visionDescription")}</p>
        </section>

        <section className="about-section">
          <h2>{t("whatWeDo")}</h2>
          <div className="features-grid">
            {FEATURES.map((f) => (
              <div key={f} className="about-plain-card">
                <h3>{t(`whatWeDoList.${f}`)}</h3>
              </div>
            ))}
          </div>
        </section>

        <section className="about-section">
          <h2>{t("why")}</h2>
          <div className="benefits-grid">
            {BENEFITS.map((b) => (
              <div key={b} className="benefit-item">
                <span className="check-icon">✓</span>
                <span>{t(`whyList.${b}`)}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="about-section">
          <h2>{t("categories")}</h2>
          <div className="categories-pills">
            {categories.map((c) => (
              <div key={c.id} className="category-pill">
                <CategoryIcon svg={c.icon} size={16} />
                <span>{locale === "ar" ? c.nameAr : c.nameEn}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="about-section">
          <h2>{t("values")}</h2>
          <div className="values-grid">
            {VALUES.map((v) => (
              <div key={v} className="about-plain-card">
                <span>{t(`values_list.${v}`)}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="about-section">
          <h2>{tF("itqan_projects")}</h2>
          <div className="projects-grid">
            {[
              { href: `https://itqan.dev/${locale}`, label: tF("main_site") },
              { href: "https://itqan.dev/projects", label: tF("content_management") },
              { href: "https://itqan.dev/resources", label: tF("resources") },
              { href: "https://itqan.dev/resources/fonts", label: tF("mushaf_fonts") },
            ].map((p) => (
              <a key={p.href} href={p.href} target="_blank" rel="noopener noreferrer" className="project-card">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/images/itqan-logo.svg" alt="" className="project-logo" />
                <span>{p.label}</span>
              </a>
            ))}
          </div>
        </section>

        <section className="acknowledgments-section">
          <h2>{t("acknowledgments")}</h2>
          <p>{t("acknowledgementsText")}</p>
        </section>
      </div>
    </main>
  );
}
