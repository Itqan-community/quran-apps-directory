import { Injectable } from "@angular/core";
import { HttpClient, HttpParams, HttpHeaders } from "@angular/common/http";
import { Observable, of } from "rxjs";
import { map, catchError } from "rxjs/operators";
import { environment } from "../../environments/environment";

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
  Developer_Id?: string; // ID for robust developer page linking
  status: string;
  Apps_Avg_Rating: number;
  categories: string[];
  screenshots_ar: string[];
  screenshots_en: string[];
  AppStore_Link?: string | null;
  Google_Play_Link?: string | null;
  App_Gallery_Link?: string | null;
  platform: string;
  ai_reasoning?: string;
  relevance_score?: number;
}

@Injectable({
  providedIn: "root",
})
export class AppService {
  private apiUrl = environment.apiUrl;
  private apiVersion = (environment as any).apiVersion || 'v1';

  constructor(private http: HttpClient) {}

  /**
   * Get HTTP headers with API versioning
   */
  private getHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'X-API-Version': this.apiVersion
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
      Developer_Website: null,
      Developer_Id: backendApp.developer?.id, // Include developer ID for robust linking
      status: backendApp.status,
      Apps_Avg_Rating: parseFloat(backendApp.avg_rating),
      categories: (backendApp.categories || []).map(cat => typeof cat === 'string' ? cat : cat.slug).filter(Boolean),
      screenshots_ar: backendApp.screenshots_ar || [],
      screenshots_en: backendApp.screenshots_en || [],
      AppStore_Link: backendApp.app_store_link || null,
      Google_Play_Link: backendApp.google_play_link || null,
      App_Gallery_Link: backendApp.app_gallery_link || null,
      platform: backendApp.platform,
    };
  }

  /**
   * Get all apps from API
   * ETag caching is handled by the browser and backend via Cache-Control headers
   */
  getApps(): Observable<QuranApp[]> {
    return this.http
      .get<BackendListResponse>(`${this.apiUrl}/apps/`, { headers: this.getHeaders() })
      .pipe(
        map((response) => {
          return response.results.map((app) => this.mapBackendApp(app));
        }),
        catchError(error => {
          console.error('[AppService] Error loading apps:', error);
          return of([]);
        })
      );
  }

  /**
   * Get app by ID or slug from the API
   */
  getAppById(id: string): Observable<QuranApp | undefined> {
    return this.http
      .get<BackendApp>(`${this.apiUrl}/apps/${id}`, { headers: this.getHeaders() })
      .pipe(
        map((app) => this.mapBackendApp(app)),
        catchError(error => {
          console.error('[AppService] Error loading app:', error);
          return of(undefined);
        })
      );
  }

  /**
   * Get apps by developer ID (preferred method - most robust)
   */
  getAppsByDeveloperId(developerId: string): Observable<QuranApp[]> {
    const params = new HttpParams().set('developer_id', developerId);
    return this.http
      .get<BackendListResponse>(`${this.apiUrl}/apps/`, { headers: this.getHeaders(), params })
      .pipe(
        map((response) => {
          return response.results.map((app) => this.mapBackendApp(app));
        }),
        catchError(error => {
          console.error('[AppService] Error loading apps by developer ID:', error);
          return of([]);
        })
      );
  }

  /**
   * Get apps by developer (legacy method - kept for backward compatibility)
   * Note: Delegates to getAppsByDeveloperId if ID is provided
   */
  getAppsByDeveloper(developerName: string): Observable<QuranApp[]> {
    const params = new HttpParams().set('search', developerName);
    return this.http
      .get<BackendListResponse>(`${this.apiUrl}/apps/`, { headers: this.getHeaders(), params })
      .pipe(
        map((response) => {
          return response.results.map((app) => this.mapBackendApp(app));
        }),
        catchError(error => {
          console.error('[AppService] Error loading apps by developer:', error);
          return of([]);
        })
      );
  }

  /**
   * Get apps by category
   */
  getAppsByCategory(category: string): Observable<QuranApp[]> {
    if (category === 'all') {
      return this.getApps();
    }

    const params = new HttpParams().set('category', category);
    return this.http
      .get<BackendListResponse>(`${this.apiUrl}/apps/`, { headers: this.getHeaders(), params })
      .pipe(
        map((response) => {
          return response.results.map((app) => this.mapBackendApp(app));
        }),
        catchError(error => {
          console.error('[AppService] Error loading apps by category:', error);
          return of([]);
        })
      );
  }

  /**
   * Search apps (client-side, no backend search caching)
   */
  searchApps(query: string): Observable<QuranApp[]> {
    const normalizedQuery = query.toLowerCase().trim();

    if (!normalizedQuery) {
      return of([]);
    }

    // Load all apps and filter client-side
    return this.getApps().pipe(
      map(apps => {
        return apps.filter(app =>
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
      })
    );
  }

  /**
   * Get featured apps
   */
  getFeaturedApps(): Observable<QuranApp[]> {
    const params = new HttpParams().set('featured', 'true');
    return this.http
      .get<BackendListResponse>(`${this.apiUrl}/apps/`, { headers: this.getHeaders(), params })
      .pipe(
        map((response) => {
          return response.results.map((app) => this.mapBackendApp(app));
        }),
        catchError(error => {
          console.error('[AppService] Error loading featured apps:', error);
          return of([]);
        })
      );
  }

  /**
   * Get all categories
   */
  getCategories(): Observable<string[]> {
    return this.http
      .get<any[]>(`${this.apiUrl}/categories/`, { headers: this.getHeaders() })
      .pipe(
        map((categories) => {
          return categories.map(cat => cat.slug);
        }),
        catchError(error => {
          console.error('[AppService] Error loading categories:', error);
          return of([]);
        })
      );
  }
}
