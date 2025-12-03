import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { appConfig } from './app/app.config';

console.log('📍 main.ts: Bootstrapping application');

bootstrapApplication(AppComponent, appConfig)
  .catch(err => console.error('Bootstrap error:', err));
