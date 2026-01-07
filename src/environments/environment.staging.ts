export const environment = {
  production: false,
  staging: true,
  development: false,
  appName: 'Quran Apps Directory (Staging)',
  appUrl: 'https://staging.quran-apps-directory-frontend.pages.dev',
  // Update this with the actual Railway staging service URL
  apiUrl: 'https://qad-backend-api-staging.up.railway.app/api',
  version: '1.0.0-staging',
  analytics: {
    enabled: false,
    trackingId: ''
  },
  features: {
    debugMode: true,
    logging: true,
    showStagingBanner: true,
    enableServiceWorker: false
  },
  sentry: {
    enabled: true,
    dsn: 'https://10ae32f7f36add568917f16d53562358@o4510669335232512.ingest.de.sentry.io/4510669357842512',
    tunnel: 'https://qad-backend-api-staging.up.railway.app/api/sentry-tunnel/',
    environment: 'staging',
    tracesSampleRate: 1.0,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0
  }
};
