# US6.3: Integrate Search Page with Backend API

**Epic:** Epic 6 - Advanced Search System  
**Sprint:** Week 5, Day 2-3  
**Story Points:** 8  
**Priority:** P1  
**Assigned To:** Frontend Developer  
**Status:** Not Started

---

## 📋 User Story

**As a** User  
**I want** a fully functional search page that applies my filters and shows relevant results  
**So that** I can discover Quran apps matching my specific criteria

---

## 🎯 Acceptance Criteria

### AC1: Search Page Route
- [ ] Route: `/search` created
- [ ] Standalone component
- [ ] Lazy-loaded module
- [ ] SEO-friendly title and meta tags

### AC2: Layout Implementation
- [ ] Search input at top (full-width)
- [ ] Filter panel on left (desktop) / bottom sheet (mobile)
- [ ] Results grid on right (desktop) / full width (mobile)
- [ ] Active filters bar below search input
- [ ] Pagination at bottom

### AC3: State Management
- [ ] Search query synchronized with URL params
- [ ] Browser back/forward works correctly
- [ ] Share search URL preserves filters
- [ ] Page refresh maintains search state

### AC4: Filter Application
- [ ] Filters applied immediately or on "Apply" button
- [ ] Loading indicator during search
- [ ] Results update without full page reload
- [ ] Filter count badges updated

### AC5: Results Display
- [ ] Apps displayed in responsive grid
- [ ] 3 columns (desktop), 2 (tablet), 1 (mobile)
- [ ] "No results" state with suggestions
- [ ] Result count displayed
- [ ] Scroll to top on page change

### AC6: Empty State Handling
- [ ] No results: "Try adjusting your filters"
- [ ] Suggestions: "Popular searches", "Try these filters"
- [ ] Clear filters button prominent

### AC7: Performance
- [ ] Initial load < 1 second
- [ ] Filter changes reflected < 500ms
- [ ] Smooth animations
- [ ] No layout shift during loading

### AC8: Accessibility
- [ ] Keyboard navigation for filters
- [ ] Screen reader support
- [ ] Focus management
- [ ] ARIA labels complete

---

## 📝 Technical Notes

### Search Page Component
```typescript
import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, Observable } from 'rxjs';
import { takeUntil, debounceTime } from 'rxjs/operators';
import { SearchService, SearchQuery } from '../../services/search.service';
import { CategoriesService } from '../../services/categories.service';
import { SeoService } from '../../services/seo.service';
import { App, SearchResult, Category } from '../../models';

@Component({
  selector: 'app-search-page',
  standalone: true,
  imports: [
    CommonModule,
    SearchInputComponent,
    SearchFiltersComponent,
    ActiveFiltersComponent,
    AppCardComponent,
    MatPaginatorModule
  ],
  templateUrl: './search-page.component.html',
  styleUrls: ['./search-page.component.scss']
})
export class SearchPageComponent implements OnInit, OnDestroy {
  searchResults$: Observable<SearchResult<App>>;
  categories: Category[] = [];
  
  currentQuery: SearchQuery = {
    page: 1,
    pageSize: 20,
    sortBy: 'relevance'
  };
  
  isLoading = false;
  showFilters = false; // Mobile
  
  private destroy$ = new Subject<void>();
  
  constructor(
    private searchService: SearchService,
    private categoriesService: CategoriesService,
    private route: ActivatedRoute,
    private router: Router,
    private seoService: SeoService
  ) {}
  
  ngOnInit(): void {
    this.loadCategories();
    this.syncWithUrl();
    this.updateSeo();
    this.performSearch();
  }
  
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
  
  loadCategories(): void {
    this.categoriesService.getCategories()
      .pipe(takeUntil(this.destroy$))
      .subscribe(response => {
        this.categories = response.categories;
      });
  }
  
  syncWithUrl(): void {
    this.route.queryParams
      .pipe(takeUntil(this.destroy$))
      .subscribe(params => {
        this.currentQuery = {
          q: params['q'] || undefined,
          categories: params['categories']?.split(',') || [],
          mushafTypes: params['mushafTypes']?.split(',') || [],
          riwayat: params['riwayat']?.split(',') || [],
          languages: params['languages']?.split(',') || [],
          audiences: params['audiences']?.split(',') || [],
          platforms: params['platforms']?.split(',') || [],
          minRating: params['minRating'] ? +params['minRating'] : undefined,
          page: params['page'] ? +params['page'] : 1,
          pageSize: params['pageSize'] ? +params['pageSize'] : 20,
          sortBy: params['sortBy'] || 'relevance',
          sortOrder: params['sortOrder'] || 'desc'
        };
        
        this.performSearch();
      });
  }
  
  performSearch(): void {
    this.isLoading = true;
    
    this.searchResults$ = this.searchService.searchApps(this.currentQuery)
      .pipe(
        tap(() => {
          this.isLoading = false;
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }),
        catchError(error => {
          this.isLoading = false;
          console.error('Search error:', error);
          return of({
            items: [],
            totalCount: 0,
            page: 1,
            pageSize: 20,
            totalPages: 0,
            appliedFilters: {}
          });
        })
      );
  }
  
  onSearchChange(searchTerm: string): void {
    this.updateQueryAndSearch({ q: searchTerm, page: 1 });
  }
  
  onFiltersChange(filters: Partial<SearchQuery>): void {
    this.updateQueryAndSearch({ ...filters, page: 1 });
  }
  
  onPageChange(page: number): void {
    this.updateQueryAndSearch({ page });
  }
  
  onSortChange(sortBy: string): void {
    this.updateQueryAndSearch({ sortBy, page: 1 });
  }
  
  onFilterRemove(filter: any): void {
    // Remove specific filter and re-search
    const updates: Partial<SearchQuery> = {};
    
    if (filter.type === 'category') {
      updates.categories = this.currentQuery.categories?.filter(c => c !== filter.value);
    } else if (filter.type === 'mushafType') {
      updates.mushafTypes = this.currentQuery.mushafTypes?.filter(m => m !== filter.value);
    }
    // ... handle other filter types
    
    this.updateQueryAndSearch(updates);
  }
  
  onClearAllFilters(): void {
    this.updateQueryAndSearch({
      q: undefined,
      categories: [],
      mushafTypes: [],
      riwayat: [],
      languages: [],
      audiences: [],
      platforms: [],
      minRating: undefined,
      page: 1
    });
  }
  
  toggleFilters(): void {
    this.showFilters = !this.showFilters;
  }
  
  private updateQueryAndSearch(updates: Partial<SearchQuery>): void {
    this.currentQuery = { ...this.currentQuery, ...updates };
    this.updateUrl();
  }
  
  private updateUrl(): void {
    const queryParams: any = {};
    
    if (this.currentQuery.q) queryParams.q = this.currentQuery.q;
    if (this.currentQuery.categories?.length) {
      queryParams.categories = this.currentQuery.categories.join(',');
    }
    if (this.currentQuery.mushafTypes?.length) {
      queryParams.mushafTypes = this.currentQuery.mushafTypes.join(',');
    }
    // ... add other params
    
    queryParams.page = this.currentQuery.page;
    queryParams.pageSize = this.currentQuery.pageSize;
    queryParams.sortBy = this.currentQuery.sortBy;
    
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams,
      queryParamsHandling: 'merge'
    });
  }
  
  private updateSeo(): void {
    this.seoService.updateTitle('Search Quran Apps - Quran Apps Directory');
    this.seoService.updateDescription('Search and discover the best Quran apps with advanced filters');
  }
}
```

