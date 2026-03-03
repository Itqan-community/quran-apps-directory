import { Component, OnInit, OnDestroy } from '@angular/core';

import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-about-us',
  standalone: true,
  imports: [TranslateModule, NzIconModule],
  templateUrl: './about-us.component.html',
  styleUrls: ['./about-us.component.scss']
})
export class AboutUsComponent implements OnInit, OnDestroy {
  currentLang: 'ar' | 'en' = 'ar';
  private destroy$ = new Subject<void>();

  constructor(private translateService: TranslateService) { }

  ngOnInit() {
    this.currentLang = this.translateService.currentLang as 'ar' | 'en';

    this.translateService.onLangChange.pipe(takeUntil(this.destroy$)).subscribe((event) => {
      this.currentLang = event.lang as 'ar' | 'en';
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
