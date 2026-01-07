export const environment = {
  production: false,
  staging: false,
  development: true,
  appName: 'Quran Apps Directory (Dev)',
  appUrl: 'http://localhost:4200',
  apiUrl: 'http://localhost:8000/api',
  apiVersion: 'v1',
  version: '1.0.1-dev',
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
    environment: 'development',
    tracesSampleRate: 1.0,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0
  }
};