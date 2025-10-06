# US5.1: Create Angular API Service Layer

**Epic:** Epic 5 - Frontend Integration  
**Sprint:** Week 4, Day 1  
**Story Points:** 5  
**Priority:** P0  
**Assigned To:** Frontend Developer  
**Status:** Not Started

---

## 📋 User Story

**As a** Frontend Developer  
**I want** a centralized Angular service for API communication  
**So that** all HTTP requests are consistent, type-safe, and easy to maintain

---

## 🎯 Acceptance Criteria

### AC1: Base API Service Created
- [ ] `ApiService` created in `src/app/services/`
- [ ] Base URL configured from environment files
- [ ] HttpClient injected and configured
- [ ] Common HTTP methods wrapped (GET, POST, PUT, DELETE)
- [ ] TypeScript strict mode enabled

### AC2: Environment Configuration
- [ ] `environment.ts` (dev): `apiUrl: 'http://localhost:5000/api'`
- [ ] `environment.staging.ts`: `apiUrl: 'https://staging-api.quran-apps.itqan.dev/api'`
- [ ] `environment.prod.ts`: `apiUrl: 'https://api.quran-apps.itqan.dev/api'`
- [ ] Environment switching tested

### AC3: Type-Safe Response Models
- [ ] TypeScript interfaces created matching DTOs:
  - `App`, `AppDetail`, `AppList`
  - `Category`, `Developer`
  - `PagedResult<T>`, `SearchResult<T>`
  - `ApiError`
- [ ] Interfaces in `src/app/models/` directory

### AC4: Apps Service Implementation
- [ ] `AppsService` extends or uses `ApiService`
- [ ] Methods implemented:
  - `getApps(page, pageSize, sortBy, sortOrder): Observable<PagedResult<App>>`
  - `getAppById(id): Observable<AppDetail>`
  - `searchApps(query): Observable<SearchResult<App>>`
  - `createApp(app): Observable<AppDetail>`
  - `updateApp(id, app): Observable<AppDetail>`
  - `deleteApp(id): Observable<void>`
- [ ] All methods return typed Observables

### AC5: Categories & Developers Services
- [ ] `CategoriesService` created with methods:
  - `getCategories(): Observable<Category[]>`
  - `getCategoryApps(id, page, pageSize): Observable<PagedResult<App>>`
- [ ] `DevelopersService` created with methods:
  - `getDevelopers(page, pageSize, search): Observable<PagedResult<Developer>>`
  - `getDeveloperById(id): Observable<DeveloperDetail>`
  - `getDeveloperApps(id): Observable<App[]>`

### AC6: Error Handling Strategy
- [ ] HTTP errors mapped to user-friendly messages
- [ ] Network errors detected and handled
- [ ] 401 errors trigger authentication flow
- [ ] 404 errors return null (not throw)
- [ ] Error logging to console in dev

---

## 📝 Technical Notes

### Base API Service
```typescript
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private readonly baseUrl = environment.apiUrl;
  
  constructor(private http: HttpClient) {}
  
  get<T>(endpoint: string, params?: HttpParams): Observable<T> {
    return this.http.get<T>(`${this.baseUrl}/${endpoint}`, { params })
      .pipe(catchError(this.handleError));
  }
  
  post<T>(endpoint: string, body: any): Observable<T> {
    return this.http.post<T>(`${this.baseUrl}/${endpoint}`, body)
      .pipe(catchError(this.handleError));
  }
  
  put<T>(endpoint: string, body: any): Observable<T> {
    return this.http.put<T>(`${this.baseUrl}/${endpoint}`, body)
      .pipe(catchError(this.handleError));
  }
  
  delete(endpoint: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${endpoint}`)
      .pipe(catchError(this.handleError));
  }
  
  private handleError(error: any): Observable<never> {
    console.error('API Error:', error);
    
    let message = 'An unexpected error occurred';
    
    if (error.error instanceof ErrorEvent) {
      // Client-side error
      message = `Error: ${error.error.message}`;
    } else if (error.status) {
      // Server-side error
      message = error.error?.message || `Error Code: ${error.status}`;
    }
    
    return throwError(() => ({ status: error.status, message }));
  }
}
```

### Apps Service
```typescript
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { App, AppDetail, PagedResult, SearchResult, CreateAppDto, UpdateAppDto } from '../models';

@Injectable({
  providedIn: 'root'
})
export class AppsService {
  constructor(private api: ApiService) {}
  
  getApps(
    page: number = 1,
    pageSize: number = 20,
    sortBy: string = 'name',
    sortOrder: 'asc' | 'desc' = 'asc'
  ): Observable<PagedResult<App>> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('pageSize', pageSize.toString())
      .set('sortBy', sortBy)
      .set('sortOrder', sortOrder);
    
    return this.api.get<PagedResult<App>>('apps', params);
  }
  
  getAppById(id: string): Observable<AppDetail | null> {
    return this.api.get<AppDetail>(`apps/${id}`)
      .pipe(
        catchError(error => {
          if (error.status === 404) return of(null);
          throw error;
        })
      );
  }
  
  searchApps(query: SearchQuery): Observable<SearchResult<App>> {
    let params = new HttpParams().set('page', query.page.toString());
    
    if (query.q) params = params.set('q', query.q);
    if (query.categories?.length) {
      params = params.set('categories', query.categories.join(','));
    }
    // Add other query params...
    
    return this.api.get<SearchResult<App>>('apps/search', params);
  }
  
  createApp(app: CreateAppDto): Observable<AppDetail> {
    return this.api.post<AppDetail>('apps', app);
  }
  
  updateApp(id: string, app: UpdateAppDto): Observable<AppDetail> {
    return this.api.put<AppDetail>(`apps/${id}`, app);
  }
  
  deleteApp(id: string): Observable<void> {
    return this.api.delete(`apps/${id}`);
  }
}
```

### TypeScript Interfaces
```typescript
// src/app/models/app.model.ts
export interface App {
  id: string;
  nameAr: string;
  nameEn: string;
  shortDescriptionAr: string;
  shortDescriptionEn: string;
  applicationIconUrl: string;
  averageRating?: number;
  categories: string[];
}

export interface AppDetail extends App {
  descriptionAr: string;
  descriptionEn: string;
  developer: Developer;
  screenshotsAr: string[];
  screenshotsEn: string[];
  mainImageAr: string;
  mainImageEn: string;
  googlePlayLink?: string;
  appStoreLink?: string;
  appGalleryLink?: string;
  createdAt: Date;
}

export interface PagedResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasPrevious: boolean;
  hasNext: boolean;
}

export interface Category {
  id: string;
  nameAr: string;
  nameEn: string;
  appCount: number;
}

export interface Developer {
  id: string;
  nameAr: string;
  nameEn: string;
  logoUrl?: string;
  website?: string;
  appCount: number;
}
```

---

## 🔗 Dependencies
- US4.1-4.3: API endpoints must be implemented
- Angular 19 HttpClient configured

---

## 📊 Definition of Done
- [ ] ApiService created and tested
- [ ] AppsService, CategoriesService, DevelopersService implemented
- [ ] TypeScript interfaces matching backend DTOs
- [ ] Environment configuration complete
- [ ] Error handling working
- [ ] All methods type-safe
- [ ] Unit tests written (Jasmine/Karma)
- [ ] Code review passed

---

**Created:** October 6, 2025  
**Owner:** Abubakr Abduraghman, a.abduraghman@itqan.dev  
**Epic:** [Epic 5: Frontend Integration](../epics/epic-5-frontend-integration.md)
