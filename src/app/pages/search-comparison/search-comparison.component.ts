import { Component, OnInit, OnDestroy, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Subject, forkJoin, takeUntil, catchError, of } from 'rxjs';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { NzInputModule } from 'ng-zorro-antd/input';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzBadgeModule } from 'ng-zorro-antd/badge';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzRateModule } from 'ng-zorro-antd/rate';

import { ApiService } from '../../services/api.service';

interface SearchFilters {
  features?: string;
  riwayah?: string;
  mushaf_type?: string;
  platform?: string;
  category?: string;
}

// Flat result - all fields at root level from the API
interface SearchResult {
  id: string;
  name_en: string;
  name_ar: string;
  slug: string;
  application_icon: string;
  short_description_en: string;
  short_description_ar: string;
  description_en: string;
  description_ar: string;
  google_play_link: string;
  app_store_link: string;
  app_gallery_link: string;
  avg_rating: number;
  platform: string;
  developer: any;
  categories: any[];
  screenshots_en: string[];
  screenshots_ar: string[];
  relevance_score: number;
  ai_reasoning: string;
  match_reasons: { type: string; value: string; label_en: string; label_ar: string }[];
  [key: string]: any;
}

interface HistoryItem {
  query: string;
  filters: SearchFilters;
  timestamp: string;
  pgCount: number;
  cfCount: number;
  pgTime: number;
  cfTime: number;
  pgResults: SearchResult[];
  cfResults: SearchResult[];
}

const HISTORY_KEY = 'search_comparison_history';
const MAX_HISTORY = 30;

