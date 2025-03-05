import { AfterViewInit, Component, inject, OnInit } from "@angular/core";
import { RouterOutlet, RouterLink, ActivatedRoute, Router, ActivatedRouteSnapshot, NavigationEnd } from "@angular/router";
import { NzLayoutModule } from "ng-zorro-antd/layout";
import { NzButtonModule } from "ng-zorro-antd/button";
import { NzSpaceModule } from "ng-zorro-antd/space";
import { TranslateModule, TranslateService } from "@ngx-translate/core";
import { NzIconModule } from "ng-zorro-antd/icon";
import { MenuOutline } from '@ant-design/icons-angular/icons';
import { Title, Meta } from '@angular/platform-browser';
import { LanguageService } from "./services/language.service";
import { filter } from "rxjs";

// Import what icons you need
const icons = [MenuOutline];

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
    TranslateModule,
    NzIconModule,
  ],
})
export class AppComponent implements OnInit, AfterViewInit {
  public isRtl: boolean;
  public isMobileMenuVisible = false;
  private translate = inject(TranslateService);
  private titleService = inject(Title);
  private metaService = inject(Meta);
  public currentLang: any = "en";

  constructor(private languageService: LanguageService, private router: Router) {
    // Get browser language
    console.log("constructor", this.getCurrentRouteParams());
    
    this.translate.onLangChange.subscribe(lang => {
      this.currentLang = lang;
    });
    // Set initial RTL state based on language
    this.isRtl = this.translate.currentLang === "ar";
    document.documentElement.dir = this.isRtl ? "rtl" : "ltr";
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
    console.log("ngOnInit", this.getCurrentRouteParams());
    this.updateMetaTags();
    this.translate.onLangChange.subscribe(() => {
      this.updateMetaTags();
    });
  }

  ngAfterViewInit() {
    this.router.events.pipe(filter(event => event instanceof NavigationEnd)).subscribe(event => {
      const currentUrl = (event as NavigationEnd).url;
      console.log('Updated URL:', currentUrl);
    });
    console.log("ngAfterViewInit", this.getCurrentRouteParams());
    this.languageService.setLanguageFromUrl();
  }

  toggleLanguage() {
    this.isRtl = !this.isRtl;
    this.languageService.changeLanguage(this.isRtl ? "ar" : "en");
  }

  toggleMobileMenu() {
    this.isMobileMenuVisible = !this.isMobileMenuVisible;
  }

  private updateMetaTags() {
    if (this.isRtl) {
      this.titleService.setTitle("دليل التطبيقات القرآنية");
      this.metaService.updateTag({ name: "title", content: "دليل التطبيقات القرآنية" });
      this.metaService.updateTag({ name: "description", content: "نساعدك في الوصول لأهم التطبيقات القرآنية للحفظ والقراءة والتدبر .... وغيرها الكثير، مقدم من مجتمع إتقان لتقنيات القرآن" });
      this.metaService.updateTag({ name: "keywords", content: "دليل التطبيقات, دليل القرآن, تفسير,Quran apps, تطبيقات القرآن, إتقان, ITQAN, Quran technology, open source" });
      this.metaService.updateTag({ name: "robots", content: "index, follow" });
      this.metaService.updateTag({ httpEquiv: "Content-Type", content: "text/html; charset=utf-8" });
      this.metaService.updateTag({ name: "language", content: "Arabic" });
      this.metaService.updateTag({ name: "author", content: "مجتمع إتقان لتقنيات القرآن" });
      this.metaService.updateTag({ property: "og:type", content: "website" });
      this.metaService.updateTag({ property: "og:url", content: "https://quran-apps.itqan.dev/" });
      this.metaService.updateTag({ property: "og:title", content: "دليل التطبيقات القرآنية" });
      this.metaService.updateTag({ property: "og:description", content: "نساعدك في الوصول لأهم التطبيقات القرآنية للحفظ والقراءة والتدبر .... وغيرها الكثير، مقدم من مجتمع إتقان لتقنيات القرآن" });
      this.metaService.updateTag({ property: "og:image", content: "image URL" });
      this.metaService.updateTag({ property: "twitter:card", content: "summary_large_image" });
      this.metaService.updateTag({ property: "twitter:url", content: "https://quran-apps.itqan.dev/" });
      this.metaService.updateTag({ property: "twitter:title", content: "دليل التطبيقات القرآنية" });
      this.metaService.updateTag({ property: "twitter:description", content: "نساعدك في الوصول لأهم التطبيقات القرآنية للحفظ والقراءة والتدبر .... وغيرها الكثير، مقدم من مجتمع إتقان لتقنيات القرآن" });
      this.metaService.updateTag({ property: "twitter:image", content: "image URL" });
    } else {
      this.titleService.setTitle("Quran Apps Directory");
      this.metaService.updateTag({ name: "title", content: "Quran Apps Directory" });
      this.metaService.updateTag({ name: "description", content: "We help you reach top Quranic applications for memorization, reading, translation... and much more, provided by ITQAN community for Quran technologies" });
      this.metaService.updateTag({ name: "keywords", content: "دليل التطبيقات, دليل القرآن, تفسير,Quran apps, تطبيقات القرآن, إتقان, ITQAN, Quran technology, open source" });
      this.metaService.updateTag({ name: "robots", content: "index, follow" });
      this.metaService.updateTag({ httpEquiv: "Content-Type", content: "text/html; charset=utf-8" });
      this.metaService.updateTag({ name: "language", content: "English" });
      this.metaService.updateTag({ name: "author", content: "ITQAN community for Quran technologies" });
      this.metaService.updateTag({ property: "og:type", content: "website" });
      this.metaService.updateTag({ property: "og:url", content: "https://quran-apps.itqan.dev/" });
      this.metaService.updateTag({ property: "og:title", content: "Quran Apps Directory" });
      this.metaService.updateTag({ property: "og:description", content: "We help you reach top Quranic applications for memorization, reading, translation... and much more, provided by ITQAN community for Quran technologies" });
      this.metaService.updateTag({ property: "og:image", content: "image URL" });
      this.metaService.updateTag({ property: "twitter:card", content: "summary_large_image" });
      this.metaService.updateTag({ property: "twitter:url", content: "https://quran-apps.itqan.dev/" });
      this.metaService.updateTag({ property: "twitter:title", content: "Quran Apps Directory" });
      this.metaService.updateTag({ property: "twitter:description", content: "We help you reach top Quranic applications for memorization, reading, translation... and much more, provided by ITQAN community for Quran technologies" });
      this.metaService.updateTag({ property: "twitter:image", content: "image URL" });
    }
  }
}