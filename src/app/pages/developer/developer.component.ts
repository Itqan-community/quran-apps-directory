import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
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

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private appService: AppService,
    private translateService: TranslateService,
    private titleService: Title,
    private metaService: Meta,
    private seoService: SeoService
  ) {
    this.currentLang = this.translateService.currentLang as 'ar' | 'en';
    // Subscribe to language changes
    this.translateService.onLangChange.subscribe((event) => {
      this.currentLang = event.lang as 'en' | 'ar';
      this.updatePageTitle();
    });
  }

  ngOnInit() {
    // Set language immediately from snapshot
    const lang = this.route.snapshot.params['lang'];
    const developerName = this.route.snapshot.params['developer'];

    if (lang) {
      this.currentLang = lang as 'en' | 'ar';
    }

    // Subscribe to route parameter changes
    this.route.params.subscribe((params) => {
      const newLang = params['lang'];
      const newDeveloperName = params['developer'];
      
      // Update language if changed
      if (newLang && newLang !== this.currentLang) {
        this.currentLang = newLang as 'en' | 'ar';
      }

      // Load developer data when developer name changes (or on initial load)
      if (newDeveloperName) {
        this.developerName = newDeveloperName;
        this.loading = true;
        this.loadDeveloperData(newDeveloperName);
      }
    });
  }

  private loadDeveloperData(developerName: string) {
    this.appService.getAppsByDeveloper(developerName).subscribe((apps) => {
      this.developerApps = apps;
      
      // Get developer info from the first app
      if (apps.length > 0) {
        const firstApp = apps[0];
        this.developerInfo = {
          logo: firstApp.Developer_Logo,
          name_en: firstApp.Developer_Name_En,
          name_ar: firstApp.Developer_Name_Ar,
          website: firstApp.Developer_Website
        };
      }
      
      this.updatePageTitle();
      this.updateSeoData();
      this.loading = false;
    });
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
    this.router.navigate([`/${this.currentLang}/app/${appId}`]).then(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
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
        url: `https://quran-apps.itqan.dev/${this.currentLang}/developer/${this.developerName}`
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
    if (this.developerInfo?.website) {
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
