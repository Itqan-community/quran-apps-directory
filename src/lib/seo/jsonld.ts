import type { AppDetail } from "@/lib/repo/apps";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://quran-apps.itqan.dev";

export function appUrlParamOf(app: { slug: string; id: number }): string {
  return `${app.slug}_${app.id}`;
}

export function appJsonLd(app: AppDetail, lang: "ar" | "en") {
  const isAr = lang === "ar";
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: isAr ? app.nameAr : app.nameEn,
    description: isAr ? app.descriptionAr : app.descriptionEn,
    url: `${SITE_URL}/${lang}/app/${appUrlParamOf(app)}`,
    image: app.applicationIcon,
    screenshot: isAr ? app.screenshotsAr : app.screenshotsEn,
    applicationCategory: "MobileApplication",
    operatingSystem: ["Android", "iOS"],
    aggregateRating:
      Number(app.avgRating) > 0
        ? {
            "@type": "AggregateRating",
            ratingValue: Number(app.avgRating),
            ratingCount: Math.max(app.reviewCount, 1),
            bestRating: 5,
            worstRating: 1,
          }
        : undefined,
    author: {
      "@type": "Organization",
      name: isAr ? app.developer.nameAr : app.developer.nameEn,
      url: app.developer.website || undefined,
      logo: app.developer.logo || undefined,
    },
    downloadUrl: [app.googlePlayLink, app.appStoreLink, app.appGalleryLink].filter(Boolean),
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
    },
    keywords: app.categories.map((c) => (isAr ? c.nameAr : c.nameEn)).join(", "),
    inLanguage: lang,
  };
}
