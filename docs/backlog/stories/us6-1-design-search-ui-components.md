# US6.1: Design Advanced Search UI Components

**Epic:** Epic 6 - Advanced Search System  
**Sprint:** Week 5, Day 1  
**Story Points:** 5  
**Priority:** P1  
**Assigned To:** Frontend Developer  
**Status:** Not Started

---

## 📋 User Story

**As a** User  
**I want** an intuitive search interface with multiple filter options  
**So that** I can quickly find apps matching my specific Quranic study needs

---

## 🎯 Acceptance Criteria

### AC1: Search Input Component
- [ ] Full-width search bar with icon
- [ ] Placeholder text: "Search apps..." (bilingual)
- [ ] Auto-focus on page load
- [ ] Clear button (X) when input has text
- [ ] Real-time search suggestions (debounced 300ms)

### AC2: Filter Panel Layout
- [ ] Collapsible side panel (desktop)
- [ ] Bottom sheet (mobile)
- [ ] Filter sections organized by category
- [ ] "Apply Filters" and "Clear All" buttons
- [ ] Active filter count badge

### AC3: Category Filter Section
- [ ] Checkbox list of all 11 categories
- [ ] "Select All" / "Deselect All" options
- [ ] Visual indication of selected categories
- [ ] Bilingual category names

### AC4: Specialized Quran Filter Sections
- [ ] **Mushaf Type** dropdown/chips:
  - Colored Tajweed
  - Regular
  - Digital
  - Simplified
- [ ] **Recitation (Riwayat)** multi-select:
  - Hafs
  - Warsh
  - Qalun
  - Duri
  - Other
- [ ] **Languages** multi-select:
  - Arabic
  - English
  - Urdu
  - Turkish
  - French
  - (+ More)
- [ ] **Target Audience** chips:
  - Children
  - Adults
  - Scholars
  - Beginners

### AC5: Platform Filter
- [ ] Platform checkboxes:
  - Android (Google Play)
  - iOS (App Store)
  - Huawei (AppGallery)
- [ ] Icon representation

### AC6: Rating Filter
- [ ] Star rating slider (0-5 stars)
- [ ] "4+ stars", "3+ stars" quick filters
- [ ] Visual star display

### AC7: Active Filters Display
- [ ] Chip-based display above results
- [ ] Each filter removable individually
- [ ] Total result count displayed
- [ ] "Clear all filters" option

---

## 📝 Technical Notes

### Search Component
```typescript
import { Component, Output, EventEmitter, OnInit } from '@angular/core';
import { FormControl } from '@angular/forms';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

@Component({
  selector: 'app-search-input',
  standalone: true,
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatIconModule],
  template: `
    <mat-form-field class="search-field" appearance="outline">
      <mat-icon matPrefix>search</mat-icon>
      <input 
        matInput 
        [formControl]="searchControl"
        [placeholder]="'Search apps...' | translate"
        autofocus>
      <button 
        *ngIf="searchControl.value"
        matSuffix 
        mat-icon-button
        (click)="clearSearch()">
        <mat-icon>close</mat-icon>
      </button>
    </mat-form-field>
  `,
  styles: [`
    .search-field {
      width: 100%;
      font-size: 18px;
    }
  `]
})
export class SearchInputComponent implements OnInit {
  searchControl = new FormControl('');
  @Output() searchChange = new EventEmitter<string>();
  
  ngOnInit(): void {
    this.searchControl.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged()
      )
      .subscribe(value => {
        this.searchChange.emit(value || '');
      });
  }
  
  clearSearch(): void {
    this.searchControl.setValue('');
  }
}
```

