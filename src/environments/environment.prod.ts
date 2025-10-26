export const environment = {
  production: true,
  staging: false,
  development: false,
  appName: 'Quran Apps Directory',
  appUrl: 'https://qad-frontend-production.up.railway.app',
  apiUrl: 'https://qad-api-production.up.railway.app/api',
  version: '1.0.0',
  analytics: {
    enabled: true,
    trackingId: 'G-XXXXXXXXXX' // Replace with actual GA4 tracking ID
  },
  features: {
    debugMode: false,
    logging: false,
    showStagingBanner: false
  }
};
