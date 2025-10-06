# US13.1-13.6: Complete Admin Content Management System

**Epic:** Epic 13 - Content Management System (Admin)  
**Sprint:** Week 13, Day 1-4  
**Story Points:** 24 (combined)  
**Priority:** P1  
**Assigned To:** Full Stack Team  
**Status:** Not Started

---

## 📋 Combined User Stories

Complete admin CMS including dashboard, user management, content moderation, app management, audit logging, and platform reports.

---

## 🎯 Combined Acceptance Criteria

### Admin Dashboard (AC1-AC6)
- [ ] Dashboard route: `/admin`
- [ ] Overview cards: users, apps, reviews, submissions
- [ ] Recent activity feed
- [ ] Quick actions panel
- [ ] Platform health metrics
- [ ] Navigation to all admin sections

### User Management (AC7-AC12)
- [ ] User list with search/filter
- [ ] User detail page
- [ ] Edit user profile
- [ ] Change user roles
- [ ] Ban/unban user
- [ ] Delete user account

### Content Moderation Queue (AC13-AC18)
- [ ] Pending reviews list
- [ ] Flagged content list
- [ ] Reported apps list
- [ ] Bulk moderation actions
- [ ] Priority sorting
- [ ] Filter by content type

### App Management (AC19-AC24)
- [ ] All apps list (admin view)
- [ ] Edit any app
- [ ] Feature/unfeature app
- [ ] Activate/deactivate app
- [ ] Delete app
- [ ] App metrics quick view

### Audit Log System (AC25-AC28)
- [ ] AuditLog entity (action, user, timestamp, details)
- [ ] Log all admin actions
- [ ] Audit log viewer
- [ ] Export audit logs

### Platform Reports (AC29-AC32)
- [ ] User growth report
- [ ] App submissions report
- [ ] Review moderation report
- [ ] System health dashboard

---

## 📝 Technical Implementation

### Audit Log Entity
```csharp
public class AuditLog
{
    public Guid Id { get; set; }
    
    [Required]
    public Guid UserId { get; set; }
    
    [Required]
    [MaxLength(100)]
    public string Action { get; set; } // UserBanned, AppApproved, ReviewRejected, etc.
    
    [Required]
    [MaxLength(100)]
    public string EntityType { get; set; } // User, App, Review, etc.
    
    public Guid? EntityId { get; set; }
    
    [Column(TypeName = "jsonb")]
    public string DetailsJson { get; set; }
    
    [MaxLength(50)]
    public string IpAddress { get; set; }
    
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
    
    // Navigation
    public ApplicationUser User { get; set; }
}
```

### Admin Dashboard Controller
```csharp
[ApiController]
[Route("api/admin")]
[Authorize(Roles = "Admin")]
public class AdminDashboardController : ControllerBase
{
    [HttpGet("overview")]
    public async Task<ActionResult<AdminOverviewDto>> GetOverview()
    {
        var totalUsers = await _context.Users.CountAsync();
        var totalApps = await _context.Apps.CountAsync();
        var pendingReviews = await _context.Reviews.CountAsync(r => !r.IsModerated);
        var pendingSubmissions = await _context.AppSubmissions.CountAsync(s => s.Status == SubmissionStatus.Submitted);
        
        var recentActivity = await _context.AuditLogs
            .Include(a => a.User)
            .OrderByDescending(a => a.Timestamp)
            .Take(10)
            .Select(a => new RecentActivityDto
            {
                Action = a.Action,
                UserName = a.User.FullName,
                Timestamp = a.Timestamp
            })
            .ToListAsync();
        
        return Ok(new AdminOverviewDto
        {
            TotalUsers = totalUsers,
            TotalApps = totalApps,
            PendingReviews = pendingReviews,
            PendingSubmissions = pendingSubmissions,
            RecentActivity = recentActivity
        });
    }
}
```

