# US9.3: Build Review UI Components

**Epic:** Epic 9 - User Reviews & Ratings System  
**Sprint:** Week 9, Day 2-3  
**Story Points:** 8  
**Priority:** P1  
**Assigned To:** Frontend Developer  
**Status:** Not Started

---

## 📋 User Story

**As a** User  
**I want** an intuitive UI to read and write reviews  
**So that** I can easily share feedback and read others' experiences

---

## 🎯 Acceptance Criteria

### AC1: Review Form Component
- [ ] Rating selector (star icons, 1-5)
- [ ] Comment textarea (max 2000 chars, counter)
- [ ] Submit button (disabled if invalid)
- [ ] Edit mode for existing reviews
- [ ] Character count display
- [ ] Form validation

### AC2: Review Card Component
- [ ] User avatar and name
- [ ] Star rating display
- [ ] Review comment
- [ ] Timestamp ("2 days ago")
- [ ] "Edited" badge if edited
- [ ] Helpful/Not helpful buttons
- [ ] Edit/Delete buttons (own reviews only)

### AC3: Reviews List Component
- [ ] Paginated list of reviews
- [ ] Sort dropdown (Newest, Highest Rated, Most Helpful)
- [ ] Filter by star rating (5★, 4★, etc.)
- [ ] Load more button or infinite scroll
- [ ] Empty state ("No reviews yet")

### AC4: Rating Summary Component
- [ ] Overall average rating (large display)
- [ ] Total review count
- [ ] Star distribution bar chart (5★: 70%, 4★: 20%, etc.)
- [ ] "Write a review" CTA button

### AC5: Review Submission Flow
- [ ] Check if user already reviewed
- [ ] Show existing review in edit mode
- [ ] Success message after submission
- [ ] Review appears immediately (optimistic UI)
- [ ] Error handling

### AC6: Helpful Voting
- [ ] Helpful/Not helpful buttons
- [ ] Vote count updates immediately
- [ ] User can only vote once per review
- [ ] Visual indication of user's vote

---

## 📝 Technical Notes

### Review Form Component
```typescript
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

@Component({
  selector: 'app-review-form',
  standalone: true,
  template: `
    <form [formGroup]="reviewForm" (ngSubmit)="onSubmit()">
      <!-- Star Rating -->
      <div class="rating-input">
        <label>Your Rating</label>
        <app-star-rating 
          [rating]="reviewForm.get('rating').value"
          [editable]="true"
          (ratingChange)="onRatingChange($event)">
        </app-star-rating>
      </div>
      
      <!-- Comment -->
      <mat-form-field appearance="outline" class="full-width">
        <mat-label>Your Review</mat-label>
        <textarea 
          matInput 
          formControlName="comment"
          rows="5"
          maxlength="2000"
          placeholder="Share your experience with this app...">
        </textarea>
        <mat-hint align="end">
          {{ reviewForm.get('comment').value?.length || 0 }} / 2000
        </mat-hint>
      </mat-form-field>
      
      <!-- Submit Button -->
      <button 
        mat-raised-button 
        color="primary"
        type="submit"
        [disabled]="reviewForm.invalid || isSubmitting">
        {{ existingReview ? 'Update Review' : 'Submit Review' }}
      </button>
      
      <button 
        *ngIf="existingReview"
        mat-button
        type="button"
        (click)="onCancel()">
        Cancel
      </button>
    </form>
  `,
  styles: [`
    .rating-input {
      margin-bottom: 16px;
    }
    .full-width {
      width: 100%;
    }
  `]
})
export class ReviewFormComponent {
  @Input() existingReview?: Review;
  @Input() appId!: string;
  @Output() submitted = new EventEmitter<CreateReviewDto>();
  @Output() cancelled = new EventEmitter<void>();
  
  reviewForm: FormGroup;
  isSubmitting = false;
  
  constructor(private fb: FormBuilder) {
    this.reviewForm = this.fb.group({
      rating: [0, [Validators.required, Validators.min(1), Validators.max(5)]],
      comment: ['', [Validators.maxLength(2000)]]
    });
  }
  
  ngOnInit(): void {
    if (this.existingReview) {
      this.reviewForm.patchValue({
        rating: this.existingReview.rating,
        comment: this.existingReview.comment
      });
    }
  }
  
  onRatingChange(rating: number): void {
    this.reviewForm.patchValue({ rating });
  }
  
  onSubmit(): void {
    if (this.reviewForm.invalid) return;
    
    this.submitted.emit(this.reviewForm.value);
  }
  
  onCancel(): void {
    this.cancelled.emit();
  }
}
```

