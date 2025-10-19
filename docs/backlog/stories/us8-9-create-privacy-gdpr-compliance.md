# US8.9: Create Privacy # US8.9: Create Privacy & GDPR Compliance GDPR Compliance (Django) Features

**Epic:** Epic 8 - User Accounts & Personalization
**Sprint:** Week 8, Day 3-4  
**Story Points:** 5  
**Priority:** P1  
**Assigned To:** Backend + Legal Consultant  
**Status:** Not Started

---

## 📋 User Story

**As a** User (especially in EU)  
**I want** control over my personal data and privacy  
**So that** my rights are protected and I comply with GDPR regulations

---

## 🎯 Acceptance Criteria

### AC1: Data Export (Right to Access)
- [ ] GET /api/users/me/export-data
- [ ] Returns all user data in JSON format
- [ ] Includes: profile, activities, reviews, favorites, collections
- [ ] Generated as downloadable file

### AC2: Account Deletion (Right to Erasure)
- [ ] POST /api/users/me/delete-account
- [ ] Soft delete with data anonymization
- [ ] Personal data removed/pseudonymized
- [ ] Reviews/content preserved but anonymized
- [ ] 30-day grace period (can undo)

### AC3: Data Retention Policies
- [ ] Activity logs: 90 days
- [ ] Search logs: 90 days
- [ ] Deleted accounts: 30-day grace, then purge
- [ ] Automated cleanup jobs (Hangfire)

### AC4: Cookie Consent Banner
- [ ] Cookie consent banner on first visit
- [ ] Accept/reject options
- [ ] Cookie preferences page
- [ ] Types: Essential, Analytics, Marketing

### AC5: Privacy Policy & Terms
- [ ] Privacy policy page
- [ ] Terms of service page
- [ ] User must accept on registration
- [ ] Version tracking (user accepts specific version)
- [ ] Re-acceptance required on major updates

### AC6: Data Processing Agreements
- [ ] List of third-party processors (SendGrid, Cloudflare, etc.)
- [ ] Purpose of each processor documented
- [ ] Data transfer mechanisms documented

### AC7: User Consent Management
- [ ] Email marketing consent (opt-in)
- [ ] Analytics tracking consent
- [ ] Notification preferences
- [ ] Audit log of consent changes

---

## 📝 Technical Notes

### ViewSet
```python
class PrivacyViewSet(viewsets.ModelViewSet):
{
    
    def  ExportData()
    {
        var userId = request.user.id;
        var user = await _userManager.FindByIdAsync(userId);
        
        if (user == null)
        
        var exportData = await _privacyService.ExportUserDataAsync(uuid.UUID(userId));
        
        var json = JsonSerializer.Serialize(exportData, new JsonSerializerOptions
        {
            WriteIndented = true
        });
        
        var bytes = Encoding.UTF8.GetBytes(json);
        
        return File(bytes, "application/json", $"quran-apps-data-export-{DateTime.UtcNow:yyyyMMdd}.json");
    }
    
    {
        var userId = request.user.id;
        var user = await _userManager.FindByIdAsync(userId);
        
        if (user == null)
        
        // Verify password
        var passwordValid = await _userManager.CheckPasswordAsync(user, dto.Password);
        if (!passwordValid)
        
        // Schedule deletion (30-day grace period)
        await _privacyService.ScheduleAccountDeletionAsync(uuid.UUID(userId));
        
        return Ok(new
        {
            message = "Account scheduled for deletion in 30 days",
            deletionDate = DateTime.UtcNow.AddDays(30)
        });
    }
    
    def  CancelDeletion()
    {
        var userId = request.user.id;
        
        await _privacyService.CancelAccountDeletionAsync(uuid.UUID(userId));
        
        return Ok(new { message = "Account deletion cancelled" });
    }
    
    def <UserConsentDto>> GetConsent()
    {
        var userId = request.user.id;
        
        var consent = await _privacyService.GetUserConsentAsync(uuid.UUID(userId));
        
        return Ok(consent);
    }
    
    {
        var userId = request.user.id;
        
        await _privacyService.UpdateUserConsentAsync(uuid.UUID(userId), dto);
        
        return Ok(new { message = "Consent preferences updated" });
    }
}
```

