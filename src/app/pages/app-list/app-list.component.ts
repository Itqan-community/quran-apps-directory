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

const CATEGORIES = [
  {
    name: "Recite",
    icon: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M5 10C5 11.8565 5.7375 13.637 7.05025 14.9497C8.36301 16.2625 10.1435 17 12 17M12 17C13.8565 17 15.637 16.2625 16.9497 14.9497C18.2625 13.637 19 11.8565 19 10M12 17V21M8 21H16M9 5C9 4.20435 9.31607 3.44129 9.87868 2.87868C10.4413 2.31607 11.2044 2 12 2C12.7956 2 13.5587 2.31607 14.1213 2.87868C14.6839 3.44129 15 4.20435 15 5V10C15 10.7956 14.6839 11.5587 14.1213 12.1213C13.5587 12.6839 12.7956 13 12 13C11.2044 13 10.4413 12.6839 9.87868 12.1213C9.31607 11.5587 9 10.7956 9 10V5Z" stroke="#A0533B" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`,
  },
  {
    name: "Listen",
    icon: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M15 8C15.621 8.46574 16.125 9.06966 16.4721 9.76393C16.8193 10.4582 17 11.2238 17 12C17 12.7762 16.8193 13.5418 16.4721 14.2361C16.125 14.9303 15.621 15.5343 15 16M17.7 5C18.7439 5.84365 19.586 6.91013 20.1644 8.12132C20.7429 9.33252 21.0431 10.6578 21.0431 12C21.0431 13.3422 20.7429 14.6675 20.1644 15.8787C19.586 17.0899 18.7439 18.1563 17.7 19M6 15H4C3.73478 15 3.48043 14.8946 3.29289 14.7071C3.10536 14.5195 3 14.2652 3 14V9.99997C3 9.73476 3.10536 9.4804 3.29289 9.29287C3.48043 9.10533 3.73478 8.99997 4 8.99997H6L9.5 4.49997C9.5874 4.3302 9.73265 4.1973 9.90949 4.12526C10.0863 4.05323 10.2831 4.04683 10.4643 4.10722C10.6454 4.1676 10.799 4.29078 10.8972 4.45451C10.9955 4.61824 11.0319 4.81171 11 4.99997V19C11.0319 19.1882 10.9955 19.3817 10.8972 19.5454C10.799 19.7092 10.6454 19.8323 10.4643 19.8927C10.2831 19.9531 10.0863 19.9467 9.90949 19.8747C9.73265 19.8027 9.5874 19.6697 9.5 19.5L6 15Z" stroke="#A0533B" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`,
  },
  {
    name: "Kids",
    icon: `<svg width="25" height="24" viewBox="0 0 25 24" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M9.5 4V22M13.5 8H15.5M13.5 12H15.5M6.5 4H17.5C18.0304 4 18.5391 4.21071 18.9142 4.58579C19.2893 4.96086 19.5 5.46957 19.5 6V18C19.5 18.5304 19.2893 19.0391 18.9142 19.4142C18.5391 19.7893 18.0304 20 17.5 20H6.5C6.23478 20 5.98043 19.8946 5.79289 19.7071C5.60536 19.5196 5.5 19.2652 5.5 19V5C5.5 4.73478 5.60536 4.48043 5.79289 4.29289C5.98043 4.10536 6.23478 4 6.5 4Z" stroke="#A0533B" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`,
  },
  {
    name: "Translation",
    icon: `<svg width="25" height="24" viewBox="0 0 25 24" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M4.5 5H11.5M9.5 3V5C9.5 9.418 7.261 13 4.5 13M5.5 9C5.5 11.144 8.452 12.908 12.2 13M12.5 20L16.5 11L20.5 20M19.5999 18H13.3999" stroke="#A0533B" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`,
  },
];

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
  styleUrls: ["./app-list.component.css"],
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
  currentLang: "en" | "ar" = this.getBrowserLanguage(); // Initialize with browser language

  constructor(
    private appService: AppService,
    private sanitizer: DomSanitizer,
    private translateService: TranslateService
  ) {
    this.categories = CATEGORIES.map((category) => ({
      name: category.name,
      icon: this.sanitizer.bypassSecurityTrustHtml(category.icon),
    }));

    // Set initial language based on browser
    const browserLang = this.getBrowserLanguage();
    this.translateService.use(browserLang);

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
    this.appService.getAppsByCategory(category).subscribe((apps) => {
      this.filteredApps = apps;
    });
  }

  toggleSort() {
    this.sortAscending = !this.sortAscending;
    this.filteredApps = [...this.filteredApps].sort((a, b) =>
      this.sortAscending ? b.rating - a.rating : a.rating - b.rating
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
