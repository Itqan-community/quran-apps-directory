# US11.4-11.6: Developer Dashboard & Admin Approval System

**Epic:** Epic 11 - Developer Self-Service Portal  
**Sprint:** Week 11, Day 3-4  
**Story Points:** 12 (combined)  
**Priority:** P1  
**Assigned To:** Full Stack Team  
**Status:** Not Started

---

## 📋 Combined User Stories

### US11.4: Build Developer Dashboard UI
**As a** Developer, **I want** a dashboard to manage my apps and submissions **So that** I can track status and performance

### US11.5: Implement Admin Approval Workflow
**As an** Admin, **I want** to review and approve/reject app submissions **So that** only quality apps are published

### US11.6: Add Developer Notifications
**As a** Developer, **I want** to receive notifications about my submissions **So that** I stay informed about the review process

---

## 🎯 Combined Acceptance Criteria

### Developer Dashboard (AC1-AC6)
- [ ] Dashboard route: `/developer/dashboard`
- [ ] Overview cards: total apps, pending reviews, approved, rejected
- [ ] List of all submissions with status
- [ ] Quick actions: edit draft, view details, delete
- [ ] Analytics preview (views, clicks)
- [ ] Navigation to submission form

### Admin Approval (AC7-AC12)
- [ ] Admin route: `/admin/submissions`
- [ ] List of pending submissions
- [ ] Detailed submission review page
- [ ] Approve button (creates App entity)
- [ ] Reject button (with reason textarea)
- [ ] Email notification to developer
- [ ] Audit log of actions

### Developer Notifications (AC13-AC16)
- [ ] Notification on submission received
- [ ] Notification on approval
- [ ] Notification on rejection (with reason)
- [ ] Email + in-app notifications
- [ ] Notification preferences

---

## 📝 Technical Implementation

### Developer Dashboard Component
```typescript
@Component({
  selector: 'app-developer-dashboard',
  standalone: true,
  template: `
    <div class="dashboard">
      <h1>Developer Dashboard</h1>
      
      <!-- Stats Cards -->
      <div class="stats-grid">
        <mat-card>
          <mat-card-content>
            <h2>{{ stats.totalApps }}</h2>
            <p>Total Apps</p>
          </mat-card-content>
        </mat-card>
        
        <mat-card>
          <mat-card-content>
            <h2>{{ stats.pendingReviews }}</h2>
            <p>Pending Reviews</p>
          </mat-card-content>
        </mat-card>
        
        <mat-card>
          <mat-card-content>
            <h2>{{ stats.approved }}</h2>
            <p>Approved</p>
          </mat-card-content>
        </mat-card>
        
        <mat-card>
          <mat-card-content>
            <h2>{{ stats.rejected }}</h2>
            <p>Rejected</p>
          </mat-card-content>
        </mat-card>
      </div>
      
      <!-- Submissions List -->
      <mat-card class="submissions-card">
        <mat-card-header>
          <mat-card-title>Your Submissions</mat-card-title>
          <button mat-raised-button color="primary" routerLink="/developer/submit">
            <mat-icon>add</mat-icon>
            Submit New App
          </button>
        </mat-card-header>
        
        <mat-card-content>
          <table mat-table [dataSource]="submissions" class="mat-elevation-z0">
            <ng-container matColumnDef="name">
              <th mat-header-cell *matHeaderCellDef>App Name</th>
              <td mat-cell *matCellDef="let submission">{{ submission.nameEn }}</td>
            </ng-container>
            
            <ng-container matColumnDef="status">
              <th mat-header-cell *matHeaderCellDef>Status</th>
              <td mat-cell *matCellDef="let submission">
                <mat-chip [class]="'status-' + submission.status">
                  {{ submission.status | titlecase }}
                </mat-chip>
              </td>
            </ng-container>
            
            <ng-container matColumnDef="submittedAt">
              <th mat-header-cell *matHeaderCellDef>Submitted</th>
              <td mat-cell *matCellDef="let submission">
                {{ submission.submittedAt | date:'short' }}
              </td>
            </ng-container>
            
            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef>Actions</th>
              <td mat-cell *matCellDef="let submission">
                <button 
                  *ngIf="submission.status === 'draft'"
                  mat-icon-button
                  [routerLink]="['/developer/submissions', submission.id, 'edit']">
                  <mat-icon>edit</mat-icon>
                </button>
                <button 
                  mat-icon-button
                  [routerLink]="['/developer/submissions', submission.id]">
                  <mat-icon>visibility</mat-icon>
                </button>
              </td>
            </ng-container>
            
            <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
            <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
          </table>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }
  `]
})
export class DeveloperDashboardComponent implements OnInit {
  stats = {
    totalApps: 0,
    pendingReviews: 0,
    approved: 0,
    rejected: 0
  };
  
  submissions: AppSubmission[] = [];
  displayedColumns = ['name', 'status', 'submittedAt', 'actions'];
  
  constructor(
    private submissionService: AppSubmissionService
  ) {}
  
  ngOnInit(): void {
    this.loadStats();
    this.loadSubmissions();
  }
  
  loadStats(): void {
    this.submissionService.getStats().subscribe(stats => {
      this.stats = stats;
    });
  }
  
  loadSubmissions(): void {
    this.submissionService.getMySubmissions().subscribe(submissions => {
      this.submissions = submissions;
    });
  }
}
```

