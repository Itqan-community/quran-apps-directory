# US7.5: Implement WhatsApp-Optimized Sharing

**Epic:** Epic 7 - Social Sharing & Community Features  
**Sprint:** Week 6, Day 3  
**Story Points:** 2  
**Priority:** P2  
**Assigned To:** Frontend Developer  
**Status:** Not Started

---

## 📋 User Story

**As a** User  
**I want** a seamless WhatsApp sharing experience  
**So that** I can quickly recommend Quran apps to my contacts and groups

---

## 🎯 Acceptance Criteria

### AC1: WhatsApp Share Button
- [ ] Dedicated WhatsApp share button (prominent)
- [ ] WhatsApp brand color (#25D366)
- [ ] WhatsApp icon
- [ ] Opens WhatsApp directly (no intermediate modal)

### AC2: Optimized Share Message
- [ ] Pre-filled message format:
```
🕌 [App Name]
[Short description]

[Platform badges: 📱 Android | 🍎 iOS]

👉 View details: [link]

Shared via Quran Apps Directory
```
- [ ] Emoji for visual appeal
- [ ] Platform availability clearly shown
- [ ] Link shortened (optional)

### AC3: Mobile Detection
- [ ] Desktop: Opens WhatsApp Web
- [ ] Mobile (iOS): Opens WhatsApp app directly
- [ ] Mobile (Android): Opens WhatsApp app directly
- [ ] Fallback if WhatsApp not installed

### AC4: Preview Optimization
- [ ] Rich link preview on WhatsApp
- [ ] App icon displayed as thumbnail
- [ ] Title, description, and image optimized
- [ ] Image size: 300x300 minimum (WhatsApp requirement)

### AC5: Group Share Support
- [ ] Option to share to specific contact vs. generic share
- [ ] "Share to group" hint in UI
- [ ] Group sharing encourages community engagement

### AC6: Analytics
- [ ] Track WhatsApp shares separately
- [ ] Most popular apps shared via WhatsApp
- [ ] WhatsApp share-to-visit conversion

---

## 📝 Technical Notes

### WhatsApp Share Service
```typescript
import { Injectable } from '@angular/core';
import { Platform } from '@angular/cdk/platform';
import { App } from '../models';

@Injectable({
  providedIn: 'root'
})
export class WhatsAppShareService {
  constructor(
    private platform: Platform,
    private analyticsService: AnalyticsService
  ) {}
  
  shareApp(app: App, lang: string = 'en'): void {
    const message = this.buildShareMessage(app, lang);
    const url = this.getWhatsAppUrl(message);
    
    // Open WhatsApp
    window.open(url, '_blank');
    
    // Track analytics
    this.analyticsService.trackShare(app.id, 'whatsapp').subscribe();
  }
  
  private buildShareMessage(app: App, lang: string): string {
    const name = lang === 'ar' ? app.nameAr : app.nameEn;
    const description = lang === 'ar' ? app.shortDescriptionAr : app.shortDescriptionEn;
    const url = `${window.location.origin}/apps/${app.id}?utm_source=whatsapp&utm_medium=social`;
    
    const platforms = this.getPlatformBadges(app);
    
    const message = `
🕌 *${name}*

${description}

${platforms}

👉 ${lang === 'ar' ? 'عرض التفاصيل' : 'View details'}: ${url}

${lang === 'ar' ? '📲 مشاركة عبر دليل تطبيقات القرآن' : '📲 Shared via Quran Apps Directory'}
    `.trim();
    
    return message;
  }
  
  private getPlatformBadges(app: App): string {
    const badges: string[] = [];
    
    if (app.googlePlayLink) {
      badges.push('📱 Android');
    }
    if (app.appStoreLink) {
      badges.push('🍎 iOS');
    }
    if (app.appGalleryLink) {
      badges.push('📲 Huawei');
    }
    
    return badges.join(' | ');
  }
  
  private getWhatsAppUrl(message: string): string {
    const encodedMessage = encodeURIComponent(message);
    
    // Mobile: Use WhatsApp app protocol
    if (this.platform.ANDROID || this.platform.IOS) {
      return `whatsapp://send?text=${encodedMessage}`;
    }
    
    // Desktop: Use WhatsApp Web
    return `https://web.whatsapp.com/send?text=${encodedMessage}`;
  }
  
  isWhatsAppAvailable(): boolean {
    // Check if on mobile device (WhatsApp app likely available)
    return this.platform.ANDROID || this.platform.IOS;
  }
}
```

### WhatsApp Share Button Component
```typescript
import { Component, Input } from '@angular/core';
import { App } from '../../models';
import { WhatsAppShareService } from '../../services/whatsapp-share.service';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-whatsapp-share-button',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule],
  template: `
    <button 
      mat-raised-button 
      class="whatsapp-button"
      (click)="onShare()"
      [matTooltip]="'Share on WhatsApp' | translate">
      <mat-icon svgIcon="whatsapp"></mat-icon>
      <span>{{ 'Share on WhatsApp' | translate }}</span>
    </button>
  `,
  styles: [`
    .whatsapp-button {
      background-color: #25D366;
      color: white;
      
      &:hover {
        background-color: #1DA851;
      }
      
      mat-icon {
        margin-right: 8px;
      }
    }
  `]
})
export class WhatsAppShareButtonComponent {
  @Input() app!: App;
  
