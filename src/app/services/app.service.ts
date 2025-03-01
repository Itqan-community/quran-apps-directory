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
  mainImage:string | null;
  applicationIcon: string | null;
  Developer_Logo: string | null;
  Developer_Name_En: string | null;
  Developer_Name_Ar: string | null;
  Developer_Website: string | null;
  status: string;
  Apps_Avg_Rating: number;
  categories: string[];
  screenshots: string[];
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
}
