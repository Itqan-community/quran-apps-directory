import { ApplicationConfig, ErrorHandler, APP_INITIALIZER, PLATFORM_ID } from '@angular/core';
import { provideRouter, Router } from '@angular/router';
import * as Sentry from '@sentry/angular';
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
import { ErrorInterceptor } from './interceptors/error.interceptor';
import { TimeoutInterceptor } from './interceptors/timeout.interceptor';
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
  SendOutline,
  CloudUploadOutline,
  LoadingOutline
} from '@ant-design/icons-angular/icons';
import { LucideAngularModule, Menu, X, Globe, Home, Info, Mail, Users, PlusCircle, ExternalLink, ChevronRight, Search } from 'lucide-angular';

// AoT requires an exported function for factories
export function HttpLoaderFactory(http: HttpClient) {
  return new TranslateHttpLoader(http, './assets/i18n/', '.json');
}

// Factory to initialize translations before app renders
// Only runs on browser platform, skips on server
export function initializeTranslations(translate: TranslateService, platformId: Object): () => Promise<void> {
  return async () => {
    // Skip initialization during SSR/prerender - it will be handled by components
    if (!isPlatformBrowser(platformId)) {
      translate.setDefaultLang('ar');
      return;
    }

    let initialLang = 'ar';
    const urlPath = window.location.pathname;
    const pathSegments = urlPath.split('/').filter(segment => segment);
    const urlLang = pathSegments[0];

    const browserLang = navigator.language;
    const browserDefault = browserLang.startsWith('ar') ? 'ar' : 'ar';
    initialLang = (urlLang === 'ar' || urlLang === 'en') ? urlLang : browserDefault;

    translate.setDefaultLang(initialLang);

    try {
      const loadPromise = firstValueFrom(translate.use(initialLang));
      const timeoutPromise = new Promise<void>((_, reject) =>
        setTimeout(() => reject(new Error('Translation load timeout')), 3000)
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

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideAnimations(),
    provideHttpClient(withInterceptorsFromDi(), withFetch()),
    provideNzConfig(ngZorroConfig),
    {
      provide: HTTP_INTERCEPTORS,
      useClass: TimeoutInterceptor,
      multi: true
    },
    {
      provide: HTTP_INTERCEPTORS,
      useClass: CacheInterceptor,
      multi: true
    },
    {
      provide: HTTP_INTERCEPTORS,
      useClass: ErrorInterceptor,
      multi: true
    },
    {
      provide: ErrorHandler,
      useValue: Sentry.createErrorHandler({ showDialog: false })
    },
    {
      provide: Sentry.TraceService,
      deps: [Router]
    },
    {
      provide: APP_INITIALIZER,
      useFactory: () => () => {},
      deps: [Sentry.TraceService],
      multi: true
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
        registrationStrategy: 'registerImmediately'
      }),
      NzIconModule.forRoot([
        MenuOutline, ArrowUpOutline, ArrowDownOutline, ArrowRightOutline,
        SearchOutline, SunOutline, MoonOutline, BgColorsOutline, ExportOutline,
        GlobalOutline, LeftOutline, RightOutline, UserOutline, MobileOutline,
        LinkOutline, AppstoreOutline, CodeOutline, PictureOutline, FileTextOutline,
        SendOutline, CloudUploadOutline, LoadingOutline
      ]),
      LucideAngularModule.pick({ Menu, X, Globe, Home, Info, Mail, Users, PlusCircle, ExternalLink, ChevronRight, Search }),
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
