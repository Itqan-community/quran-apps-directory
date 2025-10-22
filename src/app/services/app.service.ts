import { Injectable } from "@angular/core";
import { HttpClient, HttpParams, HttpHeaders } from "@angular/common/http";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";
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

  constructor(private http: HttpClient) {}

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
   * Get all apps from the backend API
   */
  getApps(): Observable<QuranApp[]> {
    return this.http
      .get<BackendListResponse>(`${this.apiUrl}/apps/`, { headers: this.getHeaders() })
      .pipe(
        map((response) => {
          // Fetch all pages if needed (simplified version - just get first page)
          return response.results.map((app) => this.mapBackendApp(app));
        })
      );
  }

  /**
   * Get app by slug from the backend API
   */
  getAppById(id: string): Observable<QuranApp | undefined> {
    return this.http
      .get<BackendApp>(`${this.apiUrl}/apps/${id}/`, { headers: this.getHeaders() })
      .pipe(
        map((app) => this.mapBackendApp(app))
      );
  }

  /**
   * Search apps using backend search
   */
  searchApps(query: string): Observable<QuranApp[]> {
    const params = new HttpParams().set('search', query);
    return this.http
      .get<BackendListResponse>(`${this.apiUrl}/apps/`, {
        params,
        headers: this.getHeaders()
      })
      .pipe(
        map((response) => response.results.map((app) => this.mapBackendApp(app)))
      );
  }

  /**
   * Get apps by category using backend filtering
   */
  getAppsByCategory(category: string): Observable<QuranApp[]> {
    if (category === 'all') {
      return this.getApps();
    }

    const params = new HttpParams().set('categories__slug', category);
    return this.http
      .get<BackendListResponse>(`${this.apiUrl}/apps/`, {
        params,
        headers: this.getHeaders()
      })
      .pipe(
        map((response) => response.results.map((app) => this.mapBackendApp(app)))
      );
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
