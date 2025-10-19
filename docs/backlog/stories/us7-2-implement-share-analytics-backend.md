# US7.2: Implement Share Analytics Backend

**Epic:** Epic 7 - Social Sharing & Community Features  
**Sprint:** Week 6, Day 1-2  
**Story Points:** 3  
**Priority:** P2  
**Assigned To:** Backend Developer  
**Status:** Not Started

---

## 📋 User Story

**As a** Product Manager  
**I want** to track how apps are being shared across social platforms  
**So that** I can measure virality and optimize sharing features

---

## 🎯 Acceptance Criteria

### AC1: Share Entity Created
- [ ] `Share` entity with properties:
  - Id (Guid)
  - AppId (Guid, FK)
  - Platform (string: whatsapp, facebook, twitter, etc.)
  - UserId (nullable Guid, FK)
  - SessionId (string)
  - Timestamp (DateTime)
  - UserAgent (string)
  - ReferrerUrl (string, nullable)
- [ ] Database migration created
- [ ] Django ORM navigation properties configured

### AC2: Share Tracking Endpoint
- [ ] POST /api/shares endpoint
- [ ] Accepts: AppId, Platform
- [ ] Returns: HTTP 202 (Accepted)
- [ ] Async processing (fire-and-forget)
- [ ] No authentication required

### AC3: Share Count Endpoint
- [ ] GET /api/apps/{id}/share-count
- [ ] Returns total shares by platform
- [ ] Response format:
```json
{
  "appId": "uuid",
  "totalShares": 150,
  "byPlatform": {
    "whatsapp": 80,
    "facebook": 40,
    "twitter": 20,
    "telegram": 10
  }
}
```
- [ ] Cached for 10 minutes

### AC4: Admin Analytics Endpoint
- [ ] GET /api/admin/shares/stats
- [ ] Requires admin authentication
- [ ] Returns:
  - Total shares (last 7/30/90 days)
  - Most shared apps
  - Most popular platforms
  - Sharing trends over time

### AC5: Database Indexes
- [ ] Index on (AppId, Timestamp)
- [ ] Index on Platform
- [ ] Composite index (AppId, Platform)

### AC6: Performance
- [ ] Share tracking endpoint < 50ms
- [ ] Non-blocking (async background job)
- [ ] Batch inserts if high volume

---

## 📝 Technical Notes

### Share Entity
```python
public class Share
{
    public Guid Id { get; set; }
    
    [Required]
    public Guid AppId { get; set; }
    
    [Required]
    [MaxLength(50)]
    public string Platform { get; set; } // whatsapp, facebook, twitter, etc.
    
    public Guid? UserId { get; set; }
    
    [Required]
    [MaxLength(100)]
    public string SessionId { get; set; }
    
    public DateTime Timestamp { get; set; }
    
    [MaxLength(500)]
    public string UserAgent { get; set; }
    
    [MaxLength(500)]
    public string ReferrerUrl { get; set; }
    
    // Navigation properties
    public App App { get; set; }
    public ApplicationUser User { get; set; }
}
```

### DbContext Configuration
```python
protected override void OnModelCreating(ModelBuilder modelBuilder)
{
    modelBuilder.Entity<Share>(entity =>
    {
        entity.HasKey(s => s.Id);
        
        entity.HasOne(s => s.App)
            .WithMany()
            .HasForeignKey(s => s.AppId)
            .OnDelete(DeleteBehavior.Cascade);
        
        entity.HasOne(s => s.User)
            .WithMany()
            .HasForeignKey(s => s.UserId)
            .OnDelete(DeleteBehavior.SetNull);
        
        entity.HasIndex(s => new { s.AppId, s.Timestamp });
        entity.HasIndex(s => s.Platform);
        entity.HasIndex(s => new { s.AppId, s.Platform });
        
        entity.Property(s => s.Timestamp)
            .HasDefaultValueSql("NOW()");
    });
}
```

### ViewSet
```python
class SharesViewSet(viewsets.ModelViewSet):
{
    
    [AllowAnonymous]
    {
        // Fire and forget - don't await
        _ = _sharesService.TrackShareAsync(new Share
        {
            Id = Guid.NewGuid(),
            AppId = dto.AppId,
            Platform = dto.Platform,
            UserId = User.Identity?.IsAuthenticated == true 
                ? uuid.UUID(request.user.id) 
                : null,
            SessionId = dto.SessionId,
            Timestamp = DateTime.UtcNow,
            UserAgent = Request.Headers["User-Agent"].ToString(),
            ReferrerUrl = Request.Headers["Referer"].ToString()
        });
        
        return Accepted();
    }
    
    [ResponseCache(Duration = 600)] // 10 minutes
    def <ShareCountResponse>> GetAppShareCount(Guid appId)
    {
        var shareCount = await _sharesService.GetAppShareCountAsync(appId);
        
        if (shareCount == null)
        
        return Ok(shareCount);
    }
    
    def <ShareStatsResponse>> GetShareStats(
    {
        var stats = await _sharesService.GetShareStatsAsync(days);
        
        return Ok(stats);
    }
}
```

