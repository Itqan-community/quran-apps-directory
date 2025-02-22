import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { NzCarouselModule } from 'ng-zorro-antd/carousel';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AppService, QuranApp } from '../../services/app.service';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

type CategoryKey = 'Recite' | 'Listen' | 'Kids' | 'Translation';

const CATEGORY_ICONS: Record<CategoryKey, string> = {
  'Recite': `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 1v16m4-4a4 4 0 0 1-8 0M9 22h6m-3 0v-4"></path></svg>`,
  'Listen': `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9v6a9 9 0 0 0 18 0V9"></path><path d="M21 9a9 9 0 0 0-18 0"></path><circle cx="12" cy="15" r="3"></circle></svg>`,
  'Kids': `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"></circle><path d="M9 9L7 7M15 9l2-2M9 15l-2 2M15 15l2 2M8 8L4 4M16 8l4-4M8 16l-4 4M16 16l4 4"></path></svg>`,
  'Translation': `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 3h14"></path><path d="M9 21h6"></path><path d="M12 3v18"></path><path d="m9 15-3 6"></path><path d="m15 15 3 6"></path><path d="M15 9l-3 3-3-3"></path></svg>`
};


@Component({
  selector: 'app-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    NzCarouselModule,
    NzCardModule,
    NzButtonModule,
    NzIconModule,
    NzTagModule,
    NzGridModule,
    TranslateModule
  ],
  templateUrl: './app-detail.component.html',
  styleUrls: ['./app-detail.component.css']
})
export class AppDetailComponent implements OnInit {
  app?: QuranApp;
  relevantApps: QuranApp[] = [];
  currentLang: 'en' | 'ar' = this.getBrowserLanguage();

  constructor(
    private route: ActivatedRoute,
    private appService: AppService,
    private sanitizer: DomSanitizer,
    private translateService: TranslateService
  ) {
    // Set initial language based on browser
    const browserLang = this.getBrowserLanguage();
    this.translateService.use(browserLang);
    
    // Subscribe to language changes
    this.translateService.onLangChange.subscribe(event => {
      this.currentLang = event.lang as 'en' | 'ar';
    });
  }

  private getBrowserLanguage(): 'en' | 'ar' {
    const browserLang = navigator.language.toLowerCase().split('-')[0];
    return browserLang === 'ar' ? 'ar' : 'en';
  }

  ngOnInit() {
    this.route.params.subscribe(params => {
      const id = params['id'];
      this.appService.getAppById(id).subscribe(app => {
        if (app) {
          this.app = app;
          if (app.categories.length > 0) {
            this.appService.getAppsByCategory(app.categories[0]).subscribe(apps => {
              this.relevantApps = apps.filter(a => a.id !== app.id).slice(0, 3);
            });
          }
        }
      });
    });
  }

  getCategoryIcon(category: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(
      CATEGORY_ICONS[category as CategoryKey] || ''
    );
  }
}