### Admin Submission Review Controller
```csharp
[ApiController]
[Route("api/admin/submissions")]
[Authorize(Roles = "Admin")]
public class AdminSubmissionsController : ControllerBase
{
    private readonly ISubmissionService _submissionService;
    private readonly INotificationService _notificationService;
    
    [HttpGet("pending")]
    public async Task<ActionResult<PagedResult<AppSubmissionDto>>> GetPendingSubmissions(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        var submissions = await _submissionService.GetPendingSubmissionsAsync(
            page, pageSize);
        
        return Ok(submissions);
    }
    
    [HttpPost("{id:guid}/approve")]
    public async Task<IActionResult> ApproveSubmission(Guid id)
    {
        var adminId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        
        var app = await _submissionService.ApproveSubmissionAsync(
            id, Guid.Parse(adminId));
        
        // Notify developer
        var submission = await _context.AppSubmissions
            .Include(s => s.DeveloperProfile)
                .ThenInclude(dp => dp.User)
            .FirstOrDefaultAsync(s => s.Id == id);
        
        await _notificationService.CreateNotificationAsync(
            submission.DeveloperProfile.UserId,
            NotificationTypes.AppApproved,
            "App Approved!",
            $"Your app '{submission.NameEn}' has been approved and is now live.");
        
        return Ok(new { message = "App approved", appId = app.Id });
    }
    
    [HttpPost("{id:guid}/reject")]
    public async Task<IActionResult> RejectSubmission(
        Guid id,
        [FromBody] RejectSubmissionDto dto)
    {
        var adminId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        
        await _submissionService.RejectSubmissionAsync(
            id, Guid.Parse(adminId), dto.Reason);
        
        // Notify developer
        var submission = await _context.AppSubmissions
            .Include(s => s.DeveloperProfile)
                .ThenInclude(dp => dp.User)
            .FirstOrDefaultAsync(s => s.Id == id);
        
        await _notificationService.CreateNotificationAsync(
            submission.DeveloperProfile.UserId,
            NotificationTypes.AppRejected,
            "App Not Approved",
            $"Your app '{submission.NameEn}' was not approved. Reason: {dto.Reason}");
        
        return Ok(new { message = "App rejected" });
    }
}
```

### Submission Service - Approval Logic
```csharp
public async Task<App> ApproveSubmissionAsync(Guid submissionId, Guid adminId)
{
    var submission = await _context.AppSubmissions
        .Include(s => s.DeveloperProfile)
        .FirstOrDefaultAsync(s => s.Id == submissionId);
    
    if (submission == null || submission.Status != SubmissionStatus.Submitted)
        throw new InvalidOperationException("Invalid submission");
    
    // Create App entity from submission
    var app = new App
    {
        Id = Guid.NewGuid(),
        NameAr = submission.NameAr,
        NameEn = submission.NameEn,
        ShortDescriptionAr = submission.ShortDescriptionAr,
        ShortDescriptionEn = submission.ShortDescriptionEn,
        DescriptionAr = submission.DescriptionAr,
        DescriptionEn = submission.DescriptionEn,
        ApplicationIconUrl = submission.ApplicationIconUrl,
        GooglePlayLink = submission.GooglePlayLink,
        AppStoreLink = submission.AppStoreLink,
        AppGalleryLink = submission.AppGalleryLink,
        CreatedAt = DateTime.UtcNow,
        IsActive = true
    };
    
    // Parse and add categories
    var categoryIds = JsonSerializer.Deserialize<List<Guid>>(submission.CategoriesJson);
    app.AppCategories = categoryIds.Select(catId => new AppCategory
    {
        AppId = app.Id,
        CategoryId = catId
    }).ToList();
    
    await _context.Apps.AddAsync(app);
    
    // Update submission status
    submission.Status = SubmissionStatus.Approved;
    submission.ReviewedBy = adminId;
    submission.ReviewedAt = DateTime.UtcNow;
    
    await _context.SaveChangesAsync();
    
    return app;
}

public async Task RejectSubmissionAsync(
    Guid submissionId,
    Guid adminId,
    string reason)
{
    var submission = await _context.AppSubmissions.FindAsync(submissionId);
    
    if (submission == null)
        throw new NotFoundException("Submission not found");
    
    submission.Status = SubmissionStatus.Rejected;
    submission.RejectionReason = reason;
    submission.ReviewedBy = adminId;
    submission.ReviewedAt = DateTime.UtcNow;
    
    await _context.SaveChangesAsync();
}
```

