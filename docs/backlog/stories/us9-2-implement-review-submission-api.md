# US9.2: Implement Review Submission API

**Epic:** Epic 9 - User Reviews & Ratings System  
**Sprint:** Week 9, Day 1-2  
**Story Points:** 5  
**Priority:** P1  
**Assigned To:** Backend Developer  
**Status:** Not Started

---

## 📋 User Story

**As a** User  
**I want** to submit reviews and ratings for apps  
**So that** I can share my experience and help others discover quality apps

---

## 🎯 Acceptance Criteria

### AC1: Submit Review Endpoint
- [ ] POST /api/apps/{appId}/reviews
- [ ] Requires authentication
- [ ] Accepts: Rating (1-5), Comment (optional, max 2000 chars)
- [ ] Validates: One review per user per app
- [ ] Returns created review with HTTP 201

### AC2: Update Review Endpoint
- [ ] PUT /api/reviews/{id}
- [ ] User can only edit their own review
- [ ] Updates Rating and/or Comment
- [ ] Sets IsEdited flag
- [ ] Recalculates app rating

### AC3: Delete Review Endpoint
- [ ] DELETE /api/reviews/{id}
- [ ] Soft delete (sets IsDeleted flag)
- [ ] User can only delete own review
- [ ] Recalculates app rating
- [ ] Returns HTTP 204

### AC4: Get App Reviews Endpoint
- [ ] GET /api/apps/{appId}/reviews
- [ ] Paginated (default 20 per page)
- [ ] Sort options: newest, highest-rated, most-helpful
- [ ] Filter: rating (e.g., 5-star only)
- [ ] Returns review with user info (name, avatar)

### AC5: Get User's Review for App
- [ ] GET /api/apps/{appId}/reviews/me
- [ ] Returns user's review if exists
- [ ] Returns 404 if no review
- [ ] Used to prevent duplicate reviews

### AC6: Validation & Business Rules
- [ ] Rating must be 1-5 (decimal allowed, e.g., 4.5)
- [ ] Comment max length: 2000 characters
- [ ] Profanity filter applied (basic)
- [ ] Spam detection (scikit-learn/TensorFlow or rule-based)
- [ ] Rate limiting: 5 reviews per day per user

---

## 📝 Technical Notes

### ViewSet
```python
class ReviewsViewSet(viewsets.ModelViewSet):
{
    
    def <ReviewDto>> SubmitReview(
        Guid appId,
    {
        var userId = request.user.id;
        
        // Check if user already reviewed this app
        var existing = await _reviewsService.GetUserReviewForAppAsync(
            uuid.UUID(userId), appId);
        
        if (existing != null)
            return Conflict(new { message = "You already reviewed this app" });
        
        // Validate and create review
        var review = await _reviewsService.CreateReviewAsync(new Review
        {
            Id = Guid.NewGuid(),
            AppId = appId,
            UserId = uuid.UUID(userId),
            Rating = dto.Rating,
            Comment = dto.Comment,
            CreatedAt = DateTime.UtcNow,
            IsApproved = true // Auto-approve (or queue for moderation)
        });
        
        // Recalculate app rating
        await _ratingService.RecalculateAppRatingAsync(appId);
        
            nameof(GetReview),
            new { reviewId = review.Id },
            review);
    }
    
    def <PagedResult<ReviewDto>>> GetAppReviews(
        Guid appId,
    {
        var reviews = await _reviewsService.GetAppReviewsAsync(
            appId, page, pageSize, sortBy, rating);
        
        return Ok(reviews);
    }
    
    def <ReviewDto>> GetMyReview(Guid appId)
    {
        var userId = request.user.id;
        
        var review = await _reviewsService.GetUserReviewForAppAsync(
            uuid.UUID(userId), appId);
        
        if (review == null)
        
        return Ok(review);
    }
}

class ReviewManagementViewSet(viewsets.ModelViewSet):
{
    def <ReviewDto>> UpdateReview(
        uuid_id,
    {
        var userId = request.user.id;
        
        var review = await _reviewsService.GetReviewByIdAsync(id);
        
        if (review == null)
        
        if (review.UserId.ToString() != userId)
        
        review.Rating = dto.Rating;
        review.Comment = dto.Comment;
        review.UpdatedAt = DateTime.UtcNow;
        review.IsEdited = true;
        
        await _reviewsService.UpdateReviewAsync(review);
        await _ratingService.RecalculateAppRatingAsync(review.AppId);
        
        return Ok(review);
    }
    
    def  DeleteReview(uuid_id)
    {
        var userId = request.user.id;
        
        var review = await _reviewsService.GetReviewByIdAsync(id);
        
        if (review == null)
        
        if (review.UserId.ToString() != userId)
        
        await _reviewsService.DeleteReviewAsync(id);
        await _ratingService.RecalculateAppRatingAsync(review.AppId);
        
    }
}
```

