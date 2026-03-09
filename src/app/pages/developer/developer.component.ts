import { Component, OnInit, OnDestroy, PLATFORM_ID, Inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule, Router } from '@angular/router';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzRateModule } from 'ng-zorro-antd/rate';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AppService, QuranApp } from '../../services/app.service';
import { Title, Meta } from '@angular/platform-browser';
import { SeoService } from '../../services/seo.service';
import { Observable, of, Subject } from 'rxjs';
import { switchMap, takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-developer',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    NzCardModule,
    NzButtonModule,
    NzIconModule,
    NzGridModule,
    NzRateModule,
    NzDividerModule,
    TranslateModule
  ],
  templateUrl: './developer.component.html',
  styleUrls: ['./developer.component.scss']
})
export class DeveloperComponent implements OnInit, OnDestroy {
  developerApps: QuranApp[] = [];
  developerInfo: any = null;
  currentLang: 'en' | 'ar' = 'ar';
  loading = true;
  developerName = '';
  developerParam = ''; // Store the full parameter (name_id)
  // Cache for star arrays to prevent NG0100 errors from creating new references on each change detection
  private starArrayCache = new Map<number, { fillPercent: number }[]>();
  private destroy$ = new Subject<void>();

  constructor(
    @Inject(PLATFORM_ID) private readonly platformId: Object,
    private route: ActivatedRoute,
    private router: Router,
    private appService: AppService,
    private translateService: TranslateService,
    private titleService: Title,
    private metaService: Meta,
    private seoService: SeoService
  ) {
    this.currentLang = this.translateService.currentLang as 'ar' | 'en';
    this.translateService.onLangChange.pipe(takeUntil(this.destroy$)).subscribe((event) => {
      this.currentLang = event.lang as 'en' | 'ar';
      this.updatePageTitle();
    });
  }

  ngOnInit() {
    const lang = this.route.snapshot.params['lang'];

    if (lang) {
      this.currentLang = lang as 'en' | 'ar';
    }

    this.route.params.pipe(
      takeUntil(this.destroy$),
      switchMap((params) => {
        const newLang = params['lang'];
        const newDeveloperParam = params['developer'];

        if (newLang && newLang !== this.currentLang) {
          this.currentLang = newLang as 'en' | 'ar';
        }

        if (!newDeveloperParam) {
          return of(null);
        }

        this.developerParam = newDeveloperParam;
        this.loading = true;
        return this.loadDeveloperData$(newDeveloperParam);
      }),
    ).subscribe({
      next: (apps) => {
        if (apps) {
          this.handleDeveloperAppsLoaded(apps);
        }
      },
      error: (error) => this.handleDeveloperAppsError(error),
    });
  }

  private loadDeveloperData$(developerParam: string): Observable<QuranApp[]> {
    const lastUnderscoreIndex = developerParam.lastIndexOf('_');
    let developerId: string | null = null;
    let developerName = developerParam;

    if (lastUnderscoreIndex !== -1) {
      const potentialId = developerParam.substring(lastUnderscoreIndex + 1);
      if (/^\d+$/.test(potentialId)) {
        developerId = potentialId;
        developerName = developerParam.substring(0, lastUnderscoreIndex);
      }
    }

    let decodedName = decodeURIComponent(developerName).trim();
    if (decodedName.includes('%')) {
      decodedName = decodeURIComponent(decodedName).trim();
    }

    if (developerId) {
      return this.appService.getAppsByDeveloperId(developerId);
    }

    const searchName = decodedName.replace(/-/g, ' ');
    return this.appService.getAppsByDeveloper(searchName);
  }

