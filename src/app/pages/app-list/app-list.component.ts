import { Component, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { RouterModule, ActivatedRoute } from "@angular/router";
import { FormsModule } from "@angular/forms";
import { NzGridModule } from "ng-zorro-antd/grid";
import { NzCardModule } from "ng-zorro-antd/card";
import { NzRateModule } from "ng-zorro-antd/rate";
import { NzInputModule } from "ng-zorro-antd/input";
import { NzIconModule } from "ng-zorro-antd/icon";
import { NzButtonModule } from "ng-zorro-antd/button";
import { SpinModule } from "ng-zorro-antd/spin";
import { AlertModule } from "ng-zorro-antd/alert";
import { TranslateModule, TranslateService } from "@ngx-translate/core";
import { AppService, QuranApp } from "../../services/app.service";
import { ApiService, App, Category } from "../../services/api.service";
import { DomSanitizer, SafeHtml, Title, Meta } from "@angular/platform-browser";
import { combineLatest, of } from "rxjs";
import { catchError, finalize, take } from "rxjs/operators";
import { SeoService } from "../../services/seo.service";
import { OptimizedImageComponent } from "../../components/optimized-image/optimized-image.component";

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
    SpinModule,
    AlertModule,
    TranslateModule,
    OptimizedImageComponent,
  ],
  templateUrl: "./app-list.component.html",
  styleUrls: ["./app-list.component.scss"],
})
export class AppListComponent implements OnInit {
  apps: QuranApp[] = [];
  filteredApps: QuranApp[] = [];
  searchQuery: string = "";
  categories: Category[] = [];
  isLoading = false;
  error: string | null = null;
  isDragging = false;
  startX = 0;
  scrollLeft = 0;
  sortAscending = true;
  private categoriesContainer: HTMLElement | null = null;
  currentLang: "en" | "ar" = 'en'; // Initialize with browser language
  selectedCategory: string = 'all';

  constructor(
    private appService: AppService,
    private apiService: ApiService,
    private sanitizer: DomSanitizer,
    private translateService: TranslateService,
    private route: ActivatedRoute,
    private seoService: SeoService,
    private titleService: Title,
    private metaService: Meta
  ) {
    // Set initial language based on browser
    this.currentLang = this.translateService.currentLang as "en" | "ar";
    // Subscribe to language changes
    this.translateService.onLangChange.subscribe((event) => {
      this.currentLang = event.lang as "en" | "ar";
    });

    // Subscribe to API service observables for reactive updates
    this.apiService.loading$.subscribe(loading => {
      this.isLoading = loading;
    });

    this.apiService.error$.subscribe(error => {
      this.error = error;
    });
  }

  ngOnInit() {
    // Load categories and apps from API
    this.loadData();

    // Subscribe to route changes for category filtering
    this.route.paramMap.subscribe(params => {
      const lang = params.get('lang');
      const category = params.get('category');

      if (lang) {
        this.currentLang = lang as "en" | "ar";
      }

      // If we're on a category-specific route, use that category
      // If we're on the base route (no category), show all apps
      if (category) {
        this.selectedCategory = category.toLowerCase();
        this.filterByCategory(this.selectedCategory);
      } else {
        this.selectedCategory = 'all';
        this.filteredApps = this.apps; // Show all apps
      }

      // Update SEO data after apps and route parameters are set
      this.updateSeoData();
    });

    // Subscribe to apps from API service for reactive updates
    this.apiService.apps$.subscribe(apiApps => {
      this.apps = apiApps.map(app => this.apiService.formatAppForDisplay(app));
      // If no category is selected, update filtered apps
      if (this.selectedCategory === 'all' && !this.searchQuery.trim()) {
        this.filteredApps = this.apps;
      }
    });

    // Subscribe to categories from API service
    this.apiService.categories$.subscribe(apiCategories => {
      this.categories = apiCategories;
    });
  }

  private loadData() {
    // Load both categories and apps concurrently
    this.apiService.getCategories().pipe(
      catchError(error => {
        console.error('Failed to load categories:', error);
        return of([]);
      })
    ).subscribe();

    this.apiService.getApps().pipe(
      catchError(error => {
        console.error('Failed to load apps:', error);
        return of({ count: 0, next: null, previous: null, results: [] });
      })
    ).subscribe();
  }

