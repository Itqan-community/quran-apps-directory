# US9.4: Implement Review Moderation System

**Epic:** Epic 9 - User Reviews & Ratings System  
**Sprint:** Week 9, Day 3  
**Story Points:** 5  
**Priority:** P2  
**Assigned To:** Backend Developer  
**Status:** Not Started

---

## 📋 User Story

**As an** Admin  
**I want** to moderate user reviews  
**So that** inappropriate content can be removed and quality maintained

---

## 🎯 Acceptance Criteria

### AC1: Moderation Queue Endpoint
- [ ] GET /api/admin/reviews/pending
- [ ] Returns reviews needing moderation
- [ ] Paginated list
- [ ] Filter by reported, flagged, auto-detected

### AC2: Approve Review Endpoint
- [ ] POST /api/admin/reviews/{id}/approve
- [ ] Sets IsApproved = true
- [ ] Logs moderation action
- [ ] Recalculates app rating

### AC3: Reject Review Endpoint
- [ ] POST /api/admin/reviews/{id}/reject
- [ ] Requires rejection reason
- [ ] Sets IsApproved = false
- [ ] Notifies user
- [ ] Excludes from rating calculation

### AC4: Flag Review (User Report)
- [ ] POST /api/reviews/{id}/flag
- [ ] Requires flagging reason
- [ ] Adds to moderation queue
- [ ] Rate limit: 10 flags per day per user

### AC5: Auto-Moderation Rules
- [ ] Profanity detection (basic filter)
- [ ] Spam detection (repeated text, links)
- [ ] Length validation
- [ ] Sentiment analysis (optional, ML.NET)

### AC6: Admin Dashboard View
- [ ] List of pending reviews
- [ ] Review details with context (app name, user)
- [ ] Quick actions (Approve/Reject)
- [ ] Moderation history

---

## 📝 Technical Notes

### Admin Reviews Controller
```csharp
[ApiController]
[Route("api/admin/reviews")]
[Authorize(Roles = "Admin")]
public class AdminReviewsController : ControllerBase
{
    private readonly IReviewModerationService _moderationService;
    
    [HttpGet("pending")]
    [ProducesResponseType(typeof(PagedResult<PendingReviewDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<PagedResult<PendingReviewDto>>> GetPendingReviews(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] string filter = "all")
    {
        var pending = await _moderationService.GetPendingReviewsAsync(
            page, pageSize, filter);
        
        return Ok(pending);
    }
    
    [HttpPost("{id:guid}/approve")]
    public async Task<IActionResult> ApproveReview(Guid id)
    {
        var moderatorId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        
        await _moderationService.ApproveReviewAsync(
            id, Guid.Parse(moderatorId));
        
        return Ok(new { message = "Review approved" });
    }
    
    [HttpPost("{id:guid}/reject")]
    public async Task<IActionResult> RejectReview(
        Guid id,
        [FromBody] RejectReviewDto dto)
    {
        var moderatorId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        
        await _moderationService.RejectReviewAsync(
            id, Guid.Parse(moderatorId), dto.Reason);
        
        return Ok(new { message = "Review rejected" });
    }
}

[ApiController]
[Route("api/reviews")]
public class ReviewFlaggingController : ControllerBase
{
    [HttpPost("{id:guid}/flag")]
    [Authorize]
    public async Task<IActionResult> FlagReview(
        Guid id,
        [FromBody] FlagReviewDto dto)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        
        await _moderationService.FlagReviewAsync(
            id, Guid.Parse(userId), dto.Reason);
        
        return Ok(new { message = "Review flagged for moderation" });
    }
}
```

