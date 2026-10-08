import type { AppDetail } from "@/lib/repo/apps";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://quran-apps.itqan.dev";

export function appUrlParamOf(app: { slug: string; id: number }): string {
  return `${app.slug}_${app.id}`;
}

export function appJsonLd(app: AppDetail, lang: "ar" | "en") {  const isAr = lang === "ar";
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

export function developerJsonLd(
  developer: { nameEn: string; nameAr: string; website: string | null; logo: string | null },
  lang: "ar" | "en"
) {
  const isAr = lang === "ar";
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: isAr ? developer.nameAr : developer.nameEn,
    url:
      developer.website ||
      `${SITE_URL}/${lang}/developer/${developer.nameEn.toLowerCase().replace(/\s+/g, "-")}`,
    logo: developer.logo
      ? { "@type": "ImageObject", url: developer.logo }
      : undefined,
    description: isAr
      ? "مطور تطبيقات قرآنية متخصص في تقنيات القرآن الكريم"
      : "Quran app developer specialized in Islamic mobile applications",
    specialty: isAr ? "تطبيقات القرآن الكريم" : "Quran Applications",
    makesOffer: {
      "@type": "Offer",
      itemOffered: {
        "@type": "SoftwareApplication",
        applicationCategory: "MobileApplication",
      },
    },
  };
}

export function websiteJsonLd(lang: "ar" | "en") {
  const isAr = lang === "ar";
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: isAr ? "دليل التطبيقات القرآنية الشامل" : "Comprehensive Quranic Directory",
    alternateName: isAr ? "دليل التطبيقات القرآنية" : "Quranic Directory",
    url: `${SITE_URL}/`,
    description: isAr
      ? "الدليل الشامل لأفضل تطبيقات القرآن الكريم - تطبيقات المصحف، التفسير، التلاوة، التحفيظ والتدبر"
      : "The most comprehensive Quranic directory featuring the best Quran apps for reading, memorization, translation, tafsir, and recitation",
    inLanguage: lang,
    publisher: {
      "@type": "Organization",
      name: isAr ? "مجتمع إتقان لتقنيات القرآن" : "ITQAN Community for Quran Technologies",
      url: `${SITE_URL}/`,
      logo: { "@type": "ImageObject", url: `${SITE_URL}/images/logo-with-text.svg` },
    },
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE_URL}/${lang}/apps?search={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

export function itemListJsonLd(
  apps: { id: number; slug: string; nameEn: string; nameAr: string; shortDescriptionEn: string; shortDescriptionAr: string; applicationIcon: string; avgRating: string }[],
  category: string | null,
  lang: "ar" | "en"
) {
  const isAr = lang === "ar";
  const CATEGORY_NAMES: Record<string, { ar: string; en: string }> = {
    mushaf: { ar: "تطبيقات المصحف", en: "Mushaf Apps" },
    tafsir: { ar: "تطبيقات التفسير", en: "Tafsir Apps" },
    translations: { ar: "تطبيقات الترجمة", en: "Translation Apps" },
    audio: { ar: "التلاوات الصوتية", en: "Audio Recitations" },
    recite: { ar: "تطبيقات التسميع", en: "Recitation Apps" },
    kids: { ar: "تطبيقات الأطفال", en: "Kids Apps" },
    riwayat: { ar: "الروايات القرآنية", en: "Quran Narrations" },
    tajweed: { ar: "تطبيقات التجويد", en: "Tajweed Apps" },
    memorize: { ar: "تطبيقات التحفيظ", en: "Memorization Apps" },
    accessibility: { ar: "تطبيقات إمكانية الوصول", en: "Accessibility Applications" },
    tools: { ar: "أدوات قرآنية", en: "Quranic Tools" },
  };
  const categoryName = category ? CATEGORY_NAMES[category]?.[isAr ? "ar" : "en"] ?? category : null;
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: categoryName ?? (isAr ? "جميع تطبيقات القرآن الكريم" : "All Quran Applications"),
    description: categoryName
      ? isAr
        ? `أفضل تطبيقات ${categoryName} للقرآن الكريم`
        : `Best ${categoryName} for the Holy Quran`
      : isAr
        ? "مجموعة شاملة من تطبيقات القرآن الكريم"
        : "Comprehensive collection of Quran applications",
    url: `${SITE_URL}/${lang}${category ? `/${category}` : ""}`,
    numberOfItems: apps.length,
    itemListElement: apps.slice(0, 20).map((app, index) => ({
      "@type": "SoftwareApplication",
      position: index + 1,
      name: isAr ? app.nameAr : app.nameEn,
      description: isAr ? app.shortDescriptionAr : app.shortDescriptionEn,
      url: `${SITE_URL}/${lang}/app/${app.slug}_${app.id}`,
      image: app.applicationIcon,
      applicationCategory: "MobileApplication",
      operatingSystem: ["Android", "iOS"],
      aggregateRating:
        Number(app.avgRating) > 0
          ? {
              "@type": "AggregateRating",
              ratingValue: Number(app.avgRating),
              ratingCount: 1,
              bestRating: 5,
              worstRating: 1,
            }
          : undefined,
    })),
  };
}

