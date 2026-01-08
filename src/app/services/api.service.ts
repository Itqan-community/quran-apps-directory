import { Injectable, PLATFORM_ID, Inject, makeStateKey, TransferState } from '@angular/core';
import { isPlatformServer, isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';

// Transfer state keys for SSR hydration
const APPS_STATE_KEY = makeStateKey<App[]>('apps');
const CATEGORIES_STATE_KEY = makeStateKey<Category[]>('categories');

export interface App {
  id: string;
  name_en: string;
  name_ar: string;
  slug: string;
  short_description_en: string;
  short_description_ar: string;
  description_en: string;
  description_ar: string;
  application_icon: string;
  main_image_en: string;
  main_image_ar: string;
  google_play_link: string;
  app_store_link: string;
  app_gallery_link: string;
  screenshots_en: string[];
  screenshots_ar: string[];
  avg_rating: number;
  review_count: number;
  view_count: number;
  sort_order: number;
  featured: boolean;
  platform: string;
  status: string;
  developer: {
    id: string;
    name_en: string;
    name_ar: string;
    website?: string;
    logo?: string;
  };
  categories: {
    id: string;
    name_en: string;
    name_ar: string;
    slug: string;
  }[];
  created_at: string;
  updated_at: string;
}

export interface AppListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: App[];
}

export interface Category {
  id: string;
  name_en: string;
  name_ar: string;
  slug: string;
  description_en?: string;
  description_ar?: string;
  icon?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private readonly apiUrl = environment.apiUrl || 'http://localhost:8000/api';
  private appsSubject = new BehaviorSubject<App[]>([]);
  private categoriesSubject = new BehaviorSubject<Category[]>([]);
  private loadingSubject = new BehaviorSubject<boolean>(false);
  private errorSubject = new BehaviorSubject<string | null>(null);

  // Public observables
  apps$ = this.appsSubject.asObservable();
  categories$ = this.categoriesSubject.asObservable();
  loading$ = this.loadingSubject.asObservable();
  error$ = this.errorSubject.asObservable();

  constructor(
    private http: HttpClient,
    private transferState: TransferState,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    // On browser, check if we have transferred state from SSR
    if (isPlatformBrowser(this.platformId)) {
      this.hydrateFromTransferState();
    }
  }

  /**
   * Hydrate data from TransferState on browser (SSR -> Client handoff)
   * This prevents duplicate API calls after prerendering
   */
  private hydrateFromTransferState(): void {
    // Check for apps data
    if (this.transferState.hasKey(APPS_STATE_KEY)) {
      const apps = this.transferState.get(APPS_STATE_KEY, []);
      if (apps.length > 0) {
        this.appsSubject.next(apps);
        this.transferState.remove(APPS_STATE_KEY);
      }
    }

    // Check for categories data
    if (this.transferState.hasKey(CATEGORIES_STATE_KEY)) {
      const categories = this.transferState.get(CATEGORIES_STATE_KEY, []);
      if (categories.length > 0) {
        this.categoriesSubject.next(categories);
        this.transferState.remove(CATEGORIES_STATE_KEY);
      }
    }
  }

