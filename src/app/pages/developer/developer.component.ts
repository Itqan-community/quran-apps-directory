import { Component, OnInit, PLATFORM_ID, Inject } from '@angular/core';
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
export class DeveloperComponent implements OnInit {
  developerApps: QuranApp[] = [];
  developerInfo: any = null;
  currentLang: 'en' | 'ar' = 'ar';
  loading = true;
  developerName = '';
  developerParam = ''; // Store the full parameter (name_id)
  // Cache for star arrays to prevent NG0100 errors from creating new references on each change detection
  private starArrayCache = new Map<number, { fillPercent: number }[]>();

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
    console.log('🏗️ DeveloperComponent constructor called');
    this.currentLang = this.translateService.currentLang as 'ar' | 'en';
    // Subscribe to language changes
    this.translateService.onLangChange.subscribe((event) => {
      this.currentLang = event.lang as 'en' | 'ar';
      this.updatePageTitle();
    });
  }

  ngOnInit() {
    console.log('🔍 DeveloperComponent ngOnInit called');

    // Set language immediately from snapshot
    const lang = this.route.snapshot.params['lang'];
    const developerName = this.route.snapshot.params['developer'];

    console.log('📍 Route snapshot params - lang:', lang, 'developer:', developerName);

    if (lang) {
      this.currentLang = lang as 'en' | 'ar';
    }

    // Subscribe to route parameter changes
    this.route.params.subscribe((params) => {
      console.log('🔄 Route params changed:', params);
      const newLang = params['lang'];
      const newDeveloperParam = params['developer'];

      console.log('📍 New params - lang:', newLang, 'developer:', newDeveloperParam);

      // Update language if changed
      if (newLang && newLang !== this.currentLang) {
        this.currentLang = newLang as 'en' | 'ar';
      }

      // Load developer data when developer param changes (or on initial load)
      if (newDeveloperParam) {
        console.log('📤 Calling loadDeveloperData with:', newDeveloperParam);
        this.developerParam = newDeveloperParam;
        this.loading = true;
        this.loadDeveloperData(newDeveloperParam);
      } else {
        console.log('⚠️ No developer param in route');
      }
    });
  }

  private loadDeveloperData(developerParam: string) {
    // Parse the developer parameter: format is "developerName_developerId"
    // Extract developer ID from URL parameter
    const lastUnderscoreIndex = developerParam.lastIndexOf('_');
    let developerId: string | null = null;
    let developerName = developerParam;

    if (lastUnderscoreIndex !== -1) {
      const potentialId = developerParam.substring(lastUnderscoreIndex + 1);
      // Check if the part after underscore is a valid ID (numeric)
      if (/^\d+$/.test(potentialId)) {
        developerId = potentialId;
        developerName = developerParam.substring(0, lastUnderscoreIndex);
        console.log('✅ Parsed developer ID from URL:', developerId);
      }
    }

    // Decode the developer name from URL
    let decodedName = decodeURIComponent(developerName).trim();
    // If it still looks double-encoded, decode again
    if (decodedName.includes('%')) {
      decodedName = decodeURIComponent(decodedName).trim();
    }

    console.log('Developer route param:', developerParam);
    console.log('Developer ID:', developerId);
    console.log('Developer name:', decodedName);

    // Load from API using developer_id
    if (developerId) {
      console.log('📡 Fetching from API using developer_id:', developerId);
      this.appService.getAppsByDeveloperId(developerId).subscribe(
        (apps) => this.handleDeveloperAppsLoaded(apps),
        (error) => this.handleDeveloperAppsError(error)
      );
    } else {
      // No ID in URL - fall back to search by developer name
      const searchName = decodedName.replace(/-/g, ' ');
      console.log('📡 No developer ID, falling back to search by name:', searchName);
      this.appService.getAppsByDeveloper(searchName).subscribe(
        (apps) => this.handleDeveloperAppsLoaded(apps),
        (error) => this.handleDeveloperAppsError(error)
      );
    }
  }

  private handleDeveloperAppsLoaded(apps: QuranApp[]) {
    if (apps && apps.length > 0) {
      console.log('✅ Loaded apps from API:', apps.length);
      this.developerApps = apps;
    } else {
      console.log('⚠️ No apps found for this developer');
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
    console.error('❌ Error loading developer data:', error);
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
