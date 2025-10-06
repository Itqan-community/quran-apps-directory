# US5.5: Implement Client-Side Caching Strategy

**Epic:** Epic 5 - Frontend Integration  
**Sprint:** Week 4, Day 4  
**Story Points:** 5  
**Priority:** P2  
**Assigned To:** Frontend Developer  
**Status:** Not Started

---

## 📋 User Story

**As a** User  
**I want** the app to cache frequently accessed data  
**So that** subsequent page loads are faster and data usage is reduced

---

## 🎯 Acceptance Criteria

### AC1: In-Memory Cache Service
- [ ] `CacheService` created with get/set/clear methods
- [ ] TTL (Time To Live) support per cache entry
- [ ] Memory limit enforcement (max 50MB)
- [ ] LRU (Least Recently Used) eviction policy

### AC2: Category Cache
- [ ] Categories cached for 1 hour
- [ ] Cache key: `categories_list`
- [ ] Subsequent calls return cached data
- [ ] Cache bypass option available

### AC3: App List Cache
- [ ] App list results cached by query params
- [ ] Cache key: `apps_list_{page}_{pageSize}_{sortBy}_{sortOrder}_{filters}`
- [ ] TTL: 5 minutes
- [ ] Clear cache on create/update/delete operations

### AC4: App Detail Cache
- [ ] Individual app details cached
- [ ] Cache key: `app_detail_{id}`
- [ ] TTL: 10 minutes
- [ ] Clear cache on app update

### AC5: IndexedDB for Persistence
- [ ] Use IndexedDB for offline storage
- [ ] Cache survives page refreshes
- [ ] Store up to 100 most recent apps
- [ ] Fallback to memory-only if IndexedDB unavailable

### AC6: Cache Invalidation
- [ ] Manual cache clear button in settings
- [ ] Automatic invalidation on data modification
- [ ] Version-based invalidation (clear on app version change)
- [ ] Time-based expiration

### AC7: Performance Monitoring
- [ ] Cache hit/miss tracking
- [ ] Log cache statistics in dev mode
- [ ] Display cache status in dev tools

---

## 📝 Technical Notes

### Cache Service Implementation
```typescript
import { Injectable } from '@angular/core';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // milliseconds
}

@Injectable({
  providedIn: 'root'
})
export class CacheService {
  private cache = new Map<string, CacheEntry<any>>();
  private maxSize = 50 * 1024 * 1024; // 50MB
  private hits = 0;
  private misses = 0;
  
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.misses++;
      return null;
    }
    
    // Check if expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      this.misses++;
      return null;
    }
    
    this.hits++;
    return entry.data as T;
  }
  
  set<T>(key: string, data: T, ttlMinutes: number = 5): void {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttlMinutes * 60 * 1000
    };
    
    this.cache.set(key, entry);
    this.enforceMemoryLimit();
  }
  
  clear(pattern?: string): void {
    if (!pattern) {
      this.cache.clear();
      return;
    }
    
    // Clear entries matching pattern
    const regex = new RegExp(pattern);
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    }
  }
  
  getStats(): { hits: number; misses: number; hitRate: number } {
    const total = this.hits + this.misses;
    return {
      hits: this.hits,
      misses: this.misses,
      hitRate: total > 0 ? (this.hits / total) * 100 : 0
    };
  }
  
  private enforceMemoryLimit(): void {
    // Simplified: just limit number of entries
    // In production, calculate actual memory usage
    const maxEntries = 1000;
    
    if (this.cache.size > maxEntries) {
      // Remove oldest entries (LRU)
      const entries = Array.from(this.cache.entries())
        .sort((a, b) => a[1].timestamp - b[1].timestamp);
      
      const toRemove = entries.slice(0, entries.length - maxEntries);
      toRemove.forEach(([key]) => this.cache.delete(key));
    }
  }
}
```

