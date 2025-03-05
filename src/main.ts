import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { provideAnimations } from '@angular/platform-browser/animations';
import { routes } from './app/app.routes';
import { NzConfig, provideNzConfig } from 'ng-zorro-antd/core/config';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { importProvidersFrom } from '@angular/core';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';
import { AppComponent } from './app/app.component';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { MenuOutline, ArrowUpOutline, ArrowDownOutline } from '@ant-design/icons-angular/icons';


// AoT requires an exported function for factories
export function HttpLoaderFactory(http: HttpClient) {
  return new TranslateHttpLoader(http, './assets/i18n/', '.json');
}

const ngZorroConfig: NzConfig = {
  theme: {
    primaryColor: '#23433d'
  }
};

bootstrapApplication(AppComponent, {
  providers: [
    provideRouter(routes),
    provideAnimations(),
    provideNzConfig(ngZorroConfig),
    importProvidersFrom(
      HttpClientModule,
      NzIconModule.forRoot([MenuOutline, ArrowUpOutline, ArrowDownOutline]),
      TranslateModule.forRoot({
        loader: {
          provide: TranslateLoader,
          useFactory: HttpLoaderFactory,
          deps: [HttpClient]
        }
      })
    )
  ]
}).catch(err => console.error(err));