# Epic 13: Content Management System (Admin)

## 📋 Epic Overview
Build a comprehensive admin dashboard for platform administrators to manage users, moderate content, review submissions, and monitor platform health.

## 🎯 Goal
Empower admins with efficient tools to manage the platform at scale while maintaining quality and security.

## 📊 Success Metrics
- Admin task completion time <5 minutes average
- Content moderation queue <48 hours
- Platform health visibility 100%
- Admin satisfaction score >8/10
- Zero unauthorized access incidents

## 🏗️ Technical Scope (Django)
- Admin dashboard with metrics
- User management (CRUD, roles, bans)
- Content moderation queue
- App submission review workflow
- Review moderation system
- Platform analytics and reports
- Audit log system
- Bulk operations support

## 🔗 Dependencies
- Epic 11: Submission workflow
- Epic 9: Review system
- Epic 8: User authentication with roles

## 📈 Business Value
- Critical: Platform governance and quality
- Impact: Scales admin operations
- Effort: 4-5 days implementation

## ✅ Definition of Done
- Admin dashboard displays key metrics
- User management functional
- Moderation queue operational
- Audit logs captured
- Role-based access working
- Performance optimized
- Mobile-responsive admin UI

## Related Stories
- US13.1: Admin Dashboard with Metrics
- US13.2: User Management System
- US13.3: Content Moderation Queue
- US13.4: App Submission Review Interface
- US13.5: Audit Log System
- US13.6: Platform Reports & Analytics

## Django Implementation Details
### Entity Models
```python
public class AuditLog
{
    public Guid Id { get; set; }
    public Guid? UserId { get; set; }
    public string Action { get; set; } = string.Empty; // "UserBanned", "AppApproved", etc.
    public string Entity { get; set; } = string.Empty; // "User", "App", "Review"
    public Guid? EntityId { get; set; }
    public string? OldValue { get; set; } // JSON
    public string? NewValue { get; set; } // JSON
    public string? IpAddress { get; set; }
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
    
    public ApplicationUser? User { get; set; }
}

public class ModerationQueue
{
    public Guid Id { get; set; }
    public ModerationItemType ItemType { get; set; }
    public Guid ItemId { get; set; }
    public ModerationStatus Status { get; set; } = ModerationStatus.Pending;
    public ModerationPriority Priority { get; set; } = ModerationPriority.Normal;
    public string? ReportReason { get; set; }
    public Guid? ReportedByUserId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public Guid? AssignedToUserId { get; set; }
    public DateTime? ReviewedAt { get; set; }
    public Guid? ReviewedByUserId { get; set; }
    public string? ReviewNotes { get; set; }
    
    public ApplicationUser? ReportedBy { get; set; }
    public ApplicationUser? AssignedTo { get; set; }
    public ApplicationUser? ReviewedBy { get; set; }
}

public enum ModerationItemType
{
    AppSubmission,
    Review,
    User,
    Comment
}

public enum ModerationStatus
{
    Pending,
    InReview,
    Approved,
    Rejected,
    Escalated
}

public enum ModerationPriority
{
    Low,
    Normal,
    High,
    Critical
}
```