### User Management Controller
```csharp
[ApiController]
[Route("api/admin/users")]
[Authorize(Roles = "Admin")]
public class AdminUsersController : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<PagedResult<UserListDto>>> GetUsers(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] string search = null,
        [FromQuery] string role = null)
    {
        var query = _context.Users.AsQueryable();
        
        if (!string.IsNullOrEmpty(search))
        {
            query = query.Where(u => 
                u.Email.Contains(search) || 
                u.FullName.Contains(search));
        }
        
        if (!string.IsNullOrEmpty(role))
        {
            var usersInRole = await _userManager.GetUsersInRoleAsync(role);
            var userIds = usersInRole.Select(u => u.Id).ToList();
            query = query.Where(u => userIds.Contains(u.Id));
        }
        
        var totalCount = await query.CountAsync();
        
        var users = await query
            .OrderBy(u => u.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(u => new UserListDto
            {
                Id = u.Id,
                Email = u.Email,
                FullName = u.FullName,
                CreatedAt = u.CreatedAt,
                IsLocked = u.LockoutEnd != null
            })
            .ToListAsync();
        
        return Ok(new PagedResult<UserListDto>
        {
            Items = users,
            TotalCount = totalCount,
            Page = page,
            PageSize = pageSize
        });
    }
    
    [HttpPut("{id:guid}/roles")]
    public async Task<IActionResult> UpdateUserRoles(
        Guid id,
        [FromBody] UpdateUserRolesDto dto)
    {
        var user = await _userManager.FindByIdAsync(id.ToString());
        if (user == null)
            return NotFound();
        
        var currentRoles = await _userManager.GetRolesAsync(user);
        
        // Remove old roles
        await _userManager.RemoveFromRolesAsync(user, currentRoles);
        
        // Add new roles
        await _userManager.AddToRolesAsync(user, dto.Roles);
        
        // Log action
        await _auditService.LogAsync(new AuditLog
        {
            UserId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier).Value),
            Action = "UserRolesUpdated",
            EntityType = "User",
            EntityId = id,
            DetailsJson = JsonSerializer.Serialize(new { OldRoles = currentRoles, NewRoles = dto.Roles })
        });
        
        return Ok(new { message = "User roles updated" });
    }
    
    [HttpPost("{id:guid}/ban")]
    public async Task<IActionResult> BanUser(
        Guid id,
        [FromBody] BanUserDto dto)
    {
        var user = await _userManager.FindByIdAsync(id.ToString());
        if (user == null)
            return NotFound();
        
        await _userManager.SetLockoutEndDateAsync(user, DateTimeOffset.MaxValue);
        
        // Send notification
        await _notificationService.CreateNotificationAsync(
            id,
            NotificationTypes.AccountBanned,
            "Account Suspended",
            $"Your account has been suspended. Reason: {dto.Reason}");
        
        // Log action
        await _auditService.LogAsync(new AuditLog
        {
            UserId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier).Value),
            Action = "UserBanned",
            EntityType = "User",
            EntityId = id,
            DetailsJson = JsonSerializer.Serialize(new { dto.Reason })
        });
        
        return Ok(new { message = "User banned" });
    }
}
```

### App Management Controller
```csharp
[ApiController]
[Route("api/admin/apps")]
[Authorize(Roles = "Admin")]
public class AdminAppsController : ControllerBase
{
    [HttpPut("{id:guid}/feature")]
    public async Task<IActionResult> FeatureApp(Guid id)
    {
        var app = await _context.Apps.FindAsync(id);
        if (app == null)
            return NotFound();
        
        app.IsFeatured = !app.IsFeatured;
        app.FeaturedAt = app.IsFeatured ? DateTime.UtcNow : (DateTime?)null;
        
        await _context.SaveChangesAsync();
        
        await _auditService.LogAsync(new AuditLog
        {
            UserId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier).Value),
            Action = app.IsFeatured ? "AppFeatured" : "AppUnfeatured",
            EntityType = "App",
            EntityId = id
        });
        
        return Ok(new { message = $"App {(app.IsFeatured ? "featured" : "unfeatured")}" });
    }
    
    [HttpPut("{id:guid}/activate")]
    public async Task<IActionResult> ToggleActive(Guid id)
    {
        var app = await _context.Apps.FindAsync(id);
        if (app == null)
            return NotFound();
        
        app.IsActive = !app.IsActive;
        await _context.SaveChangesAsync();
        
        await _auditService.LogAsync(new AuditLog
        {
            UserId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier).Value),
            Action = app.IsActive ? "AppActivated" : "AppDeactivated",
            EntityType = "App",
            EntityId = id
        });
        
        return Ok(new { message = $"App {(app.IsActive ? "activated" : "deactivated")}" });
    }
}
```