### Reviews Service
```python
public interface IReviewsService
{
    Task<ReviewDto> CreateReviewAsync(Review review);
    Task<ReviewDto> GetReviewByIdAsync(uuid_id);
    Task<ReviewDto> GetUserReviewForAppAsync(Guid userId, Guid appId);
    Task<PagedResult<ReviewDto>> GetAppReviewsAsync(Guid appId, int page, 
        int pageSize, string sortBy, int? rating);
    Task UpdateReviewAsync(Review review);
    Task DeleteReviewAsync(uuid_id);
}

public class ReviewsService : IReviewsService
{
    
    public async Task<ReviewDto> CreateReviewAsync(Review review)
    {
        // Apply profanity filter
        if (!string.IsNullOrEmpty(review.Comment))
        {
            review.Comment = _profanityFilter.Filter(review.Comment);
        }
        
        await _context.Reviews.AddAsync(review);
        await _context.SaveChangesAsync();
        
        return await GetReviewByIdAsync(review.Id);
    }
    
    public async Task<PagedResult<ReviewDto>> GetAppReviewsAsync(
        Guid appId,
        int page,
        int pageSize,
        string sortBy,
        int? rating)
    {
        var query = _context.Reviews
            .Include(r => r.User)
            .Where(r => r.AppId == appId && !r.IsDeleted && r.IsApproved);
        
        // Filter by rating
        if (rating.HasValue)
        {
            query = query.Where(r => (int)r.Rating == rating.Value);
        }
        
        // Sort
        query = sortBy?.ToLower() switch
        {
            "highest-rated" => query.OrderByDescending(r => r.Rating),
            "most-helpful" => query.OrderByDescending(r => r.HelpfulCount),
            _ => query.OrderByDescending(r => r.CreatedAt) // newest
        };
        
        var totalCount = await query.CountAsync();
        
        var reviews = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(r => new ReviewDto
            {
                Id = r.Id,
                AppId = r.AppId,
                UserId = r.UserId,
                UserName = r.User.FullName,
                UserAvatar = r.User.ProfilePictureUrl,
                Rating = r.Rating,
                Comment = r.Comment,
                IsEdited = r.IsEdited,
                HelpfulCount = r.HelpfulCount,
                UnhelpfulCount = r.UnhelpfulCount,
                CreatedAt = r.CreatedAt
            })
            .ToListAsync();
        
        return new PagedResult<ReviewDto>
        {
            Items = reviews,
            TotalCount = totalCount,
            Page = page,
            PageSize = pageSize
        };
    }
}
```

### DTOs
```python
public class CreateReviewDto
{
    [Required]
    [Range(1, 5)]
    public decimal Rating { get; set; }
    
    [MaxLength(2000)]
    public string Comment { get; set; }
}

public class UpdateReviewDto
{
    [Required]
    [Range(1, 5)]
    public decimal Rating { get; set; }
    
    [MaxLength(2000)]
    public string Comment { get; set; }
}

public class ReviewDto
{
    public Guid Id { get; set; }
    public Guid AppId { get; set; }
    public Guid UserId { get; set; }
    public string UserName { get; set; }
    public string UserAvatar { get; set; }
    public decimal Rating { get; set; }
    public string Comment { get; set; }
    public bool IsEdited { get; set; }
    public int HelpfulCount { get; set; }
    public int UnhelpfulCount { get; set; }
    public DateTime CreatedAt { get; set; }
}
```

---

## 🔗 Dependencies
- US9.1: Review entities created
- US8.2: JWT authentication

---

## 📊 Definition of Done
- [ ] All review endpoints implemented
- [ ] Validation working
- [ ] Rating recalculation working
- [ ] Profanity filter applied
- [ ] Rate limiting enforced
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] API documentation updated

---

**Created:** October 6, 2025  
**Owner:** Abubakr Abduraghman, a.abduraghman@itqan.dev  
**Epic:** [Epic 9: User Reviews & Ratings](../epics/epic-9-user-reviews-ratings-system.md)
