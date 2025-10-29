import { Injectable } from "@angular/core";
import { HttpClient, HttpParams, HttpHeaders } from "@angular/common/http";
import { Observable, BehaviorSubject, of, combineLatest } from "rxjs";
import { map, shareReplay, tap, catchError, switchMap, debounceTime, distinctUntilChanged } from "rxjs/operators";
import { environment } from "../../environments/environment";
import { BrowserStorageService } from "./browser-storage.service";

// Backend API response interfaces
interface BackendCategory {
  id: string;
  name_en: string;
  name_ar: string;
  slug: string;
  icon: string | null;
  color: string;
  sort_order: number;
}

interface BackendDeveloper {
  id: string;
  name_en: string;
  name_ar: string;
  logo_url: string | null;
  is_verified: boolean;
}

interface BackendApp {
  id: string;
  name_en: string;
  name_ar: string;
  slug: string;
  short_description_en: string;
  short_description_ar: string;
  description_en?: string;
  description_ar?: string;
  application_icon: string | null;
  main_image_en?: string | null;
  main_image_ar?: string | null;
  google_play_link?: string | null;
  app_store_link?: string | null;
  app_gallery_link?: string | null;
  screenshots_en?: string[];
  screenshots_ar?: string[];
  avg_rating: string;
  review_count: number;
  view_count: number;
  featured: boolean;
  platform: string;
  sort_order: number;
  status: string;
  developer?: BackendDeveloper;
  developer_name?: string;
  developer_name_ar?: string;
  categories: BackendCategory[];
}

interface BackendListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: BackendApp[];
}

// Frontend interface (keep for compatibility)
export interface QuranApp {
  id: string;
  slug: string;
  Name_Ar: string;
  Name_En: string;
  Short_Description_Ar: string | null;
  Short_Description_En: string | null;
  Description_Ar: string | null;
  Description_En: string | null;
  mainImage_ar: string | null;
  mainImage_en: string | null;
  applicationIcon: string | null;
  Developer_Logo: string | null;
  Developer_Name_En: string | null;
  Developer_Name_Ar: string | null;
  Developer_Website: string | null;
  status: string;
  Apps_Avg_Rating: number;
  categories: string[];
  screenshots_ar: string[];
  screenshots_en: string[];
  AppStore_Link?: string | null;
  Google_Play_Link?: string | null;
  App_Gallery_Link?: string | null;
}

@Injectable({
  providedIn: "root",
})
export class AppService {
  private apiUrl = environment.apiUrl;
  private apiVersion = (environment as any).apiVersion || 'v1';

  // Cache subjects for reactive data
  private appsCache$ = new BehaviorSubject<QuranApp[]>([]);
  private categoriesCache$ = new BehaviorSubject<string[]>([]);
  private searchCache = new Map<string, QuranApp[]>();
  private categoryCache = new Map<string, QuranApp[]>();

  // Observable streams with caching
  private allApps$!: Observable<QuranApp[]>;
  private cachedApps$!: Observable<QuranApp[]>;

  constructor(
    private http: HttpClient,
    private browserStorage: BrowserStorageService
  ) {
    this.initializeCaches();
  }

  /**
   * Initialize reactive caches
   */
  private initializeCaches(): void {
    // Try to load from browser storage first
    this.allApps$ = this.browserStorage.getOrSet<QuranApp[]>(
      'all_apps',
      () => this.loadAppsFromAPI(),
      30 * 60 * 1000 // 30 minutes TTL
    ).pipe(
      shareReplay(1), // Cache the last emission
      tap(apps => {
        this.appsCache$.next(apps);
        this.extractAndCacheCategories(apps);
        // Save categories to browser storage
        const allCategories = apps.flatMap(app => app.categories);
        const uniqueCategories = Array.from(new Set(allCategories)).sort();
        this.browserStorage.set('categories', uniqueCategories, 60 * 60 * 1000).subscribe();
      })
    );

    this.cachedApps$ = this.appsCache$.asObservable();
  }

