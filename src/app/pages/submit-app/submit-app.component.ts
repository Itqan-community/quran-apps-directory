import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subject, takeUntil } from 'rxjs';

import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzUploadModule, NzUploadFile, NzUploadChangeParam } from 'ng-zorro-antd/upload';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalService, NzModalModule } from 'ng-zorro-antd/modal';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';

import { SubmissionService, SubmissionRequest, Category } from '../../services/submission.service';

interface FormData {
  // Contact
  submitter_name: string;
  submitter_email: string;
  submitter_phone: string;
  submitter_organization: string;
  is_developer: boolean;

  // App Details
  app_name_en: string;
  app_name_ar: string;
  short_description_en: string;
  short_description_ar: string;
  description_en: string;
  description_ar: string;

  // Store Links
  google_play_link: string;
  app_store_link: string;
  app_gallery_link: string;
  website_link: string;

  // Categories
  categories: number[];

  // Developer
  developer_name_en: string;
  developer_name_ar: string;
  developer_website: string;
  developer_email: string;

  // Media
  app_icon_url: string;
  icon_input_mode: 'file' | 'url';
  icon_url_input: string;
  screenshots_en: string[];
  screenshots_ar: string[];
  screenshots_en_input: string;
  screenshots_ar_input: string;

  // Additional
  additional_notes: string;
  content_confirmation: boolean;
}

