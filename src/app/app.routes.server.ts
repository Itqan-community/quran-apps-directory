import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  // Prerender home pages (English and Arabic) at build time
  {
    path: 'en',
    renderMode: RenderMode.Prerender
  },
  {
    path: 'ar',
    renderMode: RenderMode.Prerender
  },
  // All other routes render on client (SPA)
  {
    path: '**',
    renderMode: RenderMode.Client
  }
];
