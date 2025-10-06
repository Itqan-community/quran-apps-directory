# US5.3: Migrate App List Component to Use API

**Epic:** Epic 5 - Frontend Integration  
**Sprint:** Week 4, Day 2-3  
**Story Points:** 8  
**Priority:** P0  
**Assigned To:** Frontend Developer  
**Status:** Not Started

---

## 📋 User Story

**As a** User  
**I want** the app list page to load data from the database API  
**So that** I see real-time, up-to-date app listings instead of static data

---

## 🎯 Acceptance Criteria

### AC1: Remove Static Data Import
- [ ] Remove `import { applications } from '../../services/applicationsData'`
- [ ] Inject `AppsService` instead
- [ ] Component uses API for all data

### AC2: Initial Data Loading
- [ ] `ngOnInit()` calls `appsService.getApps()`
- [ ] Loading state shown while fetching
- [ ] Apps displayed after successful load
- [ ] Error state shown if API fails

### AC3: Pagination Implementation
- [ ] Pagination controls added to UI
- [ ] "Previous" and "Next" buttons
- [ ] Page number display (e.g., "Page 1 of 5")
- [ ] Items per page selector (20, 40, 60)
- [ ] API called with correct page/pageSize params

### AC4: Sorting Implementation
- [ ] Sort dropdown added (Name, Rating, Newest)
- [ ] Sort order toggle (Ascending/Descending)
- [ ] API called with sortBy and sortOrder params
- [ ] Default: Sort by Name (Ascending)

### AC5: Category Filtering
- [ ] Category chips displayed from API
- [ ] Clicking category filters apps
- [ ] Multiple categories selectable
- [ ] "Clear filters" button available
- [ ] URL reflects active filters (query params)

### AC6: State Management
- [ ] Loading state: `isLoading = true/false`
- [ ] Error state: `error: string | null`
- [ ] Apps state: `apps: App[] = []`
- [ ] Pagination state: `currentPage`, `totalPages`
- [ ] Filter state: `selectedCategories: string[]`

### AC7: Performance Optimization
- [ ] Scroll to top on page change
- [ ] Debounce filter changes (300ms)
- [ ] Unsubscribe from observables (`takeUntil`)
- [ ] Lazy load app images

### AC8: Bilingual Support Maintained
- [ ] Arabic/English toggle still works
- [ ] App names/descriptions displayed based on language
- [ ] RTL/LTR layout maintained

---

## 📝 Technical Notes

### Component Implementation
```typescript
import { Component, OnInit, OnDestroy } from '@angular/core';
import { AppsService } from '../../services/apps.service';
import { CategoriesService } from '../../services/categories.service';
import { App, Category, PagedResult } from '../../models';
import { Subject, takeUntil } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-app-list',
  standalone: true,
  imports: [/* ... */],
  templateUrl: './app-list.component.html',
  styleUrls: ['./app-list.component.scss']
})
export class AppListComponent implements OnInit, OnDestroy {
  // State
  apps: App[] = [];
  categories: Category[] = [];
  isLoading = false;
  error: string | null = null;
  
  // Pagination
  currentPage = 1;
  pageSize = 20;
  totalCount = 0;
  totalPages = 0;
  
  // Sorting
  sortBy = 'name';
  sortOrder: 'asc' | 'desc' = 'asc';
  
  // Filtering
  selectedCategories: string[] = [];
  
  private destroy$ = new Subject<void>();
  
  constructor(
    private appsService: AppsService,
    private categoriesService: CategoriesService,
    private route: ActivatedRoute,
    private router: Router
  ) {}
  
  ngOnInit(): void {
    this.loadCategories();
    this.loadQueryParams();
    this.loadApps();
  }
  
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
  
  loadCategories(): void {
    this.categoriesService.getCategories()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.categories = response.categories;
        },
        error: (err) => {
          console.error('Failed to load categories', err);
        }
      });
  }
  
  loadQueryParams(): void {
    this.route.queryParams
      .pipe(takeUntil(this.destroy$))
      .subscribe(params => {
        this.currentPage = +params['page'] || 1;
        this.pageSize = +params['pageSize'] || 20;
        this.sortBy = params['sortBy'] || 'name';
        this.sortOrder = params['sortOrder'] || 'asc';
        this.selectedCategories = params['categories']?.split(',') || [];
      });
  }
  
  loadApps(): void {
    this.isLoading = true;
    this.error = null;
    
    this.appsService.getApps(
      this.currentPage,
      this.pageSize,
      this.sortBy,
      this.sortOrder
    )
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (result: PagedResult<App>) => {
        this.apps = result.items;
        this.totalCount = result.totalCount;
        this.totalPages = result.totalPages;
        this.isLoading = false;
        
        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
      },
      error: (err) => {
        this.error = 'Failed to load apps. Please try again.';
        this.isLoading = false;
        console.error('Error loading apps:', err);
      }
    });
  }
  
  onPageChange(page: number): void {
    this.currentPage = page;
    this.updateQueryParams();
    this.loadApps();
  }
  
  onPageSizeChange(size: number): void {
    this.pageSize = size;
    this.currentPage = 1; // Reset to first page
    this.updateQueryParams();
    this.loadApps();
  }
  
  onSortChange(sortBy: string): void {
    if (this.sortBy === sortBy) {
      // Toggle sort order
      this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortBy = sortBy;
      this.sortOrder = 'asc';
    }
    this.updateQueryParams();
    this.loadApps();
  }
  
  onCategorySelect(categoryId: string): void {
    const index = this.selectedCategories.indexOf(categoryId);
    if (index > -1) {
      this.selectedCategories.splice(index, 1);
    } else {
      this.selectedCategories.push(categoryId);
    }
    this.currentPage = 1; // Reset to first page
    this.updateQueryParams();
    this.loadApps();
  }
  
  clearFilters(): void {
    this.selectedCategories = [];
    this.currentPage = 1;
    this.updateQueryParams();
    this.loadApps();
  }
  
  private updateQueryParams(): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        page: this.currentPage,
        pageSize: this.pageSize,
        sortBy: this.sortBy,
        sortOrder: this.sortOrder,
        categories: this.selectedCategories.length 
          ? this.selectedCategories.join(',') 
          : null
      },
      queryParamsHandling: 'merge'
    });
  }
}
```

