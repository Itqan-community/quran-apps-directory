import { Component, OnInit, AfterViewInit, ViewChild, ElementRef, CUSTOM_ELEMENTS_SCHEMA } from "@angular/core";
import { CommonModule } from "@angular/common";
import { ActivatedRoute, RouterModule } from "@angular/router";
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
  ],
  templateUrl: "./app-detail.component.html",
  styleUrls: ["./app-detail.component.scss"],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class AppDetailComponent implements OnInit, AfterViewInit {
  @ViewChild('swiperContainer', { static: false }) swiperContainer!: ElementRef;

  app?: QuranApp;
  relevantApps: QuranApp[] = [];
  currentLang: "en" | "ar" = "ar";
  categoriesSet: Array<{name: string, icon: string}> = categories;

  swiperParams = {
    slidesPerView: "auto",
    spaceBetween: 20,
    pagination: false,
    navigation: {
      nextEl: '.swiper-button-next',
      prevEl: '.swiper-button-prev',
    },
  };

  constructor(
    private route: ActivatedRoute,
    private appService: AppService,
    private sanitizer: DomSanitizer,
    private translateService: TranslateService
  ) {
    // Set initial language based on browser
    // const browserLang = this.getBrowserLanguage();
    // this.translateService.use(browserLang);
    this.currentLang = this.translateService.currentLang as 'ar' | 'en';
    // Subscribe to language changes
    this.translateService.onLangChange.subscribe((event) => {
      this.currentLang = event.lang as "en" | "ar";
    });
  }

  private getBrowserLanguage(): "en" | "ar" {
    const browserLang = navigator.language.toLowerCase().split("-")[0];
    return browserLang === "ar" ? "ar" : "en";
  }

  ngOnInit() {
    this.route.params.subscribe((params) => {
      const id = params["id"];
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
        }
      });
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
}