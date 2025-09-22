import { Injectable } from "@angular/core";
import { Observable, of } from "rxjs";
import { applicationsData } from "./applicationsData";

export interface QuranApp {
  id: string;
  Name_Ar: string;
  Name_En: string;
  Short_Description_Ar:string | null;
  Short_Description_En:string | null;
  Description_Ar:string | null;
  Description_En:string | null;
  mainImage_ar:string | null;
  mainImage_en:string | null;
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
  private apps: QuranApp[] = applicationsData;
  getApps(): Observable<QuranApp[]> {
    return of(this.apps);
  }

  getAppById(id: string): Observable<QuranApp | undefined> {
    return of(this.apps.find((app) => app.id === id));
  }

  searchApps(query: string): Observable<QuranApp[]> {
    const lowercaseQuery = query.toLowerCase();
    return of(
      this.apps.filter(
        (app) =>
          app.Name_Ar.toLowerCase().includes(lowercaseQuery) ||
          app.Name_En.toLowerCase().includes(lowercaseQuery) ||
          app.Description_En?.toLowerCase().includes(lowercaseQuery) ||
          app.Description_Ar?.toLowerCase().includes(lowercaseQuery)
      )
    );
  }

  getAppsByCategory(category: string): Observable<QuranApp[]> {
    if (category == 'all') {
      return of(this.apps);
    }else {
      return of(this.apps.filter((app) => app.categories.includes(category)));
    }
  }

  getAppsByDeveloper(developerName: string): Observable<QuranApp[]> {
    // Decode URI component to handle URL encoding
    const decodedDeveloperName = decodeURIComponent(developerName);
    
    return of(this.apps.filter((app) => {
      const englishName = app.Developer_Name_En?.toLowerCase();
      const arabicName = app.Developer_Name_Ar?.toLowerCase();
      const searchName = decodedDeveloperName.toLowerCase();
      
      return englishName === searchName || arabicName === searchName;
    }));
  }

  getDeveloperNameForUrl(app: QuranApp): string {
    // Use English name for URL, encode it properly
    return encodeURIComponent(app.Developer_Name_En || app.Developer_Name_Ar || '');
  }
}
