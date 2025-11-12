import { Component, OnInit, AfterViewInit, ViewChild, ElementRef, CUSTOM_ELEMENTS_SCHEMA, ChangeDetectorRef } from "@angular/core";
import { CommonModule } from "@angular/common";
import { ActivatedRoute, RouterModule, Router } from "@angular/router";
import { NzCardModule } from "ng-zorro-antd/card";
import { NzButtonModule } from "ng-zorro-antd/button";
import { NzIconModule } from "ng-zorro-antd/icon";
import { NzTagModule } from "ng-zorro-antd/tag";
import { NzGridModule } from "ng-zorro-antd/grid";
import { TranslateModule, TranslateService } from "@ngx-translate/core";
import { AppService, QuranApp } from "../../services/app.service";
import { DomSanitizer, SafeHtml, Title, Meta } from "@angular/platform-browser";
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { categories } from "../../services/applicationsData";
import { NzRateModule } from "ng-zorro-antd/rate";
import { FormsModule } from "@angular/forms";
// import function to register Swiper custom elements
import { register } from 'swiper/element/bundle';
import {Nl2brPipe} from "../../pipes/nl2br.pipe";
import { SeoService } from "../../services/seo.service";
// register Swiper custom elements
register();

@Component({
  selector: "app-detail",
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    NzCardModule,
    NzButtonModule,
    NzIconModule,
    NzDividerModule,
    NzRateModule,
    NzTagModule,
    NzGridModule,
    TranslateModule,
    Nl2brPipe,
  ],
  templateUrl: "./app-detail.component.html",
  styleUrls: ["./app-detail.component.scss"],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class AppDetailComponent implements OnInit, AfterViewInit  {
  @ViewChild('swiperContainer') swiperContainer: any;

  app?: QuranApp;
  relevantApps: QuranApp[] = [];
  currentLang: "en" | "ar" = "ar";
  categoriesSet: Array<{name: string, icon: string}> = categories;
  isExpanded = false;

  swiperParams = {
    slidesPerView: "auto",
    spaceBetween: 20,
    pagination: {
      clickable: true,
      dynamicBullets: false,
    },
    navigation: {
      nextEl: '.swiper-button-next',
      prevEl: '.swiper-button-prev',
    },
  };

  hideSwiper = true;
  loading = true;

  constructor(
    private route: ActivatedRoute,
    private appService: AppService,
    private sanitizer: DomSanitizer,
    private translateService: TranslateService,
    private router: Router,
    private seoService: SeoService,
    private titleService: Title,
    private metaService: Meta,
    private cdr: ChangeDetectorRef
  ) {
    this.currentLang = this.translateService.currentLang as 'ar' | 'en';
    // Subscribe to language changes
    this.translateService.onLangChange.subscribe((event) => {
      this.currentLang = event.lang as "en" | "ar";
      console.log('🌐 DEBUG: Language changed to:', this.currentLang);
      // Reinitialize swiper when language changes (same pattern as data load)
      if (this.swiperContainer) {
        console.log('🔄 DEBUG: Reinitializing Swiper after language change...');
        this.hideSwiper = false;
        setTimeout(() => {
          this.hideSwiper = true;
          console.log('🔄 DEBUG: Swiper container reset after language change, initializing...');
        }, 50);
        setTimeout(() => {
          console.log('🔄 DEBUG: Final Swiper initialization after language change...');
          this.initializeSwiper();
        }, 100);
      }
    });
  }

  private getBrowserLanguage(): "en" | "ar" {
    const browserLang = navigator.language.toLowerCase().split("-")[0];
    return browserLang === "ar" ? "ar" : "en";
  }

  ngOnInit() {
    // Set language immediately from snapshot
    const lang = this.route.snapshot.params["lang"];
    const id = this.route.snapshot.params["id"];

    if (lang) {
      this.currentLang = lang as "en" | "ar";
    }

    // Subscribe to route parameter changes (both lang and id)
    this.route.params.subscribe((params) => {
      const newLang = params["lang"];
      const newId = params["id"];

      // Update language if changed
      if (newLang && newLang !== this.currentLang) {
        this.currentLang = newLang as "en" | "ar";
      }

      // Load app data when ID changes (or on initial load)
      if (newId) {
        this.loading = true;
        // Scroll to top of page when loading new app detail
        window.scrollTo({ top: 0, behavior: 'auto' });
        this.loadAppData(newId);
      }
    });
  }

  private loadAppData(id: string) {
    console.log('🔍 DEBUG: Loading app data for ID:', id);
    this.appService.getAppById(id).subscribe((app) => {
      if (app) {
        console.log('✅ DEBUG: App data loaded successfully:', app.Name_En);
        console.log('📊 DEBUG: Screenshots count (EN):', app.screenshots_en?.length || 0);
        console.log('📊 DEBUG: Screenshots count (AR):', app.screenshots_ar?.length || 0);
        console.log('🌐 DEBUG: Current language:', this.currentLang);
        console.log('🖼️ DEBUG: First screenshot URL:', app.screenshots_en?.[0] || 'No screenshots');

        this.app = app;
        this.cdr.detectChanges(); // Trigger immediate change detection

        if (app.categories.length > 0) {
          this.appService
            .getAppsByCategory(app.categories[0])
            .subscribe((apps) => {
              this.relevantApps = apps
                .filter((a) => a.id !== app.id)
                .slice(0, 3);
            });
        }

        // Update SEO data after app is loaded
        this.updateSeoData();
        // FIX: Set loading to false immediately since we have the app data
        // Images will load asynchronously and that's fine
        this.loading = false;
        this.cdr.detectChanges(); // Trigger change detection after setting loading = false

        // 🔧 FIX: Reinitialize Swiper after data loads (like language change handler)
        // Use ChangeDetectorRef to force change detection before reinitializing
        if (this.swiperContainer) {
          console.log('🔄 DEBUG: Reinitializing Swiper after data load...');
          this.hideSwiper = false;
          this.cdr.markForCheck(); // Mark for change detection
          setTimeout(() => {
            this.hideSwiper = true;
            this.cdr.markForCheck(); // Mark for change detection
            console.log('🔄 DEBUG: Swiper container visible, initializing...');
          }, 50);
          setTimeout(() => {
            console.log('🔄 DEBUG: Final Swiper initialization after data load...');
            this.initializeSwiper();
          }, 100);
        } else {
          console.warn('⚠️ DEBUG: Swiper container not available during data load');
        }

        console.log('⚙️ DEBUG: Component state after loading - hideSwiper:', this.hideSwiper, 'loading:', this.loading);
      } else {
        console.error('❌ DEBUG: No app data returned for ID:', id);
      }
    }, (error) => {
      console.error('❌ DEBUG: Error loading app data:', error);
    });
  }

  // Add a method to handle navigation to a related app
  navigateToApp(appId: string) {
    // Clear current app data before navigation to prevent stale data display
    this.app = undefined;
    this.loading = true;
    this.relevantApps = [];
    this.cdr.detectChanges();

    this.router.navigate([`/${this.currentLang}/app/${appId}`]).then(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      this.isExpanded = false;
    });
  }


  // Add a method to handle category click navigation
  navigateToCategory(categoryName: string) {
    // Try multiple ways to get the language
    const langFromParamMap = this.route.snapshot.paramMap.get("lang");
    const langFromParams = this.route.snapshot.params["lang"];
    const finalLang = langFromParamMap || langFromParams || this.currentLang;

    const targetPath = `/${finalLang}/${categoryName.toLowerCase()}`;

    // Use Angular router for proper navigation with route parameters
    this.router.navigate([targetPath], {
      replaceUrl: false // Don't replace the current URL, preserve history
    }).then((success) => {
      if (!success) {
        // Fallback to direct navigation if router fails
        const fullUrl = `${window.location.origin}${targetPath}`;
        window.location.href = fullUrl;
      }
    }).catch(() => {
      // Fallback to direct navigation
      const fullUrl = `${window.location.origin}${targetPath}`;
      window.location.href = fullUrl;
    });
  }

  ngAfterViewInit() {
    console.log('🔧 DEBUG: ngAfterViewInit called');
    console.log('📦 DEBUG: Swiper container exists:', !!this.swiperContainer);
    console.log('👁️ DEBUG: hideSwiper state:', this.hideSwiper);
    console.log('📱 DEBUG: App data loaded:', !!this.app);

    if (this.app) {
      console.log('🖼️ DEBUG: App screenshots in ngAfterViewInit:', this.app.screenshots_en?.length || 0);
      // Initialize Swiper if data is already available
      this.initializeSwiper();
    } else {
      console.log('⏳ DEBUG: App data not loaded yet, Swiper will initialize after data loads');
    }
  }

  // Separate method for Swiper initialization to reuse
  private initializeSwiper() {
    if (this.swiperContainer && this.app) {
      console.log('🚀 DEBUG: Initializing Swiper...');
      try {
        const swiperEl = this.swiperContainer.nativeElement;
        console.log('🎯 DEBUG: Swiper element:', swiperEl);
        console.log('⚙️ DEBUG: Swiper params:', this.swiperParams);

        Object.assign(swiperEl, this.swiperParams);
        swiperEl.initialize();
        console.log('✅ DEBUG: Swiper initialized successfully');
      } catch (error) {
        console.error('❌ DEBUG: Swiper initialization failed:', error);
      }
    } else {
      if (!this.swiperContainer) {
        console.warn('⚠️ DEBUG: Swiper container not available');
      }
      if (!this.app) {
        console.warn('⚠️ DEBUG: App data not available for Swiper initialization');
      }
    }
  }

  getCategoryIcon(category: string): SafeHtml {
    const foundCategory = this.categoriesSet.find(cat => cat.name === category);
    return this.sanitizer.bypassSecurityTrustHtml(foundCategory?.icon || '');
  }

  shouldShowReadMore(text: string | null): boolean {
    if (text === null) return false;
    // Only show read more button if text is long enough
    return text.length > 200; // Adjust character threshold as needed
  }

  navigateToDeveloper() {
    if (this.app && this.app.Developer_Name_En) {
      const developerName = encodeURIComponent(this.app.Developer_Name_En);
      this.router.navigate([`/${this.currentLang}/developer/${developerName}`]);
    }
  }

  private updateSeoData() {
    if (!this.app) return;

    const appName = this.currentLang === 'ar' ? this.app.Name_Ar : this.app.Name_En;
    const appDescription = this.currentLang === 'ar' ? this.app.Short_Description_Ar : this.app.Short_Description_En;
    const fullDescription = this.currentLang === 'ar' ? this.app.Description_Ar : this.app.Description_En;

    // Update page title and meta tags
    const title = this.currentLang === 'ar' 
      ? `${appName} - تطبيق قرآني من دليل التطبيقات القرآنية`
      : `${appName} - Quran App from Comprehensive Quranic Directory`;
    
    this.titleService.setTitle(title);
    this.metaService.updateTag({ name: 'title', content: title });
    this.metaService.updateTag({ name: 'description', content: `${appDescription} - ${fullDescription?.substring(0, 150)}...` });
    
    // Update Open Graph tags
    this.metaService.updateTag({ property: 'og:title', content: title });
    this.metaService.updateTag({ property: 'og:description', content: appDescription || '' });
    this.metaService.updateTag({ property: 'og:image', content: this.app.applicationIcon || '' });
    this.metaService.updateTag({ property: 'og:url', content: `https://quran-apps.itqan.dev/${this.currentLang}/app/${this.app.id}` });
    this.metaService.updateTag({ property: 'og:type', content: 'website' });
    
    // Update Twitter Card tags
    this.metaService.updateTag({ property: 'twitter:card', content: 'summary_large_image' });
    this.metaService.updateTag({ property: 'twitter:title', content: title });
    this.metaService.updateTag({ property: 'twitter:description', content: appDescription || '' });
    this.metaService.updateTag({ property: 'twitter:image', content: this.app.applicationIcon || '' });

    // Add app-specific keywords
    const keywords = [
      this.currentLang === 'ar' ? 'تطبيق قرآني' : 'Quran app',
      this.currentLang === 'ar' ? 'تطبيق إسلامي' : 'Islamic app',
      appName,
      ...this.app.categories.map(cat => this.currentLang === 'ar' ? `تطبيقات ${cat}` : `${cat} apps`)
    ];
    this.metaService.updateTag({ name: 'keywords', content: keywords.join(', ') });

    // Add enhanced structured data for the app
    const appStructuredData = this.seoService.generateEnhancedAppStructuredData(this.app, this.currentLang);
    
    // Add breadcrumb structured data
    const breadcrumbs = [
      {
        name: this.currentLang === 'ar' ? 'الرئيسية' : 'Home',
        url: `https://quran-apps.itqan.dev/${this.currentLang}`
      },
      {
        name: this.currentLang === 'ar' ? 'التطبيقات' : 'Apps',
        url: `https://quran-apps.itqan.dev/${this.currentLang}`
      },
      {
        name: appName,
        url: `https://quran-apps.itqan.dev/${this.currentLang}/app/${this.app.id}`
      }
    ];
    
    const breadcrumbData = this.seoService.generateBreadcrumbStructuredData(breadcrumbs, this.currentLang);
    const organizationData = this.seoService.generateOrganizationStructuredData(this.currentLang);

    // Combine structured data
    const combinedData = [
      appStructuredData,
      breadcrumbData,
      organizationData
    ];

    this.seoService.addStructuredData(combinedData);
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