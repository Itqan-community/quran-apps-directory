import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule, Router } from '@angular/router';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzRateModule } from 'ng-zorro-antd/rate';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AppService, QuranApp } from '../../services/app.service';
import { Title } from '@angular/platform-browser';

@Component({
  selector: 'app-developer',
  standalone: true,
  imports: [
    CommonModule,
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
    private titleService: Title
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

  visitDeveloperWebsite() {
    if (this.developerInfo?.website) {
      window.open(this.developerInfo.website, '_blank');
    }
  }
}
