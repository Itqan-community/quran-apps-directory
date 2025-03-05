import { Injectable } from '@angular/core';
import { ActivatedRoute, ActivatedRouteSnapshot, NavigationEnd, Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { filter } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class LanguageService {
  private supportedLanguages = ['en', 'ar'];
  private defaultLanguage = 'en';

  constructor(private route: ActivatedRoute, private router: Router, private translate: TranslateService) {
    const browserLang = navigator.language;
    this.defaultLanguage = browserLang.startsWith("ar") ? "ar" : "en";
    this.translate.setDefaultLang(this.defaultLanguage);
    this.translate.use(this.defaultLanguage);
    this.setLanguageFromUrl();
  }

  setLanguageFromUrl() {
    console.log("setLanguageFromUrl", this.getCurrentRouteParams());
    // use this to set the language from the url when the page is loaded using the router events
    this.router.events.pipe(filter(event => event instanceof NavigationEnd)).subscribe(event => {
      const currentUrl = (event as NavigationEnd).url;
      console.log('Updated URL:', currentUrl);
      const lang = currentUrl.split('/')[1];
      console.log("lang", lang);
      if (this.supportedLanguages.includes(lang)) {
        this.translate.setDefaultLang(lang);
        this.translate.use(lang);
        document.documentElement.lang = lang;
        document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr'; // Adjust direction
      } else {
        this.router.navigate([this.defaultLanguage]); // Redirect to default if language is invalid
      } 
    });
    // this.route.params.subscribe(params => {
    //   console.log("params", params);
    //   const lang = params['lang'];
    //   console.log("lang", lang);
      
    //   if (this.supportedLanguages.includes(lang)) {
    //     this.translate.setDefaultLang(lang);
    //     this.translate.use(lang);
    //     document.documentElement.lang = lang;
    //     document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr'; // Adjust direction
    //   } else {
    //    // this.router.navigate([this.defaultLanguage]); // Redirect to default if language is invalid
    //   }
    // });
  }

  changeLanguage(lang: string) {
    if (this.supportedLanguages.includes(lang)) {
      document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
      this.translate.use(lang);
      const currentUrl = this.router.url.split('/').slice(2).join('/'); // Remove existing language
      this.router.navigate([`/${lang}/${currentUrl}`]);
    }
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
}