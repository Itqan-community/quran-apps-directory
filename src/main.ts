import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideHttpClient, withInterceptorsFromDi, HTTP_INTERCEPTORS } from '@angular/common/http';
import { CacheInterceptor } from './app/interceptors/cache.interceptor';
import { routes } from './app/app.routes';
import { NzConfig, provideNzConfig } from 'ng-zorro-antd/core/config';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { importProvidersFrom, ErrorHandler, Injectable, NgZone, APP_INITIALIZER } from '@angular/core';
import { TranslateLoader, TranslateModule, TranslateService } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';
import { AppComponent } from './app/app.component';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { ServiceWorkerModule } from '@angular/service-worker';
import { environment } from './environments/environment';
import { firstValueFrom } from 'rxjs';
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
  return new TranslateHttpLoader(http, './assets/i18n/', '.json');
}

// Factory to initialize translations before app renders
export function initializeTranslations(translate: TranslateService): () => Promise<void> {
  return async () => {
    // Detect language from URL first, fall back to browser language
    const urlPath = window.location.pathname;
    const pathSegments = urlPath.split('/').filter(segment => segment);
    const urlLang = pathSegments[0];

    const browserLang = navigator.language;
    const browserDefault = browserLang.startsWith('ar') ? 'ar' : 'en';
    const initialLang = (urlLang === 'ar' || urlLang === 'en') ? urlLang : browserDefault;

    // Set default and use the initial language
    translate.setDefaultLang(initialLang);

    // Wait for translations to load before continuing
    await firstValueFrom(translate.use(initialLang));

    // Set document direction and language
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

console.log('📍 main.ts: Bootstrapping with routes:', routes.length);

bootstrapApplication(AppComponent, {
  providers: [
    provideRouter(routes),
    provideAnimations(),
    provideHttpClient(withInterceptorsFromDi()),
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
      deps: [TranslateService],
      multi: true
    },
    importProvidersFrom(
      HttpClientModule,
      ServiceWorkerModule.register('ngsw-worker.js', {
        enabled: environment.production,
        registrationStrategy: 'registerWhenStable:30000'
      }),
      NzIconModule.forRoot([MenuOutline, ArrowUpOutline, ArrowDownOutline, ArrowRightOutline, SearchOutline, SunOutline, MoonOutline, BgColorsOutline, ExportOutline, GlobalOutline, LeftOutline, RightOutline, UserOutline, MobileOutline, LinkOutline, AppstoreOutline, CodeOutline, PictureOutline, FileTextOutline, SendOutline]),
      TranslateModule.forRoot({
        loader: {
          provide: TranslateLoader,
          useFactory: HttpLoaderFactory,
          deps: [HttpClient]
        }
      })
    )
  ]
}).catch(err => console.error('Bootstrap error:', err));