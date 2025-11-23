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
  }
};