### Frontend Admin Dashboard
```typescript
@Component({
  selector: 'app-admin-dashboard',
  template: `
    <div class="admin-dashboard">
      <h1>Admin Dashboard</h1>
      
      <!-- Overview Cards -->
      <div class="overview-grid" *ngIf="overview">
        <mat-card>
          <mat-card-content>
            <h2>{{ overview.totalUsers | number }}</h2>
            <p>Total Users</p>
          </mat-card-content>
          <button mat-button routerLink="/admin/users">View All</button>
        </mat-card>
        
        <mat-card>
          <mat-card-content>
            <h2>{{ overview.totalApps | number }}</h2>
            <p>Total Apps</p>
          </mat-card-content>
          <button mat-button routerLink="/admin/apps">Manage</button>
        </mat-card>
        
        <mat-card class="warning">
          <mat-card-content>
            <h2>{{ overview.pendingReviews | number }}</h2>
            <p>Pending Reviews</p>
          </mat-card-content>
          <button mat-button routerLink="/admin/moderation">Moderate</button>
        </mat-card>
        
        <mat-card class="info">
          <mat-card-content>
            <h2>{{ overview.pendingSubmissions | number }}</h2>
            <p>Pending Submissions</p>
          </mat-card-content>
          <button mat-button routerLink="/admin/submissions">Review</button>
        </mat-card>
      </div>
      
      <!-- Recent Activity -->
      <mat-card class="activity-card">
        <mat-card-header>
          <mat-card-title>Recent Activity</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <mat-list>
            <mat-list-item *ngFor="let activity of overview?.recentActivity">
              <mat-icon matListItemIcon>{{ getActivityIcon(activity.action) }}</mat-icon>
              <div matListItemTitle>{{ activity.action | titlecase }}</div>
              <div matListItemLine>{{ activity.userName }} • {{ activity.timestamp | timeAgo }}</div>
            </mat-list-item>
          </mat-list>
        </mat-card-content>
      </mat-card>
      
      <!-- Quick Actions -->
      <mat-card class="quick-actions">
        <mat-card-header>
          <mat-card-title>Quick Actions</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <button mat-raised-button color="primary" routerLink="/admin/users">
            <mat-icon>person</mat-icon>
            Manage Users
          </button>
          <button mat-raised-button color="primary" routerLink="/admin/apps">
            <mat-icon>apps</mat-icon>
            Manage Apps
          </button>
          <button mat-raised-button color="warn" routerLink="/admin/moderation">
            <mat-icon>flag</mat-icon>
            Content Moderation
          </button>
          <button mat-raised-button routerLink="/admin/reports">
            <mat-icon>assessment</mat-icon>
            View Reports
          </button>
        </mat-card-content>
      </mat-card>
    </div>
  `
})
export class AdminDashboardComponent implements OnInit {
  overview: AdminOverview;
  
  constructor(private adminService: AdminDashboardService) {}
  
  ngOnInit(): void {
    this.loadOverview();
  }
  
  loadOverview(): void {
    this.adminService.getOverview().subscribe(overview => {
      this.overview = overview;
    });
  }
  
  getActivityIcon(action: string): string {
    const iconMap = {
      'UserBanned': 'block',
      'AppApproved': 'check_circle',
      'ReviewRejected': 'cancel',
      'AppFeatured': 'star'
    };
    return iconMap[action] || 'info';
  }
}
```