  onSearch() {
    if (!this.searchQuery.trim()) {
      this.filteredApps = this.apps;
    } else {
      this.apiService.searchApps(this.searchQuery, {
        category: this.selectedCategory !== 'all' ? this.selectedCategory : undefined
      }).subscribe(apiApps => {
        this.filteredApps = apiApps.map(app => this.apiService.formatAppForDisplay(app));
      });
    }
  }

  filterByCategory(category: string) {
    this.selectedCategory = category.toLowerCase();

    if (category === 'all') {
      // If showing all, use the main apps array
      this.filteredApps = this.searchQuery.trim() ?
        this.apps.filter(app => this.isAppInSearchResults(app)) :
        this.apps;
    } else {
      // Filter by category using API
      this.apiService.getApps({
        category: this.selectedCategory,
        search: this.searchQuery.trim() || undefined
      }).subscribe(response => {
        this.filteredApps = response.results.map(app => this.apiService.formatAppForDisplay(app));
      });
    }
  }

  private isAppInSearchResults(app: QuranApp): boolean {
    if (!this.searchQuery.trim()) return true;

    const searchLower = this.searchQuery.toLowerCase();
    const nameEn = app.Name_En?.toLowerCase() || '';
    const nameAr = app.Name_Ar?.toLowerCase() || '';
    const descEn = app.Short_Description_En?.toLowerCase() || '';
    const descAr = app.Short_Description_Ar?.toLowerCase() || '';

    return nameEn.includes(searchLower) ||
           nameAr.includes(searchLower) ||
           descEn.includes(searchLower) ||
           descAr.includes(searchLower);
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

  private updateSeoData() {
    const categoryMap = {
      'ar': {
        'mushaf': 'تطبيقات المصحف',
        'tafsir': 'تطبيقات التفسير',
        'translations': 'تطبيقات الترجمة',
        'audio': 'التلاوات الصوتية',
        'recite': 'تطبيقات التسميع',
        'kids': 'تطبيقات الأطفال',
        'riwayat': 'الروايات القرآنية',
        'tajweed': 'تطبيقات التجويد',
        'all': 'جميع تطبيقات القرآن الكريم'
      },
      'en': {
        'mushaf': 'Mushaf Apps',
        'tafsir': 'Tafsir Apps',
        'translations': 'Translation Apps',
        'audio': 'Audio Recitations',
        'recite': 'Recitation Apps',
        'kids': 'Kids Apps',
        'riwayat': 'Quran Narrations',
        'tajweed': 'Tajweed Apps',
        'all': 'All Quran Applications'
      }
    };

    const categoryName = categoryMap[this.currentLang][this.selectedCategory as keyof typeof categoryMap[typeof this.currentLang]] || 
                         (this.currentLang === 'ar' ? 'تطبيقات القرآن الكريم' : 'Quran Applications');

    // Update page title and meta tags
    if (this.selectedCategory === 'all') {
      if (this.currentLang === 'ar') {
        this.titleService.setTitle('دليل التطبيقات القرآنية الشامل - أفضل تطبيقات القرآن الكريم');
        this.metaService.updateTag({ name: 'description', content: 'استكشف أكثر من 100 تطبيق قرآني مجاني ومدفوع للمصحف والتفسير والتلاوة والتحفيظ. الدليل الشامل لتطبيقات القرآن الكريم من مجتمع إتقان' });
      } else {
        this.titleService.setTitle('Comprehensive Quranic Directory - Best Quran Apps Collection');
        this.metaService.updateTag({ name: 'description', content: 'Explore 100+ free and premium Quran apps for reading, memorization, tafsir, and recitation. The most comprehensive directory of Islamic mobile applications.' });
      }
    } else {
      if (this.currentLang === 'ar') {
        this.titleService.setTitle(`${categoryName} - دليل التطبيقات القرآنية`);
        this.metaService.updateTag({ name: 'description', content: `أفضل ${categoryName} للقرآن الكريم - تطبيقات مجانية ومدفوعة مختارة بعناية من مجتمع إتقان لتقنيات القرآن` });
      } else {
        this.titleService.setTitle(`${categoryName} - Comprehensive Quranic Directory`);
        this.metaService.updateTag({ name: 'description', content: `Best ${categoryName} for Holy Quran - Carefully curated free and premium Islamic mobile applications by ITQAN Community.` });
      }
    }

    // Add structured data for rich snippets
    const websiteData = this.seoService.generateWebsiteStructuredData(this.currentLang);
    const itemListData = this.seoService.generateItemListStructuredData(
      this.filteredApps, 
      this.selectedCategory === 'all' ? null : this.selectedCategory, 
      this.currentLang
    );
    const organizationData = this.seoService.generateOrganizationStructuredData(this.currentLang);
    
    // Add FAQ data for the homepage
    const faqData = this.selectedCategory === 'all' ? 
      this.seoService.generateFAQStructuredData(this.currentLang) : null;
    
    // Add CollectionPage data for category pages
    const collectionData = this.selectedCategory !== 'all' ? 
      this.seoService.generateCollectionPageStructuredData(this.selectedCategory, this.filteredApps, this.currentLang) : null;

    // Combine structured data
    const combinedData = [
      websiteData,
      itemListData,
      organizationData,
      ...(faqData ? [faqData] : []),
      ...(collectionData ? [collectionData] : [])
    ];

    this.seoService.addStructuredData(combinedData);

    // Add breadcrumb structured data
    const breadcrumbs = [
      {
        name: this.currentLang === 'ar' ? 'الرئيسية' : 'Home',
        url: `https://quran-apps.itqan.dev/${this.currentLang}`
      }
    ];
    
    if (this.selectedCategory !== 'all') {
      breadcrumbs.push({
        name: categoryName,
        url: `https://quran-apps.itqan.dev/${this.currentLang}/${this.selectedCategory}`
      });
    }

    const breadcrumbData = this.seoService.generateBreadcrumbStructuredData(breadcrumbs, this.currentLang);
    
    // Add breadcrumb data separately to avoid conflicts
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify(breadcrumbData);
    
    // Remove existing breadcrumb script
    const existingBreadcrumb = document.querySelector('script[type="application/ld+json"][data-type="breadcrumb"]');
    if (existingBreadcrumb) {
      existingBreadcrumb.remove();
    }
    
    script.setAttribute('data-type', 'breadcrumb');
    document.head.appendChild(script);
  }

  getRatingClass(rating: number): string {
    if (!rating || rating === 0) return 'poor';
    if (rating >= 4.5) return 'excellent';
    if (rating >= 4.0) return 'very-good';
    if (rating >= 3.5) return 'good';
    if (rating >= 2.5) return 'fair';
    return 'poor';
  }

  getStarArray(rating: number): { fillPercent: number }[] {
    const stars = [];
    const fullStars = Math.floor(rating);
    const remainder = rating % 1;
    
    // Add full stars
    for (let i = 0; i < fullStars; i++) {
      stars.push({ fillPercent: 100 });
    }
    
    // Add partial star if needed
    if (remainder > 0 && fullStars < 5) {
      stars.push({ fillPercent: remainder * 100 });
    }
    
    // Add empty stars to reach 5 total
    while (stars.length < 5) {
      stars.push({ fillPercent: 0 });
    }
    
    return stars;
  }

  /**
   * Aggressive loading strategy for LCP optimization
   * Load first 4 images eagerly with high priority for immediate above-the-fold content
   */
  getImageLoadingStrategy(index: number): 'eager' | 'lazy' {
    // More aggressive eager loading for better LCP
    // First 4 images (top row on desktop) load eagerly
    return index < 4 ? 'eager' : 'lazy';
  }

  /**
   * Aggressive priority strategy for LCP improvement
   */
  getImagePriority(index: number): 'high' | 'low' | 'auto' {
    // First image gets highest priority for LCP
    // Next 2 images get high priority for above-the-fold
    if (index === 0) return 'high'; // LCP candidate
    if (index < 3) return 'high';   // Above-the-fold
    return 'low';
  }

  /**
   * Get appropriate aspect ratio for different image types
   */
  getImageAspectRatio(imageType: 'cover' | 'icon'): string {
    return imageType === 'cover' ? '16/9' : '1/1';
  }

  /**
   * Get default icon for categories without custom icon
   */
  getDefaultCategoryIcon(): string {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
      <path fill="#A0533B" d="M4 6h16v2H4zm0 5h16v2H4zm0 5h16v2H4z"/>
    </svg>`;
  }
}