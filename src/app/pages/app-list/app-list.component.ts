import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzRateModule } from 'ng-zorro-antd/rate';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AppService, QuranApp } from '../../services/app.service';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

const CATEGORIES = [
  { name: 'Recite', icon: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 1v16m4-4a4 4 0 0 1-8 0M9 22h6m-3 0v-4"></path></svg>` },
  { name: 'Listen', icon: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9v6a9 9 0 0 0 18 0V9"></path><path d="M21 9a9 9 0 0 0-18 0"></path><circle cx="12" cy="15" r="3"></circle></svg>` },
  { name: 'Kids', icon: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"></circle><path d="M9 9L7 7M15 9l2-2M9 15l-2 2M15 15l2 2M8 8L4 4M16 8l4-4M8 16l-4 4M16 16l4 4"></path></svg>` },
  { name: 'Translation', icon: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 3h14"></path><path d="M9 21h6"></path><path d="M12 3v18"></path><path d="m9 15-3 6"></path><path d="m15 15 3 6"></path><path d="M15 9l-3 3-3-3"></path></svg>` }
];

@Component({
  selector: 'app-list',
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
    TranslateModule
  ],
  templateUrl: './app-list.component.html',
  styleUrls: ['./app-list.component.css']
})
export class AppListComponent implements OnInit {
  apps: QuranApp[] = [];
  filteredApps: QuranApp[] = [];
  searchQuery: string = '';
  categories: { name: string; icon: SafeHtml }[] = [];
  isDragging = false;
  startX = 0;
  scrollLeft = 0;
  sortAscending = true;
  private categoriesContainer: HTMLElement | null = null;
  currentLang: 'en' | 'ar' = this.getBrowserLanguage();  // Initialize with browser language

  constructor(
    private appService: AppService,
    private sanitizer: DomSanitizer,
    private translateService: TranslateService
  ) {
    this.categories = CATEGORIES.map(category => ({
      name: category.name,
      icon: this.sanitizer.bypassSecurityTrustHtml(category.icon)
    }));

    // Set initial language based on browser
    const browserLang = this.getBrowserLanguage();
    this.translateService.use(browserLang);
    
    // Subscribe to language changes
    this.translateService.onLangChange.subscribe(event => {
      this.currentLang = event.lang as 'en' | 'ar';
    });
  }

  private getBrowserLanguage(): 'en' | 'ar' {
    const browserLang = navigator.language.toLowerCase().split('-')[0];
    return browserLang === 'ar' ? 'ar' : 'en';
  }

  ngOnInit() {
    this.appService.getApps().subscribe(apps => {
      this.apps = apps;
      this.filteredApps = apps;
    });
  }

  onSearch() {
    if (!this.searchQuery.trim()) {
      this.filteredApps = this.apps;
    } else {
      this.appService.searchApps(this.searchQuery).subscribe(apps => {
        this.filteredApps = apps;
      });
    }
  }

  filterByCategory(category: string) {
    this.appService.getAppsByCategory(category).subscribe(apps => {
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
    this.categoriesContainer = (e.target as HTMLElement).closest('.categories-grid') as HTMLElement;
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
    const walk = (x - this.startX);
    this.categoriesContainer.scrollLeft = this.scrollLeft - walk;
  }
}