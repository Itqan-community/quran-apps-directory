# US7.4: Implement Deep Linking for Shared URLs

**Epic:** Epic 7 - Social Sharing & Community Features  
**Sprint:** Week 6, Day 3  
**Story Points:** 3  
**Priority:** P2  
**Assigned To:** Frontend + Backend Developer  
**Status:** Not Started

---

## 📋 User Story

**As a** User  
**I want** shared links to open directly to the app detail page  
**So that** I can immediately see the app my friend recommended

---

## 🎯 Acceptance Criteria

### AC1: URL Structure
- [ ] App detail URLs: `https://quran-apps.itqan.dev/apps/{id}`
- [ ] SEO-friendly slugs (optional): `/apps/{id}/{slug}`
- [ ] Example: `/apps/a1b2c3d4-e5f6.../tajweed-quran`
- [ ] Both formats supported

### AC2: Open Graph Meta Tags
- [ ] `og:title`: App name
- [ ] `og:description`: Short description
- [ ] `og:image`: App icon (high-res)
- [ ] `og:url`: Canonical URL
- [ ] `og:type`: "website"
- [ ] Twitter Card meta tags included

### AC3: Dynamic Meta Tags (SSR)
- [ ] Server-side rendering for meta tags
- [ ] Different meta data per app
- [ ] Preview works on WhatsApp, Facebook, Twitter
- [ ] Image dimensions: 1200x630 (recommended)

### AC4: UTM Parameters Support
- [ ] Support UTM tracking parameters:
  - `utm_source` (whatsapp, facebook, twitter)
  - `utm_medium` (social)
  - `utm_campaign` (app_share)
- [ ] Parameters preserved during navigation
- [ ] Logged for analytics

### AC5: Fallback Handling
- [ ] Invalid app ID → Redirect to 404
- [ ] Deleted app → Show "App no longer available"
- [ ] Load errors → Retry with toast message

### AC6: Share Context Tracking
- [ ] Track referrer for shared links
- [ ] Identify traffic from social platforms
- [ ] Analytics: "Shares → Visits" conversion

---

## 📝 Technical Notes

### Angular SEO Service
```typescript
import { Injectable, Inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { DOCUMENT } from '@angular/common';

@Injectable({
  providedIn: 'root'
})
export class SeoService {
  constructor(
    private meta: Meta,
    private title: Title,
    @Inject(DOCUMENT) private document: Document
  ) {}
  
  updateAppDetailMeta(app: AppDetail, lang: string = 'en'): void {
    const appName = lang === 'ar' ? app.nameAr : app.nameEn;
    const description = lang === 'ar' ? app.shortDescriptionAr : app.shortDescriptionEn;
    const url = `${this.getBaseUrl()}/apps/${app.id}`;
    const imageUrl = app.applicationIconUrl;
    
    // Page title
    this.title.setTitle(`${appName} - Quran Apps Directory`);
    
    // Standard meta tags
    this.meta.updateTag({ name: 'description', content: description });
    this.meta.updateTag({ name: 'keywords', content: this.generateKeywords(app) });
    
    // Open Graph
    this.meta.updateTag({ property: 'og:title', content: appName });
    this.meta.updateTag({ property: 'og:description', content: description });
    this.meta.updateTag({ property: 'og:image', content: imageUrl });
    this.meta.updateTag({ property: 'og:url', content: url });
    this.meta.updateTag({ property: 'og:type', content: 'website' });
    this.meta.updateTag({ property: 'og:site_name', content: 'Quran Apps Directory' });
    
    // Twitter Card
    this.meta.updateTag({ name: 'twitter:card', content: 'summary_large_image' });
    this.meta.updateTag({ name: 'twitter:title', content: appName });
    this.meta.updateTag({ name: 'twitter:description', content: description });
    this.meta.updateTag({ name: 'twitter:image', content: imageUrl });
    
    // WhatsApp specific (uses OG tags)
    // Facebook specific (uses OG tags)
    
    // Canonical URL
    this.updateCanonicalUrl(url);
  }
  
  updateCanonicalUrl(url: string): void {
    let link: HTMLLinkElement = this.document.querySelector('link[rel="canonical"]');
    
    if (!link) {
      link = this.document.createElement('link');
      link.setAttribute('rel', 'canonical');
      this.document.head.appendChild(link);
    }
    
    link.setAttribute('href', url);
  }
  
  private generateKeywords(app: AppDetail): string {
    const keywords = [
      'Quran',
      'Quran app',
      app.nameEn,
      ...app.categories
    ];
    
    return keywords.join(', ');
  }
  
  private getBaseUrl(): string {
    return this.document.location.origin;
  }
}
```

