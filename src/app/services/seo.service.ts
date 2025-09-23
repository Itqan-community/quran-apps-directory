import { Injectable, inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';

@Injectable({
  providedIn: 'root'
})
export class SeoService {
  private document = inject(DOCUMENT);

  constructor() { }

  /**
   * Add JSON-LD structured data to the page
   * @param data The structured data object
   */
  addStructuredData(data: any): void {
    const script = this.document.createElement('script');
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify(data);
    
    // Remove existing structured data script if exists
    const existingScript = this.document.querySelector('script[type="application/ld+json"]');
    if (existingScript) {
      existingScript.remove();
    }
    
    this.document.head.appendChild(script);
  }

  /**
   * Generate structured data for the main website
   */
  generateWebsiteStructuredData(lang: 'ar' | 'en'): any {
    const baseData = {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "name": lang === 'ar' ? "دليل التطبيقات القرآنية الشامل" : "Comprehensive Quranic Directory",
      "alternateName": lang === 'ar' ? "دليل التطبيقات القرآنية" : "Quranic Directory",
      "url": "https://quran-apps.itqan.dev/",
      "description": lang === 'ar' 
        ? "الدليل الشامل لأفضل تطبيقات القرآن الكريم - تطبيقات المصحف، التفسير، التلاوة، التحفيظ والتدبر" 
        : "The most comprehensive Quranic directory featuring the best Quran apps for reading, memorization, translation, tafsir, and recitation",
      "inLanguage": lang,
      "publisher": {
        "@type": "Organization",
        "name": lang === 'ar' ? "مجتمع إتقان لتقنيات القرآن" : "ITQAN Community for Quran Technologies",
        "url": "https://quran-apps.itqan.dev/",
        "logo": {
          "@type": "ImageObject",
          "url": "https://quran-apps.itqan.dev/assets/images/logo-with-text.svg"
        }
      },
      "potentialAction": {
        "@type": "SearchAction",
        "target": {
          "@type": "EntryPoint",
          "urlTemplate": `https://quran-apps.itqan.dev/${lang}?search={search_term_string}`
        },
        "query-input": "required name=search_term_string"
      }
    };

    return baseData;
  }

  /**
   * Generate structured data for app listings page
   */
  generateItemListStructuredData(apps: any[], category: string | null, lang: 'ar' | 'en'): any {
    const categoryNames = {
      'ar': {
        'mushaf': 'تطبيقات المصحف',
        'tafsir': 'تطبيقات التفسير',
        'translations': 'تطبيقات الترجمة',
        'audio': 'التلاوات الصوتية',
        'recite': 'تطبيقات التسميع',
        'kids': 'تطبيقات الأطفال',
        'riwayat': 'الروايات القرآنية',
        'tajweed': 'تطبيقات التجويد'
      },
      'en': {
        'mushaf': 'Mushaf Apps',
        'tafsir': 'Tafsir Apps',
        'translations': 'Translation Apps',
        'audio': 'Audio Recitations',
        'recite': 'Recitation Apps',
        'kids': 'Kids Apps',
        'riwayat': 'Quran Narrations',
        'tajweed': 'Tajweed Apps'
      }
    };

    const items = apps.slice(0, 20).map((app, index) => ({
      "@type": "SoftwareApplication",
      "position": index + 1,
      "name": lang === 'ar' ? app.Name_Ar : app.Name_En,
      "description": lang === 'ar' ? app.Short_Description_Ar : app.Short_Description_En,
      "url": `https://quran-apps.itqan.dev/${lang}/app/${app.id}`,
      "image": app.applicationIcon,
      "applicationCategory": "MobileApplication",
      "operatingSystem": ["Android", "iOS"],
      "aggregateRating": app.Apps_Avg_Rating ? {
        "@type": "AggregateRating",
        "ratingValue": app.Apps_Avg_Rating,
        "ratingCount": "100+",
        "bestRating": 5,
        "worstRating": 1
      } : undefined,
      "author": {
        "@type": "Organization",
        "name": lang === 'ar' ? app.Developer_Name_Ar : app.Developer_Name_En
      }
    }));

    return {
      "@context": "https://schema.org",
      "@type": "ItemList",
      "name": category 
        ? (lang === 'ar' ? categoryNames.ar[category as keyof typeof categoryNames.ar] : categoryNames.en[category as keyof typeof categoryNames.en])
        : (lang === 'ar' ? "جميع تطبيقات القرآن الكريم" : "All Quran Applications"),
      "description": category 
        ? `${lang === 'ar' ? 'أفضل' : 'Best'} ${category} ${lang === 'ar' ? 'للقرآن الكريم' : 'for Holy Quran'}`
        : (lang === 'ar' ? "مجموعة شاملة من تطبيقات القرآن الكريم" : "Comprehensive collection of Quran applications"),
      "url": `https://quran-apps.itqan.dev/${lang}${category ? `/${category}` : ''}`,
      "numberOfItems": apps.length,
      "itemListElement": items
    };
  }

  /**
   * Generate structured data for individual app page
   */
  generateAppStructuredData(app: any, lang: 'ar' | 'en'): any {
    return {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      "name": lang === 'ar' ? app.Name_Ar : app.Name_En,
      "description": lang === 'ar' ? app.Description_Ar : app.Description_En,
      "url": `https://quran-apps.itqan.dev/${lang}/app/${app.id}`,
      "image": app.applicationIcon,
      "screenshot": lang === 'ar' ? app.screenshots_ar : app.screenshots_en,
      "applicationCategory": "MobileApplication",
      "operatingSystem": ["Android", "iOS"],
      "aggregateRating": app.Apps_Avg_Rating ? {
        "@type": "AggregateRating",
        "ratingValue": app.Apps_Avg_Rating,
        "ratingCount": "100+",
        "bestRating": 5,
        "worstRating": 1
      } : undefined,
      "author": {
        "@type": "Organization",
        "name": lang === 'ar' ? app.Developer_Name_Ar : app.Developer_Name_En,
        "url": app.Developer_Website || undefined,
        "logo": app.Developer_Logo || undefined
      },
      "downloadUrl": [
        app.Google_Play_Link,
        app.AppStore_Link,
        app.App_Gallery_Link
      ].filter(Boolean),
      "offers": {
        "@type": "Offer",
        "price": "0",
        "priceCurrency": "USD",
        "availability": "https://schema.org/InStock"
      },
      "keywords": app.categories?.join(', '),
      "inLanguage": lang
    };
  }

  /**
   * Generate BreadcrumbList structured data
   */
  generateBreadcrumbStructuredData(breadcrumbs: Array<{name: string, url: string}>, lang: 'ar' | 'en'): any {
    return {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": breadcrumbs.map((crumb, index) => ({
        "@type": "ListItem",
        "position": index + 1,
        "name": crumb.name,
        "item": crumb.url
      }))
    };
  }

  /**
   * Generate Organization structured data
   */
  generateOrganizationStructuredData(lang: 'ar' | 'en'): any {
    return {
      "@context": "https://schema.org",
      "@type": "Organization",
      "name": lang === 'ar' ? "مجتمع إتقان لتقنيات القرآن" : "ITQAN Community for Quran Technologies",
      "url": "https://quran-apps.itqan.dev/",
      "logo": {
        "@type": "ImageObject",
        "url": "https://quran-apps.itqan.dev/assets/images/logo-with-text.svg"
      },
      "description": lang === 'ar' 
        ? "مجتمع متخصص في تقنيات القرآن الكريم وتطوير التطبيقات الإسلامية" 
        : "Community specialized in Quran technologies and Islamic application development",
      "sameAs": [
        "https://github.com/itqan-org"
      ],
      "contactPoint": {
        "@type": "ContactPoint",
        "contactType": "customer support",
        "url": `https://quran-apps.itqan.dev/${lang}/contact-us`
      }
    };
  }
}