### AdminViewSet
```python
[ApiViewSet]
public class AdminViewSet : ViewSetBase
{
    
    public async Task<Response<AdminDashboardResponse>> GetDashboard()
    {
        var dashboard = await _adminService.GetDashboardMetricsAsync();
        return Ok(dashboard);
    }
    
    public async Task<Response<PaginatedResponse<UserResponse>>> GetUsers(
    {
        var users = await _adminService.GetUsersAsync(request);
        return Ok(users);
    }
    
    public async Task<IResponse> BanUser(
        Guid userId,
    {
        var adminId = GetUserId();
        await _adminService.BanUserAsync(userId, request.Reason, request.DurationDays);
        
        await _auditLogService.LogAsync(new AuditLog
        {
            UserId = adminId,
            Action = "UserBanned",
            Entity = "User",
            EntityId = userId,
            NewValue = JsonSerializer.Serialize(new { request.Reason, request.DurationDays })
        });
        
        return NoContent();
    }
    
    public async Task<IResponse> ChangeUserRole(
        Guid userId,
    {
        var adminId = GetUserId();
        await _adminService.ChangeUserRoleAsync(userId, request.Role);
        
        await _auditLogService.LogAsync(new AuditLog
        {
            UserId = adminId,
            Action = "RoleChanged",
            Entity = "User",
            EntityId = userId,
            NewValue = request.Role
        });
        
        return NoContent();
    }
    
    public async Task<Response<PaginatedResponse<ModerationQueueItemResponse>>> GetModerationQueue(
    {
        var queue = await _adminService.GetModerationQueueAsync(filter);
        return Ok(queue);
    }
    
    public async Task<IResponse> AssignModerationItem(Guid id)
    {
        var adminId = GetUserId();
        await _adminService.AssignModerationItemAsync(id, adminId);
        return NoContent();
    }
    
    public async Task<IResponse> ReviewModerationItem(
        Guid id,
    {
        var adminId = GetUserId();
        await _adminService.ReviewModerationItemAsync(id, adminId, request);
        
        await _auditLogService.LogAsync(new AuditLog
        {
            UserId = adminId,
            Action = "ModerationReviewed",
            Entity = "ModerationQueue",
            EntityId = id,
            NewValue = JsonSerializer.Serialize(request)
        });
        
        return NoContent();
    }
    
    public async Task<Response<PaginatedResponse<AuditLogResponse>>> GetAuditLogs(
    {
        var logs = await _auditLogService.GetLogsAsync(request);
        return Ok(logs);
    }
    
    public async Task<Response<PlatformHealthReport>> GetPlatformHealth()
    {
        var report = await _adminService.GetPlatformHealthReportAsync();
        return Ok(report);
    }
    
    public async Task<Response<UserGrowthReport>> GetUserGrowth(
    {
        var report = await _adminService.GetUserGrowthReportAsync(startDate, endDate);
        return Ok(report);
    }
}
```

