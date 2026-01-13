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
    // Tunnel routes requests through our backend to bypass ad blockers
    ...(environment.sentry.tunnel && { tunnel: environment.sentry.tunnel }),
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
  .catch(err => {
    console.error('Bootstrap error:', err);

    // Detect stale chunk errors (syntax error from HTML response or chunk load failure)
    // This happens when cached JS filenames no longer exist after deployment
    const isChunkError = err.message && (
      err.message.includes('Loading chunk') ||
      err.message.includes('ChunkLoadError') ||
      err.message.includes("expected expression, got '<'") ||
      err.message.includes('Unexpected token')
    );

    if (isChunkError) {
      // Clear service worker cache and unregister workers
      if ('caches' in window) {
        caches.keys().then(names => names.forEach(name => caches.delete(name)));
      }
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations()
          .then(regs => regs.forEach(reg => reg.unregister()));
      }
      // Silent reload - user just sees page refresh with fresh assets
      window.location.reload();
    }
  });
