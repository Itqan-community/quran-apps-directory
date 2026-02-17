import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subject, takeUntil } from 'rxjs';
import { ApiService, App } from '../../services/api.service';
import { SeoService } from '../../services/seo.service';
import { LanguageService } from '../../services/language.service';
import { OptimizedImageComponent } from '../../components/optimized-image/optimized-image.component';

interface AppSection {
  titleKey: string;
  subtitleKey: string;
  descriptionKey: string;
  slugs: string[];
  apps: App[];
}

@Component({
  selector: 'app-ramadan',
  standalone: true,
  imports: [CommonModule, RouterModule, TranslateModule, OptimizedImageComponent],
  templateUrl: './ramadan.component.html',
  styleUrls: ['./ramadan.component.scss']
})
export class RamadanComponent implements OnInit, OnDestroy {
  currentLang: 'ar' | 'en' = 'ar';
  loading = true;
  private destroy$ = new Subject<void>();

  sections: AppSection[] = [
    {
      titleKey: 'ramadan.sections.quran',
      subtitleKey: 'ramadan.sectionSubtitle.quran',
      descriptionKey: 'ramadan.sectionDesc.quran',
      slugs: ['wahy', 'ayah', 'quran-hafs', 'mushaf-mecca'],
      apps: []
    },
    {
      titleKey: 'ramadan.sections.translations',
      subtitleKey: 'ramadan.sectionSubtitle.translations',
      descriptionKey: 'ramadan.sectionDesc.translations',
      slugs: ['noor-international-quran', 'quran-indonesia-kemenag', 'amazighi-quran'],
      apps: []
    },
    {
      titleKey: 'ramadan.sections.family',
      subtitleKey: 'ramadan.sectionSubtitle.family',
      descriptionKey: 'ramadan.sectionDesc.family',
      slugs: ['tarteel', 'elmohafez', 'moddakir'],
      apps: []
    },
    {
      titleKey: 'ramadan.sections.ai',
      subtitleKey: 'ramadan.sectionSubtitle.ai',
      descriptionKey: 'ramadan.sectionDesc.ai',
      slugs: ['mofassal', 'satr', 'the-holy-quran'],
      apps: []
    },
    {
      titleKey: 'ramadan.sections.accessibility',
      subtitleKey: 'ramadan.sectionSubtitle.accessibility',
      descriptionKey: 'ramadan.sectionDesc.accessibility',
      slugs: ['al-fatiha', 'quran-mobasher', 'maher'],
      apps: []
    }
  ];

  constructor(
    private translateService: TranslateService,
    private apiService: ApiService,
    private seoService: SeoService,
    private languageService: LanguageService
  ) {}

  ngOnInit(): void {
    this.currentLang = (this.translateService.currentLang as 'ar' | 'en') || 'ar';

    this.translateService.onLangChange
      .pipe(takeUntil(this.destroy$))
      .subscribe(event => {
        this.currentLang = event.lang as 'ar' | 'en';
        this.updateSeo();
      });

    this.loadApps();
    this.updateSeo();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadApps(): void {
    this.apiService.getApps({ page_size: 100 })
      .pipe(takeUntil(this.destroy$))
      .subscribe(response => {
        const appMap = new Map<string, App>();
        for (const app of response.results) {
          appMap.set(app.slug, app);
        }

        for (const section of this.sections) {
          section.apps = section.slugs
            .map(slug => appMap.get(slug))
            .filter((app): app is App => !!app);
        }

        this.loading = false;
      });
  }

  private updateSeo(): void {
    const title = this.currentLang === 'ar'
      ? 'رمضان ١٤٤٧ - دليل التطبيقات القرآنية'
      : 'Ramadan 1447 - Quran Apps Directory';

    this.seoService.addStructuredData({
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: title,
      url: `https://quran-apps.itqan.dev/${this.currentLang}/ramadan`,
      description: this.currentLang === 'ar'
        ? 'تطبيقات قرآنية مختارة لشهر رمضان المبارك ١٤٤٧ هـ'
        : 'Curated Quran apps for the blessed month of Ramadan 1447 AH'
    });
  }

  getAppName(app: App): string {
    return this.currentLang === 'ar' ? app.name_ar : app.name_en;
  }

  getAppDescription(app: App): string {
    return this.currentLang === 'ar' ? app.short_description_ar : app.short_description_en;
  }

  getScreenshot(app: App): string | null {
    const screenshots = this.currentLang === 'ar' ? app.screenshots_ar : app.screenshots_en;
    return screenshots?.length > 0 ? screenshots[0] : null;
  }

  getAppTags(app: App): string[] {
    const tags: string[] = [];
    if (app.categories) {
      for (const cat of app.categories) {
        tags.push(this.currentLang === 'ar' ? cat.name_ar : cat.name_en);
      }
    }
    if (app.riwayah?.length) {
      tags.push(...app.riwayah.slice(0, 1));
    }
    return tags.slice(0, 4);
  }

  getExtraTags(app: App): number {
    const total = (app.categories?.length || 0) + (app.riwayah?.length || 0);
    return Math.max(0, total - 4);
  }

  getPlatformLabel(app: App): string {
    if (app.google_play_link && app.app_store_link) {
      return this.currentLang === 'ar' ? 'الجميع' : 'All';
    }
    if (app.app_store_link) {
      return this.currentLang === 'ar' ? 'آيفون' : 'iOS';
    }
    return this.currentLang === 'ar' ? 'أندرويد' : 'Android';
  }

  formatDownloads(count: number): string {
    if (!count) return '-';
    if (count >= 1000000) return Math.floor(count / 1000000) + 'M';
    if (count >= 1000) return Math.floor(count / 1000) + 'K';
    return count.toString();
  }

  changeLanguage(): void {
    const newLang = this.currentLang === 'ar' ? 'en' : 'ar';
    this.languageService.changeLanguage(newLang);
  }

  shareApp(app: App, event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    const url = `https://quran-apps.itqan.dev/${this.currentLang}/app/${app.slug}`;
    if (navigator.share) {
      navigator.share({ title: this.getAppName(app), url });
    } else {
      navigator.clipboard.writeText(url);
    }
  }
}
