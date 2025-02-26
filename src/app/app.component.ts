import { Component, inject } from "@angular/core";
import { RouterOutlet, RouterLink } from "@angular/router";
import { NzLayoutModule } from "ng-zorro-antd/layout";
import { NzButtonModule } from "ng-zorro-antd/button";
import { NzSpaceModule } from "ng-zorro-antd/space";
import { TranslateModule, TranslateService } from "@ngx-translate/core";
import { NzIconModule } from "ng-zorro-antd/icon";
import { MenuOutline } from '@ant-design/icons-angular/icons';

// Import what icons you need
const icons = [MenuOutline];

@Component({
  selector: "app-root",
  templateUrl: "./app.component.html",
  styleUrls: ["./app.component.scss"],
  standalone: true,
  imports: [
    RouterOutlet,
    RouterLink,
    NzLayoutModule,
    NzButtonModule,
    NzSpaceModule,
    TranslateModule,
    NzIconModule,
  ],
})
export class App {
  public isRtl: boolean;
  public isMobileMenuVisible = false;
  private translate = inject(TranslateService);

  constructor() {
    // Get browser language
    const browserLang = navigator.language;
    const defaultLang = browserLang.startsWith("ar") ? "ar" : "en";

    // Set initial RTL state based on language
    this.isRtl = defaultLang === "ar";
    document.documentElement.dir = this.isRtl ? "rtl" : "ltr";

    // Set up translations
    this.translate.setDefaultLang(defaultLang);
    this.translate.use(defaultLang);
  }

  toggleLanguage() {
    this.isRtl = !this.isRtl;
    document.documentElement.dir = this.isRtl ? "rtl" : "ltr";
    this.translate.use(this.isRtl ? "ar" : "en");
  }

  toggleMobileMenu() {
    this.isMobileMenuVisible = !this.isMobileMenuVisible;
  }
}
