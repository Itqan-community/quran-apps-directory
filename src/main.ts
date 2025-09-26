import { bootstrapApplication, provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { appConfig } from './app/app.config';
import { mergeApplicationConfig } from '@angular/core';

const clientConfig = mergeApplicationConfig(appConfig, {
  providers: [
    provideClientHydration(withEventReplay())
  ]
});

bootstrapApplication(AppComponent, clientConfig)
  .catch(err => console.error(err));