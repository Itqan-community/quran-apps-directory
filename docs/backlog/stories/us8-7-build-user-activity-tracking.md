# US8.7: Build User Activity Tracking (Django Signals)

**Epic:** Epic 8 - User Accounts & Personalization
**Sprint:** Week 8, Day 2  
**Story Points:** 3  
**Priority:** P2  
**Assigned To:** Backend Developer  
**Status:** Not Started

---

## 📋 User Story

**As a** Product Manager  
**I want** to track user activities and engagement  
**So that** I can understand user behavior and improve the platform

---

## 🎯 Acceptance Criteria

### AC1: Activity Tracking Entity
- [ ] `UserActivity` table created
- [ ] Fields: UserId, ActivityType, EntityId, EntityType, Metadata (JSON), Timestamp
- [ ] Activity types: AppView, AppShare, FavoriteAdd, ReviewSubmit, SearchPerform, etc.
- [ ] Indexes on UserId + Timestamp

### AC2: Activity Logging Service
- [ ] `IActivityService` interface
- [ ] Methods: `LogActivity(userId, type, entityId, metadata)`
- [ ] Async/fire-and-forget logging
- [ ] Batch insert for performance

### AC3: Activity Endpoints (Admin)
- [ ] GET /api/admin/activities
- [ ] Filter by user, date range, activity type
- [ ] Pagination support
- [ ] Export to CSV

### AC4: User Activity Timeline
- [ ] GET /api/users/me/activity
- [ ] Returns user's recent activities (last 30 days)
- [ ] Grouped by date
- [ ] Paginated

### AC5: Analytics Aggregations
- [ ] Daily active users (DAU)
- [ ] Monthly active users (MAU)
- [ ] Most viewed apps
- [ ] Most active users
- [ ] Retention metrics

### AC6: Privacy Considerations
- [ ] No PII in activity logs
- [ ] User can delete activity history
- [ ] GDPR compliant data retention (90 days)
- [ ] Anonymized for analytics

---

## 📝 Technical Notes

### UserActivity Entity
```python
public class UserActivity
{
    public Guid Id { get; set; }
    
    [Required]
    public Guid UserId { get; set; }
    
    [Required]
    [MaxLength(50)]
    public string ActivityType { get; set; }
    
    public Guid? EntityId { get; set; }
    
    [MaxLength(50)]
    public string EntityType { get; set; } // App, Review, Collection, etc.
    
    [Column(TypeName = "jsonb")]
    public string MetadataJson { get; set; }
    
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
    
    // Navigation
    public ApplicationUser User { get; set; }
}

// Activity Types enum
public static class ActivityTypes
{
    public const string AppView = "app_view";
    public const string AppShare = "app_share";
    public const string FavoriteAdd = "favorite_add";
    public const string FavoriteRemove = "favorite_remove";
    public const string ReviewSubmit = "review_submit";
    public const string SearchPerform = "search_perform";
    public const string CollectionCreate = "collection_create";
    public const string ProfileUpdate = "profile_update";
}
```

### Activity Service
```python
public interface IActivityService
{
    Task LogActivityAsync(Guid userId, string activityType, Guid? entityId = null, 
        string entityType = null, object metadata = null);
    Task<List<UserActivityDto>> GetUserActivityAsync(Guid userId, int days = 30);
    Task DeleteUserActivityAsync(Guid userId);
}

public class ActivityService : IActivityService
{
    
    public ActivityService(
        ApplicationDbContext context,
        ILogger<ActivityService> logger)
    {
        _context = context;
        _logger = logger;
        
        // Create unbounded channel for activity queue
        _activityQueue = Channel.CreateUnbounded<UserActivity>();
        
        // Start background processor
        _ = ProcessActivityQueueAsync();
    }
    
    public async Task LogActivityAsync(
        Guid userId,
        string activityType,
        Guid? entityId = null,
        string entityType = null,
        object metadata = null)
    {
        try
        {
            var activity = new UserActivity
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                ActivityType = activityType,
                EntityId = entityId,
                EntityType = entityType,
                MetadataJson = metadata != null 
                    ? JsonSerializer.Serialize(metadata) 
                    : null,
                Timestamp = DateTime.UtcNow
            };
            
            // Queue for batch processing
            await _activityQueue.Writer.WriteAsync(activity);
        }
        catch (Exception ex)
        {
            // Don't throw - activity tracking shouldn't break app
            _logger.LogError(ex, "Failed to queue activity log");
        }
    }
    
    private async Task ProcessActivityQueueAsync()
    {
        var batch = new List<UserActivity>();
        var batchSize = 100;
        var batchTimeout = TimeSpan.FromSeconds(5);
        
        await foreach (var activity in _activityQueue.Reader.ReadAllAsync())
        {
            batch.Add(activity);
            
            if (batch.Count >= batchSize)
            {
                await SaveBatchAsync(batch);
                batch.Clear();
            }
        }
    }
    
    private async Task SaveBatchAsync(List<UserActivity> activities)
    {
        try
        {
            await _context.UserActivities.AddRangeAsync(activities);
            await _context.SaveChangesAsync();
            
            _logger.LogInformation("Saved {Count} activities to database", activities.Count);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to save activity batch");
        }
    }
    
    public async Task<List<UserActivityDto>> GetUserActivityAsync(Guid userId, int days = 30)
    {
        var cutoffDate = DateTime.UtcNow.AddDays(-days);
        
        var activities = await _context.UserActivities
            .Where(a => a.UserId == userId && a.Timestamp >= cutoffDate)
            .OrderByDescending(a => a.Timestamp)
            .Take(100)
            .Select(a => new UserActivityDto
            {
                ActivityType = a.ActivityType,
                EntityId = a.EntityId,
                EntityType = a.EntityType,
                Timestamp = a.Timestamp
            })
            .ToListAsync();
        
        return activities;
    }
    
    public async Task DeleteUserActivityAsync(Guid userId)
    {
        var activities = await _context.UserActivities
            .Where(a => a.UserId == userId)
            .ToListAsync();
        
        _context.UserActivities.RemoveRange(activities);
        await _context.SaveChangesAsync();
    }
}
```