### Audit Log Viewer Component
```typescript
@Component({
  selector: 'app-audit-logs',
  template: `
    <div class="audit-logs">
      <h1>Audit Logs</h1>
      
      <!-- Filters -->
      <mat-form-field>
        <mat-label>Action Type</mat-label>
        <mat-select [(value)]="filterAction" (selectionChange)="loadLogs()">
          <mat-option value="">All</mat-option>
          <mat-option value="UserBanned">User Banned</mat-option>
          <mat-option value="AppApproved">App Approved</mat-option>
          <!-- More options -->
        </mat-select>
      </mat-form-field>
      
      <mat-form-field>
        <mat-label>Date Range</mat-label>
        <mat-date-range-input [rangePicker]="picker">
          <input matStartDate placeholder="Start date" [(ngModel)]="startDate">
          <input matEndDate placeholder="End date" [(ngModel)]="endDate">
        </mat-date-range-input>
        <mat-datepicker-toggle matSuffix [for]="picker"></mat-datepicker-toggle>
        <mat-date-range-picker #picker></mat-date-range-picker>
      </mat-form-field>
      
      <!-- Logs Table -->
      <table mat-table [dataSource]="logs" class="mat-elevation-z2">
        <ng-container matColumnDef="timestamp">
          <th mat-header-cell *matHeaderCellDef>Timestamp</th>
          <td mat-cell *matCellDef="let log">{{ log.timestamp | date:'medium' }}</td>
        </ng-container>
        
        <ng-container matColumnDef="user">
          <th mat-header-cell *matHeaderCellDef>User</th>
          <td mat-cell *matCellDef="let log">{{ log.userName }}</td>
        </ng-container>
        
        <ng-container matColumnDef="action">
          <th mat-header-cell *matHeaderCellDef>Action</th>
          <td mat-cell *matCellDef="let log">{{ log.action }}</td>
        </ng-container>
        
        <ng-container matColumnDef="entity">
          <th mat-header-cell *matHeaderCellDef>Entity</th>
          <td mat-cell *matCellDef="let log">{{ log.entityType }}</td>
        </ng-container>
        
        <ng-container matColumnDef="details">
          <th mat-header-cell *matHeaderCellDef>Details</th>
          <td mat-cell *matCellDef="let log">
            <button mat-icon-button (click)="viewDetails(log)">
              <mat-icon>info</mat-icon>
            </button>
          </td>
        </ng-container>
        
        <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
        <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
      </table>
      
      <mat-paginator [pageSizeOptions]="[20, 50, 100]"></mat-paginator>
    </div>
  `
})
export class AuditLogsComponent implements OnInit {
  logs: AuditLog[] = [];
  displayedColumns = ['timestamp', 'user', 'action', 'entity', 'details'];
  
  filterAction = '';
  startDate: Date;
  endDate: Date;
  
  constructor(
    private auditService: AuditLogService,
    private dialog: MatDialog
  ) {}
  
  ngOnInit(): void {
    this.loadLogs();
  }
  
  loadLogs(): void {
    this.auditService.getLogs({
      action: this.filterAction,
      startDate: this.startDate,
      endDate: this.endDate
    }).subscribe(logs => {
      this.logs = logs;
    });
  }
  
  viewDetails(log: AuditLog): void {
    this.dialog.open(AuditLogDetailsDialogComponent, {
      data: log,
      width: '600px'
    });
  }
}
```

---

## 🔗 Dependencies
- US8.1: User authentication & roles
- US9.4: Review moderation
- US11.5: App submission approval

---

## 📊 Definition of Done
- [ ] Admin dashboard complete
- [ ] User management CRUD working
- [ ] Content moderation queue functional
- [ ] App management interface complete
- [ ] Audit logging on all admin actions
- [ ] Audit log viewer working
- [ ] Platform reports generated
- [ ] All admin routes protected (role-based)
- [ ] Unit tests pass
- [ ] Security tested

---

**Created:** October 6, 2025  
**Owner:** Abubakr Abduraghman, a.abduraghman@itqan.dev  
**Epic:** [Epic 13: Content Management System](../epics/epic-13-content-management-admin.md)
