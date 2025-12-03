import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  // All routes - client-side only (SPA) for now
  { path: '**', renderMode: RenderMode.Client }
];