@Component({
  selector: 'app-search-comparison',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    TranslateModule,
    NzInputModule,
    NzButtonModule,
    NzCardModule,
    NzGridModule,
    NzTagModule,
    NzSpinModule,
    NzEmptyModule,
    NzAlertModule,
    NzDividerModule,
    NzBadgeModule,
    NzIconModule,
    NzToolTipModule,
    NzModalModule,
    NzRateModule,
  ],
  templateUrl: './search-comparison.component.html',
  styleUrls: ['./search-comparison.component.scss']
})
export class SearchComparisonComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  query = '';
  filterFeatures = '';
  filterRiwayah = '';
  filterPlatform = '';
  filterCategory = '';

  loading = false;
  pgResults: SearchResult[] = [];
  cfResults: SearchResult[] = [];
  pgTime = 0;
  cfTime = 0;
  pgError = '';
  cfError = '';

  history: HistoryItem[] = [];
  currentLang: 'ar' | 'en' = 'en';

  // Modal state
  modalVisible = false;
  modalLoading = false;
  modalApp: any = null;
  modalRating = 0;

  constructor(
    private apiService: ApiService,
    private translateService: TranslateService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit(): void {
    this.currentLang = this.translateService.currentLang as 'ar' | 'en' || 'en';
    this.translateService.onLangChange
      .pipe(takeUntil(this.destroy$))
      .subscribe(event => {
        this.currentLang = event.lang as 'ar' | 'en';
      });

    this.loadHistory();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  search(): void {
    const trimmed = this.query.trim();
    if (!trimmed) return;

    this.loading = true;
    this.pgResults = [];
    this.cfResults = [];
    this.pgError = '';
    this.cfError = '';

    const filters: SearchFilters = {};
    if (this.filterFeatures.trim()) filters.features = this.filterFeatures.trim();
    if (this.filterRiwayah.trim()) filters.riwayah = this.filterRiwayah.trim();
    if (this.filterPlatform.trim()) filters.platform = this.filterPlatform.trim();
    if (this.filterCategory.trim()) filters.category = this.filterCategory.trim();

    const pgStart = performance.now();
    const cfStart = performance.now();

    const pgSearch$ = this.apiService.searchHybrid(trimmed, false, filters).pipe(
      catchError(() => {
        this.pgError = 'Gemini Flash + pgvector request failed';
        return of({ results: [] });
      })
    );
    const cfSearch$ = this.apiService.searchHybrid(trimmed, true, filters).pipe(
      catchError(() => {
        this.cfError = 'CF AI Search request failed';
        return of({ results: [] });
      })
    );

    forkJoin({ pg: pgSearch$, cf: cfSearch$ })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: ({ pg, cf }) => {
          this.pgTime = Math.round(performance.now() - pgStart);
          this.cfTime = Math.round(performance.now() - cfStart);

          this.pgResults = pg?.results || [];
          this.cfResults = cf?.results || [];

          this.saveHistory(trimmed, filters);
          this.loading = false;
        },
        error: () => {
          this.pgError = this.pgError || 'Request failed';
          this.cfError = this.cfError || 'Request failed';
          this.loading = false;
        }
      });
  }

  openAppModal(result: SearchResult): void {
    this.modalVisible = true;
    this.modalLoading = true;
    this.modalApp = null;

    this.apiService.getApp(result.slug || result.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (app) => {
          this.modalApp = app;
          this.modalRating = app?.avg_rating || 0;
          this.modalLoading = false;
        },
        error: () => {
          // Fallback to search result data if full fetch fails
          this.modalApp = result;
          this.modalRating = result.avg_rating || 0;
          this.modalLoading = false;
        }
      });
  }

  closeModal(): void {
    this.modalVisible = false;
    this.modalApp = null;
  }

  getModalAppName(): string {
    if (!this.modalApp) return '';
    return this.currentLang === 'ar'
      ? (this.modalApp.name_ar || this.modalApp.name_en)
      : (this.modalApp.name_en || this.modalApp.name_ar);
  }

  getModalDescription(): string {
    if (!this.modalApp) return '';
    return this.currentLang === 'ar'
      ? (this.modalApp.description_ar || this.modalApp.description_en || this.modalApp.short_description_ar || '')
      : (this.modalApp.description_en || this.modalApp.description_ar || this.modalApp.short_description_en || '');
  }

  getModalScreenshots(): string[] {
    if (!this.modalApp) return [];
    return this.currentLang === 'ar'
      ? (this.modalApp.screenshots_ar || this.modalApp.screenshots_en || [])
      : (this.modalApp.screenshots_en || this.modalApp.screenshots_ar || []);
  }

  getModalDeveloperName(): string {
    if (!this.modalApp?.developer) return '';
    return this.currentLang === 'ar'
      ? (this.modalApp.developer.name_ar || this.modalApp.developer.name_en)
      : (this.modalApp.developer.name_en || this.modalApp.developer.name_ar);
  }

  restoreFromHistory(item: HistoryItem): void {
    this.query = item.query;
    this.filterFeatures = item.filters.features || '';
    this.filterRiwayah = item.filters.riwayah || '';
    this.filterPlatform = item.filters.platform || '';
    this.filterCategory = item.filters.category || '';
    this.pgResults = item.pgResults || [];
    this.cfResults = item.cfResults || [];
    this.pgTime = item.pgTime;
    this.cfTime = item.cfTime;
    this.pgError = '';
    this.cfError = '';
  }

  clearHistory(): void {
    this.history = [];
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem(HISTORY_KEY);
    }
  }

  getScoreColor(score: number): string {
    if (score >= 0.8) return '#52c41a';
    if (score >= 0.6) return '#faad14';
    if (score >= 0.4) return '#f5222d';
    return '#999';
  }

  getAppName(result: SearchResult): string {
    if (this.currentLang === 'ar') {
      return result.name_ar || result.name_en || 'Unknown';
    }
    return result.name_en || result.name_ar || 'Unknown';
  }

  getShortDescription(result: SearchResult): string {
    if (this.currentLang === 'ar') {
      return result.short_description_ar || result.short_description_en || '';
    }
    return result.short_description_en || result.short_description_ar || '';
  }

  getMatchReasonLabel(reason: any): string {
    if (typeof reason === 'string') return reason;
    if (this.currentLang === 'ar') {
      return reason.label_ar || reason.label_en || reason.value || '';
    }
    return reason.label_en || reason.label_ar || reason.value || '';
  }

  private loadHistory(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      this.history = raw ? JSON.parse(raw) : [];
    } catch {
      this.history = [];
    }
  }

  private saveHistory(query: string, filters: SearchFilters): void {
    if (!isPlatformBrowser(this.platformId)) return;

    const item: HistoryItem = {
      query,
      filters,
      timestamp: new Date().toISOString(),
      pgCount: this.pgResults.length,
      cfCount: this.cfResults.length,
      pgTime: this.pgTime,
      cfTime: this.cfTime,
      pgResults: this.pgResults,
      cfResults: this.cfResults,
    };

    // Remove duplicate queries
    this.history = this.history.filter(
      h => !(h.query === query && JSON.stringify(h.filters) === JSON.stringify(filters))
    );

    this.history.unshift(item);

    if (this.history.length > MAX_HISTORY) {
      this.history = this.history.slice(0, MAX_HISTORY);
    }

    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(this.history));
    } catch {
      this.history = this.history.slice(0, 10);
      try {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(this.history));
      } catch {
        // still full - give up
      }
    }
  }
}
