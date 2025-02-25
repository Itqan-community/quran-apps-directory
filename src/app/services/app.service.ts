import { Injectable } from "@angular/core";
import { Observable, of } from "rxjs";
import { applicationsData } from "./applicationsData";

export interface QuranApp {
  id: string;
  name: string;
  mainImage:string | null;
  applicationIcon: string | null;
  developerName: string | null;
  description: {
    ar: string;
    en: string;
  };
  link: string;
  status: string;
  rating: number;
  categories: string[];
  screenshots: string[];
  appStoreLink?: string | null;
  googlePlayLink?: string | null;
  huaweiAppGalleryLink?: string | null;
  websiteLink?: string | null;
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
          app.name.toLowerCase().includes(lowercaseQuery) ||
          app.description.ar.toLowerCase().includes(lowercaseQuery) ||
          app.description.en.toLowerCase().includes(lowercaseQuery)
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
}
