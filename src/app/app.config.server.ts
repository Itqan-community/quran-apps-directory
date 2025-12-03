import { ApplicationConfig, mergeApplicationConfig, importProvidersFrom, APP_INITIALIZER, ErrorHandler, Injectable } from '@angular/core';
import { provideServerRendering } from '@angular/platform-server';
import { provideServerRoutesConfig } from '@angular/ssr';
import { TranslateModule, TranslateLoader, TranslateService } from '@ngx-translate/core';
import { appConfig } from './app.config';
import { serverRoutes } from './app.routes.server';
import { translateServerLoaderFactory } from './services/translate-server-loader';

// Server-side translation initializer that doesn't rely on browser APIs
export function serverInitializeTranslations(translate: TranslateService): () => Promise<void> {
  return async () => {
    translate.setDefaultLang('en');
    try {
      await translate.use('en').toPromise();
    } catch (error) {
      console.warn('[SSR] Translation load failed, using defaults');
    }
  };
}

@Injectable({ providedIn: 'root' })
class ServerErrorHandler implements ErrorHandler {
  handleError(error: Error): void {
    console.error('[SSR] Error caught:', error);
  }
}

const serverConfig: ApplicationConfig = {
  providers: [
    provideServerRendering(),
    provideServerRoutesConfig(serverRoutes),
    {
      provide: ErrorHandler,
      useClass: ServerErrorHandler
    },
    // Override APP_INITIALIZER for server
    {
      provide: APP_INITIALIZER,
      useFactory: serverInitializeTranslations,
      deps: [TranslateService],
      multi: true
    },
    // Override the TranslateModule with server-safe loader
    importProvidersFrom(
      TranslateModule.forRoot({
        loader: {
          provide: TranslateLoader,
          useFactory: translateServerLoaderFactory
        }
      })
    )
  ]
};

export const config = mergeApplicationConfig(appConfig, serverConfig);
