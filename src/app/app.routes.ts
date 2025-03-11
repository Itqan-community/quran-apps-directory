import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: ':lang', loadComponent: () => import('./pages/app-list/app-list.component').then(m => m.AppListComponent) },
  { path: ':lang/app/:id', loadComponent: () => import('./pages/app-detail/app-detail.component').then(m => m.AppDetailComponent) },
  { path: ':lang/request', loadComponent: () => import('./pages/request-form/request-form.component').then(m => m.RequestFormComponent) },
  { path: ':lang/about-us', loadComponent: () => import('./pages/about-us/about-us.component').then(m => m.AboutUsComponent) },
  { path: ':lang/contact-us', loadComponent: () => import('./pages/contact-us/contact-us.component').then(m => m.ContactUsComponent) },
  { path: '**', redirectTo: '/en', pathMatch: 'full'}
];