  constructor(
    private whatsappService: WhatsAppShareService,
    private translate: TranslateService
  ) {}
  
  onShare(): void {
    const lang = this.translate.currentLang;
    this.whatsappService.shareApp(this.app, lang);
  }
}
```

### App Detail Page Integration
```html
<!-- app-detail.component.html -->
<section class="app-actions">
  <h3>{{ 'Share this app' | translate }}</h3>
  
  <div class="action-buttons">
    <!-- Prominent WhatsApp button -->
    <app-whatsapp-share-button [app]="app"></app-whatsapp-share-button>
    
    <!-- Other share options -->
    <app-share-button [app]="app" [mode]="'button'"></app-share-button>
  </div>
  
  <p class="share-hint">
    <mat-icon>info</mat-icon>
    {{ 'Help others discover this app by sharing it with your community' | translate }}
  </p>
</section>
```

### WhatsApp Icon Registration
```typescript
// app.component.ts or main.ts
import { MatIconRegistry } from '@angular/material/icon';
import { DomSanitizer } from '@angular/platform-browser';

export class AppComponent {
  constructor(
    private matIconRegistry: MatIconRegistry,
    private domSanitizer: DomSanitizer
  ) {
    this.registerCustomIcons();
  }
  
  private registerCustomIcons(): void {
    this.matIconRegistry.addSvgIcon(
      'whatsapp',
      this.domSanitizer.bypassSecurityTrustResourceUrl('assets/icons/whatsapp.svg')
    );
  }
}
```

### Open Graph Optimization for WhatsApp
```html
<!-- index.html or dynamically via SeoService -->
<meta property="og:image" content="https://quran-apps.itqan.dev/assets/og-image.jpg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:type" content="image/jpeg">
<meta property="og:image:alt" content="Quran Apps Directory">

<!-- WhatsApp specific meta (optional) -->
<meta property="og:site_name" content="Quran Apps Directory">
<meta property="og:locale" content="en_US">
<meta property="og:locale:alternate" content="ar_SA">
```

### WhatsApp Preview Testing
```typescript
// Use WhatsApp's link preview debugger
// https://developers.facebook.com/tools/debug/
// (WhatsApp uses Facebook's Open Graph crawlers)

export class WhatsAppShareService {
  debugPreview(url: string): void {
    const debugUrl = `https://developers.facebook.com/tools/debug/?q=${encodeURIComponent(url)}`;
    window.open(debugUrl, '_blank');
  }
}
```

---

## 🔗 Dependencies
- US7.1: Web Share API
- US7.4: Deep Linking

---

## 📊 Definition of Done
- [ ] WhatsApp share button component created
- [ ] Share message optimized with emojis and formatting
- [ ] Mobile/desktop detection working
- [ ] Rich link preview tested on WhatsApp
- [ ] Analytics tracking WhatsApp shares
- [ ] Cross-platform tested (Android, iOS, Desktop)
- [ ] Fallback handling if WhatsApp unavailable
- [ ] Bilingual support (Arabic/English)

---

**Created:** October 6, 2025  
**Owner:** Abubakr Abduraghman, a.abduraghman@itqan.dev  
**Epic:** [Epic 7: Social Sharing & Community Features](../epics/epic-7-social-sharing-community-features.md)
