import {
  Component,
  OnInit,
  OnDestroy,
  AfterViewInit,
  ViewChild,
  ElementRef,
  CUSTOM_ELEMENTS_SCHEMA,
  ChangeDetectorRef,
  Inject,
  PLATFORM_ID,
} from "@angular/core";
import {
  CommonModule,
  DOCUMENT,
  isPlatformBrowser,
  SlicePipe,
} from "@angular/common";
import { ActivatedRoute, RouterModule, Router } from "@angular/router";
import { NzCardModule } from "ng-zorro-antd/card";
import { NzButtonModule } from "ng-zorro-antd/button";
import { NzIconModule } from "ng-zorro-antd/icon";
import { NzTagModule } from "ng-zorro-antd/tag";
import { NzGridModule } from "ng-zorro-antd/grid";
import { TranslateModule, TranslateService } from "@ngx-translate/core";
import { AppService, QuranApp } from "../../services/app.service";
import { DomSanitizer, SafeHtml, Title, Meta } from "@angular/platform-browser";
import { NzDividerModule } from "ng-zorro-antd/divider";
import { categories } from "../../services/applicationsData";
import { NzRateModule } from "ng-zorro-antd/rate";
import { NzImageModule, NzImageService } from "ng-zorro-antd/image";
import { FormsModule } from "@angular/forms";
import { Subscription } from "rxjs"; // Added for memory leak fix
import { register } from "swiper/element/bundle";
import { Nl2brPipe } from "../../pipes/nl2br.pipe";
import { OptimizedImageComponent } from "../../components/optimized-image/optimized-image.component";
import { SeoService } from "../../services/seo.service";
import { environment } from "../../../environments/environment";
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
    NzImageModule,
    NzTagModule,
    NzGridModule,
    TranslateModule,
    Nl2brPipe,
    SlicePipe,
    OptimizedImageComponent,
  ],
  templateUrl: "./app-detail.component.html",
  styleUrls: ["./app-detail.component.scss"],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class AppDetailComponent implements OnInit, OnDestroy, AfterViewInit { // Added OnDestroy
  @ViewChild("swiperContainer") swiperContainer: any;
  @ViewChild("relatedCarousel") relatedCarousel!: ElementRef<HTMLDivElement>;

  app?: QuranApp;
  relevantApps: QuranApp[] = [];
  currentLang: "en" | "ar" = "ar";
  categoriesSet: Array<{ name: string; icon: string }> = categories;
  isExpanded = false;
  private starArrayCache = new Map<number, { fillPercent: number }[]>();
  private swiperInitAttempts = 0;

  // Subscriptions management for memory leak fix
  private subscriptions: Subscription[] = [];

  swiperParams = {
    slidesPerView: "auto",
    spaceBetween: 20,
    pagination: {
      clickable: true,
      dynamicBullets: false,
    },
    navigation: {
      nextEl: ".swiper-button-next",
      prevEl: ".swiper-button-prev",
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
    private cdr: ChangeDetectorRef,
    private nzImageService: NzImageService,
    @Inject(DOCUMENT) private document: Document,
    @Inject(PLATFORM_ID) private platformId: Object,
  ) {
    this.currentLang = this.translateService.currentLang as "ar" | "en";
    
    // Subscribe to language changes - store subscription for cleanup
    const langSub = this.translateService.onLangChange.subscribe((event) => {
      this.currentLang = event.lang as "en" | "ar";
      console.log("🌐 DEBUG: Language changed to:", this.currentLang);
      if (this.swiperContainer) {
        console.log("🔄 DEBUG: Reinitializing Swiper after language change...");
        this.hideSwiper = false;
        setTimeout(() => {
          this.hideSwiper = true;
        }, 50);
        setTimeout(() => {
          this.initializeSwiper();
        }, 100);
      }
    });
    this.subscriptions.push(langSub);
  }

  // Memory leak fix: Clean up all subscriptions on destroy
  ngOnDestroy(): void {
    console.log("🧹 DEBUG: Cleaning up subscriptions...");
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.subscriptions = [];
  }

  private getBrowserLanguage(): "en" | "ar" {
    if (!isPlatformBrowser(this.platformId)) return "en";
    const browserLang = navigator.language.toLowerCase().split("-")[0];
    return browserLang === "ar" ? "ar" : "en";
  }

  ngOnInit() {
    const lang = this.route.snapshot.params["lang"];
    const id = this.route.snapshot.params["id"];

    if (lang) {
      this.currentLang = lang as "en" | "ar";
    }

    // Subscribe to route parameter changes - store for cleanup
    const paramsSub = this.route.params.subscribe((params) => {
      const newLang = params["lang"];
      const newId = params["id"];

      if (newLang && newLang !== this.currentLang) {
        this.currentLang = newLang as "en" | "ar";
      }

      if (newId) {
        this.loading = true;
        if (isPlatformBrowser(this.platformId)) {
          const fragment = this.route.snapshot.fragment;
          if (!fragment) {
            window.scrollTo({ top: 0, behavior: "auto" });
          }
        }
        this.loadAppData(newId);
      }
    });
    this.subscriptions.push(paramsSub);

    // Handle fragment navigation - store for cleanup
    const fragmentSub = this.route.fragment.subscribe((fragment) => {
      if (fragment === "downloads" && isPlatformBrowser(this.platformId)) {
        setTimeout(() => {
          this.scrollToDownloads();
        }, 500);
      }
    });
    this.subscriptions.push(fragmentSub);
  }

  private loadAppData(appParam: string) {
    const lastUnderscoreIndex = appParam.lastIndexOf("_");
    let appId: string = appParam;

    if (lastUnderscoreIndex !== -1) {
      const potentialId = appParam.substring(lastUnderscoreIndex + 1);
      if (potentialId.length > 0) {
        appId = potentialId;
      }
    }

    // Store subscription for cleanup
    const appSub = this.appService.getAppById(appId).subscribe(
      (app) => {
        if (app) {
          console.log("✅ DEBUG: App data loaded successfully:", app.Name_En);
          this.app = app;
          this.cdr.detectChanges();
          if (app.categories.length > 0) {
            // Store nested subscription for cleanup
            const categorySub = this.appService
              .getAppsByCategory(app.categories[0])
              .subscribe((apps) => {
                this.relevantApps = apps.filter((a) => a.id !== app.id);
              });
            this.subscriptions.push(categorySub);
          }

          this.updateSeoData();
          this.loading = false;
          this.cdr.detectChanges();

          this.swiperInitAttempts = 0;
          setTimeout(() => {
            this.initializeSwiper();
          }, 0);
          setTimeout(() => {
            this.initializeSwiper();
          }, 150);
        } else {
          console.error("❌ DEBUG: No app data returned for:", appParam);
        }
      },
      (error) => {
        console.error("❌ DEBUG: Error loading app data:", error);
      }
    );
    this.subscriptions.push(appSub);
  }

  // Rest of the methods remain the same...
  navigateToApp(lookupId: string) {
    this.app = undefined;
    this.loading = true;
    this.relevantApps = [];
    this.cdr.detectChanges();

    const targetApp = this.relevantApps.find((app) => app.id === lookupId);
    let slug = targetApp?.slug || "";
    slug = slug.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");

    if (!slug && targetApp) {
      slug = targetApp.Name_En.toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "");
    }

    if (slug && slug.includes("-")) {
      const parts = slug.split("-");
      if (/^\d+$/.test(parts[0])) {
        slug = parts.slice(1).join("-");
      }
    }

    slug = slug || lookupId;
    const urlParam = `${slug}_${lookupId}`;
    this.router.navigate([`/${this.currentLang}/app/${urlParam}`]).then(() => {
      if (isPlatformBrowser(this.platformId)) {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
      this.isExpanded = false;
    });
  }

  navigateToAppDownloads(lookupId: string, event: Event) {
    event.stopPropagation();
    const targetApp = this.relevantApps.find((app) => app.id === lookupId);
    this.app = undefined;
    this.loading = true;
    this.relevantApps = [];
    this.cdr.detectChanges();

    let slug = targetApp?.slug || "";
    slug = slug.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");

    if (!slug && targetApp) {
      slug = targetApp.Name_En.toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "");
    }

    if (slug && slug.includes("-")) {
      const parts = slug.split("-");
      if (/^\d+$/.test(parts[0])) {
        slug = parts.slice(1).join("-");
      }
    }

    slug = slug || lookupId;
    const urlParam = `${slug}_${lookupId}`;
    this.router
      .navigate([`/${this.currentLang}/app/${urlParam}`], {
        fragment: "downloads",
      })
      .then(() => {
        this.isExpanded = false;
      });
  }

  async shareRelatedApp(lookupId: string, event: Event): Promise<void> {
    event.stopPropagation();
    if (!isPlatformBrowser(this.platformId)) return;

    const targetApp = this.relevantApps.find((app) => app.id === lookupId);
    if (!targetApp) return;

    const appName =
      this.currentLang === "ar" ? targetApp.Name_Ar : targetApp.Name_En;
    const appDescription =
      this.currentLang === "ar"
        ? targetApp.Short_Description_Ar
        : targetApp.Short_Description_En;

    let slug = targetApp.slug || "";
    slug = slug.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");

    if (!slug) {
      slug = targetApp.Name_En.toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "");
    }

    if (slug && slug.includes("-")) {
      const parts = slug.split("-");
      if (/^\d+$/.test(parts[0])) {
        slug = parts.slice(1).join("-");
      }
    }

    slug = slug || lookupId;
    const urlParam = `${slug}_${lookupId}`;
    const shareUrl = `${window.location.origin}/${this.currentLang}/app/${urlParam}`;

    const shareData = {
      title: appName,
      text: appDescription || appName,
      url: shareUrl,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(shareUrl);
        alert(
          this.currentLang === "ar"
            ? "تم نسخ الرابط إلى الحافظة"
            : "Link copied to clipboard",
        );
      }
    } catch (error) {
      if ((error as Error).name !== "AbortError") {
        console.error("Share failed:", error);
      }
    }
  }

  openLightbox(index: number): void {
    const screenshots =
      this.currentLang === "en"
        ? this.app?.screenshots_en
        : this.app?.screenshots_ar;
    if (!screenshots || screenshots.length === 0) return;

    const images = screenshots.map((src, i) => ({
      src: src,
      alt: `${this.app?.Name_En || "App"} screenshot ${i + 1}`,
    }));

    const reorderedImages = [...images.slice(index), ...images.slice(0, index)];

    this.nzImageService.preview(reorderedImages, {
      nzZoom: 1,
      nzRotate: 0,
      nzNoAnimation: false,
    });
  }

  navigateToCategory(categoryName: string) {
    const langFromParamMap = this.route.snapshot.paramMap.get("lang");
    const langFromParams = this.route.snapshot.params["lang"];
    const finalLang = langFromParamMap || langFromParams || this.currentLang;

    const targetPath = `/${finalLang}/${categoryName.toLowerCase()}`;

    this.router
      .navigate([targetPath], { replaceUrl: false })
      .then((success) => {
        if (!success && isPlatformBrowser(this.platformId)) {
          const fullUrl = `${window.location.origin}${targetPath}`;
          window.location.href = fullUrl;
        }
      })
      .catch(() => {
        if (isPlatformBrowser(this.platformId)) {
          const fullUrl = `${window.location.origin}${targetPath}`;
          window.location.href = fullUrl;
        }
      });
  }

  ngAfterViewInit() {
    console.log("🔧 DEBUG: ngAfterViewInit called");
    if (this.app) {
      this.initializeSwiper();
    }
  }

  private initializeSwiper() {
    if (this.swiperContainer && this.app) {
      try {
        const swiperEl = this.swiperContainer.nativeElement;
        Object.assign(swiperEl, this.swiperParams);
        swiperEl.initialize();
        this.swiperInitAttempts = 0;
      } catch (error) {
        console.error("❌ DEBUG: Swiper initialization failed:", error);
      }
    } else {
      if (this.swiperInitAttempts < 5) {
        this.swiperInitAttempts += 1;
        setTimeout(() => this.initializeSwiper(), 120);
      }
    }
  }

  getCategoryIcon(category: string): SafeHtml {
    const foundCategory = this.categoriesSet.find(
      (cat) => cat.name.toLowerCase() === category.toLowerCase(),
    );
    return this.sanitizer.bypassSecurityTrustHtml(foundCategory?.icon || "");
  }

  shouldShowReadMore(text: string | null): boolean {
    if (text === null) return false;
    return text.length > 200;
  }

  navigateToDeveloper() {
    if (this.app && this.app.Developer_Name_En) {
      const developerName = this.app.Developer_Name_En.toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "");
      const developerId = this.app.Developer_Id || "";

      if (developerId) {
        const urlParam = `${developerName}_${developerId}`;
        this.router.navigate([`/${this.currentLang}/developer/${urlParam}`]);
      } else {
        console.warn("⚠️ No developer ID found for app:", this.app.Name_En);
      }
    }
  }

  private updateSeoData() {
    if (!this.app) return;

    const appName =
      this.currentLang === "ar" ? this.app.Name_Ar : this.app.Name_En;
    const appDescription =
      this.currentLang === "ar"
        ? this.app.Short_Description_Ar
        : this.app.Short_Description_En;
    const fullDescription =
      this.currentLang === "ar"
        ? this.app.Description_Ar
        : this.app.Description_En;

    const screenshots =
      this.currentLang === "ar"
        ? this.app.screenshots_ar
        : this.app.screenshots_en;
    if (screenshots && screenshots.length > 0) {
      this.addPreloadLink(screenshots[0]);
    }

    const title =
      this.currentLang === "ar"
        ? `${appName} - تطبيق قرآني من دليل التطبيقات القرآنية`
        : `${appName} - Quran App from Comprehensive Quranic Directory`;

    this.titleService.setTitle(title);
    this.metaService.updateTag({ name: "title", content: title });
    this.metaService.updateTag({
      name: "description",
      content: `${appDescription} - ${fullDescription?.substring(0, 150)}...`,
    });

    const ogImageUrl = `${environment.apiUrl}/apps/${this.app.slug}/og-image/?lang=${this.currentLang}`;
    this.metaService.updateTag({ property: "og:title", content: title });
    this.metaService.updateTag({
      property: "og:description",
      content: appDescription || "",
    });
    this.metaService.updateTag({ property: "og:image", content: ogImageUrl });
    this.metaService.updateTag({
      property: "og:url",
      content: `https://quran-apps.itqan.dev/${this.currentLang}/app/${this.app.slug}_${this.app.id}`,
    });
    this.metaService.updateTag({ property: "og:type", content: "website" });
    this.metaService.updateTag({
      property: "twitter:card",
      content: "summary_large_image",
    });
    this.metaService.updateTag({ property: "twitter:title", content: title });
    this.metaService.updateTag({
      property: "twitter:description",
      content: appDescription || "",
    });
    this.metaService.updateTag({
      property: "twitter:image",
      content: ogImageUrl,
    });

    const keywords = [
      this.currentLang === "ar" ? "تطبيق قرآني" : "Quran app",
      this.currentLang === "ar" ? "تطبيق إسلامي" : "Islamic app",
      appName,
      ...this.app.categories.map((cat) =>
        this.currentLang === "ar" ? `تطبيقات ${cat}` : `${cat} apps`,
      ),
    ];
    this.metaService.updateTag({
      name: "keywords",
      content: keywords.join(", "),
    });

    const appStructuredData = this.seoService.generateEnhancedAppStructuredData(
      this.app,
      this.currentLang,
    );
    const breadcrumbs = [
      {
        name: this.currentLang === "ar" ? "الرئيسية" : "Home",
        url: `https://quran-apps.itqan.dev/${this.currentLang}`,
      },
      {
        name: this.currentLang === "ar" ? "التطبيقات" : "Apps",
        url: `https://quran-apps.itqan.dev/${this.currentLang}`,
      },
      {
        name: appName,
        url: `https://quran-apps.itqan.dev/${this.currentLang}/app/${this.app.id}`,
      },
    ];

    const breadcrumbData = this.seoService.generateBreadcrumbStructuredData(
      breadcrumbs,
      this.currentLang,
    );
    const organizationData = this.seoService.generateOrganizationStructuredData(
      this.currentLang,
    );

    const combinedData = [appStructuredData, breadcrumbData, organizationData];
    this.seoService.addStructuredData(combinedData);
  }

  getPlatformLabel(platform: string): string {
    const labels: Record<string, Record<string, string>> = {
      android: { en: 'Android', ar: 'أندرويد' },
      ios: { en: 'iOS', ar: 'آي أو إس' },
      cross_platform: { en: 'All', ar: 'الجميع' },
      web: { en: 'Web', ar: 'ويب' },
    };
    return labels[platform]?.[this.currentLang] || labels['cross_platform'][this.currentLang];
  }

  getStoreCount(app: QuranApp): number {
    let count = 0;
    if (app.Google_Play_Link) count++;
    if (app.AppStore_Link) count++;
    if (app.App_Gallery_Link) count++;
    return count;
  }

  getRatingClass(rating: number): string {
    if (!rating || rating === 0) return "poor";
    if (rating >= 4.5) return "excellent";
    if (rating >= 4.0) return "very-good";
    if (rating >= 3.5) return "good";
    if (rating >= 2.5) return "fair";
    return "poor";
  }

  getStarArray(rating: number | undefined | null): { fillPercent: number }[] {
    const safeRating =
      typeof rating === "number" && !isNaN(rating)
        ? Math.round(rating * 10) / 10
        : 0;

    if (this.starArrayCache.has(safeRating)) {
      return this.starArrayCache.get(safeRating)!;
    }

    const stars: { fillPercent: number }[] = [];
    const fullStars = Math.floor(safeRating);
    const remainder = safeRating % 1;

    for (let i = 0; i < fullStars; i++) {
      stars.push({ fillPercent: 100 });
    }

    if (remainder > 0 && fullStars < 5) {
      stars.push({ fillPercent: Math.round(remainder * 100) });
    }

    while (stars.length < 5) {
      stars.push({ fillPercent: 0 });
    }

    this.starArrayCache.set(safeRating, stars);
    return stars;
  }

  private addPreloadLink(imageUrl: string) {
    if (!isPlatformBrowser(this.platformId)) return;

    const existingLink = this.document.querySelector(
      'link[rel="preload"][data-screenshot-preload]',
    );
    if (existingLink) {
      existingLink.remove();
    }

    const link = this.document.createElement("link");
    link.rel = "preload";
    link.as = "image";
    link.href = imageUrl;
    link.setAttribute("fetchpriority", "high");
    link.setAttribute("data-screenshot-preload", "true");
    this.document.head.appendChild(link);
  }

  scrollToDownloads() {
    if (!isPlatformBrowser(this.platformId)) return;
    const downloadsSection = this.document.querySelector("#downloads");
    if (downloadsSection) {
      const header = this.document.querySelector(".modern-header");
      const headerHeight = header ? header.getBoundingClientRect().height : 80;
      const elementTop = downloadsSection.getBoundingClientRect().top + window.scrollY;
      window.scrollTo({ top: elementTop - headerHeight - 16, behavior: "smooth" });
    }
  }

  async shareApp() {
    if (!isPlatformBrowser(this.platformId) || !this.app) return;

    const appName =
      this.currentLang === "ar" ? this.app.Name_Ar : this.app.Name_En;
    const appDescription =
      this.currentLang === "ar"
        ? this.app.Short_Description_Ar
        : this.app.Short_Description_En;
    const shareUrl = window.location.href;

    const shareData = {
      title: appName,
      text: appDescription || appName,
      url: shareUrl,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(shareUrl);
        console.log("Link copied to clipboard");
      }
    } catch (error) {
      console.error("Share failed:", error);
    }
  }

  scrollRelatedLeft() {
    const el = this.relatedCarousel?.nativeElement;
    if (el) {
      const scrollAmount = this.currentLang === "ar" ? 320 : -320;
      el.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  }

  scrollRelatedRight() {
    const el = this.relatedCarousel?.nativeElement;
    if (el) {
      const scrollAmount = this.currentLang === "ar" ? -320 : 320;
      el.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  }

  slidePrev() {
    if (this.swiperContainer?.nativeElement?.swiper) {
      this.swiperContainer.nativeElement.swiper.slidePrev();
    }
  }

  slideNext() {
    if (this.swiperContainer?.nativeElement?.swiper) {
      this.swiperContainer.nativeElement.swiper.slideNext();
    }
  }
}
