/**
 * Cloudflare Pages Function - OG Tags + Asset 404 Handler
 *
 * Features:
 * 1. Intercept crawler requests and inject dynamic OG tags
 * 2. Return proper 404 for missing static assets (prevents HTML-as-JS errors)
 */

interface CFContext {
  request: Request;
  next: () => Promise<Response>;
}

// Crawler User-Agents to detect
const CRAWLER_USER_AGENTS = [
  'WhatsApp',
  'facebookexternalhit',
  'Facebot',
  'Twitterbot',
  'LinkedInBot',
  'TelegramBot',
  'Slackbot',
  'Discordbot',
  'Pinterest',
  'Googlebot',
  'bingbot',
];

const API_BASE = 'https://qad-backend-api-production.up.railway.app/api';
const BASE_URL = 'https://quran-apps.itqan.dev';
const DEFAULT_IMAGE = `${BASE_URL}/assets/images/Social-Media-Thumnail.webp`;

// Types
interface RouteInfo {
  type: 'home' | 'app' | 'developer' | 'category' | 'other';
  lang: 'en' | 'ar';
  slug?: string;
}

interface OGTags {
  title: string;
  description: string;
  image: string;
  imageWidth?: number;
  imageHeight?: number;
  url: string;
  type: string;
  locale: string;
}

// Helper functions
const isCrawler = (userAgent: string): boolean => {
  return CRAWLER_USER_AGENTS.some(crawler =>
    userAgent.toLowerCase().includes(crawler.toLowerCase())
  );
};

const parseRoute = (pathname: string): RouteInfo => {
  const parts = pathname.split('/').filter(Boolean);
  const lang = (parts[0] === 'ar' ? 'ar' : 'en') as 'en' | 'ar';

  if (parts.length <= 1) return { type: 'home', lang };
  if (parts[1] === 'app' && parts[2]) return { type: 'app', lang, slug: parts[2] };
  if (parts[1] === 'developer' && parts[2]) return { type: 'developer', lang, slug: parts[2] };
  if (parts.length === 2) return { type: 'category', lang, slug: parts[1] };
  return { type: 'other', lang };
};

