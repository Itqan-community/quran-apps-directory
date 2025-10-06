# Epic 9: User Reviews & Ratings System

## 📋 Epic Overview
Implement a comprehensive review and rating system enabling users to provide feedback, rate applications, and help others make informed decisions.

## 🎯 Goal
Build trust and community engagement through authentic user reviews and ratings, with robust moderation to maintain quality.

## 📊 Success Metrics
- 25% of authenticated users leave at least one review
- Average rating accuracy (correlation with actual app quality)
- Moderation efficiency: <24 hours for review approval
- Spam detection accuracy >95%
- 50% of users find reviews helpful

## 🏗️ Technical Scope (.NET 9)
- Review submission and storage (EF Core entities)
- Rating aggregation and calculation
- Review moderation system (Admin dashboard)
- Spam/abuse detection (ML.NET or external API)
- Helpful/not helpful voting
- Review pagination and sorting
- Real-time rating updates
- Review notification system

## 🔗 Dependencies
- Epic 8: User authentication required
- Epic 4: API infrastructure complete

## 📈 Business Value
- Critical: Builds trust and credibility
- Impact: Increases conversion and engagement
- Effort: 1-1.5 weeks for core features

## ✅ Definition of Done
- Authenticated users can submit reviews
- Rating calculation accurate (weighted averages)
- Moderation dashboard functional
- Spam detection operational
- Reviews displayed on app detail pages
- Email notifications sent to developers
- Performance tested with 10K+ reviews

## Related Stories
- US9.1: Review Submission System
- US9.2: Rating Aggregation Engine
- US9.3: Review Moderation Dashboard
- US9.4: Spam Detection System
- US9.5: Helpful Votes Feature
- US9.6: Developer Notifications

## .NET 9 Implementation Details
### Entity Models
```csharp
public class Review
{
    public Guid Id { get; set; }
    public Guid AppId { get; set; }
    public Guid UserId { get; set; }
    public int Rating { get; set; } // 1-5
    public string Title { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public ReviewStatus Status { get; set; } = ReviewStatus.Pending;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ModeratedAt { get; set; }
    public Guid? ModeratorId { get; set; }
    public int HelpfulCount { get; set; }
    public int NotHelpfulCount { get; set; }
    
    // Navigation properties
    public App App { get; set; } = null!;
    public ApplicationUser User { get; set; } = null!;
    public ApplicationUser? Moderator { get; set; }
    public ICollection<ReviewHelpfulness> Helpfulness { get; set; }
}

public enum ReviewStatus
{
    Pending,
    Approved,
    Rejected,
    Flagged
}

public class ReviewHelpfulness
{
    public Guid ReviewId { get; set; }
    public Guid UserId { get; set; }
    public bool IsHelpful { get; set; }
    public DateTime CreatedAt { get; set; }
}
```

### ReviewsController
```csharp
[ApiController]
[Route("api/v1/[controller]")]
public class ReviewsController : ControllerBase
{
    private readonly IReviewsService _reviewsService;
    
    [HttpPost]
    [Authorize]
    public async Task<ActionResult<ReviewResponse>> CreateReview(
        [FromBody] CreateReviewRequest request)
    {
        var userId = GetUserId();
        
        // Check if user already reviewed this app
        if (await _reviewsService.HasUserReviewedAsync(userId, request.AppId))
        {
            return BadRequest("You have already reviewed this app");
        }
        
        var review = await _reviewsService.CreateReviewAsync(userId, request);
        return CreatedAtAction(nameof(GetReview), new { id = review.Id }, review);
    }
    
    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ReviewResponse>> GetReview(Guid id)
    {
        var review = await _reviewsService.GetReviewAsync(id);
        return review == null ? NotFound() : Ok(review);
    }
    
    [HttpGet("app/{appId:guid}")]
    public async Task<ActionResult<PaginatedResponse<ReviewResponse>>> GetAppReviews(
        Guid appId,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 10,
        [FromQuery] string sort = "recent") // recent, helpful, rating
    {
        var reviews = await _reviewsService.GetAppReviewsAsync(appId, page, pageSize, sort);
        return Ok(reviews);
    }
    
    [HttpPost("{id:guid}/helpful")]
    [Authorize]
    public async Task<IActionResult> MarkHelpful(Guid id, [FromBody] MarkHelpfulRequest request)
    {
        var userId = GetUserId();
        await _reviewsService.MarkHelpfulAsync(id, userId, request.IsHelpful);
        return NoContent();
    }
    
    [HttpPost("{id:guid}/flag")]
    [Authorize]
    public async Task<IActionResult> FlagReview(Guid id, [FromBody] FlagReviewRequest request)
    {
        var userId = GetUserId();
        await _reviewsService.FlagReviewAsync(id, userId, request.Reason);
        return NoContent();
    }
    
    [HttpPut("{id:guid}/moderate")]
    [Authorize(Roles = "Admin,Moderator")]
    public async Task<IActionResult> ModerateReview(Guid id, [FromBody] ModerateReviewRequest request)
    {
        var moderatorId = GetUserId();
        await _reviewsService.ModerateReviewAsync(id, moderatorId, request.Status, request.Reason);
        return NoContent();
    }
}
```

