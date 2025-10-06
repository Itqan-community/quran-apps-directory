# US6.2: Implement Search Service with Query Builder

**Epic:** Epic 6 - Advanced Search System  
**Sprint:** Week 5, Day 1-2  
**Story Points:** 5  
**Priority:** P1  
**Assigned To:** Frontend Developer  
**Status:** Not Started

---

## 📋 User Story

**As a** Frontend Developer  
**I want** a robust search service that builds API queries from filter selections  
**So that** search functionality is maintainable and type-safe

---

## 🎯 Acceptance Criteria

### AC1: SearchService Created
- [ ] Service in `src/app/services/search.service.ts`
- [ ] Injectable with `providedIn: 'root'`
- [ ] Uses ApiService for HTTP calls
- [ ] Type-safe method signatures

### AC2: Query Builder Implementation
- [ ] Converts filter object to HTTP query params
- [ ] Handles array parameters (comma-separated)
- [ ] Null/undefined filtering (only include set values)
- [ ] URL encoding handled correctly

### AC3: Search Method
- [ ] `searchApps(query: SearchQuery): Observable<SearchResult<App>>`
- [ ] Supports all filter dimensions
- [ ] Returns paginated results
- [ ] Cancels previous search if new one triggered

### AC4: Search History Management
- [ ] Last 10 searches stored in localStorage
- [ ] Duplicate searches not stored
- [ ] Clear history method
- [ ] Get search history method

### AC5: Search Suggestions
- [ ] Popular search terms fetched from API
- [ ] Cached for 1 hour
- [ ] Filtered by current input
- [ ] Max 5 suggestions returned

### AC6: Performance Optimization
- [ ] Debouncing for text search (300ms)
- [ ] Request cancellation on rapid filter changes
- [ ] Result caching for identical queries (5 min)

---

## 📝 Technical Notes