### Review Moderation Service
```csharp
public interface IReviewModerationService
{
    Task<PagedResult<PendingReviewDto>> GetPendingReviewsAsync(
        int page, int pageSize, string filter);
    Task ApproveReviewAsync(Guid reviewId, Guid moderatorId);
    Task RejectReviewAsync(Guid reviewId, Guid moderatorId, string reason);
    Task FlagReviewAsync(Guid reviewId, Guid userId, string reason);
    Task<bool> AutoModerateReviewAsync(Review review);
}

public class ReviewModerationService : IReviewModerationService
{
    private readonly ApplicationDbContext _context;
    private readonly INotificationService _notificationService;
    
    public async Task<PagedResult<PendingReviewDto>> GetPendingReviewsAsync(
        int page,
        int pageSize,
        string filter)
    {
        var query = _context.Reviews
            .Include(r => r.User)
            .Include(r => r.App)
            .Where(r => !r.IsDeleted);
        
        query = filter?.ToLower() switch
        {
            "flagged" => query.Where(r => r.IsFlagged),
            "pending" => query.Where(r => !r.IsModerated),
            _ => query.Where(r => !r.IsModerated || r.IsFlagged)
        };
        
        var totalCount = await query.CountAsync();
        
        var reviews = await query
            .OrderBy(r => r.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(r => new PendingReviewDto
            {
                Id = r.Id,
                AppId = r.AppId,
                AppName = r.App.NameEn,
                UserId = r.UserId,
                UserName = r.User.FullName,
                Rating = r.Rating,
                Comment = r.Comment,
                CreatedAt = r.CreatedAt,
                IsFlagged = r.IsFlagged,
                FlagCount = r.FlagCount
            })
            .ToListAsync();
        
        return new PagedResult<PendingReviewDto>
        {
            Items = reviews,
            TotalCount = totalCount,
            Page = page,
            PageSize = pageSize
        };
    }
    
    public async Task ApproveReviewAsync(Guid reviewId, Guid moderatorId)
    {
        var review = await _context.Reviews.FindAsync(reviewId);
        if (review == null) return;
        
        review.IsModerated = true;
        review.IsApproved = true;
        
        // Log moderation action
        var moderationLog = new ReviewModeration
        {
            Id = Guid.NewGuid(),
            ReviewId = reviewId,
            ModeratorId = moderatorId,
            Action = "Approved",
            CreatedAt = DateTime.UtcNow
        };
        
        await _context.ReviewModerations.AddAsync(moderationLog);
        await _context.SaveChangesAsync();
        
        // Recalculate app rating
        await _ratingService.RecalculateAppRatingAsync(review.AppId);
    }
    
    public async Task RejectReviewAsync(
        Guid reviewId,
        Guid moderatorId,
        string reason)
    {
        var review = await _context.Reviews
            .Include(r => r.User)
            .FirstOrDefaultAsync(r => r.Id == reviewId);
        
        if (review == null) return;
        
        review.IsModerated = true;
        review.IsApproved = false;
        
        var moderationLog = new ReviewModeration
        {
            Id = Guid.NewGuid(),
            ReviewId = reviewId,
            ModeratorId = moderatorId,
            Action = "Rejected",
            Reason = reason,
            CreatedAt = DateTime.UtcNow
        };
        
        await _context.ReviewModerations.AddAsync(moderationLog);
        await _context.SaveChangesAsync();
        
        // Notify user
        await _notificationService.CreateNotificationAsync(
            review.UserId,
            NotificationTypes.ReviewRejected,
            "Review Not Approved",
            $"Your review was not approved. Reason: {reason}");
        
        // Recalculate app rating (excluded review)
        await _ratingService.RecalculateAppRatingAsync(review.AppId);
    }
    
    public async Task FlagReviewAsync(Guid reviewId, Guid userId, string reason)
    {
        var review = await _context.Reviews.FindAsync(reviewId);
        if (review == null) return;
        
        review.IsFlagged = true;
        review.FlagCount++;
        
        var flag = new ReviewFlag
        {
            Id = Guid.NewGuid(),
            ReviewId = reviewId,
            UserId = userId,
            Reason = reason,
            CreatedAt = DateTime.UtcNow
        };
        
        await _context.ReviewFlags.AddAsync(flag);
        await _context.SaveChangesAsync();
    }
    
    public async Task<bool> AutoModerateReviewAsync(Review review)
    {
        var issues = new List<string>();
        
        // Check for profanity
        if (ContainsProfanity(review.Comment))
        {
            issues.Add("Contains inappropriate language");
        }
        
        // Check for spam (repeated characters)
        if (IsSpam(review.Comment))
        {
            issues.Add("Suspected spam");
        }
        
        // Check for external links
        if (ContainsLinks(review.Comment))
        {
            issues.Add("Contains external links");
        }
        
        if (issues.Any())
        {
            review.IsModerated = false; // Queue for manual review
            review.IsFlagged = true;
            review.AutoModerationFlags = string.Join(", ", issues);
            return false; // Requires manual review
        }
        
        // Auto-approve if passes all checks
        review.IsModerated = true;
        review.IsApproved = true;
        return true;
    }
    
    private bool ContainsProfanity(string text)
    {
        if (string.IsNullOrEmpty(text)) return false;
        
        var profanityList = new[] { "badword1", "badword2" }; // Load from config
        return profanityList.Any(word => 
            text.Contains(word, StringComparison.OrdinalIgnoreCase));
    }
    
    private bool IsSpam(string text)
    {
        if (string.IsNullOrEmpty(text)) return false;
        
        // Check for repeated characters (e.g., "aaaaaaa")
        var repeatedPattern = new Regex(@"(.)\1{10,}");
        return repeatedPattern.IsMatch(text);
    }
    
    private bool ContainsLinks(string text)
    {
        if (string.IsNullOrEmpty(text)) return false;
        
        var urlPattern = new Regex(@"https?://|www\.");
        return urlPattern.IsMatch(text);
    }
}
```

---

## 🔗 Dependencies
- US9.2: Review submission API
- US8.8: Notification system

---

## 📊 Definition of Done
- [ ] Moderation endpoints implemented
- [ ] Auto-moderation rules working
- [ ] Flag system functional
- [ ] Admin dashboard accessible
- [ ] Notifications sent to users
- [ ] Unit tests pass
- [ ] Security tested

---

**Created:** October 6, 2025  
**Owner:** Abubakr Abduraghman, a.abduraghman@itqan.dev  
**Epic:** [Epic 9: User Reviews & Ratings](../epics/epic-9-user-reviews-ratings-system.md)