### Privacy Service
```python
public interface IPrivacyService
{
    Task<UserDataExport> ExportUserDataAsync(Guid userId);
    Task ScheduleAccountDeletionAsync(Guid userId);
    Task CancelAccountDeletionAsync(Guid userId);
    Task AnonymizeUserDataAsync(Guid userId);
    Task<UserConsentDto> GetUserConsentAsync(Guid userId);
    Task UpdateUserConsentAsync(Guid userId, UpdateConsentDto dto);
}

public class PrivacyService : IPrivacyService
{
    public async Task<UserDataExport> ExportUserDataAsync(Guid userId)
    {
        var user = await _context.Users
            .Include(u => u.Favorites)
            .Include(u => u.Reviews)
            .Include(u => u.Collections)
            .FirstOrDefaultAsync(u => u.Id == userId);
        
        if (user == null)
            return null;
        
        var activities = await _context.UserActivities
            .Where(a => a.UserId == userId)
            .OrderByDescending(a => a.Timestamp)
            .Take(1000) // Last 1000 activities
            .ToListAsync();
        
        return new UserDataExport
        {
            ExportDate = DateTime.UtcNow,
            Profile = new
            {
                user.Email,
                user.FullName,
                user.PreferredLanguage,
                user.CreatedAt
            },
            Favorites = user.Favorites.Select(f => new
            {
                AppId = f.AppId,
                AddedAt = f.CreatedAt
            }).ToList(),
            Reviews = user.Reviews.Select(r => new
            {
                AppId = r.AppId,
                Rating = r.Rating,
                r.Comment,
                r.CreatedAt
            }).ToList(),
            Collections = user.Collections.Select(c => new
            {
                c.Name,
                c.Description,
                AppCount = c.AppCollections.Count,
                c.CreatedAt
            }).ToList(),
            Activities = activities.Select(a => new
            {
                a.ActivityType,
                a.EntityType,
                a.Timestamp
            }).ToList()
        };
    }
    
    public async Task ScheduleAccountDeletionAsync(Guid userId)
    {
        var user = await _context.Users.FindAsync(userId);
        if (user == null)
            return;
        
        user.DeletionScheduledAt = DateTime.UtcNow;
        user.DeletionDate = DateTime.UtcNow.AddDays(30);
        
        await _context.SaveChangesAsync();
        
        // Send confirmation email
        await _emailService.SendAccountDeletionScheduledAsync(user.Email, user.DeletionDate.Value);
        
        // Schedule background job
        BackgroundJob.Schedule<PrivacyBackgroundJobs>(
            jobs => jobs.ExecuteAccountDeletion(userId),
            user.DeletionDate.Value);
    }
    
    public async Task AnonymizeUserDataAsync(Guid userId)
    {
        var user = await _context.Users.FindAsync(userId);
        if (user == null)
            return;
        
        // Anonymize personal data
        user.Email = $"deleted_{userId}@anonymized.com";
        user.UserName = user.Email;
        user.FullName = "[Deleted User]";
        user.ProfilePictureUrl = null;
        user.PhoneNumber = null;
        user.EmailVerified = false;
        user.LockoutEnd = DateTimeOffset.MaxValue;
        
        // Anonymize reviews (keep content but remove identity)
        var reviews = await _context.Reviews.Where(r => r.UserId == userId).ToListAsync();
        foreach (var review in reviews)
        {
            review.UserId = Guid.Empty; // Or a special "Anonymous" user ID
        }
        
        // Delete sensitive data
        var activities = await _context.UserActivities.Where(a => a.UserId == userId).ToListAsync();
        _context.UserActivities.RemoveRange(activities);
        
        var notifications = await _context.Notifications.Where(n => n.UserId == userId).ToListAsync();
        _context.Notifications.RemoveRange(notifications);
        
        await _context.SaveChangesAsync();
        
        _logger.LogInformation("User {UserId} data anonymized", userId);
    }
    
    public async Task<UserConsentDto> GetUserConsentAsync(Guid userId)
    {
        var user = await _context.Users.FindAsync(userId);
        
        return new UserConsentDto
        {
            EmailMarketingConsent = user.EmailMarketingConsent,
            AnalyticsConsent = user.AnalyticsConsent,
            EmailNotificationsEnabled = user.EmailNotificationsEnabled,
            ConsentVersion = user.TermsAcceptedVersion,
            ConsentDate = user.TermsAcceptedAt
        };
    }
    
    public async Task UpdateUserConsentAsync(Guid userId, UpdateConsentDto dto)
    {
        var user = await _context.Users.FindAsync(userId);
        
        user.EmailMarketingConsent = dto.EmailMarketingConsent;
        user.AnalyticsConsent = dto.AnalyticsConsent;
        user.EmailNotificationsEnabled = dto.EmailNotificationsEnabled;
        
        // Log consent change
        var consentLog = new ConsentLog
        {
            UserId = userId,
            ConsentType = "preferences_update",
            ConsentGiven = true,
            Timestamp = DateTime.UtcNow,
            MetadataJson = JsonSerializer.Serialize(dto)
        };
        
        await _context.ConsentLogs.AddAsync(consentLog);
        await _context.SaveChangesAsync();
    }
}
```

