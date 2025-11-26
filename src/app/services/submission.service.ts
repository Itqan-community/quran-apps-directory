import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';
import { environment } from '../../environments/environment';

export interface SubmissionRequest {
  // Contact Information
  submitter_name: string;
  submitter_email: string;
  submitter_phone?: string;
  submitter_organization?: string;
  is_developer: boolean;

  // App Details (Bilingual)
  app_name_en: string;
  app_name_ar: string;
  short_description_en: string;
  short_description_ar: string;
  description_en?: string;
  description_ar?: string;

  // Store Links
  google_play_link?: string;
  app_store_link?: string;
  app_gallery_link?: string;
  website_link?: string;

  // Categories (list of category IDs)
  categories: number[];

  // Developer Info
  developer_name_en: string;
  developer_name_ar?: string;
  developer_website?: string;
  developer_email?: string;

  // Media URLs
  app_icon_url?: string;
  main_image_en?: string;
  main_image_ar?: string;
  screenshots_en?: string[];
  screenshots_ar?: string[];

  // Additional
  additional_notes?: string;
  content_confirmation: boolean;
}

export interface SubmissionResponse {
  tracking_id: string;
  status: string;
  message: string;
}

export interface SubmissionStatus {
  tracking_id: string;
  status: string;
  status_display: string;
  app_name_en: string;
  app_name_ar: string;
  app_icon_url?: string;
  submitted_at: string;
  reviewed_at?: string;
  message?: string;
  app_url?: string;
}

export interface SubmissionListItem {
  tracking_id: string;
  app_name_en: string;
  app_name_ar: string;
  status: string;
  status_display: string;
  submitted_at: string;
}

export interface MediaUploadResponse {
  url: string;
  filename: string;
  size: number;
}

export interface Category {
  id: number;
  name_en: string;
  name_ar: string;
  slug: string;
  icon?: string;
}

@Injectable({
  providedIn: 'root'
})
export class SubmissionService {
  private readonly apiUrl = environment.apiUrl || 'http://localhost:8000/api';

  constructor(private http: HttpClient) {}

  /**
   * Submit a new app for review
   */
  submitApp(data: SubmissionRequest): Observable<SubmissionResponse> {
    return this.http.post<SubmissionResponse>(`${this.apiUrl}/submissions/`, data).pipe(
      catchError(error => {
        console.error('Submission error:', error);
        return throwError(() => error.error?.detail || error.error?.error || 'Failed to submit app');
      })
    );
  }

  /**
   * Track submission status by tracking ID
   */
  trackSubmission(trackingId: string): Observable<SubmissionStatus> {
    return this.http.get<SubmissionStatus>(`${this.apiUrl}/submissions/track/${trackingId}`).pipe(
      catchError(error => {
        console.error('Track error:', error);
        return throwError(() => error.error?.detail || error.error?.error || 'Submission not found');
      })
    );
  }

  /**
   * Track all submissions by email
   */
  trackByEmail(email: string): Observable<SubmissionListItem[]> {
    const params = new HttpParams().set('email', email);
    return this.http.get<SubmissionListItem[]>(`${this.apiUrl}/submissions/track/`, { params }).pipe(
      catchError(error => {
        console.error('Track by email error:', error);
        return throwError(() => error.error?.detail || error.error?.error || 'Failed to fetch submissions');
      })
    );
  }

  /**
   * Upload a media file (icon or screenshot)
   */
  uploadMedia(file: File, mediaType: 'icon' | 'screenshot_en' | 'screenshot_ar', trackingId?: string): Observable<MediaUploadResponse> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('media_type', mediaType);
    if (trackingId) {
      formData.append('tracking_id', trackingId);
    }

    return this.http.post<MediaUploadResponse>(`${this.apiUrl}/submissions/upload-media`, formData).pipe(
      catchError(error => {
        console.error('Upload error:', error);
        return throwError(() => error.error?.detail || error.error?.error || 'Failed to upload file');
      })
    );
  }

  /**
   * Upload from URL (download and re-upload to our storage)
   */
  uploadFromUrl(url: string, mediaType: 'icon' | 'screenshot_en' | 'screenshot_ar', trackingId?: string): Observable<MediaUploadResponse> {
    const params: any = { url, media_type: mediaType };
    if (trackingId) {
      params.tracking_id = trackingId;
    }

    return this.http.post<MediaUploadResponse>(`${this.apiUrl}/submissions/upload-from-url`, null, { params }).pipe(
      catchError(error => {
        console.error('Upload from URL error:', error);
        return throwError(() => error.error?.detail || error.error?.error || 'Failed to upload from URL');
      })
    );
  }

  /**
   * Get all categories for the submission form
   */
  getCategories(): Observable<Category[]> {
    return this.http.get<Category[]>(`${this.apiUrl}/categories/`).pipe(
      catchError(error => {
        console.error('Categories error:', error);
        return throwError(() => 'Failed to load categories');
      })
    );
  }
}
