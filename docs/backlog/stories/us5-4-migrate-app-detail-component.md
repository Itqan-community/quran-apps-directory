# US5.4: Migrate App Detail Component to Use API

**Epic:** Epic 5 - Frontend Integration  
**Sprint:** Week 4, Day 3  
**Story Points:** 5  
**Priority:** P0  
**Assigned To:** Frontend Developer  
**Status:** Not Started

---

## 📋 User Story

**As a** User  
**I want** the app detail page to load data from the database API  
**So that** I see the most current and complete information about each app

---

## 🎯 Acceptance Criteria

### AC1: Route Parameter Handling
- [ ] Component reads app ID from route params
- [ ] ID validation (must be valid Guid)
- [ ] Invalid ID redirects to 404 page

### AC2: API Integration
- [ ] Remove static data lookup
- [ ] Use `appsService.getAppById(id)` instead
- [ ] Handle loading state
- [ ] Handle error states (404, 500)

### AC3: Complete App Details Display
- [ ] All bilingual fields displayed correctly
- [ ] Developer information shown (name, logo, website)
- [ ] All categories displayed as chips
- [ ] Screenshots gallery working
- [ ] Platform links shown (Google Play, App Store, Huawei)
- [ ] Average rating displayed

### AC4: Developer Profile Link
- [ ] Clicking developer navigates to developer page
- [ ] Pass developer ID to route

### AC5: Related Apps Section
- [ ] "More from this developer" section
- [ ] API call to get developer's other apps
- [ ] Display 3-5 related apps
- [ ] Horizontal scroll for mobile

### AC6: 404 Handling
- [ ] If app not found, show friendly 404 message
- [ ] "Back to Apps" button
- [ ] Log 404 for analytics

### AC7: SEO Meta Tags
- [ ] Update page title: "{AppName} - Quran Apps Directory"
- [ ] Update meta description with app description
- [ ] Update og:image with app icon
- [ ] Update canonical URL

---

## 📝 Technical Notes

### Component Implementation
```typescript
import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil, switchMap, catchError } from 'rxjs';
import { of } from 'rxjs';
import { AppsService } from '../../services/apps.service';
import { DevelopersService } from '../../services/developers.service';
import { SeoService } from '../../services/seo.service';
import { AppDetail, App } from '../../models';

@Component({
  selector: 'app-app-detail',
  standalone: true,
  imports: [/* ... */],
  templateUrl: './app-detail.component.html',
  styleUrls: ['./app-detail.component.scss']
})
export class AppDetailComponent implements OnInit, OnDestroy {
  app: AppDetail | null = null;
  relatedApps: App[] = [];
  isLoading = true;
  error: string | null = null;
  notFound = false;
  
  private destroy$ = new Subject<void>();
  
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private appsService: AppsService,
    private developersService: DevelopersService,
    private seoService: SeoService
  ) {}
  
  ngOnInit(): void {
    this.route.params
      .pipe(
        switchMap(params => {
          const id = params['id'];
          
          // Validate Guid format
          if (!this.isValidGuid(id)) {
            this.router.navigate(['/404']);
            return of(null);
          }
          
          this.isLoading = true;
          this.error = null;
          return this.appsService.getAppById(id);
        }),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (app) => {
          if (app) {
            this.app = app;
            this.updateSeo(app);
            this.loadRelatedApps(app.developer.id);
          } else {
            this.notFound = true;
          }
          this.isLoading = false;
        },
        error: (err) => {
          console.error('Error loading app:', err);
          if (err.status === 404) {
            this.notFound = true;
          } else {
            this.error = 'Failed to load app details. Please try again.';
          }
          this.isLoading = false;
        }
      });
  }
  
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
  
  loadRelatedApps(developerId: string): void {
    this.developersService.getDeveloperApps(developerId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (apps) => {
          // Exclude current app
          this.relatedApps = apps
            .filter(a => a.id !== this.app?.id)
            .slice(0, 5);
        },
        error: (err) => {
          console.error('Failed to load related apps', err);
        }
      });
  }
  
  updateSeo(app: AppDetail): void {
    const lang = this.seoService.getCurrentLanguage();
    const title = lang === 'ar' ? app.nameAr : app.nameEn;
    const description = lang === 'ar' 
      ? app.shortDescriptionAr 
      : app.shortDescriptionEn;
    
    this.seoService.updateTitle(`${title} - Quran Apps Directory`);
    this.seoService.updateDescription(description);
    this.seoService.updateOgImage(app.applicationIconUrl);
    this.seoService.updateCanonicalUrl(`/apps/${app.id}`);
  }
  
  navigateToDeveloper(developerId: string): void {
    this.router.navigate(['/developers', developerId]);
  }
  
  private isValidGuid(guid: string): boolean {
    const guidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return guidRegex.test(guid);
  }
}
```

