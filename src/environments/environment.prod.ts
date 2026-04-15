export const environment = {
  production: true,
  staging: false,
  development: false,
  appName: 'Quran Apps Directory',
  appUrl: 'https://quran-apps.itqan.dev',
  apiUrl: 'https://qad-backend-api-production.up.railway.app/api',
  version: '1.0.0',
  analytics: {
    enabled: true,
    trackingId: 'G-XXXXXXXXXX' // Replace with actual GA4 tracking ID
  },
  features: {
    debugMode: false,
    logging: false,
    showStagingBanner: false,
    enableServiceWorker: false
  },
  sentry: {
    enabled: true,
    dsn: 'https://10ae32f7f36add568917f16d53562358@o4510669335232512.ingest.de.sentry.io/4510669357842512',
    tunnel: 'https://qad-backend-api-production.up.railway.app/api/sentry-tunnel/',
    environment: 'production',
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0
  }
};
