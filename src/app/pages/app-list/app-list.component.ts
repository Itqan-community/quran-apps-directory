import { Component, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { RouterModule } from "@angular/router";
import { FormsModule } from "@angular/forms";
import { NzGridModule } from "ng-zorro-antd/grid";
import { NzCardModule } from "ng-zorro-antd/card";
import { NzRateModule } from "ng-zorro-antd/rate";
import { NzInputModule } from "ng-zorro-antd/input";
import { NzIconModule } from "ng-zorro-antd/icon";
import { NzButtonModule } from "ng-zorro-antd/button";
import { TranslateModule, TranslateService } from "@ngx-translate/core";
import { AppService, QuranApp } from "../../services/app.service";
import { DomSanitizer, SafeHtml } from "@angular/platform-browser";
import { categories } from "../../services/applicationsData";

const CATEGORIES = categories;

@Component({
  selector: "app-list",
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    NzGridModule,
    NzCardModule,
    NzRateModule,
    NzInputModule,
    NzIconModule,
    NzButtonModule,
    TranslateModule,
  ],
  templateUrl: "./app-list.component.html",
  styleUrls: ["./app-list.component.scss"],
})
export class AppListComponent implements OnInit {
  apps: QuranApp[] = [];
  filteredApps: QuranApp[] = [];
  searchQuery: string = "";
  categories: { name: string; icon: SafeHtml }[] = [];
  isDragging = false;
  startX = 0;
  scrollLeft = 0;
  sortAscending = true;
  private categoriesContainer: HTMLElement | null = null;
  currentLang: "en" | "ar" = 'ar' ; // Initialize with browser language
  selectedCategory: string = 'all';

  constructor(
    private appService: AppService,
    private sanitizer: DomSanitizer,
    private translateService: TranslateService
  ) {
    this.categories = CATEGORIES.map((category) => ({
      name: category.name,
      icon: this.sanitizer.bypassSecurityTrustHtml(category.icon),
    }));

    // // Set initial language based on browser
    // const browserLang = this.getBrowserLanguage();
    // this.translateService.use(browserLang);
    this.currentLang = this.translateService.currentLang as "en" | "ar"
    // Subscribe to language changes
    this.translateService.onLangChange.subscribe((event) => {
      this.currentLang = event.lang as "en" | "ar";
    });
  }

  private getBrowserLanguage(): "en" | "ar" {
    const browserLang = navigator.language.toLowerCase().split("-")[0];
    return browserLang === "ar" ? "ar" : "en";
  }

  ngOnInit() {
    this.appService.getApps().subscribe((apps) => {
      this.apps = apps;
      this.filteredApps = apps;
    });
  }

  onSearch() {
    if (!this.searchQuery.trim()) {
      this.filteredApps = this.apps;
    } else {
      this.appService.searchApps(this.searchQuery).subscribe((apps) => {
        this.filteredApps = apps;
      });
    }
  }

  filterByCategory(category: string) {
    this.selectedCategory = category.toLowerCase();
    this.appService.getAppsByCategory(this.selectedCategory).subscribe((apps) => {
      this.filteredApps = apps;
    });
  }

  toggleSort() {
    this.sortAscending = !this.sortAscending;
    this.filteredApps = [...this.filteredApps].sort((a, b) =>
      this.sortAscending ? b.Apps_Avg_Rating - a.Apps_Avg_Rating : a.Apps_Avg_Rating - b.Apps_Avg_Rating
    );
  }

  startDragging(e: MouseEvent) {
    this.isDragging = true;
    this.categoriesContainer = (e.target as HTMLElement).closest(
      ".categories-grid"
    ) as HTMLElement;
    if (this.categoriesContainer) {
      this.startX = e.pageX - this.categoriesContainer.scrollLeft;
      this.scrollLeft = this.categoriesContainer.scrollLeft;
    }
  }

  stopDragging() {
    this.isDragging = false;
  }

  onDrag(e: MouseEvent) {
    if (!this.isDragging || !this.categoriesContainer) return;
    e.preventDefault();
    const x = e.pageX;
    const walk = x - this.startX;
    this.categoriesContainer.scrollLeft = this.scrollLeft - walk;
  }
}