### Template Updates
```html
<!-- Loading State -->
<div *ngIf="isLoading" class="loading-container">
  <mat-spinner></mat-spinner>
  <p>Loading apps...</p>
</div>

<!-- Error State -->
<div *ngIf="error" class="error-container">
  <mat-icon>error</mat-icon>
  <p>{{ error }}</p>
  <button mat-button (click)="loadApps()">Retry</button>
</div>

<!-- Content -->
<div *ngIf="!isLoading && !error">
  <!-- Filters -->
  <div class="filters">
    <mat-chip-listbox>
      <mat-chip-option 
        *ngFor="let category of categories"
        [selected]="selectedCategories.includes(category.id)"
        (click)="onCategorySelect(category.id)">
        {{ currentLang === 'ar' ? category.nameAr : category.nameEn }}
      </mat-chip-option>
    </mat-chip-listbox>
    <button mat-button (click)="clearFilters()">Clear Filters</button>
  </div>
  
  <!-- Sorting -->
  <mat-form-field>
    <mat-label>Sort By</mat-label>
    <mat-select [(value)]="sortBy" (selectionChange)="onSortChange($event.value)">
      <mat-option value="name">Name</mat-option>
      <mat-option value="rating">Rating</mat-option>
      <mat-option value="newest">Newest</mat-option>
    </mat-select>
  </mat-form-field>
  
  <!-- App Grid -->
  <div class="apps-grid">
    <app-card *ngFor="let app of apps" [app]="app"></app-card>
  </div>
  
  <!-- Pagination -->
  <mat-paginator
    [length]="totalCount"
    [pageSize]="pageSize"
    [pageIndex]="currentPage - 1"
    [pageSizeOptions]="[20, 40, 60]"
    (page)="onPageChange($event.pageIndex + 1)">
  </mat-paginator>
</div>
```

---

## 🔗 Dependencies
- US5.1: API Service Layer
- US5.2: HTTP Interceptors

---

## 📊 Definition of Done
- [ ] Static data import removed
- [ ] Component uses AppsService
- [ ] Pagination working correctly
- [ ] Sorting working correctly
- [ ] Category filtering working
- [ ] Loading/error states implemented
- [ ] Performance optimized (debouncing, unsubscribe)
- [ ] Bilingual support maintained
- [ ] URL reflects current state
- [ ] Unit tests updated
- [ ] E2E tests pass

---

**Created:** October 6, 2025  
**Owner:** Abubakr Abduraghman, a.abduraghman@itqan.dev  
**Epic:** [Epic 5: Frontend Integration](../epics/epic-5-frontend-integration.md)