  /**
   * Get all published applications with optional filtering and search
   * Uses TransferState for SSR hydration and ETag caching
   */
  getApps(params?: {
    search?: string;
    category?: string;
    platform?: string;
    featured?: boolean;
    ordering?: string;
    page?: number;
    page_size?: number;
  }): Observable<AppListResponse> {
    // On browser, check if we already have data from TransferState (no params = home page)
    const isHomePageRequest = !params || Object.keys(params).length === 0;
    if (isPlatformBrowser(this.platformId) && isHomePageRequest) {
      const cachedApps = this.appsSubject.value;
      if (cachedApps.length > 0) {
        // Return cached data immediately without loading spinner
        return of({ count: cachedApps.length, next: null, previous: null, results: cachedApps as App[] });
      }
    }

    this.setLoading(true);
    this.setError(null);

    let httpParams = new HttpParams();

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          httpParams = httpParams.set(key, value.toString());
        }
      });
    }

    return this.http.get<AppListResponse>(`${this.apiUrl}/apps/`, { params: httpParams }).pipe(
      tap(response => {
        this.setLoading(false);
        this.appsSubject.next(response.results);

        // On server, store data in TransferState for client hydration (only for home page)
        if (isPlatformServer(this.platformId) && isHomePageRequest) {
          this.transferState.set(APPS_STATE_KEY, response.results);
        }
      }),
      catchError(error => {
        this.setError('Failed to load applications. Please try again later.');
        this.setLoading(false);
        return of({ count: 0, next: null, previous: null, results: [] });
      })
    );
  }

  /**
   * Get a single application by slug or ID
   */
  getApp(identifier: string): Observable<App | null> {
    this.setLoading(true);
    this.setError(null);

    return this.http.get<App>(`${this.apiUrl}/apps/${identifier}/`).pipe(
      map(app => app || null),
      tap(() => this.setLoading(false)),
      catchError(error => {
        this.setError('Application not found or failed to load.');
        this.setLoading(false);
        return of(null);
      })
    );
  }

  /**
   * Get featured applications
   */
  getFeaturedApps(category?: string): Observable<App[]> {
    this.setLoading(true);
    this.setError(null);

    let params = new HttpParams().set('featured', 'true');
    if (category && category !== 'all') {
      params = params.set('category', category);
    }

    return this.http.get<AppListResponse>(`${this.apiUrl}/apps/`, { params }).pipe(
      map(response => response.results),
      tap(apps => {
        this.setLoading(false);
      }),
      catchError(error => {
        this.setError('Failed to load featured applications.');
        this.setLoading(false);
        return of([]);
      })
    );
  }

  /**
   * Get applications by platform
   */
  getAppsByPlatform(platform: string): Observable<App[]> {
    this.setLoading(true);
    this.setError(null);

    const params = new HttpParams().set('platform', platform);

    return this.http.get<AppListResponse>(`${this.apiUrl}/apps/`, { params }).pipe(
      map(response => response.results),
      tap(() => this.setLoading(false)),
      catchError(error => {
        this.setError('Failed to load applications for this platform.');
        this.setLoading(false);
        return of([]);
      })
    );
  }

  /**
   * Get all categories
   * Uses TransferState for SSR hydration
   */
  getCategories(): Observable<Category[]> {
    // On browser, check if we already have data from TransferState
    if (isPlatformBrowser(this.platformId)) {
      const cachedCategories = this.categoriesSubject.value;
      if (cachedCategories.length > 0) {
        // Return cached data immediately without loading spinner
        return of(cachedCategories);
      }
    }

    this.setLoading(true);
    this.setError(null);

    return this.http.get<Category[]>(`${this.apiUrl}/categories/`).pipe(
      tap(categories => {
        this.setLoading(false);
        this.categoriesSubject.next(categories);

        // On server, store data in TransferState for client hydration
        if (isPlatformServer(this.platformId)) {
          this.transferState.set(CATEGORIES_STATE_KEY, categories);
        }
      }),
      catchError(error => {
        this.setError('Failed to load categories.');
        this.setLoading(false);
        return of([]);
      })
    );
  }

  /**
   * Search applications
   */
  searchApps(query: string, filters?: {
    category?: string;
    platform?: string;
    featured?: boolean;
  }): Observable<App[]> {
    this.setLoading(true);
    this.setError(null);

    const params: any = { search: query };
    if (filters) {
      Object.assign(params, filters);
    }

    return this.getApps(params).pipe(
      map(response => response.results)
    );
  }

  /**
   * Get cached apps immediately (for UI responsiveness)
   */
  getCachedApps(): App[] {
    return this.appsSubject.value;
  }

  /**
   * Get cached categories immediately
   */
  getCachedCategories(): Category[] {
    return this.categoriesSubject.value;
  }

  /**
   * Refresh data from server
   */
  refreshApps(): void {
    this.getApps().subscribe();
  }

  /**
   * Refresh categories from server
   */
  refreshCategories(): void {
    this.getCategories().subscribe();
  }

  // Private helper methods
  private setLoading(loading: boolean): void {
    this.loadingSubject.next(loading);
  }

  private setError(error: string | null): void {
    this.errorSubject.next(error);
  }

  /**
   * Utility method to format app data for components
   */
  formatAppForDisplay(app: App) {
    let formattedCategories: string[] = [];
    if (app.categories && Array.isArray(app.categories)) {
      formattedCategories = (app.categories as any[]).reduce((acc: string[], cat: any) => {
        if (typeof cat === 'string') {
          acc.push(cat.toLowerCase());
        } else if (cat && typeof cat === 'object' && cat.name_en) {
          const name = (cat.name_en as string).toLowerCase();
          if (name) acc.push(name);
        }
        return acc;
      }, []);
    }

    return {
      ...app,
      Name_En: app.name_en,
      Name_Ar: app.name_ar,
      Short_Description_En: app.short_description_en,
      Short_Description_Ar: app.short_description_ar,
      Description_En: app.description_en,
      Description_Ar: app.description_ar,
      applicationIcon: app.application_icon,
      mainImage_en: app.main_image_en,
      mainImage_ar: app.main_image_ar,
      Google_Play_Link: app.google_play_link,
      AppStore_Link: app.app_store_link,
      App_Gallery_Link: app.app_gallery_link,
      screenshots_en: app.screenshots_en,
      screenshots_ar: app.screenshots_ar,
      Apps_Avg_Rating: app.avg_rating,
      Developer_Name_En: app.developer?.name_en || null,
      Developer_Name_Ar: app.developer?.name_ar || null,
      Developer_Website: app.developer?.website || null,
      Developer_Logo: app.developer?.logo || null,
      categories: formattedCategories,
      slug: app.slug,
      status: app.status
    };
  }
}
