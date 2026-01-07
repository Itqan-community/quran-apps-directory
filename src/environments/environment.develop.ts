export const environment = {
  production: false,
  staging: false,
  development: true,
  appName: 'Quran Apps Directory (Dev)',
  appUrl: 'https://quran-apps-directory-frontend.pages.dev',
  // Update this with the actual Railway dev service URL
  apiUrl: 'https://qad-backend-api-develop.up.railway.app/api',
  version: '1.0.0-dev',
  analytics: {
    enabled: false,
    trackingId: ''
  },
  features: {
    debugMode: true,
    logging: true,
    showDevBanner: true,
    enableServiceWorker: false
  },
  sentry: {
    enabled: false,
    dsn: '',
    tunnel: '',
    environment: 'develop',
    tracesSampleRate: 1.0,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0
  }
};