### Filter Panel Component
```typescript
import { Component, Output, EventEmitter } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';

interface SearchFilters {
  categories: string[];
  mushafTypes: string[];
  riwayat: string[];
  languages: string[];
  audiences: string[];
  platforms: string[];
  minRating?: number;
}

@Component({
  selector: 'app-search-filters',
  standalone: true,
  template: `
    <div class="filter-panel">
      <div class="filter-header">
        <h3>{{ 'Filters' | translate }}</h3>
        <button mat-button (click)="clearAll()">Clear All</button>
      </div>
      
      <form [formGroup]="filtersForm">
        <!-- Categories -->
        <mat-expansion-panel expanded>
          <mat-expansion-panel-header>
            <mat-panel-title>Categories</mat-panel-title>
          </mat-expansion-panel-header>
          <div class="filter-options">
            <mat-checkbox 
              *ngFor="let category of categories"
              [value]="category.id"
              (change)="onFilterChange()">
              {{ currentLang === 'ar' ? category.nameAr : category.nameEn }}
            </mat-checkbox>
          </div>
        </mat-expansion-panel>
        
        <!-- Mushaf Type -->
        <mat-expansion-panel>
          <mat-expansion-panel-header>
            <mat-panel-title>Mushaf Type</mat-panel-title>
          </mat-expansion-panel-header>
          <mat-chip-listbox formControlName="mushafTypes" multiple>
            <mat-chip-option value="colored">Colored Tajweed</mat-chip-option>
            <mat-chip-option value="regular">Regular</mat-chip-option>
            <mat-chip-option value="digital">Digital</mat-chip-option>
            <mat-chip-option value="simplified">Simplified</mat-chip-option>
          </mat-chip-listbox>
        </mat-expansion-panel>
        
        <!-- Recitation (Riwayat) -->
        <mat-expansion-panel>
          <mat-expansion-panel-header>
            <mat-panel-title>Recitation</mat-panel-title>
          </mat-expansion-panel-header>
          <mat-selection-list formControlName="riwayat" multiple>
            <mat-list-option value="hafs">Hafs</mat-list-option>
            <mat-list-option value="warsh">Warsh</mat-list-option>
            <mat-list-option value="qalun">Qalun</mat-list-option>
            <mat-list-option value="duri">Duri</mat-list-option>
          </mat-selection-list>
        </mat-expansion-panel>
        
        <!-- Languages -->
        <mat-expansion-panel>
          <mat-expansion-panel-header>
            <mat-panel-title>Languages</mat-panel-title>
          </mat-expansion-panel-header>
          <mat-selection-list formControlName="languages" multiple>
            <mat-list-option value="ar">Arabic</mat-list-option>
            <mat-list-option value="en">English</mat-list-option>
            <mat-list-option value="ur">Urdu</mat-list-option>
            <mat-list-option value="tr">Turkish</mat-list-option>
            <mat-list-option value="fr">French</mat-list-option>
          </mat-selection-list>
        </mat-expansion-panel>
        
        <!-- Target Audience -->
        <mat-expansion-panel>
          <mat-expansion-panel-header>
            <mat-panel-title>Target Audience</mat-panel-title>
          </mat-expansion-panel-header>
          <mat-chip-listbox formControlName="audiences" multiple>
            <mat-chip-option value="children">Children</mat-chip-option>
            <mat-chip-option value="adults">Adults</mat-chip-option>
            <mat-chip-option value="scholars">Scholars</mat-chip-option>
            <mat-chip-option value="beginners">Beginners</mat-chip-option>
          </mat-chip-listbox>
        </mat-expansion-panel>
        
        <!-- Platforms -->
        <mat-expansion-panel>
          <mat-expansion-panel-header>
            <mat-panel-title>Platforms</mat-panel-title>
          </mat-expansion-panel-header>
          <div class="platform-filters">
            <mat-checkbox value="android">
              <mat-icon>android</mat-icon> Android
            </mat-checkbox>
            <mat-checkbox value="ios">
              <mat-icon>apple</mat-icon> iOS
            </mat-checkbox>
            <mat-checkbox value="huawei">
              Huawei
            </mat-checkbox>
          </div>
        </mat-expansion-panel>
        
        <!-- Rating -->
        <mat-expansion-panel>
          <mat-expansion-panel-header>
            <mat-panel-title>Minimum Rating</mat-panel-title>
          </mat-expansion-panel-header>
          <mat-slider min="0" max="5" step="0.5" formControlName="minRating">
            <input matSliderThumb>
          </mat-slider>
          <div class="rating-display">
            <mat-icon *ngFor="let star of [1,2,3,4,5]">
              {{ filtersForm.value.minRating >= star ? 'star' : 'star_border' }}
            </mat-icon>
          </div>
        </mat-expansion-panel>
      </form>
      
      <div class="filter-actions">
        <button mat-raised-button color="primary" (click)="applyFilters()">
          Apply Filters
        </button>
      </div>
    </div>
  `,
  styles: [`
    .filter-panel {
      padding: 16px;
      max-width: 320px;
    }
    
    .filter-options {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    
    .filter-actions {
      margin-top: 16px;
      display: flex;
      justify-content: center;
    }
  `]
})
export class SearchFiltersComponent {
  filtersForm: FormGroup;
  categories: any[] = [];
  
  @Output() filtersChange = new EventEmitter<SearchFilters>();
  
  constructor(private fb: FormBuilder) {
    this.filtersForm = this.fb.group({
      categories: [[]],
      mushafTypes: [[]],
      riwayat: [[]],
      languages: [[]],
      audiences: [[]],
      platforms: [[]],
      minRating: [0]
    });
  }
  
  onFilterChange(): void {
    // Real-time filter application (optional)
  }
  
  applyFilters(): void {
    this.filtersChange.emit(this.filtersForm.value);
  }
  
  clearAll(): void {
    this.filtersForm.reset({
      categories: [],
      mushafTypes: [],
      riwayat: [],
      languages: [],
      audiences: [],
      platforms: [],
      minRating: 0
    });
    this.applyFilters();
  }
}
```

### Active Filters Display
```typescript
@Component({
  selector: 'app-active-filters',
  template: `
    <div class="active-filters" *ngIf="hasFilters()">
      <span class="results-count">{{ totalResults }} results</span>
      
      <mat-chip-listbox>
        <mat-chip *ngFor="let filter of activeFilters" (removed)="removeFilter(filter)">
          {{ filter.label }}
          <button matChipRemove>
            <mat-icon>cancel</mat-icon>
          </button>
        </mat-chip>
      </mat-chip-listbox>
      
      <button mat-button (click)="clearAll()">Clear All</button>
    </div>
  `
})
export class ActiveFiltersComponent {
  @Input() activeFilters: any[] = [];
  @Input() totalResults = 0;
  @Output() filterRemoved = new EventEmitter<any>();
  @Output() allCleared = new EventEmitter<void>();
  
  hasFilters(): boolean {
    return this.activeFilters.length > 0;
  }
  
  removeFilter(filter: any): void {
    this.filterRemoved.emit(filter);
  }
  
  clearAll(): void {
    this.allCleared.emit();
  }
}
```

---

## 🔗 Dependencies
- US5.1: API Service Layer
- Angular Material or Ng-Zorro UI library

---

## 📊 Definition of Done
- [ ] Search input component created
- [ ] Filter panel with all sections implemented
- [ ] Active filters display component created
- [ ] Responsive design (mobile + desktop)
- [ ] Bilingual support for all labels
- [ ] Accessibility (ARIA labels, keyboard navigation)
- [ ] Visual design matches mockups
- [ ] Components reusable and well-documented

---

**Created:** October 6, 2025  
**Owner:** Abubakr Abduraghman, a.abduraghman@itqan.dev  
**Epic:** [Epic 6: Advanced Search System](../epics/epic-6-advanced-search-system.md)