### Enhanced Apps Service with Caching
```typescript
import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { ApiService } from './api.service';
import { CacheService } from './cache.service';
import { App, AppDetail, PagedResult } from '../models';

@Injectable({
  providedIn: 'root'
})
export class AppsService {
  constructor(
    private api: ApiService,
    private cache: CacheService
  ) {}
  
  getApps(
    page: number = 1,
    pageSize: number = 20,
    sortBy: string = 'name',
    sortOrder: 'asc' | 'desc' = 'asc',
    bypassCache: boolean = false
  ): Observable<PagedResult<App>> {
    const cacheKey = `apps_list_${page}_${pageSize}_${sortBy}_${sortOrder}`;
    
    if (!bypassCache) {
      const cached = this.cache.get<PagedResult<App>>(cacheKey);
      if (cached) {
        console.log('[Cache] Hit:', cacheKey);
        return of(cached);
      }
    }
    
    console.log('[Cache] Miss:', cacheKey);
    
    const params = new HttpParams()
      .set('page', page.toString())
      .set('pageSize', pageSize.toString())
      .set('sortBy', sortBy)
      .set('sortOrder', sortOrder);
    
    return this.api.get<PagedResult<App>>('apps', params)
      .pipe(
        tap(result => {
          this.cache.set(cacheKey, result, 5); // 5 minutes TTL
        })
      );
  }
  
  getAppById(id: string, bypassCache: boolean = false): Observable<AppDetail | null> {
    const cacheKey = `app_detail_${id}`;
    
    if (!bypassCache) {
      const cached = this.cache.get<AppDetail>(cacheKey);
      if (cached) {
        return of(cached);
      }
    }
    
    return this.api.get<AppDetail>(`apps/${id}`)
      .pipe(
        tap(app => {
          if (app) {
            this.cache.set(cacheKey, app, 10); // 10 minutes TTL
          }
        })
      );
  }
  
  createApp(app: CreateAppDto): Observable<AppDetail> {
    return this.api.post<AppDetail>('apps', app)
      .pipe(
        tap(() => {
          // Invalidate app list cache
          this.cache.clear('apps_list_');
        })
      );
  }
  
  updateApp(id: string, app: UpdateAppDto): Observable<AppDetail> {
    return this.api.put<AppDetail>(`apps/${id}`, app)
      .pipe(
        tap(() => {
          // Invalidate specific app cache and lists
          this.cache.clear(`app_detail_${id}`);
          this.cache.clear('apps_list_');
        })
      );
  }
}
```

### IndexedDB Service (Optional Enhancement)
```typescript
import { Injectable } from '@angular/core';
import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface AppCacheDB extends DBSchema {
  apps: {
    key: string;
    value: {
      id: string;
      data: any;
      timestamp: number;
      ttl: number;
    };
  };
}

@Injectable({
  providedIn: 'root'
})
export class IndexedDBCacheService {
  private db: IDBPDatabase<AppCacheDB> | null = null;
  
  async init(): Promise<void> {
    try {
      this.db = await openDB<AppCacheDB>('quran-apps-cache', 1, {
        upgrade(db) {
          db.createObjectStore('apps', { keyPath: 'id' });
        },
      });
    } catch (error) {
      console.error('Failed to initialize IndexedDB', error);
    }
  }
  
  async get<T>(key: string): Promise<T | null> {
    if (!this.db) return null;
    
    const entry = await this.db.get('apps', key);
    
    if (!entry) return null;
    
    // Check expiration
    if (Date.now() - entry.timestamp > entry.ttl) {
      await this.db.delete('apps', key);
      return null;
    }
    
    return entry.data as T;
  }
  
  async set<T>(key: string, data: T, ttlMinutes: number): Promise<void> {
    if (!this.db) return;
    
    await this.db.put('apps', {
      id: key,
      data,
      timestamp: Date.now(),
      ttl: ttlMinutes * 60 * 1000
    });
  }
  
  async clear(): Promise<void> {
    if (!this.db) return;
    await this.db.clear('apps');
  }
}
```

---

## 🔗 Dependencies
- US5.1: API Service Layer
- US5.2: HTTP Interceptors

---

## 📊 Definition of Done
- [ ] CacheService implemented
- [ ] In-memory caching working
- [ ] TTL-based expiration working
- [ ] Cache invalidation on mutations
- [ ] IndexedDB integration (optional)
- [ ] Cache hit/miss tracking
- [ ] Manual cache clear available
- [ ] Performance improvement measurable (30%+ faster on cache hits)
- [ ] Unit tests written
- [ ] Documentation complete

---

**Created:** October 6, 2025  
**Owner:** Abubakr Abduraghman, a.abduraghman@itqan.dev  
**Epic:** [Epic 5: Frontend Integration](../epics/epic-5-frontend-integration.md)