@Component({
  selector: 'app-submit-app',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    TranslateModule,
    NzFormModule,
    NzInputModule,
    NzButtonModule,
    NzCheckboxModule,
    NzSelectModule,
    NzUploadModule,
    NzModalModule,
    NzIconModule,
    NzSpinModule,
    NzAlertModule,
    NzCardModule,
    NzDividerModule,
    NzGridModule,
    NzToolTipModule,
  ],
  templateUrl: './submit-app.component.html',
  styleUrls: ['./submit-app.component.scss']
})
export class SubmitAppComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  formData: FormData = {
    submitter_name: '',
    submitter_email: '',
    submitter_phone: '',
    submitter_organization: '',
    is_developer: false,
    app_name_en: '',
    app_name_ar: '',
    short_description_en: '',
    short_description_ar: '',
    description_en: '',
    description_ar: '',
    google_play_link: '',
    app_store_link: '',
    app_gallery_link: '',
    website_link: '',
    categories: [],
    developer_name_en: '',
    developer_name_ar: '',
    developer_website: '',
    developer_email: '',
    app_icon_url: '',
    icon_input_mode: 'url',
    icon_url_input: '',
    screenshots_en: [],
    screenshots_ar: [],
    screenshots_en_input: '',
    screenshots_ar_input: '',
    additional_notes: '',
    content_confirmation: false,
  };

  categories: Category[] = [];
  isLoading = false;
  isSubmitting = false;
  currentLang: 'en' | 'ar' = 'en';
  iconFileList: NzUploadFile[] = [];

  constructor(
    private submissionService: SubmissionService,
    private translate: TranslateService,
    private message: NzMessageService,
    private modal: NzModalService,
    private router: Router,
    private route: ActivatedRoute,
  ) {}

  ngOnInit(): void {
    // Start with loading state
    this.isLoading = true;

    // Get language from route parameter to avoid race condition
    const routeLang = this.route.snapshot.paramMap.get('lang');
    this.currentLang = (routeLang as 'en' | 'ar') || (this.translate.currentLang as 'en' | 'ar') || 'en';

    // Ensure TranslateService uses the correct language and wait for translations to load
    const langToUse = routeLang || this.currentLang;
    this.translate.use(langToUse).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        // Translations are now loaded
        this.loadCategories();
      },
      error: () => {
        // Even on error, try to load categories
        this.loadCategories();
      }
    });

    this.translate.onLangChange
      .pipe(takeUntil(this.destroy$))
      .subscribe(event => {
        this.currentLang = event.lang as 'en' | 'ar';
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadCategories(): void {
    this.isLoading = true;
    this.submissionService.getCategories()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (categories) => {
          this.categories = categories;
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Failed to load categories:', error);
          this.message.error('Failed to load categories. Please refresh the page.');
          this.isLoading = false;
        }
      });
  }

  getCategoryName(category: Category): string {
    return this.currentLang === 'ar' ? category.name_ar : category.name_en;
  }

  get hasStoreLink(): boolean {
    return !!(this.formData.google_play_link || this.formData.app_store_link);
  }

  get shortDescEnCount(): number {
    return this.formData.short_description_en?.length || 0;
  }

  get shortDescArCount(): number {
    return this.formData.short_description_ar?.length || 0;
  }

  parseScreenshots(input: string): string[] {
    if (!input) return [];
    return input.split('\n')
      .map(url => url.trim())
      .filter(url => url.startsWith('http'));
  }

  onScreenshotsEnChange(): void {
    this.formData.screenshots_en = this.parseScreenshots(this.formData.screenshots_en_input);
  }

  onScreenshotsArChange(): void {
    this.formData.screenshots_ar = this.parseScreenshots(this.formData.screenshots_ar_input);
  }

  onIconFileChange(info: NzUploadChangeParam): void {
    if (info.file.status === 'done') {
      this.formData.app_icon_url = info.file.response?.url || '';
      this.message.success('Icon uploaded successfully');
    } else if (info.file.status === 'error') {
      this.message.error('Icon upload failed');
    }
  }

  useIconUrl(): void {
    if (this.formData.icon_url_input) {
      this.formData.app_icon_url = this.formData.icon_url_input;
    }
  }

  isFormValid(): boolean {
    // Required fields
    if (!this.formData.submitter_name || !this.formData.submitter_email) return false;
    if (!this.formData.app_name_en || !this.formData.app_name_ar) return false;
    if (!this.formData.short_description_en || !this.formData.short_description_ar) return false;
    if (!this.formData.developer_name_en) return false;
    if (!this.hasStoreLink) return false;
    if (this.formData.categories.length === 0) return false;
    if (!this.formData.content_confirmation) return false;

    return true;
  }

  onSubmit(): void {
    if (!this.isFormValid()) {
      this.message.warning(
        this.currentLang === 'ar'
          ? 'يرجى ملء جميع الحقول المطلوبة'
          : 'Please fill in all required fields'
      );
      return;
    }

    this.isSubmitting = true;

    const request: SubmissionRequest = {
      submitter_name: this.formData.submitter_name,
      submitter_email: this.formData.submitter_email,
      submitter_phone: this.formData.submitter_phone,
      submitter_organization: this.formData.submitter_organization,
      is_developer: this.formData.is_developer,
      app_name_en: this.formData.app_name_en,
      app_name_ar: this.formData.app_name_ar,
      short_description_en: this.formData.short_description_en,
      short_description_ar: this.formData.short_description_ar,
      description_en: this.formData.description_en,
      description_ar: this.formData.description_ar,
      google_play_link: this.formData.google_play_link,
      app_store_link: this.formData.app_store_link,
      app_gallery_link: this.formData.app_gallery_link,
      website_link: this.formData.website_link,
      categories: this.formData.categories,
      developer_name_en: this.formData.developer_name_en,
      developer_name_ar: this.formData.developer_name_ar,
      developer_website: this.formData.developer_website,
      developer_email: this.formData.developer_email,
      app_icon_url: this.formData.app_icon_url,
      screenshots_en: this.formData.screenshots_en,
      screenshots_ar: this.formData.screenshots_ar,
      additional_notes: this.formData.additional_notes,
      content_confirmation: this.formData.content_confirmation,
    };

    this.submissionService.submitApp(request)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.isSubmitting = false;
          this.showSuccessModal(response.tracking_id);
        },
        error: (error) => {
          this.isSubmitting = false;
          this.message.error(error || 'Failed to submit. Please try again.');
        }
      });
  }

  private showSuccessModal(trackingId: string): void {
    const isArabic = this.currentLang === 'ar';

    this.modal.success({
      nzTitle: isArabic ? 'تم استلام طلبك!' : 'Submission Received!',
      nzContent: `
        <div style="text-align: center; padding: 20px 0;">
          <p>${isArabic ? 'شكراً لإرسال تطبيقك. رقم التتبع الخاص بك هو:' : 'Thank you for submitting your app. Your tracking ID is:'}</p>
          <div style="font-size: 24px; font-weight: bold; color: #a0533b; background: #fdf2f0; padding: 15px; border-radius: 8px; margin: 15px 0;">
            ${trackingId}
          </div>
          <p style="font-size: 14px; color: #666;">
            ${isArabic ? 'احفظ هذا الرقم لتتبع حالة طلبك. سنرسل لك تحديثات عبر البريد الإلكتروني.' : 'Save this ID to track your submission status. We will send you updates via email.'}
          </p>
        </div>
      `,
      nzOkText: isArabic ? 'حسناً' : 'OK',
      nzOnOk: () => {
        this.router.navigate([`/${this.currentLang}/track-submission`], {
          queryParams: { id: trackingId }
        });
      }
    });
  }
}
