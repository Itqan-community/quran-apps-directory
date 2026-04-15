import { Routes } from '@angular/router';
import { RAMADAN_MODE } from './guards/ramadan-redirect.guard';

export const routes: Routes = [
  // SEO and utility routes
  { path: 'robots.txt', redirectTo: '/assets/robots.txt' },

  // Specific routes MUST come before generic category route
  // Use exact path matching to prevent `:lang/:category` from matching developer routes
  {
    path: ':lang/developer/:developer',
    data: { title: 'Developer' },
    loadComponent: () => {
      console.log('⭐ Loading developer component');
      return import('./pages/developer/developer.component').then(m => {
        console.log('⭐ Developer component loaded successfully');
        return m.DeveloperComponent;
      }).catch(err => {
        console.error('❌ Failed to load developer component:', err);
        throw err;
      });
    }
  },
  {
    path: ':lang/app/:id',
    data: { title: 'App Detail' },
    loadComponent: () => import('./pages/app-detail/app-detail.component').then(m => m.AppDetailComponent)
  },
  {
    path: ':lang/request',
    data: { title: 'Request Form' },
    loadComponent: () => import('./pages/request-form/request-form.component').then(m => m.RequestFormComponent)
  },
  {
    path: ':lang/about-us',
    data: { title: 'About Us' },
    loadComponent: () => import('./pages/about-us/about-us.component').then(m => m.AboutUsComponent)
  },
  {
    path: ':lang/contact-us',
    data: { title: 'Contact Us' },
    loadComponent: () => import('./pages/contact-us/contact-us.component').then(m => m.ContactUsComponent)
  },
  {
    path: ':lang/submit-app',
    data: { title: 'Submit App' },
    loadComponent: () => import('./pages/submit-app/submit-app.component').then(m => m.SubmitAppComponent)
  },
  {
    path: ':lang/track-submission',
    data: { title: 'Track Submission' },
    loadComponent: () => import('./pages/track-submission/track-submission.component').then(m => m.TrackSubmissionComponent)
  },
  {
    path: ':lang/search-comparison',
    data: { title: 'Search Comparison', hideChrome: true },
    loadComponent: () => import('./pages/search-comparison/search-comparison.component').then(m => m.SearchComparisonComponent)
  },
  {
    path: ':lang/ramadan',
    data: { title: 'Ramadan 1447', hideFooter: true },
    loadComponent: () => import('./pages/ramadan/ramadan.component').then(m => m.RamadanComponent)
  },

  {
    path: ':lang/apps',
    data: { title: 'Apps' },
    loadComponent: () => import('./pages/app-list/app-list.component').then(m => m.AppListComponent)
  },

  // Generic category route (must come AFTER all specific routes)
  {
    path: ':lang/:category',
    data: { title: 'Category' },
    loadComponent: () => {
      console.log('⭐ Loading app-list component (category route)');
      return import('./pages/app-list/app-list.component').then(m => m.AppListComponent);
    }
  },

  // Home route - loads Ramadan page when RAMADAN_MODE is true, otherwise apps list
  {
    path: ':lang',
    data: { title: 'Home', ...(RAMADAN_MODE ? { hideFooter: true, hideLanguageToggle: true } : {}) },
    loadComponent: () => RAMADAN_MODE
      ? import('./pages/ramadan/ramadan.component').then(m => m.RamadanComponent)
      : import('./pages/app-list/app-list.component').then(m => m.AppListComponent)
  },
  { path: '**', redirectTo: '/ar', pathMatch: 'full'}
];