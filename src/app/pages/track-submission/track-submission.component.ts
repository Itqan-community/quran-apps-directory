import { Component, OnInit, OnDestroy } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subject, takeUntil } from 'rxjs';

import { NzInputModule } from 'ng-zorro-antd/input';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzResultModule } from 'ng-zorro-antd/result';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzTimelineModule } from 'ng-zorro-antd/timeline';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzTabsModule } from 'ng-zorro-antd/tabs';

import { SubmissionService, SubmissionStatus, SubmissionListItem } from '../../services/submission.service';

@Component({
  selector: 'app-track-submission',
  standalone: true,
  imports: [
    FormsModule,
    RouterLink,
    TranslateModule,
    NzInputModule,
    NzButtonModule,
    NzCardModule,
    NzResultModule,
    NzSpinModule,
    NzIconModule,
    NzAlertModule,
    NzTimelineModule,
    NzTagModule,
    NzDividerModule,
    NzEmptyModule,
    NzTabsModule
],
  templateUrl: './track-submission.component.html',
  styleUrls: ['./track-submission.component.scss']
})
export class TrackSubmissionComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // Search
  searchMode: 'tracking' | 'email' = 'tracking';
  trackingId = '';
  email = '';

  // Results
  isLoading = false;
  error = '';
  submission: SubmissionStatus | null = null;
  submissions: SubmissionListItem[] = [];

  currentLang: 'en' | 'ar' = 'en';

  constructor(
    private route: ActivatedRoute,
    private submissionService: SubmissionService,
    private translate: TranslateService,
  ) {}

  ngOnInit(): void {
    this.currentLang = (this.translate.currentLang as 'en' | 'ar') || 'en';

    this.translate.onLangChange
      .pipe(takeUntil(this.destroy$))
      .subscribe(event => {
        this.currentLang = event.lang as 'en' | 'ar';
      });

    // Check for tracking ID in query params
    this.route.queryParams
      .pipe(takeUntil(this.destroy$))
      .subscribe(params => {
        if (params['id']) {
          this.trackingId = params['id'];
          this.searchByTrackingId();
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onTabChange(index: number): void {
    this.searchMode = index === 0 ? 'tracking' : 'email';
    this.error = '';
    this.submission = null;
    this.submissions = [];
  }

  searchByTrackingId(): void {
    if (!this.trackingId.trim()) {
      this.error = this.currentLang === 'ar'
        ? 'يرجى إدخال رقم التتبع'
        : 'Please enter a tracking ID';
      return;
    }

    this.isLoading = true;
    this.error = '';
    this.submission = null;

    this.submissionService.trackSubmission(this.trackingId.trim().toUpperCase())
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result) => {
          this.submission = result;
          this.isLoading = false;
        },
        error: (err) => {
          this.error = err;
          this.isLoading = false;
        }
      });
  }

  searchByEmail(): void {
    if (!this.email.trim() || !this.email.includes('@')) {
      this.error = this.currentLang === 'ar'
        ? 'يرجى إدخال بريد إلكتروني صحيح'
        : 'Please enter a valid email address';
      return;
    }

    this.isLoading = true;
    this.error = '';
    this.submissions = [];

    this.submissionService.trackByEmail(this.email.trim())
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (results) => {
          this.submissions = results;
          this.isLoading = false;
        },
        error: (err) => {
          this.error = err;
          this.isLoading = false;
        }
      });
  }

  getStatusColor(status: string): string {
    const colors: Record<string, string> = {
      pending: 'gold',
      under_review: 'blue',
      info_requested: 'orange',
      approved: 'green',
      rejected: 'red',
    };
    return colors[status] || 'default';
  }

  getStatusIcon(status: string): string {
    const icons: Record<string, string> = {
      pending: 'clock-circle',
      under_review: 'eye',
      info_requested: 'question-circle',
      approved: 'check-circle',
      rejected: 'close-circle',
    };
    return icons[status] || 'info-circle';
  }

  getAppName(item: SubmissionStatus | SubmissionListItem): string {
    return this.currentLang === 'ar' ? item.app_name_ar : item.app_name_en;
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString(
      this.currentLang === 'ar' ? 'ar-SA' : 'en-US',
      { year: 'numeric', month: 'long', day: 'numeric' }
    );
  }

  selectSubmission(item: SubmissionListItem): void {
    this.trackingId = item.tracking_id;
    this.searchMode = 'tracking';
    this.searchByTrackingId();
  }
}
