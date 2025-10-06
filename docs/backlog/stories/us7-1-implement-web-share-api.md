# US7.1: Implement Web Share API Integration

**Epic:** Epic 7 - Social Sharing & Community Features  
**Sprint:** Week 6, Day 1  
**Story Points:** 3  
**Priority:** P2  
**Assigned To:** Frontend Developer  
**Status:** Not Started

---

## 📋 User Story

**As a** User  
**I want** to share Quran apps with friends using my device's native share menu  
**So that** I can easily recommend apps through my preferred communication channels

---

## 🎯 Acceptance Criteria

### AC1: Share Button Component
- [ ] Reusable "Share" button component created
- [ ] Button placed on app detail page (prominent position)
- [ ] Button also available on app cards (hover/context menu)
- [ ] Icon: Material Icons `share` or `ios_share`
- [ ] Bilingual label: "Share" / "مشاركة"

### AC2: Web Share API Implementation
- [ ] Detect if Web Share API is supported
- [ ] Fallback to custom share menu if not supported
- [ ] Share data includes:
  - Title: "{App Name} - Quran Apps"
  - Text: Short description
  - URL: App detail page URL
- [ ] Error handling if share is cancelled

### AC3: Fallback Share Modal
- [ ] Custom modal for browsers without Web Share API
- [ ] Social media buttons:
  - WhatsApp
  - Facebook
  - Twitter (X)
  - Telegram
  - Email
  - Copy Link
- [ ] Modal styled consistently with app theme
- [ ] Responsive design (mobile + desktop)

### AC4: Platform-Specific URLs
- [ ] WhatsApp: `https://wa.me/?text={encodedText}`
- [ ] Facebook: `https://www.facebook.com/sharer/sharer.php?u={url}`
- [ ] Twitter: `https://twitter.com/intent/tweet?url={url}&text={text}`
- [ ] Telegram: `https://t.me/share/url?url={url}&text={text}`
- [ ] Email: `mailto:?subject={subject}&body={body}`

### AC5: Copy Link Functionality
- [ ] "Copy Link" button in share modal
- [ ] Clipboard API used
- [ ] Toast notification: "Link copied!"
- [ ] Fallback for older browsers (select + copy)

### AC6: Share Analytics
- [ ] Track share button clicks
- [ ] Track platform used for sharing
- [ ] Send to analytics service (non-blocking)

---

## 📝 Technical Notes

### Share Service
```typescript
import { Injectable } from '@angular/core';
import { Clipboard } from '@angular/cdk/clipboard';
import { MatSnackBar } from '@angular/material/snack-bar';

export interface ShareData {
  title: string;
  text: string;
  url: string;
}

@Injectable({
  providedIn: 'root'
})
export class ShareService {
  constructor(
    private clipboard: Clipboard,
    private snackBar: MatSnackBar,
    private analyticsService: AnalyticsService
  ) {}
  
  async shareApp(app: App): Promise<void> {
    const shareData: ShareData = {
      title: `${app.nameEn} - Quran Apps Directory`,
      text: app.shortDescriptionEn,
      url: `${window.location.origin}/apps/${app.id}`
    };
    
    if (this.isWebShareSupported()) {
      try {
        await navigator.share(shareData);
        this.trackShare('native', app.id);
      } catch (err) {
        // User cancelled or error occurred
        if (err.name !== 'AbortError') {
          console.error('Share failed:', err);
        }
      }
    } else {
      // Show fallback modal
      this.showShareModal(shareData, app.id);
    }
  }
  
  isWebShareSupported(): boolean {
    return navigator.share !== undefined;
  }
  
  shareViaWhatsApp(shareData: ShareData, appId: string): void {
    const text = encodeURIComponent(`${shareData.title}\n${shareData.text}\n${shareData.url}`);
    const url = `https://wa.me/?text=${text}`;
    this.openShareWindow(url);
    this.trackShare('whatsapp', appId);
  }
  
  shareViaFacebook(shareData: ShareData, appId: string): void {
    const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareData.url)}`;
    this.openShareWindow(url);
    this.trackShare('facebook', appId);
  }
  
  shareViaTwitter(shareData: ShareData, appId: string): void {
    const url = `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareData.url)}&text=${encodeURIComponent(shareData.title)}`;
    this.openShareWindow(url);
    this.trackShare('twitter', appId);
  }
  
  shareViaTelegram(shareData: ShareData, appId: string): void {
    const url = `https://t.me/share/url?url=${encodeURIComponent(shareData.url)}&text=${encodeURIComponent(shareData.title)}`;
    this.openShareWindow(url);
    this.trackShare('telegram', appId);
  }
  
  shareViaEmail(shareData: ShareData, appId: string): void {
    const subject = encodeURIComponent(shareData.title);
    const body = encodeURIComponent(`${shareData.text}\n\n${shareData.url}`);
    const url = `mailto:?subject=${subject}&body=${body}`;
    window.location.href = url;
    this.trackShare('email', appId);
  }
  
  copyLink(url: string, appId: string): void {
    this.clipboard.copy(url);
    this.snackBar.open('Link copied to clipboard!', 'Close', {
      duration: 3000,
      horizontalPosition: 'center',
      verticalPosition: 'bottom'
    });
    this.trackShare('copy', appId);
  }
  
  private openShareWindow(url: string): void {
    window.open(url, '_blank', 'width=600,height=400');
  }
  
  private showShareModal(shareData: ShareData, appId: string): void {
    // Open custom share modal component
    const dialogRef = this.dialog.open(ShareModalComponent, {
      data: { shareData, appId },
      width: '400px'
    });
  }
  
  private trackShare(platform: string, appId: string): void {
    this.analyticsService.trackShare(appId, platform).subscribe({
      error: (err) => console.warn('Failed to track share', err)
    });
  }
}
```

### Share Button Component
```typescript
import { Component, Input } from '@angular/core';
import { App } from '../../models';
import { ShareService } from '../../services/share.service';