  private handleDeveloperAppsLoaded(apps: QuranApp[]) {
    if (apps && apps.length > 0) {
      this.developerApps = apps;
    } else {
      this.developerApps = [];
    }

    // Get developer info from the first app
    if (this.developerApps.length > 0) {
      const firstApp = this.developerApps[0];
      this.developerInfo = {
        logo: firstApp.Developer_Logo,
        name_en: firstApp.Developer_Name_En,
        name_ar: firstApp.Developer_Name_Ar,
        website: firstApp.Developer_Website
      };
    } else {
      // No apps found for this developer
      this.developerInfo = null;
    }

    this.updatePageTitle();
    this.updateSeoData();
    this.loading = false;

    // Scroll to top when page finishes loading
    if (isPlatformBrowser(this.platformId)) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  private handleDeveloperAppsError(error: any) {
    // Handle subscription error
    console.error('Error loading developer data:', error);
    this.developerApps = [];
    this.developerInfo = null;
    this.loading = false;
  }

  private updatePageTitle() {
    if (this.developerInfo) {
      const developerName = this.currentLang === 'en' 
        ? this.developerInfo.name_en 
        : this.developerInfo.name_ar;
      
      const prefix = this.currentLang === 'en' ? 'Apps by' : 'تطبيقات';
      this.titleService.setTitle(`${prefix} ${developerName} - Quran Apps Directory`);
    }
  }

  navigateToApp(appId: string) {
    // Find the app in developerApps to get its slug
    const targetApp = this.developerApps.find(app => app.id === appId);

    let slug = targetApp?.slug || '';

    // Normalize the slug: convert spaces to hyphens
    slug = slug.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

    // If no slug after normalization, generate from app name
    if (!slug && targetApp) {
      slug = targetApp.Name_En.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    }

    // Extract just the name part of the slug if it includes a numeric prefix (like "1-wahy" -> "wahy")
    if (slug && slug.includes('-')) {
      const parts = slug.split('-');
      // If first part is numeric, remove it
      if (/^\d+$/.test(parts[0])) {
        slug = parts.slice(1).join('-');
      }
    }

    slug = slug || appId;

    // Format: "slug_appId" (e.g., "wahy_1")
    const urlParam = `${slug}_${appId}`;
    this.router.navigate([`/${this.currentLang}/app/${urlParam}`]).then(() => {
      if (isPlatformBrowser(this.platformId)) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });
  }

  goBack() {
    this.router.navigate([`/${this.currentLang}`]);
  }

  private updateSeoData() {
    if (!this.developerInfo) return;

    const developerName = this.currentLang === 'en' ? this.developerInfo.name_en : this.developerInfo.name_ar;
    const title = this.currentLang === 'ar' ? 
      `تطبيقات ${developerName} - دليل التطبيقات القرآنية` : 
      `${developerName} Apps - Quran Apps Directory`;
    
    const description = this.currentLang === 'ar' ?
      `اكتشف ${this.developerApps.length} تطبيق قرآني من تطوير ${developerName}. تطبيقات القرآن الكريم المتاحة للتحميل المجاني.` :
      `Discover ${this.developerApps.length} Quran apps developed by ${developerName}. Free Quran applications available for download.`;

    // Set page title and meta tags
    this.titleService.setTitle(title);
    this.metaService.updateTag({ name: 'description', content: description });
    this.metaService.updateTag({ property: 'og:title', content: title });
    this.metaService.updateTag({ property: 'og:description', content: description });
    this.metaService.updateTag({ property: 'twitter:title', content: title });
    this.metaService.updateTag({ property: 'twitter:description', content: description });

    // Add developer structured data
    const developerData = this.seoService.generateDeveloperStructuredData(this.developerInfo, this.currentLang);
    
    // Add breadcrumb structured data
    const breadcrumbs = [
      {
        name: this.currentLang === 'ar' ? 'الرئيسية' : 'Home',
        url: `https://quran-apps.itqan.dev/${this.currentLang}`
      },
      {
        name: this.currentLang === 'ar' ? 'المطورون' : 'Developers',
        url: `https://quran-apps.itqan.dev/${this.currentLang}`
      },
      {
        name: developerName,
        url: `https://quran-apps.itqan.dev/${this.currentLang}/developer/${this.developerParam}`
      }
    ];
    
    const breadcrumbData = this.seoService.generateBreadcrumbStructuredData(breadcrumbs, this.currentLang);
    const organizationData = this.seoService.generateOrganizationStructuredData(this.currentLang);

    // Add ItemList for developer's apps
    const itemListData = this.seoService.generateItemListStructuredData(
      this.developerApps,
      null,
      this.currentLang
    );

    // Combine structured data
    const combinedData = [
      developerData,
      breadcrumbData,
      organizationData,
      itemListData
    ];

    this.seoService.addStructuredData(combinedData);
  }

  visitDeveloperWebsite() {
    if (this.developerInfo?.website && isPlatformBrowser(this.platformId)) {
      window.open(this.developerInfo.website, '_blank');
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

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  getStarArray(rating: number | undefined | null): { fillPercent: number }[] {
    // Ensure rating is a valid number to prevent NG0100 errors
    const safeRating = typeof rating === 'number' && !isNaN(rating) ? Math.round(rating * 10) / 10 : 0;

    // Return cached array if available to prevent NG0100 errors
    if (this.starArrayCache.has(safeRating)) {
      return this.starArrayCache.get(safeRating)!;
    }

    const stars: { fillPercent: number }[] = [];
    const fullStars = Math.floor(safeRating);
    const remainder = safeRating % 1;

    // Add full stars
    for (let i = 0; i < fullStars; i++) {
      stars.push({ fillPercent: 100 });
    }

    // Add partial star if needed
    if (remainder > 0 && fullStars < 5) {
      stars.push({ fillPercent: Math.round(remainder * 100) });
    }

    // Add empty stars to reach 5 total
    while (stars.length < 5) {
      stars.push({ fillPercent: 0 });
    }

    // Cache the result
    this.starArrayCache.set(safeRating, stars);

    return stars;
  }
}
