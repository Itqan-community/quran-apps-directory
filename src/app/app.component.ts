import { AfterViewInit, Component, inject, OnInit } from "@angular/core";
import { RouterOutlet, RouterLink, ActivatedRoute, Router, ActivatedRouteSnapshot, NavigationEnd } from "@angular/router";
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
import { filter } from "rxjs";

// Icons globally registered in main.ts

@Component({
  selector: "app-root",
  templateUrl: "./app.component.html",
  styleUrls: ["./app.component.scss"],
  standalone: true,
  imports: [
    RouterOutlet,
    RouterLink,
    NzLayoutModule,
    NzButtonModule,
    NzSpaceModule,
    NzDividerModule,
    TranslateModule,
    NzIconModule,
    ThemeToggleComponent,
  ],
})
export class AppComponent implements OnInit, AfterViewInit {
  public isRtl: boolean;
  public isMobileMenuVisible = false;
  public currentLang: "en" | "ar" = "en";
  private translate = inject(TranslateService);
  private titleService = inject(Title);
  private metaService = inject(Meta);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  constructor(
    private languageService: LanguageService,
    private themeService: ThemeService,
    private performanceService: PerformanceService,
    private deferredAnalytics: DeferredAnalyticsService,
    private http2Optimization: Http2OptimizationService,
    private appImagePreloader: AppImagePreloaderService
  ) {
    // Icons are globally registered in main.ts
    // Get browser language
    const browserLang = navigator.language;
    const defaultLang = browserLang.startsWith("ar") ? "ar" : "en";

    // Set initial RTL state based on language
    this.isRtl = defaultLang === "ar";
    document.documentElement.dir = this.isRtl ? "rtl" : "ltr";

    // Set up translations
    this.translate.setDefaultLang(defaultLang);
    this.translate.use(defaultLang);
    this.currentLang = defaultLang;

    // Critical resource preloading removed - handled by optimized image component
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

    // Subscribe to router events
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      console.log('🔀 NavigationEnd:', event.url, 'Matched route config:', this.getCurrentRouteParams());
    });

    this.updateMetaTags();
    this.translate.onLangChange.subscribe(() => {
      this.updateMetaTags();
    });

    // Language service will handle language detection and RTL/LTR settings
    // Just update the currentLang property when language changes
    this.translate.onLangChange.subscribe((event) => {
      this.currentLang = event.lang as "en" | "ar";
      this.isRtl = this.currentLang === 'ar';
      document.documentElement.dir = this.isRtl ? 'rtl' : 'ltr';
    });

    // Also listen for route changes to update language
    this.router.events.pipe(filter(event => event instanceof NavigationEnd)).subscribe(() => {
      const lang = this.route.snapshot.firstChild?.paramMap.get('lang') || this.translate.getDefaultLang();
      if (lang !== this.currentLang) {
        this.translate.use(lang);
        this.currentLang = lang as "en" | "ar";
        this.isRtl = this.currentLang === 'ar';
        document.documentElement.dir = this.isRtl ? 'rtl' : 'ltr';
      }
    });

    // Start preloading app images in background (non-blocking)
    this.appImagePreloader.startPreloadingInBackground();
  }

  ngAfterViewInit() {
    // Language service will handle URL changes
    this.languageService.setLanguageFromUrl();

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
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: NavigationEnd) => {
      // Track page view with deferred analytics
      this.deferredAnalytics.trackPageView(event.urlAfterRedirects);
    });
  }

  toggleLanguage() {
    this.isRtl = !this.isRtl;
    const newLang = this.isRtl ? "ar" : "en";
    this.languageService.changeLanguage(newLang);
    this.currentLang = newLang;
  }

  toggleMobileMenu() {
    this.isMobileMenuVisible = !this.isMobileMenuVisible;
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