### Template
```html
<div class="search-page">
  <!-- Search Header -->
  <header class="search-header">
    <app-search-input 
      [initialValue]="currentQuery.q"
      (searchChange)="onSearchChange($event)">
    </app-search-input>
    
    <button 
      class="filter-toggle" 
      mat-icon-button 
      (click)="toggleFilters()"
      [class.active]="showFilters">
      <mat-icon>filter_list</mat-icon>
      <span class="filter-count" *ngIf="getActiveFilterCount() > 0">
        {{ getActiveFilterCount() }}
      </span>
    </button>
  </header>
  
  <!-- Active Filters -->
  <app-active-filters
    *ngIf="searchResults$ | async as results"
    [activeFilters]="getActiveFiltersArray()"
    [totalResults]="results.totalCount"
    (filterRemoved)="onFilterRemove($event)"
    (allCleared)="onClearAllFilters()">
  </app-active-filters>
  
  <!-- Main Content -->
  <div class="search-content">
    <!-- Filter Panel -->
    <aside 
      class="filter-panel"
      [class.mobile-visible]="showFilters">
      <app-search-filters
        [categories]="categories"
        [currentFilters]="currentQuery"
        (filtersChange)="onFiltersChange($event)">
      </app-search-filters>
    </aside>
    
    <!-- Results -->
    <main class="search-results">
      <!-- Loading -->
      <div *ngIf="isLoading" class="loading">
        <mat-spinner></mat-spinner>
      </div>
      
      <!-- Results Grid -->
      <div *ngIf="!isLoading && (searchResults$ | async) as results">
        <div *ngIf="results.totalCount > 0" class="results-grid">
          <app-card 
            *ngFor="let app of results.items" 
            [app]="app">
          </app-card>
        </div>
        
        <!-- Empty State -->
        <div *ngIf="results.totalCount === 0" class="empty-state">
          <mat-icon>search_off</mat-icon>
          <h2>No apps found</h2>
          <p>Try adjusting your filters or search term</p>
          <button mat-raised-button (click)="onClearAllFilters()">
            Clear All Filters
          </button>
        </div>
        
        <!-- Pagination -->
        <mat-paginator
          *ngIf="results.totalCount > 0"
          [length]="results.totalCount"
          [pageSize]="currentQuery.pageSize"
          [pageIndex]="currentQuery.page - 1"
          (page)="onPageChange($event.pageIndex + 1)">
        </mat-paginator>
      </div>
    </main>
  </div>
</div>
```

---

## 🔗 Dependencies
- US6.1: Search UI Components
- US6.2: Search Service

---

## 📊 Definition of Done
- [ ] Search page route created
- [ ] Layout responsive (mobile + desktop)
- [ ] URL synchronization working
- [ ] All filters functional
- [ ] Results display correctly
- [ ] Empty state implemented
- [ ] Performance targets met
- [ ] Accessibility requirements met
- [ ] E2E tests pass

---

**Created:** October 6, 2025  
**Owner:** Abubakr Abduraghman, a.abduraghman@itqan.dev  
**Epic:** [Epic 6: Advanced Search System](../epics/epic-6-advanced-search-system.md)