### Shares Service
```python
public interface ISharesService
{
    Task TrackShareAsync(Share share);
    Task<ShareCountResponse> GetAppShareCountAsync(Guid appId);
    Task<ShareStatsResponse> GetShareStatsAsync(int days);
}

public class SharesService : ISharesService
{
    
    public async Task TrackShareAsync(Share share)
    {
        try
        {
            await _context.Shares.AddAsync(share);
            await _context.SaveChangesAsync();
        }
        catch (Exception ex)
        {
            // Log error but don't throw - tracking shouldn't break app
            _logger.LogError(ex, "Failed to track share for app {AppId}", share.AppId);
        }
    }
    
    public async Task<ShareCountResponse> GetAppShareCountAsync(Guid appId)
    {
        var shares = await _context.Shares
            .Where(s => s.AppId == appId)
            .GroupBy(s => s.Platform)
            .Select(g => new { Platform = g.Key, Count = g.Count() })
            .ToListAsync();
        
        if (!shares.Any())
            return null;
        
        var totalShares = shares.Sum(s => s.Count);
        var byPlatform = shares.ToDictionary(s => s.Platform, s => s.Count);
        
        return new ShareCountResponse
        {
            AppId = appId,
            TotalShares = totalShares,
            ByPlatform = byPlatform
        };
    }
    
    public async Task<ShareStatsResponse> GetShareStatsAsync(int days)
    {
        var cutoffDate = DateTime.UtcNow.AddDays(-days);
        
        var totalShares = await _context.Shares
            .Where(s => s.Timestamp >= cutoffDate)
            .CountAsync();
        
        var mostSharedApps = await _context.Shares
            .Where(s => s.Timestamp >= cutoffDate)
            .GroupBy(s => new { s.AppId, s.App.NameEn })
            .Select(g => new MostSharedApp
            {
                AppId = g.Key.AppId,
                AppName = g.Key.NameEn,
                ShareCount = g.Count()
            })
            .OrderByDescending(x => x.ShareCount)
            .Take(10)
            .ToListAsync();
        
        var platformStats = await _context.Shares
            .Where(s => s.Timestamp >= cutoffDate)
            .GroupBy(s => s.Platform)
            .Select(g => new { Platform = g.Key, Count = g.Count() })
            .OrderByDescending(x => x.Count)
            .ToDictionaryAsync(x => x.Platform, x => x.Count);
        
        var dailyShares = await _context.Shares
            .Where(s => s.Timestamp >= cutoffDate)
            .GroupBy(s => s.Timestamp.Date)
            .Select(g => new DailyShareCount
            {
                Date = g.Key,
                Count = g.Count()
            })
            .OrderBy(x => x.Date)
            .ToListAsync();
        
        return new ShareStatsResponse
        {
            TotalShares = totalShares,
            MostSharedApps = mostSharedApps,
            PlatformStats = platformStats,
            DailyShares = dailyShares,
            Period = $"Last {days} days"
        };
    }
}
```

### DTOs
```python
public class TrackShareDto
{
    [Required]
    public Guid AppId { get; set; }
    
    [Required]
    [MaxLength(50)]
    public string Platform { get; set; }
    
    [Required]
    [MaxLength(100)]
    public string SessionId { get; set; }
}

public class ShareCountResponse
{
    public Guid AppId { get; set; }
    public int TotalShares { get; set; }
    public Dictionary<string, int> ByPlatform { get; set; }
}

public class ShareStatsResponse
{
    public int TotalShares { get; set; }
    public List<MostSharedApp> MostSharedApps { get; set; }
    public Dictionary<string, int> PlatformStats { get; set; }
    public List<DailyShareCount> DailyShares { get; set; }
    public string Period { get; set; }
}

public class MostSharedApp
{
    public Guid AppId { get; set; }
    public string AppName { get; set; }
    public int ShareCount { get; set; }
}

public class DailyShareCount
{
    public DateTime Date { get; set; }
    public int Count { get; set; }
}
```

---

## 🔗 Dependencies
- US2.2: Django ORM configured
- US4.1: Apps API endpoints

---

## 📊 Definition of Done
- [ ] Share entity created
- [ ] Database migration applied
- [ ] Share tracking endpoint implemented
- [ ] Share count endpoint implemented
- [ ] Admin stats endpoint implemented
- [ ] Database indexes created
- [ ] Performance tested (< 50ms tracking)
- [ ] Unit tests written
- [ ] Integration tests pass

---

**Created:** October 6, 2025  
**Owner:** Abubakr Abduraghman, a.abduraghman@itqan.dev  
**Epic:** [Epic 7: Social Sharing & Community Features](../epics/epic-7-social-sharing-community-features.md)
