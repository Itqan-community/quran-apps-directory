import { AfterViewInit, Component, HostListener, Inject, OnInit, OnDestroy, PLATFORM_ID } from "@angular/core";
import { isPlatformBrowser, CommonModule } from "@angular/common";
import { RouterOutlet, RouterLink, ActivatedRoute, Router, ActivatedRouteSnapshot, NavigationEnd } from "@angular/router";
import { FormsModule } from "@angular/forms";
import { NzLayoutModule } from "ng-zorro-antd/layout";
import { NzButtonModule } from "ng-zorro-antd/button";
import { NzSpaceModule } from "ng-zorro-antd/space";
import { NzDividerModule } from "ng-zorro-antd/divider";
import { TranslateModule, TranslateService } from "@ngx-translate/core";
import { NzIconModule } from "ng-zorro-antd/icon";
import { Title, Meta } from '@angular/platform-browser';
import { LanguageService } from "./services/language.service";
import { ThemeService } from "./services/theme.service";
import { ThemeToggleComponent } from "./components/theme-toggle/theme-toggle.component";
import { PerformanceService } from "./services/performance.service";
import { DeferredAnalyticsService } from "./services/deferred-analytics.service";
import { Http2OptimizationService } from "./services/http2-optimization.service";
import { AppImagePreloaderService } from "./services/app-image-preloader.service";
import { NavbarScrollService, NavbarSearchState } from "./services/navbar-scroll.service";
import { Category } from "./services/api.service";
import { filter, Subject, takeUntil } from "rxjs";
import { LucideAngularModule, Menu, X, Globe, Home, Info, Mail, Users, PlusCircle, ExternalLink, ChevronRight, Search } from 'lucide-angular';
import { SafeHtmlPipe } from "./pipes/safe-html.pipe";


// Icons globally registered in main.ts

@Component({
  selector: "app-root",
  templateUrl: "./app.component.html",
  styleUrls: ["./app.component.scss"],
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    RouterLink,
    FormsModule,
    NzLayoutModule,
    NzButtonModule,
    NzSpaceModule,
    NzDividerModule,
    TranslateModule,
    NzIconModule,
    // ThemeToggleComponent,
    LucideAngularModule,
    SafeHtmlPipe,
  ],
})
export class AppComponent implements OnInit, AfterViewInit, OnDestroy {
  public isRtl: boolean;
  public isMobileMenuVisible = false;
  public currentLang: "en" | "ar" = "en";

  // Hide header/footer for internal tool pages
  public hideChrome = false;
  public hideFooter = false;

  // Navbar compact mode with inline search
  public isNavbarCompact = false;
  public navbarSearchQuery = '';
  public navbarSearchType: 'traditional' | 'smart' = 'traditional';
  public navbarCategories: Category[] = [];
  public navbarSelectedCategory = 'all';
  public isNavbarSearching = false;
  public isCategoryDropdownOpen = false;
  private destroy$ = new Subject<void>();

  constructor(
    @Inject(PLATFORM_ID) private readonly platformId: Object,
    private translate: TranslateService,
    private titleService: Title,
    private metaService: Meta,
    private route: ActivatedRoute,
    private router: Router,
    private languageService: LanguageService,
    private themeService: ThemeService,
    private performanceService: PerformanceService,
    private deferredAnalytics: DeferredAnalyticsService,
    private http2Optimization: Http2OptimizationService,
    private appImagePreloader: AppImagePreloaderService,
    private navbarScrollService: NavbarScrollService
  ) {
    // Icons are globally registered in main.ts
    // Translations are initialized via APP_INITIALIZER in main.ts (ensures they load before render)

    // Get current language from TranslateService (already set by APP_INITIALIZER)
    const currentLang = this.translate.currentLang || this.translate.getDefaultLang() || 'en';
    this.currentLang = currentLang as "en" | "ar";
    this.isRtl = this.currentLang === "ar";
  }

  getCurrentRouteParams(): any {
    const snapshot = this.router.routerState.snapshot.root;
    return this.extractParams(snapshot);
  }

  private extractParams(route: ActivatedRouteSnapshot): any {
    let params = { ...route.params };
    while (route.firstChild) {
      route = route.firstChild;
      params = { ...params, ...route.params };
    }
    return params;
  }

