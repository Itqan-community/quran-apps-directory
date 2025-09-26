import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { routes } from './app.routes';
import { NzConfig, provideNzConfig } from 'ng-zorro-antd/core/config';
import { HttpClient } from '@angular/common/http';
import { importProvidersFrom } from '@angular/core';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { 
  MenuOutline, 
  ArrowUpOutline, 
  ArrowDownOutline, 
  SearchOutline,
  SunOutline,
  MoonOutline,
  BgColorsOutline,
  ExportOutline,
  GlobalOutline,
  LeftOutline,
  RightOutline
} from '@ant-design/icons-angular/icons';

// AoT requires an exported function for factories
export function HttpLoaderFactory(http: HttpClient) {
  return new TranslateHttpLoader(http, './assets/i18n/', '.json');
}

const ngZorroConfig: NzConfig = {
  theme: {
    primaryColor: '#A0533B'
  },
  // Disable dynamic theming for SSR compatibility
  message: { nzDuration: 3000 },
  notification: { nzDuration: 4500 }
};

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideAnimations(),
    provideHttpClient(withFetch()),
    provideNzConfig(ngZorroConfig),
    importProvidersFrom(
      NzIconModule.forRoot([MenuOutline, ArrowUpOutline, ArrowDownOutline, SearchOutline, SunOutline, MoonOutline, BgColorsOutline, ExportOutline, GlobalOutline, LeftOutline, RightOutline]),
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