### Review Card Component
```typescript
@Component({
  selector: 'app-review-card',
  standalone: true,
  template: `
    <mat-card class="review-card">
      <mat-card-header>
        <img 
          mat-card-avatar 
          [src]="review.userAvatar || 'assets/default-avatar.png'"
          [alt]="review.userName">
        <mat-card-title>{{ review.userName }}</mat-card-title>
        <mat-card-subtitle>
          <app-star-rating [rating]="review.rating" [editable]="false"></app-star-rating>
          <span class="timestamp">{{ review.createdAt | timeAgo }}</span>
          <mat-chip *ngIf="review.isEdited" class="edited-badge">Edited</mat-chip>
        </mat-card-subtitle>
      </mat-card-header>
      
      <mat-card-content>
        <p>{{ review.comment }}</p>
      </mat-card-content>
      
      <mat-card-actions>
        <!-- Helpful Voting -->
        <button 
          mat-button 
          (click)="onHelpfulClick()"
          [class.voted]="userVote === true">
          <mat-icon>thumb_up</mat-icon>
          Helpful ({{ review.helpfulCount }})
        </button>
        
        <button 
          mat-button 
          (click)="onUnhelpfulClick()"
          [class.voted]="userVote === false">
          <mat-icon>thumb_down</mat-icon>
          Not Helpful ({{ review.unhelpfulCount }})
        </button>
        
        <!-- Own Review Actions -->
        <span class="spacer"></span>
        <button 
          *ngIf="isOwnReview"
          mat-icon-button
          (click)="onEdit()">
          <mat-icon>edit</mat-icon>
        </button>
        <button 
          *ngIf="isOwnReview"
          mat-icon-button
          (click)="onDelete()">
          <mat-icon>delete</mat-icon>
        </button>
      </mat-card-actions>
    </mat-card>
  `,
  styles: [`
    .review-card {
      margin-bottom: 16px;
    }
    .timestamp {
      margin-left: 8px;
      color: #666;
    }
    .spacer {
      flex: 1 1 auto;
    }
    .voted {
      color: #1976d2;
    }
  `]
})
export class ReviewCardComponent {
  @Input() review!: ReviewDto;
  @Input() isOwnReview = false;
  @Input() userVote?: boolean;
  @Output() helpful = new EventEmitter<void>();
  @Output() unhelpful = new EventEmitter<void>();
  @Output() edit = new EventEmitter<void>();
  @Output() delete = new EventEmitter<void>();
  
  onHelpfulClick(): void {
    this.helpful.emit();
  }
  
  onUnhelpfulClick(): void {
    this.unhelpful.emit();
  }
  
  onEdit(): void {
    this.edit.emit();
  }
  
  onDelete(): void {
    const confirmed = confirm('Are you sure you want to delete your review?');
    if (confirmed) {
      this.delete.emit();
    }
  }
}
```

### Rating Summary Component
```typescript
@Component({
  selector: 'app-rating-summary',
  template: `
    <div class="rating-summary">
      <div class="overall-rating">
        <h2>{{ averageRating | number: '1.1' }}</h2>
        <app-star-rating [rating]="averageRating" [editable]="false"></app-star-rating>
        <p>{{ totalReviews }} reviews</p>
      </div>
      
      <div class="rating-distribution">
        <div *ngFor="let star of [5, 4, 3, 2, 1]" class="rating-bar">
          <span>{{ star }}★</span>
          <mat-progress-bar 
            mode="determinate" 
            [value]="getPercentage(star)">
          </mat-progress-bar>
          <span>{{ getCount(star) }}</span>
        </div>
      </div>
      
      <button 
        mat-raised-button 
        color="primary"
        (click)="onWriteReview()">
        Write a Review
      </button>
    </div>
  `,
  styles: [`
    .rating-summary {
      padding: 24px;
      background: #f5f5f5;
      border-radius: 8px;
    }
    .overall-rating {
      text-align: center;
      margin-bottom: 24px;
    }
    .rating-bar {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;
    }
  `]
})
export class RatingSummaryComponent {
  @Input() averageRating: number;
  @Input() totalReviews: number;
  @Input() ratingDistribution: { [key: number]: number };
  @Output() writeReview = new EventEmitter<void>();
  
  getPercentage(star: number): number {
    if (!this.totalReviews) return 0;
    return ((this.ratingDistribution[star] || 0) / this.totalReviews) * 100;
  }
  
  getCount(star: number): number {
    return this.ratingDistribution[star] || 0;
  }
  
  onWriteReview(): void {
    this.writeReview.emit();
  }
}
```

---

## 🔗 Dependencies
- US9.2: Review submission API
- Angular Material or UI library

---

## 📊 Definition of Done
- [ ] All review components created
- [ ] Review form working
- [ ] Review cards displaying correctly
- [ ] Rating summary component complete
- [ ] Helpful voting functional
- [ ] Responsive design
- [ ] Accessibility (ARIA labels)
- [ ] Unit tests pass

---

**Created:** October 6, 2025  
**Owner:** Abubakr Abduraghman, a.abduraghman@itqan.dev  
**Epic:** [Epic 9: User Reviews & Ratings](../epics/epic-9-user-reviews-ratings-system.md)