### Middleware for Automatic Activity Tracking
```python
public class ActivityTrackingMiddleware
{
    
    public async Task InvokeAsync(HttpContext context, IActivityService activityService)
    {
        await _next(context);
        
        // Track specific endpoints
        var path = context.Request.Path.Value;
        
        if (context.User.Identity?.IsAuthenticated == true)
        {
            var userIdStr = context.request.user.id;
            if (Guid.TryParse(userIdStr, out var userId))
            {
                // Track app views
                if (path.StartsWith("/api/apps/") && context.Request.Method == "GET")
                {
                    var appId = ExtractAppId(path);
                    if (appId.HasValue)
                    {
                        _ = activityService.LogActivityAsync(
                            userId,
                            ActivityTypes.AppView,
                            appId,
                            "App");
                    }
                }
            }
        }
    }
    
    private Guid? ExtractAppId(string path)
    {
        var segments = path.Split('/');
        if (segments.Length >= 3 && Guid.TryParse(segments[3], out var id))
            return id;
        return null;
    }
}
```

### Analytics Service
```python
public class AnalyticsService
{
    public async Task<DailyActiveUsersDto> GetDAUAsync(DateTime date)
    {
        var startOfDay = date.Date;
        var endOfDay = startOfDay.AddDays(1);
        
        var count = await _context.UserActivities
            .Where(a => a.Timestamp >= startOfDay && a.Timestamp < endOfDay)
            .Select(a => a.UserId)
            .Distinct()
            .CountAsync();
        
        return new DailyActiveUsersDto
        {
            Date = date.Date,
            Count = count
        };
    }
    
    public async Task<MonthlyActiveUsersDto> GetMAUAsync(int year, int month)
    {
        var startOfMonth = new DateTime(year, month, 1);
        var endOfMonth = startOfMonth.AddMonths(1);
        
        var count = await _context.UserActivities
            .Where(a => a.Timestamp >= startOfMonth && a.Timestamp < endOfMonth)
            .Select(a => a.UserId)
            .Distinct()
            .CountAsync();
        
        return new MonthlyActiveUsersDto
        {
            Year = year,
            Month = month,
            Count = count
        };
    }
    
    public async Task<List<MostViewedAppDto>> GetMostViewedAppsAsync(int days = 30)
    {
        var cutoffDate = DateTime.UtcNow.AddDays(-days);
        
        var mostViewed = await _context.UserActivities
            .Where(a => a.ActivityType == ActivityTypes.AppView &&
                       a.Timestamp >= cutoffDate &&
                       a.EntityId != null)
            .GroupBy(a => a.EntityId)
            .Select(g => new
            {
                AppId = g.Key,
                ViewCount = g.Count()
            })
            .OrderByDescending(x => x.ViewCount)
            .Take(10)
            .ToListAsync();
        
        // Join with Apps to get names
        var result = new List<MostViewedAppDto>();
        foreach (var item in mostViewed)
        {
            var app = await _context.Apps.FindAsync(item.AppId);
            if (app != null)
            {
                result.Add(new MostViewedAppDto
                {
                    AppId = item.AppId.Value,
                    AppName = app.NameEn,
                    ViewCount = item.ViewCount
                });
            }
        }
        
        return result;
    }
}
```

---

## 🔗 Dependencies
- US8.1: django-allauth
- US8.2: JWT Auth

---

## 📊 Definition of Done
- [ ] UserActivity entity created
- [ ] Activity service implemented
- [ ] Batch processing working
- [ ] User activity timeline endpoint working
- [ ] Analytics aggregations implemented
- [ ] Admin activity dashboard
- [ ] Privacy controls in place
- [ ] Performance tested (handles high volume)

---

**Created:** October 6, 2025  
**Updated:** October 19, 2025 (Django alignment)**Owner:** Abubakr Abduraghman, a.abduraghman@itqan.dev  
**Epic:** [Epic 8: User Accounts & Personalization](../epics/epic-8-user-accounts-personalization.md)
