import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NzLayoutModule } from 'ng-zorro-antd/layout';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzSpaceModule } from 'ng-zorro-antd/space';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
  standalone: true,
  imports: [
    RouterOutlet,
    NzLayoutModule,
    NzButtonModule,
    NzSpaceModule,
    TranslateModule
  ]
})
export class App {
  public isRtl: boolean;
  private translate = inject(TranslateService);

  constructor() {
    // Get browser language
    const browserLang = navigator.language;
    const defaultLang = browserLang.startsWith('ar') ? 'ar' : 'en';
    
    // Set initial RTL state based on language
    this.isRtl = defaultLang === 'ar';
    document.documentElement.dir = this.isRtl ? 'rtl' : 'ltr';

    // Set up translations
    this.translate.setDefaultLang('en');
    this.translate.use(defaultLang);
  }

  toggleLanguage() {
    this.isRtl = !this.isRtl;
    document.documentElement.dir = this.isRtl ? 'rtl' : 'ltr';
    this.translate.use(this.isRtl ? 'ar' : 'en');
  }
}