### Data Retention Background Job
```python
public class DataRetentionJobs
{
    [AutomaticRetry(Attempts = 0)]
    public async Task CleanupOldActivities()
    {
        var cutoffDate = DateTime.UtcNow.AddDays(-90);
        
        await _context.UserActivities
            .Where(a => a.Timestamp < cutoffDate)
            .ExecuteDeleteAsync();
        
        _logger.LogInformation("Cleaned up activities older than 90 days");
    }
    
    [AutomaticRetry(Attempts = 0)]
    public async Task CleanupOldSearchLogs()
    {
        var cutoffDate = DateTime.UtcNow.AddDays(-90);
        
        await _context.SearchLogs
            .Where(s => s.Timestamp < cutoffDate)
            .ExecuteDeleteAsync();
        
        _logger.LogInformation("Cleaned up search logs older than 90 days");
    }
}

// Schedule in Program.cs
RecurringJob.AddOrUpdate<DataRetentionJobs>(
    "cleanup-old-activities",
    jobs => jobs.CleanupOldActivities(),
    Cron.Daily);
```

### Cookie Consent Component (Frontend)
```typescript
@Component({
  selector: 'app-cookie-consent',
  template: `
    <div class="cookie-banner" *ngIf="!consentGiven">
      <p>We use cookies to improve your experience. 
         <a routerLink="/privacy">Learn more</a>
      </p>
      <button mat-button (click)="acceptAll()">Accept All</button>
      <button mat-stroked-button (click)="rejectNonEssential()">Essential Only</button>
      <button mat-stroked-button (click)="showPreferences()">Customize</button>
    </div>
  `
})
export class CookieConsentComponent {
  consentGiven = false;
  
  ngOnInit(): void {
    this.consentGiven = localStorage.getItem('cookie_consent') !== null;
  }
  
  acceptAll(): void {
    localStorage.setItem('cookie_consent', JSON.stringify({
      essential: true,
      analytics: true,
      marketing: true
    }));
    this.consentGiven = true;
  }
  
  rejectNonEssential(): void {
    localStorage.setItem('cookie_consent', JSON.stringify({
      essential: true,
      analytics: false,
      marketing: false
    }));
    this.consentGiven = true;
  }
}
```

---

## 🔗 Dependencies
- US8.4: User Profile Management
- Legal consultation for GDPR compliance

---

## 📊 Definition of Done
- [ ] Data export working
- [ ] Account deletion with grace period
- [ ] Data retention policies implemented
- [ ] Cookie consent banner working
- [ ] Privacy policy and terms pages
- [ ] Consent management working
- [ ] GDPR compliance verified
- [ ] Legal review completed

---

**Created:** October 6, 2025  
**Updated:** October 19, 2025 (Django alignment)**Owner:** Abubakr Abduraghman, a.abduraghman@itqan.dev  
**Epic:** [Epic 8: User Accounts & Personalization](../epics/epic-8-user-accounts-personalization.md)