### AdminService
```python
public class AdminService : IAdminService
{
    
    public async Task<AdminDashboardResponse> GetDashboardMetricsAsync()
    {
        var now = DateTime.UtcNow;
        var last24Hours = now.AddDays(-1);
        var last30Days = now.AddDays(-30);
        
        return new AdminDashboardResponse
        {
            TotalUsers = await _context.Users.CountAsync(),
            NewUsersLast24Hours = await _context.Users.CountAsync(u => u.CreatedAt >= last24Hours),
            TotalApps = await _context.Apps.CountAsync(),
            PendingSubmissions = await _context.AppSubmissions.CountAsync(s => s.Status == SubmissionStatus.Submitted),
            PendingReviews = await _context.Reviews.CountAsync(r => r.Status == ReviewStatus.Pending),
            ModerationQueueSize = await _context.ModerationQueue.CountAsync(m => m.Status == ModerationStatus.Pending),
            TotalPageViews30Days = await _context.AnalyticsEvents
                .CountAsync(e => e.Timestamp >= last30Days && e.EventType == AnalyticsEventType.PageView),
            AverageResponseTime = await CalculateAverageResponseTimeAsync(),
            SystemHealth = await GetSystemHealthStatusAsync()
        };
    }
    
    public async Task<PaginatedResponse<UserResponse>> GetUsersAsync(GetUsersRequest request)
    {
        var query = _context.Users.AsQueryable();
        
        if (!string.IsNullOrEmpty(request.SearchTerm))
        {
            query = query.Where(u => 
                u.Name!.Contains(request.SearchTerm) ||
                u.Email!.Contains(request.SearchTerm));
        }
        
        if (request.Role != null)
        {
            var usersInRole = await _userManager.GetUsersInRoleAsync(request.Role);
            var userIds = usersInRole.Select(u => u.Id).ToList();
            query = query.Where(u => userIds.Contains(u.Id));
        }
        
        var total = await query.CountAsync();
        var users = await query
            .OrderByDescending(u => u.CreatedAt)
            .Skip((request.Page - 1) * request.PageSize)
            .Take(request.PageSize)
            .ToListAsync();
        
        var userResponses = new List<UserResponse>();
        foreach (var user in users)
        {
            var roles = await _userManager.GetRolesAsync(user);
            userResponses.Add(new UserResponse
            {
                Id = user.Id,
                Name = user.Name!,
                Email = user.Email!,
                Roles = roles.ToList(),
                CreatedAt = user.CreatedAt,
                LastLoginAt = user.LastLoginAt
            });
        }
        
        return new PaginatedResponse<UserResponse>
        {
            Items = userResponses,
            Page = request.Page,
            PageSize = request.PageSize,
            TotalCount = total
        };
    }
    
    public async Task BanUserAsync(Guid userId, string reason, int? durationDays)
    {
        var user = await _userManager.FindByIdAsync(userId.ToString());
        if (user == null)
            throw new NotFoundException("User not found");
        
        // Set lockout
        var lockoutEnd = durationDays.HasValue
            ? DateTimeOffset.UtcNow.AddDays(durationDays.Value)
            : DateTimeOffset.MaxValue;
        
        await _userManager.SetLockoutEndDateAsync(user, lockoutEnd);
        await _userManager.SetLockoutEnabledAsync(user, true);
        
        // Send notification email
        // await _emailService.SendBanNotificationAsync(user.Email!, reason, durationDays);
    }
    
    public async Task<PaginatedResponse<ModerationQueueItemResponse>> GetModerationQueueAsync(
        ModerationQueueFilter filter)
    {
        var query = _context.ModerationQueue
            .Include(m => m.ReportedBy)
            .Include(m => m.AssignedTo)
            .AsQueryable();
        
        if (filter.Status.HasValue)
        {
            query = query.Where(m => m.Status == filter.Status.Value);
        }
        
        if (filter.ItemType.HasValue)
        {
            query = query.Where(m => m.ItemType == filter.ItemType.Value);
        }
        
        if (filter.AssignedToMe)
        {
            query = query.Where(m => m.AssignedToUserId == filter.CurrentUserId);
        }
        
        var total = await query.CountAsync();
        var items = await query
            .OrderByDescending(m => m.Priority)
            .ThenBy(m => m.CreatedAt)
            .Skip((filter.Page - 1) * filter.PageSize)
            .Take(filter.PageSize)
            .ToListAsync();
        
        return new PaginatedResponse<ModerationQueueItemResponse>
        {
            Items = _mapper.Map<List<ModerationQueueItemResponse>>(items),
            Page = filter.Page,
            PageSize = filter.PageSize,
            TotalCount = total
        };
    }
}
```

### Frontend Admin Dashboard
```typescript
// admin-dashboard.component.ts
@Component({
  selector: 'app-admin-dashboard',
  templateUrl: './admin-dashboard.component.html'
})
export class AdminDashboardComponent implements OnInit {
  dashboardMetrics$: Observable<AdminDashboard>;
  moderationQueue$: Observable<ModerationQueueItem[]>;
  
  constructor(
    private adminService: AdminService,
    private modal: NzModalService
  ) {}
  
  ngOnInit() {
    this.loadDashboard();
    this.loadModerationQueue();
    
    // Refresh every 30 seconds
    interval(30000).subscribe(() => this.loadDashboard());
  }
  
  loadDashboard() {
    this.dashboardMetrics$ = this.adminService.getDashboardMetrics();
  }
  
  banUser(userId: string) {
    this.modal.confirm({
      nzTitle: 'Ban User',
      nzContent: 'Are you sure you want to ban this user?',
      nzOnOk: () => {
        return this.adminService.banUser(userId, 'Violation of terms', 30)
          .toPromise();
      }
    });
  }
  
  reviewSubmission(submissionId: string) {
    // Navigate to review interface
    this.router.navigate(['/admin/submissions', submissionId]);
  }
}
```

## Priority
priority-2 (Phase 3 - Developer Ecosystem)
