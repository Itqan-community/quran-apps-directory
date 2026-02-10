import { Component, OnInit, OnDestroy } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subject, takeUntil, of, Observable, from, Subscription } from 'rxjs';
import { catchError, map, tap, toArray, mergeMap } from 'rxjs/operators';

import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzUploadModule, NzUploadFile, NzUploadXHRArgs } from 'ng-zorro-antd/upload';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalService, NzModalModule } from 'ng-zorro-antd/modal';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { NzProgressModule } from 'ng-zorro-antd/progress';

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
  main_image_en: string;
  main_image_ar: string;
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
    NzProgressModule
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
    main_image_en: '',
    main_image_ar: '',
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
  isUploading = false;
  uploadProgress = 0;
  totalUploads = 0;
  completedUploads = 0;
  currentLang: 'en' | 'ar' = 'en';

  // Icon upload state
  iconFileList: NzUploadFile[] = [];
  iconUploading = false;
  iconUploadError: string | null = null;
  private iconUploadSubscription: Subscription | null = null;

  // Icon validation constants
  readonly MAX_ICON_SIZE = 512 * 1024; // 512 KB
  readonly ALLOWED_ICON_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

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
    if (this.iconUploadSubscription) {
      this.iconUploadSubscription.unsubscribe();
    }
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

  /**
   * Client-side validation before icon upload
   */
  beforeIconUpload = (file: NzUploadFile): boolean => {
    this.iconUploadError = null;

    // Check file type
    const isAllowedType = this.ALLOWED_ICON_TYPES.includes(file.type || '');
    if (!isAllowedType) {
      const errorMsg = this.translate.instant('submitApp.iconTypeError');
      this.iconUploadError = errorMsg;
      this.message.error(errorMsg);
      return false;
    }

    // Check file size
    const isWithinSize = (file.size || 0) <= this.MAX_ICON_SIZE;
    if (!isWithinSize) {
      const errorMsg = this.translate.instant('submitApp.iconSizeError');
      this.iconUploadError = errorMsg;
      this.message.error(errorMsg);
      return false;
    }

    return true;
  };

  /**
   * Custom upload handler for icon file
   */
  customIconUpload = (item: NzUploadXHRArgs): Subscription => {
    this.iconUploading = true;
    this.iconUploadError = null;

    const file = item.file as unknown as File;

    this.iconUploadSubscription = this.submissionService.uploadMedia(file, 'icon')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.iconUploading = false;
          this.formData.app_icon_url = response.url;
          this.iconFileList = [{
            uid: '-1',
            name: file.name,
            status: 'done',
            url: response.url,
            thumbUrl: response.url
          }];
          this.message.success(this.translate.instant('submitApp.iconUploadSuccess'));
          if (item.onSuccess) {
            item.onSuccess(response, item.file, null);
          }
        },
        error: (error) => {
          this.iconUploading = false;
          const errorMsg = this.translate.instant('submitApp.iconUploadError');
          this.iconUploadError = errorMsg;
          this.message.error(errorMsg);
          if (item.onError) {
            item.onError(error, item.file);
          }
        }
      });

    return this.iconUploadSubscription;
  };

  /**
   * Handle icon removal
   */
  onIconRemove = (): boolean => {
    this.formData.app_icon_url = '';
    this.iconFileList = [];
    this.iconUploadError = null;
    return true;
  };

  isFormValid(): boolean {
    // Required fields
    if (!this.formData.submitter_name || !this.formData.submitter_email) return false;
    if (!this.formData.app_name_en || !this.formData.app_name_ar) return false;
    if (!this.formData.short_description_en || !this.formData.short_description_ar) return false;
    if (!this.formData.developer_name_en) return false;
    if (!this.hasStoreLink) return false;
    if (this.formData.categories.length === 0) return false;
    if (!this.formData.app_icon_url) return false;
    if (!this.formData.main_image_en || !this.formData.main_image_ar) return false;
    if (this.formData.screenshots_en.length === 0) return false;
    if (this.formData.screenshots_ar.length === 0) return false;
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

    // First, upload all images to R2, then submit the form
    this.uploadAllImages().pipe(takeUntil(this.destroy$)).subscribe({
      next: (uploadedUrls) => {
        // Create request with R2 URLs
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
          app_icon_url: uploadedUrls.icon_url,
          main_image_en: uploadedUrls.main_image_en,
          main_image_ar: uploadedUrls.main_image_ar,
          screenshots_en: uploadedUrls.screenshots_en,
          screenshots_ar: uploadedUrls.screenshots_ar,
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
      },
      error: (error) => {
        this.isSubmitting = false;
        this.message.error(
          this.currentLang === 'ar'
            ? 'فشل في رفع الصور. يرجى المحاولة مرة أخرى.'
            : 'Failed to upload images. Please try again.'
        );
        console.error('Image upload error:', error);
      }
    });
  }

  private uploadAllImages(): Observable<{
    icon_url: string;
    main_image_en: string;
    main_image_ar: string;
    screenshots_en: string[];
    screenshots_ar: string[];
  }> {
    interface UploadTask {
      key: string;
      index?: number;
      url: string;
      mediaType: 'icon' | 'screenshot_en' | 'screenshot_ar';
    }

    const uploadTasks: UploadTask[] = [];

    // Collect all upload tasks
    if (this.formData.app_icon_url && this.isExternalUrl(this.formData.app_icon_url)) {
      uploadTasks.push({ key: 'icon', url: this.formData.app_icon_url, mediaType: 'icon' });
    }
    if (this.formData.main_image_en && this.isExternalUrl(this.formData.main_image_en)) {
      uploadTasks.push({ key: 'main_en', url: this.formData.main_image_en, mediaType: 'screenshot_en' });
    }
    if (this.formData.main_image_ar && this.isExternalUrl(this.formData.main_image_ar)) {
      uploadTasks.push({ key: 'main_ar', url: this.formData.main_image_ar, mediaType: 'screenshot_ar' });
    }
    this.formData.screenshots_en.forEach((url, index) => {
      if (this.isExternalUrl(url)) {
        uploadTasks.push({ key: 'screenshot_en', index, url, mediaType: 'screenshot_en' });
      }
    });
    this.formData.screenshots_ar.forEach((url, index) => {
      if (this.isExternalUrl(url)) {
        uploadTasks.push({ key: 'screenshot_ar', index, url, mediaType: 'screenshot_ar' });
      }
    });

    // If no uploads needed, return original URLs immediately
    if (uploadTasks.length === 0) {
      return of({
        icon_url: this.formData.app_icon_url,
        main_image_en: this.formData.main_image_en,
        main_image_ar: this.formData.main_image_ar,
        screenshots_en: this.formData.screenshots_en,
        screenshots_ar: this.formData.screenshots_ar,
      });
    }

    // Initialize progress tracking
    this.isUploading = true;
    this.totalUploads = uploadTasks.length;
    this.completedUploads = 0;
    this.uploadProgress = 0;

    // Process uploads concurrently (3 at a time to avoid overwhelming the server)
    return from(uploadTasks).pipe(
      mergeMap((task) =>
        this.submissionService.uploadFromUrl(task.url, task.mediaType).pipe(
          tap(() => {
            this.completedUploads++;
            this.uploadProgress = Math.round((this.completedUploads / this.totalUploads) * 100);
          }),
          map((result) => ({ ...task, uploadedUrl: result.url })),
          catchError(() => {
            this.completedUploads++;
            this.uploadProgress = Math.round((this.completedUploads / this.totalUploads) * 100);
            return of({ ...task, uploadedUrl: task.url }); // Fallback to original URL
          })
        ),
        3 // Concurrency limit
      ),
      toArray(),
      tap(() => {
        this.isUploading = false;
      }),
      map((results) => {
        let iconUrl = this.formData.app_icon_url;
        let mainImageEn = this.formData.main_image_en;
        let mainImageAr = this.formData.main_image_ar;
        const screenshotsEn = [...this.formData.screenshots_en];
        const screenshotsAr = [...this.formData.screenshots_ar];

        results.forEach((result) => {
          if (result.key === 'icon') {
            iconUrl = result.uploadedUrl;
          } else if (result.key === 'main_en') {
            mainImageEn = result.uploadedUrl;
          } else if (result.key === 'main_ar') {
            mainImageAr = result.uploadedUrl;
          } else if (result.key === 'screenshot_en' && result.index !== undefined) {
            screenshotsEn[result.index] = result.uploadedUrl;
          } else if (result.key === 'screenshot_ar' && result.index !== undefined) {
            screenshotsAr[result.index] = result.uploadedUrl;
          }
        });

        return {
          icon_url: iconUrl,
          main_image_en: mainImageEn,
          main_image_ar: mainImageAr,
          screenshots_en: screenshotsEn,
          screenshots_ar: screenshotsAr,
        };
      })
    );
  }

  private isExternalUrl(url: string): boolean {
    if (!url) return false;
    // Check if it's already an R2 URL (already uploaded)
    const r2Domain = 'r2.dev';
    if (url.includes(r2Domain)) return false;
    // Check if it's an external HTTP/HTTPS URL
    return url.startsWith('http://') || url.startsWith('https://');
  }

  private showSuccessModal(trackingId: string): void {
    const isArabic = this.currentLang === 'ar';

    // Get translations using instant() for use in template strings
    const title = this.translate.instant('submitApp.success.title');
    const message = this.translate.instant('submitApp.success.message');
    const trackingIdLabel = this.translate.instant('submitApp.success.trackingId');
    const trackingIdNote = this.translate.instant('submitApp.success.trackingIdNote');
    const trackSubmission = this.translate.instant('submitApp.success.trackSubmission');
    const submitAnother = this.translate.instant('submitApp.success.submitAnother');
    const emailConfirmation = isArabic
      ? 'سيتم إرسال رقم التتبع إلى بريدك الإلكتروني'
      : 'A confirmation email with your tracking ID has been sent';
    const clickToCopy = isArabic ? 'انقر للنسخ' : 'Click to copy';
    const copiedText = isArabic ? 'تم النسخ!' : 'Copied!';

    this.modal.success({
      nzTitle: '',
      nzContent: `
        <div style="text-align: center; padding: 40px 20px;">
          <!-- Success Icon -->
          <div style="margin-bottom: 25px;">
            <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" style="margin: 0 auto;">
              <circle cx="40" cy="40" r="38" fill="#e8f5e9" stroke="#4caf50" stroke-width="3"/>
              <path d="M25 40l10 10 20-20" stroke="#4caf50" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>

          <!-- Title -->
          <h2 style="margin: 0 0 20px 0; font-size: 28px; font-weight: 700; color: #1a1a1a;">
            ${title}
          </h2>

          <!-- Message -->
          <p style="margin: 0 0 30px 0; font-size: 16px; color: #666; line-height: 1.6;">
            ${message}
          </p>

          <!-- Tracking ID Box -->
          <div style="background: linear-gradient(135deg, #fdf2f0 0%, #fff5f2 100%); border: 2px solid #e8b8a8; border-radius: 12px; padding: 25px; margin: 30px 0;">
            <p style="margin: 0 0 12px 0; font-size: 14px; color: #888; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
              ${trackingIdLabel}
            </p>
            <div
              id="tracking-id-copy"
              onclick="navigator.clipboard.writeText('${trackingId}').then(() => { this.querySelector('.copy-hint').textContent = '${copiedText}'; setTimeout(() => { this.querySelector('.copy-hint').textContent = '${clickToCopy}'; }, 2000); })"
              style="font-size: 32px; font-weight: 800; color: #a0533b; font-family: 'Monaco', 'Courier New', monospace; letter-spacing: 2px; word-break: break-all; cursor: pointer; transition: transform 0.1s;"
              onmouseover="this.style.transform='scale(1.02)'"
              onmouseout="this.style.transform='scale(1)'"
            >
              ${trackingId}
              <div class="copy-hint" style="font-size: 12px; color: #888; font-weight: 400; margin-top: 8px; letter-spacing: 0;">
                ${clickToCopy}
              </div>
            </div>
          </div>

          <!-- Note -->
          <div style="background: #f5f5f5; border-radius: 8px; padding: 15px; margin: 20px 0; border-left: 4px solid #a0533b;">
            <p style="margin: 0; font-size: 14px; color: #555; line-height: 1.6;">
              <strong style="color: #a0533b;">${trackingIdNote}</strong>
            </p>
          </div>

          <!-- Email Confirmation -->
          <p style="margin: 20px 0 0 0; font-size: 13px; color: #999;">
            ✓ ${emailConfirmation}
          </p>
        </div>
      `,
      nzWidth: 500,
      nzCentered: true,
      nzClosable: false,
      nzMaskClosable: false,
      nzOkText: trackSubmission,
      nzCancelText: submitAnother,
      nzOnOk: () => {
        this.router.navigate([`/${this.currentLang}/track-submission`], {
          queryParams: { id: trackingId }
        });
      },
      nzOnCancel: () => {
        this.router.navigate([`/${this.currentLang}/submit-app`]);
      }
    });
  }
}