### ReviewsService
```csharp
public interface IReviewsService
{
    Task<ReviewResponse> CreateReviewAsync(Guid userId, CreateReviewRequest request);
    Task<ReviewResponse?> GetReviewAsync(Guid id);
    Task<PaginatedResponse<ReviewResponse>> GetAppReviewsAsync(Guid appId, int page, int pageSize, string sort);
    Task<bool> HasUserReviewedAsync(Guid userId, Guid appId);
    Task MarkHelpfulAsync(Guid reviewId, Guid userId, bool isHelpful);
    Task FlagReviewAsync(Guid reviewId, Guid userId, string reason);
    Task ModerateReviewAsync(Guid reviewId, Guid moderatorId, ReviewStatus status, string? reason);
    Task<RatingStatistics> GetRatingStatisticsAsync(Guid appId);
}

public class ReviewsService : IReviewsService
{
    private readonly ApplicationDbContext _context;
    private readonly IMapper _mapper;
    private readonly IEmailService _emailService;
    private readonly ISpamDetectionService _spamDetection;
    
    public async Task<ReviewResponse> CreateReviewAsync(Guid userId, CreateReviewRequest request)
    {
        // Spam detection
        var isSpam = await _spamDetection.IsSpamAsync(request.Content);
        
        var review = new Review
        {
            UserId = userId,
            AppId = request.AppId,
            Rating = request.Rating,
            Title = request.Title,
            Content = request.Content,
            Status = isSpam ? ReviewStatus.Flagged : ReviewStatus.Pending
        };
        
        _context.Reviews.Add(review);
        await _context.SaveChangesAsync();
        
        // Update app rating asynchronously
        _ = Task.Run(() => UpdateAppRatingAsync(request.AppId));
        
        // Notify developer
        await _emailService.SendNewReviewNotificationAsync(request.AppId, review.Id);
        
        return _mapper.Map<ReviewResponse>(review);
    }
    
    public async Task<PaginatedResponse<ReviewResponse>> GetAppReviewsAsync(
        Guid appId, int page, int pageSize, string sort)
    {
        var query = _context.Reviews
            .Where(r => r.AppId == appId && r.Status == ReviewStatus.Approved)
            .Include(r => r.User);
        
        query = sort switch
        {
            "helpful" => query.OrderByDescending(r => r.HelpfulCount),
            "rating" => query.OrderByDescending(r => r.Rating),
            _ => query.OrderByDescending(r => r.CreatedAt)
        };
        
        var reviews = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();
        
        var total = await query.CountAsync();
        
        return new PaginatedResponse<ReviewResponse>
        {
            Items = _mapper.Map<List<ReviewResponse>>(reviews),
            Page = page,
            PageSize = pageSize,
            TotalCount = total
        };
    }
    
    private async Task UpdateAppRatingAsync(Guid appId)
    {
        var stats = await _context.Reviews
            .Where(r => r.AppId == appId && r.Status == ReviewStatus.Approved)
            .GroupBy(r => r.AppId)
            .Select(g => new
            {
                AverageRating = g.Average(r => r.Rating),
                TotalReviews = g.Count()
            })
            .FirstOrDefaultAsync();
        
        if (stats != null)
        {
            var app = await _context.Apps.FindAsync(appId);
            if (app != null)
            {
                app.AppsAvgRating = stats.AverageRating;
                app.TotalReviews = stats.TotalReviews;
                await _context.SaveChangesAsync();
            }
        }
    }
}
```

### Spam Detection Service
```csharp
public interface ISpamDetectionService
{
    Task<bool> IsSpamAsync(string content);
}

public class SpamDetectionService : ISpamDetectionService
{
    private readonly HttpClient _httpClient;
    private readonly IConfiguration _configuration;
    
    public async Task<bool> IsSpamAsync(string content)
    {
        // Option 1: Use Azure Content Moderator
        // Option 2: Use Akismet API
        // Option 3: Simple rule-based detection
        
        // Simple implementation
        var spamKeywords = new[] { "viagra", "casino", "free money", "click here" };
        var lowerContent = content.ToLower();
        
        if (spamKeywords.Any(keyword => lowerContent.Contains(keyword)))
        {
            return true;
        }
        
        // Check for excessive links
        var linkCount = Regex.Matches(content, @"https?://").Count;
        if (linkCount > 3)
        {
            return true;
        }
        
        return false;
    }
}
```

### Frontend Implementation
```typescript
// reviews.service.ts
@Injectable({ providedIn: 'root' })
export class ReviewsService {
  private readonly baseUrl = environment.apiUrl;
  
  submitReview(appId: string, review: CreateReviewRequest): Observable<Review> {
    return this.http.post<Review>(
      `${this.baseUrl}/api/v1/reviews`,
      { appId, ...review }
    );
  }
  
  getAppReviews(appId: string, page: number, sort: string = 'recent'): Observable<PaginatedResponse<Review>> {
    return this.http.get<PaginatedResponse<Review>>(
      `${this.baseUrl}/api/v1/reviews/app/${appId}`,
      { params: { page, sort } }
    );
  }
  
  markHelpful(reviewId: string, isHelpful: boolean): Observable<void> {
    return this.http.post<void>(
      `${this.baseUrl}/api/v1/reviews/${reviewId}/helpful`,
      { isHelpful }
    );
  }
}

// Component
export class AppReviewsComponent implements OnInit {
  reviews$: Observable<Review[]>;
  reviewForm: FormGroup;
  
  submitReview() {
    this.reviewsService.submitReview(this.appId, this.reviewForm.value)
      .subscribe({
        next: () => {
          this.message.success('Review submitted successfully!');
          this.loadReviews();
        },
        error: (err) => {
          this.message.error(err.error.message || 'Failed to submit review');
        }
      });
  }
}
```

## Priority
priority-1 (Phase 2 - User Engagement)
