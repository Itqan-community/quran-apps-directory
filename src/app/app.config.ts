import { ApplicationConfig, ErrorHandler, Injectable, NgZone, APP_INITIALIZER, PLATFORM_ID, Inject } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideHttpClient, withInterceptorsFromDi, HTTP_INTERCEPTORS, withFetch } from '@angular/common/http';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { importProvidersFrom } from '@angular/core';
import { TranslateLoader, TranslateModule, TranslateService } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzConfig, provideNzConfig } from 'ng-zorro-antd/core/config';
import { ServiceWorkerModule } from '@angular/service-worker';
import { firstValueFrom } from 'rxjs';
import { CacheInterceptor } from './interceptors/cache.interceptor';
import { routes } from './app.routes';
import { environment } from '../environments/environment';
import {
  MenuOutline,
  ArrowUpOutline,
  ArrowDownOutline,
  ArrowRightOutline,
  SearchOutline,
  SunOutline,
  MoonOutline,
  BgColorsOutline,
  ExportOutline,
  GlobalOutline,
  LeftOutline,
  RightOutline,
  UserOutline,
  MobileOutline,
  LinkOutline,
  AppstoreOutline,
  CodeOutline,
  PictureOutline,
  FileTextOutline,
  SendOutline
} from '@ant-design/icons-angular/icons';

// AoT requires an exported function for factories
export function HttpLoaderFactory(http: HttpClient) {
  const cacheVersion = environment.version || '1.0.0';
  const suffix = `.json?v=${cacheVersion}`;
  return new TranslateHttpLoader(http, './assets/i18n/', suffix);
}

// Factory to initialize translations before app renders
// Only runs on browser platform, skips on server
export function initializeTranslations(translate: TranslateService, platformId: Object): () => Promise<void> {
  return async () => {
    // Skip initialization during SSR/prerender - it will be handled by components
    if (!isPlatformBrowser(platformId)) {
      translate.setDefaultLang('en');
      return;
    }

    let initialLang = 'en';
    const urlPath = window.location.pathname;
    const pathSegments = urlPath.split('/').filter(segment => segment);
    const urlLang = pathSegments[0];

    const browserLang = navigator.language;
    const browserDefault = browserLang.startsWith('ar') ? 'ar' : 'en';
    initialLang = (urlLang === 'ar' || urlLang === 'en') ? urlLang : browserDefault;

    translate.setDefaultLang(initialLang);

    try {
      const loadPromise = firstValueFrom(translate.use(initialLang));
      const timeoutPromise = new Promise<void>((_, reject) =>
        setTimeout(() => reject(new Error('Translation load timeout')), 5000)
      );
      await Promise.race([loadPromise, timeoutPromise]);
    } catch (error) {
      console.warn('Translation load failed or timed out, continuing with defaults:', error);
    }

    document.documentElement.dir = initialLang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = initialLang;
  };
}

const ngZorroConfig: NzConfig = {
  theme: {
    primaryColor: '#A0533B'
  }
};

@Injectable({ providedIn: 'root' })
class GlobalErrorHandler implements ErrorHandler {
  constructor(private ngZone: NgZone) {}
  handleError(error: Error): void {
    console.error('🚨 Global error caught:', error);
  }
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideAnimations(),
    provideHttpClient(withInterceptorsFromDi(), withFetch()),
    provideNzConfig(ngZorroConfig),
    {
      provide: HTTP_INTERCEPTORS,
      useClass: CacheInterceptor,
      multi: true
    },
    {
      provide: ErrorHandler,
      useClass: GlobalErrorHandler
    },
    {
      provide: APP_INITIALIZER,
      useFactory: initializeTranslations,
      deps: [TranslateService, PLATFORM_ID],
      multi: true
    },
    importProvidersFrom(
      HttpClientModule,
      ServiceWorkerModule.register('ngsw-worker.js', {
        enabled: environment.production,
        registrationStrategy: 'registerWhenStable:30000'
      }),
      NzIconModule.forRoot([
        MenuOutline, ArrowUpOutline, ArrowDownOutline, ArrowRightOutline,
        SearchOutline, SunOutline, MoonOutline, BgColorsOutline, ExportOutline,
        GlobalOutline, LeftOutline, RightOutline, UserOutline, MobileOutline,
        LinkOutline, AppstoreOutline, CodeOutline, PictureOutline, FileTextOutline,
        SendOutline
      ]),
      TranslateModule.forRoot({
        loader: {
          provide: TranslateLoader,
          useFactory: HttpLoaderFactory,
          deps: [HttpClient]
        }
      })
    )
  ]
};