### Search Service Implementation
```typescript
import { Injectable } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { Observable, Subject } from 'rxjs';
import { debounceTime, switchMap, shareReplay } from 'rxjs/operators';
import { ApiService } from './api.service';
import { CacheService } from './cache.service';
import { App, SearchResult } from '../models';

export interface SearchQuery {
  q?: string;
  categories?: string[];
  mushafTypes?: string[];
  riwayat?: string[];
  languages?: string[];
  audiences?: string[];
  platforms?: string[];
  minRating?: number;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

@Injectable({
  providedIn: 'root'
})
export class SearchService {
  private searchSubject = new Subject<SearchQuery>();
  private readonly HISTORY_KEY = 'search_history';
  private readonly MAX_HISTORY = 10;
  
  // Debounced search stream
  search$ = this.searchSubject.pipe(
    debounceTime(300),
    switchMap(query => this.executeSearch(query)),
    shareReplay(1)
  );
  
  constructor(
    private api: ApiService,
    private cache: CacheService
  ) {}
  
  searchApps(query: SearchQuery): Observable<SearchResult<App>> {
    this.searchSubject.next(query);
    return this.search$;
  }
  
  private executeSearch(query: SearchQuery): Observable<SearchResult<App>> {
    const cacheKey = this.buildCacheKey(query);
    
    // Check cache
    const cached = this.cache.get<SearchResult<App>>(cacheKey);
    if (cached) {
      return of(cached);
    }
    
    const params = this.buildQueryParams(query);
    
    return this.api.get<SearchResult<App>>('apps/search', params)
      .pipe(
        tap(result => {
          // Cache result
          this.cache.set(cacheKey, result, 5);
          
          // Save to history
          if (query.q) {
            this.addToHistory(query.q);
          }
        })
      );
  }
  
  private buildQueryParams(query: SearchQuery): HttpParams {
    let params = new HttpParams();
    
    // Text search
    if (query.q) {
      params = params.set('q', query.q);
    }
    
    // Array parameters (comma-separated)
    if (query.categories?.length) {
      params = params.set('categories', query.categories.join(','));
    }
    
    if (query.mushafTypes?.length) {
      params = params.set('mushafTypes', query.mushafTypes.join(','));
    }
    
    if (query.riwayat?.length) {
      params = params.set('riwayat', query.riwayat.join(','));
    }
    
    if (query.languages?.length) {
      params = params.set('languages', query.languages.join(','));
    }
    
    if (query.audiences?.length) {
      params = params.set('audiences', query.audiences.join(','));
    }
    
    if (query.platforms?.length) {
      params = params.set('platforms', query.platforms.join(','));
    }
    
    // Single value parameters
    if (query.minRating !== undefined && query.minRating > 0) {
      params = params.set('minRating', query.minRating.toString());
    }
    
    // Pagination
    params = params.set('page', (query.page || 1).toString());
    params = params.set('pageSize', (query.pageSize || 20).toString());
    
    // Sorting
    if (query.sortBy) {
      params = params.set('sortBy', query.sortBy);
      params = params.set('sortOrder', query.sortOrder || 'asc');
    }
    
    return params;
  }
  
  private buildCacheKey(query: SearchQuery): string {
    return `search_${JSON.stringify(query)}`;
  }
  
  // Search History Management
  addToHistory(searchTerm: string): void {
    const history = this.getHistory();
    
    // Remove duplicates
    const filtered = history.filter(term => term !== searchTerm);
    
    // Add to beginning
    filtered.unshift(searchTerm);
    
    // Limit size
    const limited = filtered.slice(0, this.MAX_HISTORY);
    
    localStorage.setItem(this.HISTORY_KEY, JSON.stringify(limited));
  }
  
  getHistory(): string[] {
    const stored = localStorage.getItem(this.HISTORY_KEY);
    return stored ? JSON.parse(stored) : [];
  }
  
  clearHistory(): void {
    localStorage.removeItem(this.HISTORY_KEY);
  }
  
  // Search Suggestions
  getSearchSuggestions(input: string): Observable<string[]> {
    const cacheKey = 'search_suggestions';
    
    // Check cache
    const cached = this.cache.get<string[]>(cacheKey);
    if (cached) {
      return of(this.filterSuggestions(cached, input));
    }
    
    // Fetch popular terms from API
    return this.api.get<{ terms: string[] }>('search/popular-terms')
      .pipe(
        map(response => {
          this.cache.set(cacheKey, response.terms, 60); // 1 hour
          return this.filterSuggestions(response.terms, input);
        })
      );
  }
  
  private filterSuggestions(terms: string[], input: string): string[] {
    if (!input) return [];
    
    const lowerInput = input.toLowerCase();
    return terms
      .filter(term => term.toLowerCase().includes(lowerInput))
      .slice(0, 5);
  }
}
```

### SearchQuery Model
```typescript
// src/app/models/search.model.ts
export interface SearchQuery {
  q?: string;
  categories?: string[];
  mushafTypes?: string[];
  riwayat?: string[];
  languages?: string[];
  audiences?: string[];
  platforms?: string[];
  minRating?: number;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface SearchResult<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  appliedFilters: {
    q?: string;
    categoriesCount: number;
    developerId?: string;
    platformsCount: number;
    minRating?: number;
  };
}
```

### Usage in Component
```typescript
export class SearchPageComponent implements OnInit {
  searchResults$: Observable<SearchResult<App>>;
  
  constructor(private searchService: SearchService) {}
  
  onSearch(query: SearchQuery): void {
    this.searchResults$ = this.searchService.searchApps(query);
  }
  
  onFilterChange(filters: SearchQuery): void {
    this.onSearch({ ...this.currentQuery, ...filters, page: 1 });
  }
}
```

---

## 🔗 Dependencies
- US5.1: API Service Layer
- US6.1: Search UI Components

---

## 📊 Definition of Done
- [ ] SearchService implemented
- [ ] Query builder working correctly
- [ ] Search method returns typed results
- [ ] Search history management working
- [ ] Search suggestions implemented
- [ ] Performance optimizations (debouncing, caching)
- [ ] Unit tests written (85%+ coverage)
- [ ] Integration tests pass

---

**Created:** October 6, 2025  
**Owner:** Abubakr Abduraghman, a.abduraghman@itqan.dev  
**Epic:** [Epic 6: Advanced Search System](../epics/epic-6-advanced-search-system.md)