  /**
   * Get HTTP headers with API versioning
   */
  private getHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'X-API-Version': this.apiVersion  // Version in custom header instead
    });
  }

  /**
   * Map backend app data to frontend QuranApp interface
   */
  private mapBackendApp(backendApp: BackendApp): QuranApp {
    return {
      id: backendApp.id,
      slug: backendApp.slug,
      Name_En: backendApp.name_en,
      Name_Ar: backendApp.name_ar,
      Short_Description_En: backendApp.short_description_en,
      Short_Description_Ar: backendApp.short_description_ar,
      Description_En: backendApp.description_en || null,
      Description_Ar: backendApp.description_ar || null,
      mainImage_en: backendApp.main_image_en || null,
      mainImage_ar: backendApp.main_image_ar || null,
      applicationIcon: backendApp.application_icon,
      Developer_Logo: backendApp.developer?.logo_url || null,
      Developer_Name_En: backendApp.developer?.name_en || backendApp.developer_name || null,
      Developer_Name_Ar: backendApp.developer?.name_ar || backendApp.developer_name_ar || null,
      Developer_Website: null, // Not in list response
      status: backendApp.status,
      Apps_Avg_Rating: parseFloat(backendApp.avg_rating),
      categories: backendApp.categories.map(cat => cat.slug),
      screenshots_ar: backendApp.screenshots_ar || [],
      screenshots_en: backendApp.screenshots_en || [],
      AppStore_Link: backendApp.app_store_link || null,
      Google_Play_Link: backendApp.google_play_link || null,
      App_Gallery_Link: backendApp.app_gallery_link || null,
    };
  }

  /**
   * Load apps from API with error handling
   */
  private loadAppsFromAPI(): Observable<QuranApp[]> {
    return this.http
      .get<BackendListResponse>(`${this.apiUrl}/apps/`, { headers: this.getHeaders() })
      .pipe(
        map((response) => {
          return response.results.map((app) => this.mapBackendApp(app));
        }),
        catchError(error => {
          console.error('[AppService] Error loading apps:', error);
          // Return cached apps if available, otherwise empty array
          const cachedApps = this.appsCache$.value;
          return of(cachedApps.length > 0 ? cachedApps : []);
        })
      );
  }

  /**
   * Get all apps with caching
   */
  getApps(): Observable<QuranApp[]> {
    // If we have cached data, return it immediately
    const cachedApps = this.appsCache$.value;
    if (cachedApps.length > 0) {
      return this.cachedApps$;
    }

    // Otherwise, load from API
    return this.allApps$;
  }

  /**
   * Force refresh apps cache
   */
  refreshApps(): Observable<QuranApp[]> {
    this.allApps$ = this.loadAppsFromAPI().pipe(
      shareReplay(1),
      tap(apps => {
        this.appsCache$.next(apps);
        this.extractAndCacheCategories(apps);
        // Clear related caches
        this.searchCache.clear();
        this.categoryCache.clear();
      })
    );
    return this.allApps$;
  }

  /**
   * Get app by slug from the backend API
   */
  getAppById(id: string): Observable<QuranApp | undefined> {
    return this.http
      .get<BackendApp>(`${this.apiUrl}/apps/${id}`, { headers: this.getHeaders() })
      .pipe(
        map((app) => this.mapBackendApp(app))
      );
  }

  /**
   * Search apps with caching and debouncing
   */
  searchApps(query: string): Observable<QuranApp[]> {
    const normalizedQuery = query.toLowerCase().trim();
    const cacheKey = `search_${normalizedQuery}`;

    // Return empty for empty queries
    if (!normalizedQuery) {
      return of([]);
    }

    // Check browser storage cache first
    return this.browserStorage.getOrSet<QuranApp[]>(
      cacheKey,
      () => {
        // Check memory cache
        if (this.searchCache.has(normalizedQuery)) {
          return of(this.searchCache.get(normalizedQuery)!);
        }

        // Perform search
        return this.getApps().pipe(
          map(apps => {
            const filtered = apps.filter(app =>
              app.Name_En?.toLowerCase().includes(normalizedQuery) ||
              app.Name_Ar?.toLowerCase().includes(normalizedQuery) ||
              app.Short_Description_En?.toLowerCase().includes(normalizedQuery) ||
              app.Short_Description_Ar?.toLowerCase().includes(normalizedQuery) ||
              app.Description_En?.toLowerCase().includes(normalizedQuery) ||
              app.Description_Ar?.toLowerCase().includes(normalizedQuery) ||
              app.Developer_Name_En?.toLowerCase().includes(normalizedQuery) ||
              app.Developer_Name_Ar?.toLowerCase().includes(normalizedQuery) ||
              app.categories.some(cat => cat.toLowerCase().includes(normalizedQuery))
            );

            // Cache the results in memory
            this.searchCache.set(normalizedQuery, filtered);
            return filtered;
          })
        );
      },
      15 * 60 * 1000 // 15 minutes TTL for search results
    );
  }

  /**
   * Create a reactive search stream with debouncing
   */
  createSearchStream(searchQuery$: Observable<string>): Observable<QuranApp[]> {
    return searchQuery$.pipe(
      debounceTime(300), // Wait 300ms after user stops typing
      distinctUntilChanged(),
      switchMap(query => this.searchApps(query))
    );
  }

  /**
   * Get apps by category with caching
   */
  getAppsByCategory(category: string): Observable<QuranApp[]> {
    if (category === 'all') {
      return this.getApps();
    }

    const cacheKey = `category_${category}`;

    // Check browser storage cache first
    return this.browserStorage.getOrSet<QuranApp[]>(
      cacheKey,
      () => {
        // Check memory cache
        if (this.categoryCache.has(category)) {
          return of(this.categoryCache.get(category)!);
        }

        // Perform category filtering
        return this.getApps().pipe(
          map(apps => {
            const filtered = apps.filter(app =>
              app.categories.includes(category)
            );

            // Cache the results in memory
            this.categoryCache.set(category, filtered);
            return filtered;
          })
        );
      },
      20 * 60 * 1000 // 20 minutes TTL for category results
    );
  }

  /**
   * Get categories from cached apps
   */
  getCategories(): Observable<string[]> {
    return this.categoriesCache$.asObservable();
  }

  /**
   * Extract and cache categories from apps
   */
  private extractAndCacheCategories(apps: QuranApp[]): void {
    const allCategories = apps.flatMap(app => app.categories);
    const uniqueCategories = Array.from(new Set(allCategories)).sort();
    this.categoriesCache$.next(uniqueCategories);
  }

  /**
   * Clear all caches
   */
  clearCaches(): void {
    this.searchCache.clear();
    this.categoryCache.clear();
    this.appsCache$.next([]);
    this.categoriesCache$.next([]);
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    appsCacheSize: number;
    searchCacheSize: number;
    categoryCacheSize: number;
    categoriesCount: number;
  } {
    return {
      appsCacheSize: this.appsCache$.value.length,
      searchCacheSize: this.searchCache.size,
      categoryCacheSize: this.categoryCache.size,
      categoriesCount: this.categoriesCache$.value.length
    };
  }

  /**
   * Get apps by developer
   */
  getAppsByDeveloper(developerName: string): Observable<QuranApp[]> {
    // For now, get all apps and filter client-side
    // TODO: Add backend endpoint for filtering by developer name
    return this.getApps().pipe(
      map((apps) => {
        const decodedDeveloperName = decodeURIComponent(developerName);
        return apps.filter((app) => {
          const englishName = app.Developer_Name_En?.toLowerCase();
          const arabicName = app.Developer_Name_Ar?.toLowerCase();
          const searchName = decodedDeveloperName.toLowerCase();

          return englishName === searchName || arabicName === searchName;
        });
      })
    );
  }

  /**
   * Get developer name for URL
   */
  getDeveloperNameForUrl(app: QuranApp): string {
    return encodeURIComponent(app.Developer_Name_En || app.Developer_Name_Ar || '');
  }
}