export function breadcrumbJsonLd(items: { name: string; url: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.name,
      item: crumb.url,
    })),
  };
}

export function organizationJsonLd(lang: "ar" | "en") {
  const isAr = lang === "ar";
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: isAr ? "مجتمع إتقان لتقنيات القرآن" : "ITQAN Community for Quran Technologies",
    alternateName: isAr ? "إتقان" : "ITQAN",
    url: `${SITE_URL}/`,
    logo: {
      "@type": "ImageObject",
      url: `${SITE_URL}/images/logo-with-text.svg`,
      width: 400,
      height: 100,
    },
    description: isAr
      ? "مجتمع متخصص في تقنيات القرآن الكريم وتطوير التطبيقات الإسلامية وتوفير دليل شامل لأفضل تطبيقات القرآن"
      : "Community specialized in Quran technologies, Islamic application development, and providing comprehensive directory of the best Quran apps",
    foundingDate: "2020",
    specialty: isAr ? "تقنيات القرآن الكريم" : "Quran Technologies",
    knowsAbout: isAr
      ? ["تطبيقات القرآن الكريم", "التطبيقات الإسلامية", "تقنيات المصحف الشريف", "تطبيقات التفسير"]
      : ["Quran Applications", "Islamic Apps", "Mushaf Technologies", "Tafsir Applications"],
    sameAs: [
      "https://github.com/Itqan-community",
      "https://x.com/itqan_community",
      "https://community.itqan.dev",
      "https://discord.gg/24CskUbuuB",
    ],
    contactPoint: [
      {
        "@type": "ContactPoint",
        contactType: "customer support",
        url: `${SITE_URL}/${lang}/contact-us`,
        email: "connect@itqan.dev",
        availableLanguage: ["Arabic", "English"],
      },
      {
        "@type": "ContactPoint",
        contactType: "technical support",
        url: `${SITE_URL}/${lang}/contact-us`,
        email: "connect@itqan.dev",
        availableLanguage: ["Arabic", "English"],
      },
    ],
    areaServed: "Worldwide",
    audience: {
      "@type": "Audience",
      audienceType: isAr ? "المسلمون وطلاب القرآن" : "Muslims and Quran Students",
    },
  };
}

export function faqJsonLd(lang: "ar" | "en") {
  const faqs = lang === "ar"
    ? [
        {
          question: "ما هو دليل التطبيقات القرآنية؟",
          answer: "دليل شامل يضم أفضل تطبيقات القرآن الكريم المتاحة للأجهزة المحمولة، يشمل تطبيقات المصحف والتفسير والتلاوة والتحفيظ والتدبر.",
        },
        {
          question: "كم عدد التطبيقات المتوفرة في الدليل؟",
          answer: "يحتوي الدليل على أكثر من 40 تطبيقاً قرآنياً متنوعاً، مع معلومات مفصلة عن كل تطبيق وتقييمات المستخدمين.",
        },
        {
          question: "هل التطبيقات مجانية؟",
          answer: "معظم التطبيقات المدرجة مجانية، ونوضح بوضوح التطبيقات المدفوعة مع تفاصيل الأسعار والميزات.",
        },
        {
          question: "كيف يتم اختيار التطبيقات؟",
          answer: "نختار التطبيقات بناءً على معايير الجودة والأمان وتقييمات المستخدمين والميزات المتوفرة ومدى مطابقتها لتعاليم الإسلام.",
        },
      ]
    : [
        {
          question: "What is the Quran Apps Directory?",
          answer: "A comprehensive directory featuring the best Quran applications available for mobile devices, including Mushaf, Tafsir, recitation, memorization, and reflection apps.",
        },
        {
          question: "How many apps are available in the directory?",
          answer: "The directory contains over 40 diverse Quran applications, with detailed information about each app and user ratings.",
        },
        {
          question: "Are the apps free?",
          answer: "Most listed applications are free, and we clearly indicate paid apps with pricing details and features.",
        },
        {
          question: "How are apps selected?",
          answer: "We select apps based on quality criteria, security, user ratings, available features, and compliance with Islamic teachings.",
        },
      ];
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: { "@type": "Answer", text: faq.answer },
    })),
  };
}

export function collectionPageJsonLd(
  categoryName: string,
  apps: { id: number; slug: string; nameEn: string; nameAr: string }[],
  lang: "ar" | "en",
) {
  const isAr = lang === "ar";
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: categoryName,
    description: isAr
      ? `مجموعة مختارة من أفضل ${categoryName} للقرآن الكريم`
      : `Curated collection of the best ${categoryName} for the Holy Quran`,
    url: `${SITE_URL}/${lang}`,
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: apps.length,
      itemListElement: apps.slice(0, 20).map((app, index) => ({
        "@type": "SoftwareApplication",
        position: index + 1,
        name: isAr ? app.nameAr : app.nameEn,
        url: `${SITE_URL}/${lang}/app/${app.slug}_${app.id}`,
      })),
    },
    breadcrumb: {
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: isAr ? "الرئيسية" : "Home",
          item: `${SITE_URL}/${lang}`,
        },
        { "@type": "ListItem", position: 2, name: categoryName },
      ],
    },
  };
}
