# US7.3: Display Share Counts on App Cards

**Epic:** Epic 7 - Social Sharing & Community Features  
**Sprint:** Week 6, Day 2  
**Story Points:** 2  
**Priority:** P3  
**Assigned To:** Frontend Developer  
**Status:** Not Started

---

## 📋 User Story

**As a** User  
**I want** to see how many times an app has been shared  
**So that** I can gauge its popularity and trustworthiness

---

## 🎯 Acceptance Criteria

### AC1: Share Count Badge
- [ ] Share count displayed on app cards
- [ ] Icon: `share` or `trending_up`
- [ ] Format: "150 shares" or "1.2K shares"
- [ ] Only shown if count > 0
- [ ] Subtle styling (not overwhelming)

### AC2: App Detail Page Display
- [ ] Share count prominently displayed
- [ ] Breakdown by platform (tooltip or expandable)
- [ ] Example: "Shared 150 times (WhatsApp: 80, Facebook: 40, Twitter: 20, Other: 10)"
- [ ] Updates after user shares

### AC3: Real-Time Update (Optional)
- [ ] Share count increments after successful share
- [ ] Optimistic UI update
- [ ] Fallback if analytics endpoint fails

### AC4: Formatting
- [ ] Numbers formatted with commas (1,234)
- [ ] Large numbers abbreviated (1.2K, 15K, 1.5M)
- [ ] Bilingual support (Arabic numerals in RTL)

### AC5: Caching
- [ ] Share counts cached for 10 minutes
- [ ] Prevents excessive API calls
- [ ] Refresh on user action (pull-to-refresh)

---

## 📝 Technical Notes

### Share Count Service
```typescript
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map, shareReplay } from 'rxjs/operators';
import { ApiService } from './api.service';
import { CacheService } from './cache.service';

export interface ShareCount {
  appId: string;
  totalShares: number;
  byPlatform: { [platform: string]: number };
}

@Injectable({
  providedIn: 'root'
})
export class ShareCountService {
  private cache = new Map<string, Observable<ShareCount>>();
  
  constructor(
    private api: ApiService,
    private cacheService: CacheService
  ) {}
  
  getAppShareCount(appId: string): Observable<ShareCount> {
    // Check memory cache first
    if (this.cache.has(appId)) {
      return this.cache.get(appId)!;
    }
    
    // Check storage cache
    const cacheKey = `share_count_${appId}`;
    const cached = this.cacheService.get<ShareCount>(cacheKey);
    if (cached) {
      return of(cached);
    }
    
    // Fetch from API
    const request$ = this.api
      .get<ShareCount>(`shares/apps/${appId}/share-count`)
      .pipe(
        tap(count => {
          this.cacheService.set(cacheKey, count, 10); // 10 min TTL
        }),
        shareReplay(1) // Share among multiple subscribers
      );
    
    this.cache.set(appId, request$);
    
    return request$;
  }
  
  formatShareCount(count: number): string {
    if (count < 1000) {
      return count.toLocaleString();
    } else if (count < 1000000) {
      return `${(count / 1000).toFixed(1)}K`;
    } else {
      return `${(count / 1000000).toFixed(1)}M`;
    }
  }
  
  incrementShareCount(appId: string, platform: string): void {
    // Optimistic update - increment in cache
    const cacheKey = `share_count_${appId}`;
    const cached = this.cacheService.get<ShareCount>(cacheKey);
    
    if (cached) {
      cached.totalShares++;
      cached.byPlatform[platform] = (cached.byPlatform[platform] || 0) + 1;
      this.cacheService.set(cacheKey, cached, 10);
    }
  }
}
```

