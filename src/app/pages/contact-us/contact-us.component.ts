import { Component } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-contact-us',
  standalone: true,
  imports: [TranslateModule, RouterLink],
  templateUrl: './contact-us.component.html',
  styleUrls: ['./contact-us.component.scss']
})
export class ContactUsComponent {
  currentLang: 'en' | 'ar';

  constructor(route: ActivatedRoute, translate: TranslateService) {
    const routeLang = route.snapshot.paramMap.get('lang');
    this.currentLang = (routeLang as 'en' | 'ar') || (translate.currentLang as 'en' | 'ar') || 'en';
  }
} 