### Admin Review Page Component
```typescript
@Component({
  selector: 'app-admin-submission-review',
  template: `
    <div class="review-page" *ngIf="submission">
      <h1>Review Submission: {{ submission.nameEn }}</h1>
      
      <div class="review-grid">
        <!-- Left: Submission Details -->
        <mat-card class="details">
          <mat-card-header>
            <mat-card-title>Submission Details</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <img [src]="submission.applicationIconUrl" alt="App Icon" class="app-icon">
            
            <h3>{{ submission.nameEn }} / {{ submission.nameAr }}</h3>
            <p>{{ submission.shortDescriptionEn }}</p>
            
            <h4>Categories</h4>
            <mat-chip-listbox>
              <mat-chip *ngFor="let category of submission.categories">
                {{ category }}
              </mat-chip>
            </mat-chip-listbox>
            
            <h4>Platform Links</h4>
            <div *ngIf="submission.googlePlayLink">
              <a [href]="submission.googlePlayLink" target="_blank">Google Play</a>
            </div>
            <div *ngIf="submission.appStoreLink">
              <a [href]="submission.appStoreLink" target="_blank">App Store</a>
            </div>
            
            <h4>Screenshots</h4>
            <div class="screenshots">
              <img *ngFor="let screenshot of submission.screenshotsEn" 
                   [src]="screenshot" alt="Screenshot">
            </div>
          </mat-card-content>
        </mat-card>
        
        <!-- Right: Review Actions -->
        <mat-card class="actions">
          <mat-card-header>
            <mat-card-title>Review Actions</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <button 
              mat-raised-button 
              color="primary"
              (click)="approve()"
              [disabled]="isProcessing">
              <mat-icon>check</mat-icon>
              Approve & Publish
            </button>
            
            <button 
              mat-raised-button 
              color="warn"
              (click)="showRejectDialog()"
              [disabled]="isProcessing">
              <mat-icon>close</mat-icon>
              Reject
            </button>
          </mat-card-content>
        </mat-card>
      </div>
    </div>
  `
})
export class AdminSubmissionReviewComponent {
  submission: AppSubmission;
  isProcessing = false;
  
  constructor(
    private route: ActivatedRoute,
    private adminService: AdminSubmissionService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private router: Router
  ) {}
  
  approve(): void {
    this.isProcessing = true;
    
    this.adminService.approveSubmission(this.submission.id).subscribe({
      next: () => {
        this.snackBar.open('App approved and published!', 'Close', { duration: 3000 });
        this.router.navigate(['/admin/submissions']);
      },
      error: () => {
        this.isProcessing = false;
      }
    });
  }
  
  showRejectDialog(): void {
    const dialogRef = this.dialog.open(RejectReasonDialogComponent, {
      width: '500px'
    });
    
    dialogRef.afterClosed().subscribe(reason => {
      if (reason) {
        this.reject(reason);
      }
    });
  }
  
  reject(reason: string): void {
    this.isProcessing = true;
    
    this.adminService.rejectSubmission(this.submission.id, reason).subscribe({
      next: () => {
        this.snackBar.open('App rejected', 'Close', { duration: 3000 });
        this.router.navigate(['/admin/submissions']);
      },
      error: () => {
        this.isProcessing = false;
      }
    });
  }
}
```

---

## 🔗 Dependencies
- US11.1-11.3: Developer profile & submission
- US8.8: Notification system
- US8.1: Role-based access control

---

## 📊 Definition of Done
- [ ] Developer dashboard UI complete
- [ ] Stats cards displaying correctly
- [ ] Submissions list functional
- [ ] Admin review page working
- [ ] Approve/reject actions functional
- [ ] App entity created on approval
- [ ] Developer notifications sent
- [ ] Email notifications working
- [ ] Audit log of admin actions
- [ ] Unit tests pass
- [ ] E2E tests pass

---

**Created:** October 6, 2025  
**Owner:** Abubakr Abduraghman, a.abduraghman@itqan.dev  
**Epic:** [Epic 11: Developer Self-Service Portal](../epics/epic-11-developer-self-service-portal.md)
