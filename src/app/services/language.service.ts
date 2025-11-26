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
    // Translations are initialized via APP_INITIALIZER in main.ts
    // Just get the current language and set up URL change listener
    this.defaultLanguage = this.translate.currentLang || this.translate.getDefaultLang() || 'en';
    this.setLanguageFromUrl();
  }

  setLanguageFromUrl() {
    // use this to set the language from the url when the page is loaded using the router events
    this.router.events.pipe(filter(event => event instanceof NavigationEnd)).subscribe(event => {
      const currentUrl = (event as NavigationEnd).url;

      // Extract language from URL path (handles both /en and /en/kids formats)
      const urlPath = currentUrl.split('?')[0]; // Remove query parameters if any
      const pathSegments = urlPath.split('/').filter(segment => segment); // Remove empty segments
      const lang = pathSegments[0]; // First non-empty segment should be the language

      if (this.supportedLanguages.includes(lang)) {
        this.translate.setDefaultLang(lang);
        // Wait for translations to load before updating DOM
        this.translate.use(lang).subscribe(() => {
          document.documentElement.lang = lang;
          document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr'; // Adjust direction
        });
      } else {
        // Redirect to default language (preserve any additional path segments)
        const remainingPath = pathSegments.slice(1).join('/');
        const targetUrl = remainingPath ? `/${this.defaultLanguage}/${remainingPath}` : `/${this.defaultLanguage}`;
        this.router.navigateByUrl(targetUrl);
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
      // Wait for translations to load before navigating
      this.translate.use(lang).subscribe(() => {
        document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
        document.documentElement.lang = lang;

        // Preserve path segments when changing language
        const currentUrl = this.router.url;
        const urlPath = currentUrl.split('?')[0];
        const pathSegments = urlPath.split('/').filter(segment => segment);
        const remainingPath = pathSegments.slice(1).join('/'); // Remove existing language, keep rest
        const targetUrl = `/${lang}/${remainingPath}`;

        this.router.navigateByUrl(targetUrl);
      });
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