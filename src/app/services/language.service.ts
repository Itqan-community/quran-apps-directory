import { Injectable, PLATFORM_ID, Inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, ActivatedRouteSnapshot, NavigationEnd, Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { BehaviorSubject, Observable, filter } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class LanguageService {
  private supportedLanguages = ['en', 'ar'];
  private defaultLanguage = 'ar';
  private urlSubscriptionActive = false;

  private langSubject: BehaviorSubject<string>;
  public readonly currentLang$: Observable<string>;

  constructor(
    @Inject(PLATFORM_ID) private readonly platformId: Object,
    private route: ActivatedRoute,
    private router: Router,
    private translate: TranslateService
  ) {
    // Translations are initialized via APP_INITIALIZER in main.ts
    // Just get the current language and set up URL change listener
    this.defaultLanguage = this.translate.currentLang || this.translate.getDefaultLang() || 'ar';
    this.langSubject = new BehaviorSubject<string>(this.defaultLanguage);
    this.currentLang$ = this.langSubject.asObservable();
    this.setLanguageFromUrl();
  }

  setLanguageFromUrl() {
    // Prevent duplicate subscriptions (guard for safety — called once from constructor)
    if (this.urlSubscriptionActive) {
      return;
    }
    this.urlSubscriptionActive = true;

    // use this to set the language from the url when the page is loaded using the router events
    this.router.events.pipe(filter(event => event instanceof NavigationEnd)).subscribe(event => {
      const currentUrl = (event as NavigationEnd).url;

      // Extract language from URL path (handles both /en and /en/kids formats)
      const urlPath = currentUrl.split('?')[0]; // Remove query parameters if any
      const pathSegments = urlPath.split('/').filter(segment => segment); // Remove empty segments
      const lang = pathSegments[0]; // First non-empty segment should be the language

      if (this.supportedLanguages.includes(lang)) {
        // Only update if language actually changed — prevents race conditions
        if (lang !== this.langSubject.getValue()) {
          // Wait for translations to load before updating DOM
          this.translate.use(lang).subscribe({
            next: () => this.applyLanguage(lang),
            error: () => this.applyLanguage(lang)
          });
        }
      } else {
        // Redirect to default language (preserve any additional path segments)
        const remainingPath = pathSegments.slice(1).join('/');
        const targetUrl = remainingPath ? `/${this.defaultLanguage}/${remainingPath}` : `/${this.defaultLanguage}`;
        this.router.navigateByUrl(targetUrl);
      }
    });
  }

  changeLanguage(lang: string) {
    if (this.supportedLanguages.includes(lang)) {
      // Wait for translations to load before navigating
      this.translate.use(lang).subscribe({
        next: () => this.applyLanguageAndNavigate(lang),
        error: () => this.applyLanguageAndNavigate(lang)
      });
    }
  }

  /** Apply language then navigate to the same page with the new language prefix */
  private applyLanguageAndNavigate(lang: string) {
    this.applyLanguage(lang);
    const currentUrl = this.router.url;
    const urlPath = currentUrl.split('?')[0];
    const pathSegments = urlPath.split('/').filter(segment => segment);
    const remainingPath = pathSegments.slice(1).join('/');
    const targetUrl = `/${lang}/${remainingPath}`;
    this.router.navigateByUrl(targetUrl);
  }

  /** Single place that applies language to DOM and notifies subscribers */
  private applyLanguage(lang: string) {
    this.translate.setDefaultLang(lang);
    if (isPlatformBrowser(this.platformId)) {
      document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
      document.documentElement.lang = lang;
    }
    this.langSubject.next(lang);
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