@Component({
  selector: 'app-share-button',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule],
  template: `
    <button 
      mat-icon-button 
      (click)="onShare()"
      [matTooltip]="'Share' | translate">
      <mat-icon>share</mat-icon>
    </button>
  `,
  styles: [`
    button {
      color: var(--primary-color);
    }
  `]
})
export class ShareButtonComponent {
  @Input() app!: App;
  
  constructor(private shareService: ShareService) {}
  
  async onShare(): Promise<void> {
    await this.shareService.shareApp(this.app);
  }
}
```

### Share Modal Component
```typescript
import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ShareService, ShareData } from '../../services/share.service';

@Component({
  selector: 'app-share-modal',
  standalone: true,
  template: `
    <h2 mat-dialog-title>{{ 'Share App' | translate }}</h2>
    <mat-dialog-content>
      <div class="share-buttons">
        <button mat-button (click)="shareWhatsApp()">
          <mat-icon>
            <img src="/assets/icons/whatsapp.svg" alt="WhatsApp">
          </mat-icon>
          WhatsApp
        </button>
        
        <button mat-button (click)="shareFacebook()">
          <mat-icon>facebook</mat-icon>
          Facebook
        </button>
        
        <button mat-button (click)="shareTwitter()">
          <mat-icon>
            <img src="/assets/icons/twitter.svg" alt="Twitter">
          </mat-icon>
          Twitter
        </button>
        
        <button mat-button (click)="shareTelegram()">
          <mat-icon>telegram</mat-icon>
          Telegram
        </button>
        
        <button mat-button (click)="shareEmail()">
          <mat-icon>email</mat-icon>
          Email
        </button>
        
        <button mat-button (click)="copyLink()">
          <mat-icon>content_copy</mat-icon>
          Copy Link
        </button>
      </div>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
    </mat-dialog-actions>
  `,
  styles: [`
    .share-buttons {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 8px;
      padding: 16px 0;
    }
    
    button {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      padding: 16px;
    }
    
    mat-icon {
      font-size: 32px;
      width: 32px;
      height: 32px;
    }
  `]
})
export class ShareModalComponent {
  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { shareData: ShareData; appId: string },
    private dialogRef: MatDialogRef<ShareModalComponent>,
    private shareService: ShareService
  ) {}
  
  shareWhatsApp(): void {
    this.shareService.shareViaWhatsApp(this.data.shareData, this.data.appId);
    this.dialogRef.close();
  }
  
  shareFacebook(): void {
    this.shareService.shareViaFacebook(this.data.shareData, this.data.appId);
    this.dialogRef.close();
  }
  
  shareTwitter(): void {
    this.shareService.shareViaTwitter(this.data.shareData, this.data.appId);
    this.dialogRef.close();
  }
  
  shareTelegram(): void {
    this.shareService.shareViaTelegram(this.data.shareData, this.data.appId);
    this.dialogRef.close();
  }
  
  shareEmail(): void {
    this.shareService.shareViaEmail(this.data.shareData, this.data.appId);
    this.dialogRef.close();
  }
  
  copyLink(): void {
    this.shareService.copyLink(this.data.shareData.url, this.data.appId);
    this.dialogRef.close();
  }
}
```

---

## 🔗 Dependencies
- US5.4: App Detail Component

---

## 📊 Definition of Done
- [ ] ShareService created
- [ ] Share button component created
- [ ] Web Share API implemented
- [ ] Fallback modal created with all platforms
- [ ] Copy link functionality working
- [ ] Share analytics tracking implemented
- [ ] Cross-browser tested (Chrome, Safari, Firefox)
- [ ] Mobile tested (Android, iOS)
- [ ] Unit tests written

---

**Created:** October 6, 2025  
**Owner:** Abubakr Abduraghman, a.abduraghman@itqan.dev  
**Epic:** [Epic 7: Social Sharing & Community Features](../epics/epic-7-social-sharing-community-features.md)