  ngOnInit() {
    console.log('🚀 AppComponent ngOnInit - listening to router events');

    // Subscribe to language changes from the single source of truth (LanguageService)
    // This replaces the previous competing onLangChange + NavigationEnd language handlers
    this.languageService.currentLang$
      .pipe(takeUntil(this.destroy$))
      .subscribe((lang) => {
        this.currentLang = lang as 'en' | 'ar';
        this.isRtl = lang === 'ar';
        this.updateMetaTags();
      });

    // Listen for route changes to update chrome visibility only (NOT language)
    // Language is handled exclusively by LanguageService
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd),
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.hideChrome = !!this.route.snapshot.firstChild?.data?.['hideChrome'];
      this.hideFooter = !!this.route.snapshot.firstChild?.data?.['hideFooter'];
    });

    // Start preloading app images in background (non-blocking)
    this.appImagePreloader.startPreloadingInBackground();

    // Subscribe to navbar compact mode changes (desktop only)
    this.navbarScrollService.compactMode$
      .pipe(takeUntil(this.destroy$))
      .subscribe(isCompact => {
        this.isNavbarCompact = isCompact;
      });

    // Subscribe to search state changes for navbar
    this.navbarScrollService.searchState$
      .pipe(takeUntil(this.destroy$))
      .subscribe(state => {
        this.navbarSearchQuery = state.searchQuery;
        this.navbarSearchType = state.searchType;
        this.navbarCategories = state.categories;
        this.navbarSelectedCategory = state.selectedCategory;
        this.isNavbarSearching = state.isSearching;
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  ngAfterViewInit() {
    // Initialize performance monitoring
    setTimeout(() => {
      this.performanceService.measurePerformance();
      this.performanceService.optimizeImages();

      // Initialize HTTP/2 optimization monitoring
      this.http2Optimization.generateHTTP2Report();
      this.http2Optimization.monitorHTTP2Usage();
    }, 1000);

    // Track route changes for analytics (when analytics is ready)
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd),
      takeUntil(this.destroy$)
    ).subscribe((event: NavigationEnd) => {
      // Track page view with deferred analytics
      this.deferredAnalytics.trackPageView(event.urlAfterRedirects);
    });
  }

  toggleLanguage() {
    const newLang = this.currentLang === 'ar' ? 'en' : 'ar';
    this.languageService.changeLanguage(newLang);
  }

  toggleMobileMenu() {
    this.isMobileMenuVisible = !this.isMobileMenuVisible;
  }

  onNavbarSearchInput() {
    this.navbarScrollService.updateSearchState({ searchQuery: this.navbarSearchQuery });
  }

  onNavbarSearch() {
    if (!this.navbarSearchQuery.trim()) return;
    this.isNavbarSearching = true;
    this.navbarScrollService.updateSearchState({ isSearching: true });
    // Navigate to home with smart search query
    this.router.navigate(['/', this.currentLang], {
      queryParams: { smart_search: this.navbarSearchQuery.trim() }
    });
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    this.isCategoryDropdownOpen = false;
  }

  toggleCategoryDropdown(event: Event): void {
    event.stopPropagation();
    this.isCategoryDropdownOpen = !this.isCategoryDropdownOpen;
  }

  isDropdownCategorySelected(): boolean {
    if (this.navbarSelectedCategory === 'all') return false;
    const index = this.navbarCategories.findIndex(c => c.slug === this.navbarSelectedCategory);
    return index >= 5;
  }

  getSelectedCategoryName(): string {
    const cat = this.navbarCategories.find(c => c.slug === this.navbarSelectedCategory);
    if (!cat) return '';
    return this.currentLang === 'ar' ? cat.name_ar : cat.name_en;
  }

  onNavbarCategoryClick(categorySlug: string) {
    this.navbarSelectedCategory = categorySlug;
    this.navbarScrollService.updateSearchState({ selectedCategory: categorySlug });

    // Save current scroll position before navigation
    const scrollY = isPlatformBrowser(this.platformId) ? window.scrollY : 0;

    // Navigate to category
    const route = categorySlug === 'all'
      ? ['/', this.currentLang]
      : ['/', this.currentLang, categorySlug];

    this.router.navigate(route).then(() => {
      // Restore scroll position after navigation using multiple attempts
      // to ensure it works after Angular's change detection completes
      if (isPlatformBrowser(this.platformId)) {
        // First attempt immediately
        window.scrollTo(0, scrollY);
        // Second attempt after microtask
        Promise.resolve().then(() => window.scrollTo(0, scrollY));
        // Third attempt after next frame
        requestAnimationFrame(() => {
          window.scrollTo(0, scrollY);
          // Fourth attempt after Angular settles
          setTimeout(() => window.scrollTo(0, scrollY), 50);
        });
      }
    });
  }

  private updateMetaTags() {
    const currentUrl = `https://quran-apps.itqan.dev${this.router.url}`;
    
    if (this.currentLang === 'ar') {
      // Arabic SEO optimization
      this.titleService.setTitle("دليل التطبيقات القرآنية الشامل - أفضل تطبيقات القرآن الكريم");
      this.metaService.updateTag({ name: "title", content: "دليل التطبيقات القرآنية الشامل - أفضل تطبيقات القرآن الكريم" });
      this.metaService.updateTag({ name: "description", content: "الدليل الشامل لأفضل تطبيقات القرآن الكريم - تطبيقات المصحف، التفسير، التلاوة، التحفيظ والتدبر. اكتشف أكثر من 100 تطبيق قرآني مجاني ومدفوع لجميع الأجهزة من مجتمع إتقان لتقنيات القرآن" });
      this.metaService.updateTag({ name: "keywords", content: "دليل التطبيقات القرآنية, دليل قرآني شامل, تطبيقات القرآن, مصحف إلكتروني, تفسير القرآن, تلاوة القرآن, تحفيظ القرآن, تطبيقات إسلامية, Quranic Directory, القرآن الكريم, إتقان, ITQAN, تقنيات القرآن" });
      this.metaService.updateTag({ name: "robots", content: "index, follow, max-image-preview:large, max-snippet:-1" });
      this.metaService.updateTag({ httpEquiv: "Content-Type", content: "text/html; charset=utf-8" });
      this.metaService.updateTag({ name: "language", content: "ar" });
      this.metaService.updateTag({ name: "author", content: "مجتمع إتقان لتقنيات القرآن" });
      this.metaService.updateTag({ property: "og:type", content: "website" });
      this.metaService.updateTag({ property: "og:url", content: currentUrl });
      this.metaService.updateTag({ property: "og:title", content: "دليل التطبيقات القرآنية الشامل - أفضل تطبيقات القرآن الكريم" });
      this.metaService.updateTag({ property: "og:description", content: "الدليل الشامل لأفضل تطبيقات القرآن الكريم - تطبيقات المصحف، التفسير، التلاوة، التحفيظ والتدبر. اكتشف أكثر من 100 تطبيق قرآني مجاني ومدفوع" });
      this.metaService.updateTag({ property: "og:image", content: "https://quran-apps.itqan.dev/assets/images/Social-Media-Thumnail.webp" });
      this.metaService.updateTag({ property: "og:locale", content: "ar_SA" });
      this.metaService.updateTag({ property: "twitter:card", content: "summary_large_image" });
      this.metaService.updateTag({ property: "twitter:url", content: currentUrl });
      this.metaService.updateTag({ property: "twitter:title", content: "دليل التطبيقات القرآنية الشامل - أفضل تطبيقات القرآن الكريم" });
      this.metaService.updateTag({ property: "twitter:description", content: "الدليل الشامل لأفضل تطبيقات القرآن الكريم - تطبيقات المصحف، التفسير، التلاوة، التحفيظ والتدبر" });
      this.metaService.updateTag({ property: "twitter:image", content: "https://quran-apps.itqan.dev/assets/images/Social-Media-Thumnail.webp" });
    } else {
      // English SEO optimization
      this.titleService.setTitle("Comprehensive Quranic Directory - Best Quran Apps Collection");
      this.metaService.updateTag({ name: "title", content: "Comprehensive Quranic Directory - Best Quran Apps Collection" });
      this.metaService.updateTag({ name: "description", content: "The most comprehensive Quranic directory featuring the best Quran apps for reading, memorization, translation, tafsir, and recitation. Discover 100+ free and premium Islamic mobile applications for all devices by ITQAN Community." });
      this.metaService.updateTag({ name: "keywords", content: "Comprehensive Quranic Directory, Quranic Directory, Best Quran Apps, Islamic Apps, Quran Reading Apps, Quran Memorization, Tafsir Apps, Quran Translation, Islamic Mobile Apps, Holy Quran, ITQAN, Quran Technology" });
      this.metaService.updateTag({ name: "robots", content: "index, follow, max-image-preview:large, max-snippet:-1" });
      this.metaService.updateTag({ httpEquiv: "Content-Type", content: "text/html; charset=utf-8" });
      this.metaService.updateTag({ name: "language", content: "en" });
      this.metaService.updateTag({ name: "author", content: "ITQAN Community for Quran Technologies" });
      this.metaService.updateTag({ property: "og:type", content: "website" });
      this.metaService.updateTag({ property: "og:url", content: currentUrl });
      this.metaService.updateTag({ property: "og:title", content: "Comprehensive Quranic Directory - Best Quran Apps Collection" });
      this.metaService.updateTag({ property: "og:description", content: "The most comprehensive Quranic directory featuring the best Quran apps for reading, memorization, translation, tafsir, and recitation. Discover 100+ Islamic mobile applications." });
      this.metaService.updateTag({ property: "og:image", content: "https://quran-apps.itqan.dev/assets/images/Social-Media-Thumnail.webp" });
      this.metaService.updateTag({ property: "og:locale", content: "en_US" });
      this.metaService.updateTag({ property: "twitter:card", content: "summary_large_image" });
      this.metaService.updateTag({ property: "twitter:url", content: currentUrl });
      this.metaService.updateTag({ property: "twitter:title", content: "Comprehensive Quranic Directory - Best Quran Apps Collection" });
      this.metaService.updateTag({ property: "twitter:description", content: "The most comprehensive Quranic directory featuring the best Quran apps for reading, memorization, translation, tafsir, and recitation." });
      this.metaService.updateTag({ property: "twitter:image", content: "https://quran-apps.itqan.dev/assets/images/Social-Media-Thumnail.webp" });
    }
    
    // Add canonical URL
    this.metaService.updateTag({ rel: "canonical", href: currentUrl });
    
    // Add alternate language tags (hreflang)
    const baseUrl = currentUrl.replace(/\/(ar|en)/, '');
    this.metaService.updateTag({ rel: "alternate", hreflang: "ar", href: `${baseUrl}/ar` });
    this.metaService.updateTag({ rel: "alternate", hreflang: "en", href: `${baseUrl}/en` });
    this.metaService.updateTag({ rel: "alternate", hreflang: "x-default", href: `${baseUrl}/en` });
  }
}