const escapeHtml = (text: string): string => {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

// API fetchers
const fetchAppData = async (slug: string): Promise<any> => {
  try {
    const response = await fetch(`${API_BASE}/apps/${slug}`);
    if (!response.ok) return null;
    return response.json();
  } catch {
    return null;
  }
};

const fetchDeveloperData = async (slug: string): Promise<any> => {
  try {
    const response = await fetch(`${API_BASE}/developers/${slug}`);
    if (!response.ok) return null;
    return response.json();
  } catch {
    return null;
  }
};

const fetchCategoryData = async (slug: string): Promise<any> => {
  try {
    const response = await fetch(`${API_BASE}/categories/${slug}`);
    if (!response.ok) return null;
    return response.json();
  } catch {
    return null;
  }
};

// OG tag generation
const generateOGTags = (route: RouteInfo, data: any): OGTags => {
  // App page
  if (route.type === 'app' && data) {
    const title = route.lang === 'ar' ? data.name_ar : data.name_en;
    const description = route.lang === 'ar'
      ? (data.short_description_ar || data.description_ar)
      : (data.short_description_en || data.description_en);

    const hasAppIcon = !!data.application_icon;
    return {
      title: title || 'Quran App',
      description: description || '',
      image: data.application_icon || DEFAULT_IMAGE,
      imageWidth: hasAppIcon ? 512 : 1200,
      imageHeight: hasAppIcon ? 512 : 630,
      url: `${BASE_URL}/${route.lang}/app/${data.slug}`,
      type: 'website',
      locale: route.lang === 'ar' ? 'ar_SA' : 'en_US',
    };
  }

  // Developer page
  if (route.type === 'developer' && data) {
    const title = route.lang === 'ar'
      ? `${data.name_ar || data.name_en} - مطور تطبيقات`
      : `${data.name_en || data.name_ar} - App Developer`;
    const description = route.lang === 'ar'
      ? `اكتشف تطبيقات ${data.name_ar || data.name_en}`
      : `Discover apps by ${data.name_en || data.name_ar}`;

    const hasLogo = !!data.logo_url;
    return {
      title,
      description,
      image: data.logo_url || DEFAULT_IMAGE,
      imageWidth: hasLogo ? 512 : 1200,
      imageHeight: hasLogo ? 512 : 630,
      url: `${BASE_URL}/${route.lang}/developer/${data.slug}`,
      type: 'website',
      locale: route.lang === 'ar' ? 'ar_SA' : 'en_US',
    };
  }

  // Category page
  if (route.type === 'category' && data) {
    const title = route.lang === 'ar' ? data.name_ar : data.name_en;
    const description = route.lang === 'ar'
      ? `تطبيقات ${data.name_ar} - دليل التطبيقات القرآنية`
      : `${data.name_en} Apps - Quran Apps Directory`;

    return {
      title: title || 'Category',
      description,
      image: DEFAULT_IMAGE,
      imageWidth: 1200,
      imageHeight: 630,
      url: `${BASE_URL}/${route.lang}/${route.slug}`,
      type: 'website',
      locale: route.lang === 'ar' ? 'ar_SA' : 'en_US',
    };
  }

  // Default/home page
  return {
    title: route.lang === 'ar'
      ? 'دليل التطبيقات القرآنية الشامل'
      : 'Quran Apps Directory',
    description: route.lang === 'ar'
      ? 'الدليل الشامل لأفضل تطبيقات القرآن الكريم - تطبيقات المصحف، التفسير، التلاوة، التحفيظ والتدبر'
      : 'Discover the best Quran applications - Mushaf, Tafsir, Recitation, Memorization and more',
    image: DEFAULT_IMAGE,
    imageWidth: 1200,
    imageHeight: 630,
    url: `${BASE_URL}/${route.lang}`,
    type: 'website',
    locale: route.lang === 'ar' ? 'ar_SA' : 'en_US',
  };
};

// HTML injection
const injectOGTags = (html: string, tags: OGTags): string => {
  const widthTag = tags.imageWidth ? `\n    <meta property="og:image:width" content="${tags.imageWidth}" />` : '';
  const heightTag = tags.imageHeight ? `\n    <meta property="og:image:height" content="${tags.imageHeight}" />` : '';

  const ogTagsHtml = `<!-- Dynamic OG Tags -->
    <meta property="og:type" content="${tags.type}" />
    <meta property="og:url" content="${tags.url}" />
    <meta property="og:title" content="${escapeHtml(tags.title)}" />
    <meta property="og:description" content="${escapeHtml(tags.description)}" />
    <meta property="og:image" content="${tags.image}" />
    <meta property="og:image:alt" content="${escapeHtml(tags.title)}" />${widthTag}${heightTag}
    <meta property="og:locale" content="${tags.locale}" />
    <meta property="og:site_name" content="Quran Apps Directory" />
    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:url" content="${tags.url}" />
    <meta name="twitter:title" content="${escapeHtml(tags.title)}" />
    <meta name="twitter:description" content="${escapeHtml(tags.description)}" />
    <meta name="twitter:image" content="${tags.image}" />`;

  // Replace existing OG tags block (from og:type to twitter:image:alt)
  const ogRegex = /<meta property="og:type"[\s\S]*?<meta property="twitter:image:alt"[^>]*>/;

  if (ogRegex.test(html)) {
    return html.replace(ogRegex, ogTagsHtml);
  }

  // Fallback: inject before </head>
  return html.replace('</head>', `${ogTagsHtml}\n  </head>`);
};

export const onRequest = async (context: CFContext): Promise<Response> => {
  const { request, next } = context;
  const url = new URL(request.url);
  const path = url.pathname;
  const userAgent = request.headers.get('user-agent') || '';

  // 1. Check if static asset request (JS, CSS, fonts, images, source maps)
  const isStaticAsset = /\.(js|css|map|woff2?|ttf|eot|ico|png|jpg|jpeg|webp|svg|gif)$/i.test(path);

  if (isStaticAsset) {
    const response = await next();
    // If Cloudflare returned HTML for a missing asset, return 404 instead
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('text/html')) {
      return new Response('Not found', {
        status: 404,
        headers: { 'Content-Type': 'text/plain' }
      });
    }
    return response;
  }

  // 2. Check if crawler - inject dynamic OG tags
  if (isCrawler(userAgent)) {
    const route = parseRoute(path);
    let data = null;

    // Fetch data based on route type
    if (route.type === 'app' && route.slug) {
      data = await fetchAppData(route.slug);
    } else if (route.type === 'developer' && route.slug) {
      data = await fetchDeveloperData(route.slug);
    } else if (route.type === 'category' && route.slug) {
      data = await fetchCategoryData(route.slug);
    }

    // Get original HTML response
    const response = await next();
    const html = await response.text();

    // Generate and inject OG tags
    const ogTags = generateOGTags(route, data);
    const modifiedHtml = injectOGTags(html, ogTags);

    // Return modified response with same headers
    return new Response(modifiedHtml, {
      status: response.status,
      headers: {
        ...Object.fromEntries(response.headers),
        'Content-Type': 'text/html; charset=utf-8',
      },
    });
  }

  // 3. Non-crawler, non-static: normal routing
  return next();
};
