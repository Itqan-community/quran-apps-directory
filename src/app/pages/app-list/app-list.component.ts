import { Component, OnInit, OnDestroy, PLATFORM_ID, Inject } from "@angular/core";
import { CommonModule, isPlatformBrowser } from "@angular/common";
import { RouterModule, ActivatedRoute } from "@angular/router";
import { FormsModule } from "@angular/forms";
import { NzGridModule } from "ng-zorro-antd/grid";
import { NzCardModule } from "ng-zorro-antd/card";
import { NzRateModule } from "ng-zorro-antd/rate";
import { NzInputModule } from "ng-zorro-antd/input";
import { NzIconModule } from "ng-zorro-antd/icon";
import { NzButtonModule } from "ng-zorro-antd/button";
import { NzSpinModule } from "ng-zorro-antd/spin";
import { NzAlertModule } from "ng-zorro-antd/alert";
import { TranslateModule, TranslateService } from "@ngx-translate/core";
import type { QuranApp } from "../../services/app.service";
import { ApiService, Category } from "../../services/api.service";
import { Title, Meta } from "@angular/platform-browser";
import { combineLatest, of, Subject } from "rxjs";
import { catchError, finalize, takeUntil, switchMap, debounceTime } from "rxjs/operators";
import { SeoService } from "../../services/seo.service";
import { OptimizedImageComponent } from "../../components/optimized-image/optimized-image.component";
import { SafeHtmlPipe } from "../../pipes/safe-html.pipe";

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
    NzSpinModule,
    NzAlertModule,
    TranslateModule,
    OptimizedImageComponent,
    SafeHtmlPipe,
  ],
  templateUrl: "./app-list.component.html",
  styleUrls: ["./app-list.component.scss"],
})
export class AppListComponent implements OnInit, OnDestroy {
  apps: QuranApp[] = [];
  filteredApps: QuranApp[] = [];
  searchQuery: string = "";
  categories: Category[] = [];
  isLoading = true;
  error: string | null = null;
  isDragging = false;
  startX = 0;
  scrollLeft = 0;
  sortAscending = true;
  private categoriesContainer: HTMLElement | null = null;
  currentLang: "en" | "ar" = 'en'; // Initialize with browser language
  selectedCategory: string = 'all';
  isDarkMode = false;
  private destroy$ = new Subject<void>();

  constructor(
    @Inject(PLATFORM_ID) private readonly platformId: Object,
    private apiService: ApiService,
    private translateService: TranslateService,
    private route: ActivatedRoute,
    private seoService: SeoService,
    private titleService: Title,
    private metaService: Meta
  ) {
    // Set initial language based on current translation or URL
    const lang = this.translateService.currentLang || this.translateService.getDefaultLang() || 'en';
    this.currentLang = lang as "en" | "ar";
    // Subscribe to language changes
    this.translateService.onLangChange
      .pipe(takeUntil(this.destroy$))
      .subscribe((event) => {
        this.currentLang = event.lang as "en" | "ar";
      });

    // Subscribe to API service observables for reactive updates
    this.apiService.loading$
      .pipe(takeUntil(this.destroy$))
      .subscribe(loading => {
        this.isLoading = loading;
      });

    this.apiService.error$
      .pipe(takeUntil(this.destroy$))
      .subscribe(error => {
        this.error = error;
      });
  }

  ngOnInit() {
    // Check initial dark mode state (browser only)
    if (isPlatformBrowser(this.platformId)) {
      this.updateDarkModeState();

      // Listen for dark mode changes
      const observer = new MutationObserver(() => {
        this.updateDarkModeState();
      });

      observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['class'],
      });

