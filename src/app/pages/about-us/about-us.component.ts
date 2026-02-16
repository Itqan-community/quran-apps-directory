import { Component, OnInit } from '@angular/core';

import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NzIconModule } from 'ng-zorro-antd/icon';

@Component({
  selector: 'app-about-us',
  standalone: true,
  imports: [TranslateModule, NzIconModule],
  templateUrl: './about-us.component.html',
  styleUrls: ['./about-us.component.scss']
})
export class AboutUsComponent implements OnInit {
  currentLang: 'ar' | 'en' = 'ar';

  constructor(private translateService: TranslateService) { }

  ngOnInit() {
    this.currentLang = this.translateService.currentLang as 'ar' | 'en';
    
    // Subscribe to language changes
    this.translateService.onLangChange.subscribe((event) => {
      this.currentLang = event.lang as 'ar' | 'en';
    });
  }
} 