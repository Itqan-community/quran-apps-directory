import { Component, OnInit, AfterViewInit, ViewChild, ElementRef, CUSTOM_ELEMENTS_SCHEMA } from "@angular/core";
import { CommonModule } from "@angular/common";
import { ActivatedRoute, RouterModule, Router } from "@angular/router";
import { NzCardModule } from "ng-zorro-antd/card";
import { NzButtonModule } from "ng-zorro-antd/button";
import { NzIconModule } from "ng-zorro-antd/icon";
import { NzTagModule } from "ng-zorro-antd/tag";
import { NzGridModule } from "ng-zorro-antd/grid";
import { TranslateModule, TranslateService } from "@ngx-translate/core";
import { AppService, QuranApp } from "../../services/app.service";
import { DomSanitizer, SafeHtml } from "@angular/platform-browser";
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { categories } from "../../services/applicationsData";
import { NzRateModule } from "ng-zorro-antd/rate";
import { FormsModule } from "@angular/forms";
// import function to register Swiper custom elements
import { register } from 'swiper/element/bundle';
import {Nl2brPipe} from "../../pipes/nl2br.pipe";
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
    pagination: false,
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
    private router: Router // Add Router to the constructor
  ) {
    this.currentLang = this.translateService.currentLang as 'ar' | 'en';
    // Subscribe to language changes
    this.translateService.onLangChange.subscribe((event) => {
      this.currentLang = event.lang as "en" | "ar";
      // Reinitialize swiper when language changes
      if (this.swiperContainer) {
        this.hideSwiper = false;
        setTimeout(() => {
          this.hideSwiper = true;
        }, 50);
        setTimeout(() => {
          console.log(this.hideSwiper);
          const swiperEl = this.swiperContainer.nativeElement;
          Object.assign(swiperEl, this.swiperParams);
          swiperEl.initialize();
        }, 60);
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
        this.loadAppData(newId);
      }
    });
  }

  private loadAppData(id: string) {
    this.appService.getAppById(id).subscribe((app) => {
      if (app) {
        this.app = app;
        if (app.categories.length > 0) {
          this.appService
            .getAppsByCategory(app.categories[0])
            .subscribe((apps) => {
              this.relevantApps = apps
                .filter((a) => a.id !== app.id)
                .slice(0, 3);
            });
        }
        this.loading = false;
      }
    });
  }

  // Add a method to handle navigation to a related app
  navigateToApp(appId: string) {
  
    this.router.navigate([`/${this.currentLang}/app/${appId}`]).then(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      this.isExpanded = false;
    });;
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
    if (this.swiperContainer) {
      const swiperEl = this.swiperContainer.nativeElement;
      Object.assign(swiperEl, this.swiperParams);
      swiperEl.initialize();
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
}