      this.destroy$.subscribe(() => {
        observer.disconnect();
      });
    }

    // Load categories and apps from API
    this.loadData();

    // Subscribe to route changes for category filtering
    // Use debounceTime to prevent race conditions from rapid clicks
    this.route.paramMap
      .pipe(
        debounceTime(50),
        switchMap(params => {
          const lang = params.get('lang');
          const category = params.get('category');

          if (lang) {
            this.currentLang = lang as "en" | "ar";
          }

          // Set the selected category
          this.selectedCategory = category ? category.toLowerCase() : 'all';

          // Wait for apps to be loaded before filtering
          return this.apiService.apps$.pipe(
            switchMap(() => {
              // Now that apps are loaded, apply the filter
              if (this.selectedCategory === 'all') {
                this.filteredApps = this.apps;
              } else {
                this.filterByCategory(this.selectedCategory);
              }
              return of(params);
            })
          );
        }),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        // Scroll to top of page when route changes (browser only)
        if (isPlatformBrowser(this.platformId)) {
          window.scrollTo({ top: 0, behavior: 'auto' });

          // Scroll selected category into view (horizontally within categories section)
          setTimeout(() => this.scrollSelectedCategoryIntoView(), 100);
        }

        // Update SEO data after apps and route parameters are set
        this.updateSeoData();
      });

    // Subscribe to apps from API service for reactive updates
    this.apiService.apps$
      .pipe(takeUntil(this.destroy$))
      .subscribe(apiApps => {
        this.apps = apiApps.map(app => this.apiService.formatAppForDisplay(app));
        // If no category is selected, update filtered apps
        if (this.selectedCategory === 'all' && !this.searchQuery.trim()) {
          this.filteredApps = this.apps;
        }
      });

    // Subscribe to categories from API service
    this.apiService.categories$
      .pipe(takeUntil(this.destroy$))
      .subscribe(apiCategories => {
        this.categories = apiCategories;
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private updateDarkModeState() {
    if (isPlatformBrowser(this.platformId)) {
      this.isDarkMode = document.documentElement.classList.contains('dark-theme');
    }
  }

  private loadData() {
    // Load both categories and apps concurrently using combineLatest for better control
    combineLatest([
      this.apiService.getCategories().pipe(
        catchError(error => {
          console.error('Failed to load categories:', error);
          return of([]);
        })
      ),
      this.apiService.getApps().pipe(
        catchError(error => {
          console.error('Failed to load apps:', error);
          return of({ count: 0, next: null, previous: null, results: [] });
        })
      )
    ])
      .pipe(
        finalize(() => {
          // Ensure loading state is set to false after both requests complete
          this.isLoading = false;
        }),
        takeUntil(this.destroy$)
      )
      .subscribe(([categories, appsResponse]) => {
        // Categories are already handled by the service and subject
        // Apps are already handled by the service and subject
        // Just ensure our local state is updated properly
        if (!categories || categories.length === 0) {
          this.categories = [];
        }
        if (!appsResponse || !appsResponse.results || appsResponse.results.length === 0) {
          this.apps = [];
          this.filteredApps = [];
        }

        // Show error message if both categories and apps failed to load
        // This helps users understand why the page appears blank
        const hasNoCategories = !categories || categories.length === 0;
        const hasNoApps = !appsResponse?.results || appsResponse.results.length === 0;
        if (hasNoCategories && hasNoApps && !this.error) {
          this.error = this.currentLang === 'ar'
            ? 'تعذر تحميل المحتوى. يرجى التحقق من اتصالك بالإنترنت وإعادة تحميل الصفحة.'
            : 'Unable to load content. Please check your connection and refresh the page.';
        }
      });
  }

  onSearch() {
    const query = this.searchQuery.trim();

    // If query is empty, just respect current category filter
    if (!query) {
      this.applyCategoryAndSearchFilters();
      return;
    }

    // Local, tolerant search on already-loaded apps (avoids strict backend matching)
    this.applyCategoryAndSearchFilters();
  }

  filterByCategory(category: string) {
    this.selectedCategory = category.toLowerCase();
    this.applyCategoryAndSearchFilters();
  }

  /**
   * Apply current category + search query to the in-memory apps list.
   * This allows us to normalize Arabic text and be tolerant to hamza/diacritics.
   */
  private applyCategoryAndSearchFilters(): void {
    const query = this.searchQuery.trim();
    const hasQuery = !!query;

    this.filteredApps = this.apps.filter(app => {
      // Category filter
      const inCategory = this.selectedCategory === 'all'
        ? true
        : (app.categories || []).map(c => c.toLowerCase()).includes(this.selectedCategory);

      if (!inCategory) return false;

      // Search filter
      return hasQuery ? this.isAppInSearchResults(app) : true;
    });
  }

  /**
   * Normalize text to make search tolerant for Arabic spelling variants
   * (e.g. "القران" vs "القرآن") and case-insensitive in English.
   */
  private normalizeText(text: string): string {
    if (!text) return '';

    let normalized = text.toLowerCase();

    // Normalize common Arabic variants
    normalized = normalized
      // Different forms of alif with hamza/mand
      .replace(/[أإآ]/g, 'ا')
      // taa marbuta to ha
      .replace(/ة/g, 'ه')
      // yaa/aleph maqsura
      .replace(/ى/g, 'ي')
      // remove common Arabic diacritics
      .replace(/[\u064B-\u0652]/g, '');

    return normalized;
  }

  private isAppInSearchResults(app: QuranApp): boolean {
    const query = this.searchQuery.trim();
    if (!query) return true;

    const searchNorm = this.normalizeText(query);
    const nameEn = this.normalizeText(app.Name_En || '');
    const nameAr = this.normalizeText(app.Name_Ar || '');
    const descEn = this.normalizeText(app.Short_Description_En || '');
    const descAr = this.normalizeText(app.Short_Description_Ar || '');

    return nameEn.includes(searchNorm) ||
           nameAr.includes(searchNorm) ||
           descEn.includes(searchNorm) ||
           descAr.includes(searchNorm);
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
    
    // Add breadcrumb data separately to avoid conflicts (browser only)
    if (isPlatformBrowser(this.platformId)) {
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

  /**
   * Scroll the selected category into view
   */
  private scrollSelectedCategoryIntoView(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    // Find the selected category element
    const selectedElement = document.querySelector('.category-item.selected');

    if (selectedElement) {
      // Scroll into view with smooth behavior
      selectedElement.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center'
      });
    }
  }

  /**
   * Get the URL parameter for an app (slug_id format without numeric prefix)
   */
  getAppUrlParam(app: QuranApp): string {
    let slug = app.slug || '';

    // Normalize the slug: convert spaces to hyphens
    slug = slug.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

    // Extract just the name part of the slug if it includes a numeric prefix (like "1-wahy" -> "wahy")
    if (slug && slug.includes('-')) {
      const parts = slug.split('-');
      // If first part is numeric, remove it
      if (/^\d+$/.test(parts[0])) {
        slug = parts.slice(1).join('-');
      }
    }

    // If no slug after normalization, generate from app name
    if (!slug) {
      slug = app.Name_En.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    }

    // Return format: "slug_appId" (e.g., "wahy_1")
    return `${slug}_${app.id}`;
  }
}