### Template Updates
```html
<!-- Loading State -->
<div *ngIf="isLoading" class="loading-container">
  <mat-spinner></mat-spinner>
  <p>Loading app details...</p>
</div>

<!-- 404 State -->
<div *ngIf="notFound" class="not-found-container">
  <mat-icon>search_off</mat-icon>
  <h2>App Not Found</h2>
  <p>The app you're looking for doesn't exist or has been removed.</p>
  <button mat-raised-button color="primary" routerLink="/apps">
    Back to Apps
  </button>
</div>

<!-- Error State -->
<div *ngIf="error" class="error-container">
  <mat-icon>error</mat-icon>
  <p>{{ error }}</p>
  <button mat-button (click)="ngOnInit()">Retry</button>
</div>

<!-- Content -->
<div *ngIf="app && !isLoading" class="app-detail">
  <!-- Hero Section -->
  <section class="hero">
    <img [src]="app.applicationIconUrl" [alt]="app.nameEn" class="app-icon">
    <div class="info">
      <h1>{{ currentLang === 'ar' ? app.nameAr : app.nameEn }}</h1>
      <p class="short-desc">
        {{ currentLang === 'ar' ? app.shortDescriptionAr : app.shortDescriptionEn }}
      </p>
      
      <!-- Developer -->
      <div class="developer" (click)="navigateToDeveloper(app.developer.id)">
        <img [src]="app.developer.logoUrl" [alt]="app.developer.nameEn">
        <span>{{ currentLang === 'ar' ? app.developer.nameAr : app.developer.nameEn }}</span>
      </div>
      
      <!-- Rating -->
      <div *ngIf="app.averageRating" class="rating">
        <mat-icon>star</mat-icon>
        <span>{{ app.averageRating | number: '1.1-1' }}</span>
      </div>
      
      <!-- Categories -->
      <mat-chip-listbox>
        <mat-chip *ngFor="let category of app.categories">
          {{ category }}
        </mat-chip>
      </mat-chip-listbox>
    </div>
  </section>
  
  <!-- Screenshots -->
  <section class="screenshots">
    <h2>Screenshots</h2>
    <div class="gallery">
      <img 
        *ngFor="let screenshot of (currentLang === 'ar' ? app.screenshotsAr : app.screenshotsEn)"
        [src]="screenshot"
        alt="Screenshot">
    </div>
  </section>
  
  <!-- Description -->
  <section class="description">
    <h2>About</h2>
    <p [innerHTML]="(currentLang === 'ar' ? app.descriptionAr : app.descriptionEn) | nl2br"></p>
  </section>
  
  <!-- Download Links -->
  <section class="download-links">
    <h2>Download</h2>
    <a *ngIf="app.googlePlayLink" [href]="app.googlePlayLink" target="_blank" mat-raised-button>
      <mat-icon>android</mat-icon>
      Google Play
    </a>
    <a *ngIf="app.appStoreLink" [href]="app.appStoreLink" target="_blank" mat-raised-button>
      <mat-icon>apple</mat-icon>
      App Store
    </a>
    <a *ngIf="app.appGalleryLink" [href]="app.appGalleryLink" target="_blank" mat-raised-button>
      Huawei AppGallery
    </a>
  </section>
  
  <!-- Related Apps -->
  <section *ngIf="relatedApps.length > 0" class="related-apps">
    <h2>More from {{ app.developer.nameEn }}</h2>
    <div class="apps-horizontal">
      <app-card *ngFor="let relatedApp of relatedApps" [app]="relatedApp"></app-card>
    </div>
  </section>
</div>
```

---

## 🔗 Dependencies
- US5.1: API Service Layer
- US5.3: App List Component migrated

---

## 📊 Definition of Done
- [ ] Static data lookup removed
- [ ] API integration complete
- [ ] Loading/error/404 states implemented
- [ ] All app details displayed correctly
- [ ] Developer profile link working
- [ ] Related apps section working
- [ ] SEO meta tags updated dynamically
- [ ] Bilingual support maintained
- [ ] Unit tests updated
- [ ] E2E tests pass

---

**Created:** October 6, 2025  
**Owner:** Abubakr Abduraghman, a.abduraghman@itqan.dev  
**Epic:** [Epic 5: Frontend Integration](../epics/epic-5-frontend-integration.md)