### Share Count Component
```typescript
import { Component, Input, OnInit } from '@angular/core';
import { ShareCountService, ShareCount } from '../../services/share-count.service';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-share-count',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatTooltipModule],
  template: `
    <div 
      *ngIf="(shareCount$ | async) as count"
      class="share-count"
      [matTooltip]="getTooltip(count)">
      <mat-icon>trending_up</mat-icon>
      <span>{{ formatCount(count.totalShares) }}</span>
    </div>
  `,
  styles: [`
    .share-count {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 12px;
      color: var(--text-secondary);
    }
    
    mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }
  `]
})
export class ShareCountComponent implements OnInit {
  @Input() appId!: string;
  shareCount$: Observable<ShareCount>;
  
  constructor(private shareCountService: ShareCountService) {}
  
  ngOnInit(): void {
    if (this.appId) {
      this.shareCount$ = this.shareCountService.getAppShareCount(this.appId);
    }
  }
  
  formatCount(count: number): string {
    return this.shareCountService.formatShareCount(count);
  }
  
  getTooltip(count: ShareCount): string {
    const breakdown = Object.entries(count.byPlatform)
      .map(([platform, num]) => `${platform}: ${num}`)
      .join(', ');
    
    return `Shared ${count.totalShares} times (${breakdown})`;
  }
}
```

### App Card Integration
```html
<!-- app-card.component.html -->
<mat-card class="app-card">
  <mat-card-header>
    <img mat-card-avatar [src]="app.applicationIconUrl" [alt]="app.nameEn">
    <mat-card-title>{{ app.nameEn }}</mat-card-title>
    <mat-card-subtitle>{{ app.developer?.nameEn }}</mat-card-subtitle>
  </mat-card-header>
  
  <mat-card-content>
    <p>{{ app.shortDescriptionEn }}</p>
    
    <!-- Stats Row -->
    <div class="app-stats">
      <!-- Rating -->
      <div class="stat" *ngIf="app.averageRating">
        <mat-icon>star</mat-icon>
        <span>{{ app.averageRating | number: '1.1' }}</span>
      </div>
      
      <!-- Share Count -->
      <app-share-count [appId]="app.id"></app-share-count>
    </div>
  </mat-card-content>
  
  <mat-card-actions>
    <button mat-button [routerLink]="['/apps', app.id]">View Details</button>
    <app-share-button [app]="app"></app-share-button>
  </mat-card-actions>
</mat-card>
```

### App Detail Page Integration
```html
<!-- app-detail.component.html -->
<section class="app-stats">
  <div class="stat-card">
    <mat-icon>star</mat-icon>
    <div>
      <h3>{{ app.averageRating | number: '1.1' }}</h3>
      <p>Rating</p>
    </div>
  </div>
  
  <div class="stat-card" *ngIf="shareCount$ | async as shareCount">
    <mat-icon>trending_up</mat-icon>
    <div>
      <h3>{{ formatShareCount(shareCount.totalShares) }}</h3>
      <p>Shares</p>
    </div>
  </div>
  
  <!-- Detailed Breakdown (Expandable) -->
  <mat-expansion-panel *ngIf="shareCount$ | async as shareCount">
    <mat-expansion-panel-header>
      <mat-panel-title>Share Breakdown</mat-panel-title>
    </mat-expansion-panel-header>
    <ul class="platform-breakdown">
      <li *ngFor="let platform of getP latformEntries(shareCount.byPlatform)">
        <span class="platform-name">{{ platform[0] | titlecase }}</span>
        <span class="platform-count">{{ platform[1] }}</span>
      </li>
    </ul>
  </mat-expansion-panel>
</section>
```

---

## 🔗 Dependencies
- US7.2: Share Analytics Backend
- US7.1: Web Share API

---

## 📊 Definition of Done
- [ ] Share count component created
- [ ] Share counts displayed on app cards
- [ ] Detailed breakdown on app detail page
- [ ] Number formatting working (K, M abbreviations)
- [ ] Caching implemented
- [ ] Optimistic updates working
- [ ] Bilingual support (Arabic numerals)
- [ ] Unit tests written

---

**Created:** October 6, 2025  
**Owner:** Abubakr Abduraghman, a.abduraghman@itqan.dev  
**Epic:** [Epic 7: Social Sharing & Community Features](../epics/epic-7-social-sharing-community-features.md)