### App Detail Component with Deep Linking
```typescript
export class AppDetailComponent implements OnInit {
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private appsService: AppsService,
    private seoService: SeoService,
    private analyticsService: AnalyticsService
  ) {}
  
  ngOnInit(): void {
    this.route.params
      .pipe(
        switchMap(params => {
          const id = params['id'];
          
          // Track UTM parameters
          this.trackUtmParams();
          
          // Track referrer
          this.trackReferrer();
          
          return this.appsService.getAppById(id);
        })
      )
      .subscribe({
        next: (app) => {
          if (app) {
            this.app = app;
            this.seoService.updateAppDetailMeta(app, this.currentLang);
          } else {
            this.router.navigate(['/404']);
          }
        },
        error: (err) => {
          console.error('Error loading app:', err);
          if (err.status === 404) {
            this.router.navigate(['/404']);
          }
        }
      });
  }
  
  private trackUtmParams(): void {
    this.route.queryParams.subscribe(params => {
      if (params['utm_source'] && params['utm_medium']) {
        this.analyticsService.trackUtmCampaign({
          source: params['utm_source'],
          medium: params['utm_medium'],
          campaign: params['utm_campaign'] || 'app_share',
          appId: this.app?.id
        }).subscribe();
      }
    });
  }
  
  private trackReferrer(): void {
    const referrer = document.referrer;
    if (referrer && this.app) {
      const utmSource = this.identifyPlatform(referrer);
      if (utmSource) {
        this.analyticsService.trackShareVisit(
          this.app.id,
          utmSource,
          referrer
        ).subscribe();
      }
    }
  }
  
  private identifyPlatform(url: string): string | null {
    if (url.includes('whatsapp')) return 'whatsapp';
    if (url.includes('facebook')) return 'facebook';
    if (url.includes('twitter') || url.includes('t.co')) return 'twitter';
    if (url.includes('telegram')) return 'telegram';
    return null;
  }
}
```

### Server-Side Rendering (Angular Universal)
```typescript
// server.ts
import { APP_BASE_HREF } from '@angular/common';
import { CommonEngine } from '@angular/ssr';
import express from 'express';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { AppServerModule } from './src/main.server';

export function app(): express.Express {
  const server = express();
  const serverDistFolder = dirname(fileURLToPath(import.meta.url));
  const browserDistFolder = resolve(serverDistFolder, '../browser');
  const indexHtml = join(serverDistFolder, 'index.server.html');
  
  const commonEngine = new CommonEngine();
  
  server.set('view engine', 'html');
  server.set('views', browserDistFolder);
  
  // Serve static files
  server.get('*.*', express.static(browserDistFolder, {
    maxAge: '1y'
  }));
  
  // All regular routes use the Angular engine
  server.get('*', (req, res, next) => {
    const { protocol, originalUrl, baseUrl, headers } = req;
    
    commonEngine
      .render({
        bootstrap: AppServerModule,
        documentFilePath: indexHtml,
        url: `${protocol}://${headers.host}${originalUrl}`,
        publicPath: browserDistFolder,
        providers: [
          { provide: APP_BASE_HREF, useValue: baseUrl }
        ]
      })
      .then((html) => res.send(html))
      .catch((err) => next(err));
  });
  
  return server;
}
```

### Share URL Builder
```typescript
export class ShareService {
  buildShareUrl(app: App, platform: string): string {
    const baseUrl = window.location.origin;
    const appUrl = `${baseUrl}/apps/${app.id}`;
    
    // Add UTM parameters
    const utmParams = new URLSearchParams({
      utm_source: platform,
      utm_medium: 'social',
      utm_campaign: 'app_share'
    });
    
    return `${appUrl}?${utmParams.toString()}`;
  }
}
```

---

## 🔗 Dependencies
- US5.4: App Detail Component
- US7.1: Web Share API

---

## 📊 Definition of Done
- [ ] Deep linking URLs working
- [ ] Open Graph meta tags implemented
- [ ] Dynamic meta tags per app (SSR)
- [ ] UTM parameters supported and tracked
- [ ] Preview working on WhatsApp, Facebook, Twitter
- [ ] Analytics tracking referrers
- [ ] Fallback handling for errors
- [ ] Cross-browser tested

---

**Created:** October 6, 2025  
**Owner:** Abubakr Abduraghman, a.abduraghman@itqan.dev  
**Epic:** [Epic 7: Social Sharing & Community Features](../epics/epic-7-social-sharing-community-features.md)
