import { bootstrapApplication } from '@angular/platform-browser';
import * as Sentry from '@sentry/angular';
import { AppComponent } from './app/app.component';
import { appConfig } from './app/app.config';
import { environment } from './environments/environment';

// Initialize Sentry before Angular bootstraps
if (environment.sentry.enabled && environment.sentry.dsn) {
  Sentry.init({
    dsn: environment.sentry.dsn,
    environment: environment.sentry.environment,
    release: `quran-apps-directory@${environment.version}`,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: false,
        blockAllMedia: false,
      }),
    ],
    tracesSampleRate: environment.sentry.tracesSampleRate,
    replaysSessionSampleRate: environment.sentry.replaysSessionSampleRate,
    replaysOnErrorSampleRate: environment.sentry.replaysOnErrorSampleRate,
  });
}

console.log('📍 main.ts: Bootstrapping application');

bootstrapApplication(AppComponent, appConfig)
  .catch(err => console.error('Bootstrap error:', err));
