export const environment = {
  production: true,
  staging: false,
  development: false,
  appName: 'Quran Apps Directory',
  appUrl: 'https://dev.quran-apps.itqan.dev',
  apiUrl: 'https://dev.api.quran-apps.itqan.dev/api',
  version: '1.0.0',
  analytics: {
    enabled: true,
    trackingId: 'G-XXXXXXXXXX' // Replace with actual GA4 tracking ID
  },
  features: {
    debugMode: false,
    logging: false,
    showStagingBanner: false,
    enableServiceWorker: true
  }
};
