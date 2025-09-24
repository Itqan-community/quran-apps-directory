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
import { TranslateModule, TranslateService } from "@ngx-translate/core";
import { AppService, QuranApp } from "../../services/app.service";
import { DomSanitizer, SafeHtml, Title, Meta } from "@angular/platform-browser";
import { categories } from "../../services/applicationsData";
import { combineLatest } from "rxjs";
import { SeoService } from "../../services/seo.service";
import { OptimizedImageComponent } from "../../components/optimized-image/optimized-image.component";

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
    OptimizedImageComponent,
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
  currentLang: "en" | "ar" = 'ar'; // Initialize with browser language
  selectedCategory: string = 'all';

  constructor(
    private appService: AppService,
    private sanitizer: DomSanitizer,
    private translateService: TranslateService,
    private route: ActivatedRoute,
    private seoService: SeoService,
    private titleService: Title,
    private metaService: Meta
  ) {
    this.categories = CATEGORIES.map((category) => ({
      name: category.name,
      icon: this.sanitizer.bypassSecurityTrustHtml(category.icon),
    }));

    // Set initial language based on browser
    this.currentLang = this.translateService.currentLang as "en" | "ar";
    // Subscribe to language changes
    this.translateService.onLangChange.subscribe((event) => {
      this.currentLang = event.lang as "en" | "ar";
    });
  }

  ngOnInit() {
    // Load apps data first
    this.appService.getApps().subscribe((apps) => {
      this.apps = apps;
      this.filteredApps = apps;
      
      // Now that apps are loaded, subscribe to route changes
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

      // Force change detection
      this.filteredApps = [...this.filteredApps];
    });
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
}