# US9.6: Add Rating Distribution Analytics

**Epic:** Epic 9 - User Reviews & Ratings System  
**Sprint:** Week 9, Day 4  
**Story Points:** 3  
**Priority:** P2  
**Assigned To:** Backend Developer  
**Status:** Not Started

---

## 📋 User Story

**As a** User  
**I want** to see detailed rating statistics  
**So that** I understand the overall sentiment and quality distribution

---

## 🎯 Acceptance Criteria

### AC1: Rating Distribution Endpoint
- [ ] GET /api/apps/{appId}/rating-distribution
- [ ] Returns count per star rating (5★: 120, 4★: 45, etc.)
- [ ] Returns percentages
- [ ] Cached for 10 minutes

### AC2: Rating Summary
- [ ] Average rating
- [ ] Total review count
- [ ] Distribution histogram data
- [ ] Most common rating

### AC3: Review Trends
- [ ] Reviews over time (last 30 days)
- [ ] Average rating trend
- [ ] Growth rate

### AC4: Frontend Visualization
- [ ] Bar chart showing distribution
- [ ] Percentage display per star
- [ ] Responsive design

### AC5: Performance Optimization
- [ ] Materialized view or computed column
- [ ] Background job updates (hourly)
- [ ] Redis caching

---

## 📝 Technical Notes

### ViewSet
```python
class RatingAnalyticsViewSet(viewsets.ModelViewSet):
{
    [ResponseCache(Duration = 600)] // 10 minutes
    def <RatingDistributionDto>> GetRatingDistribution(Guid appId)
    {
        var distribution = await _ratingAnalyticsService.GetRatingDistributionAsync(appId);
        
        if (distribution == null)
        
        return Ok(distribution);
    }
    
    def <RatingTrendsDto>> GetRatingTrends(
        Guid appId,
    {
        var trends = await _ratingAnalyticsService.GetRatingTrendsAsync(appId, days);
        
        return Ok(trends);
    }
}
```

### Rating Analytics Service
```python
public class RatingAnalyticsService
{
    public async Task<RatingDistributionDto> GetRatingDistributionAsync(Guid appId)
    {
        var reviews = await _context.Reviews
            .Where(r => r.AppId == appId && !r.IsDeleted && r.IsApproved)
            .ToListAsync();
        
        if (!reviews.Any())
            return null;
        
        var totalCount = reviews.Count;
        var distribution = new Dictionary<int, RatingInfo>();
        
        for (int star = 1; star <= 5; star++)
        {
            var count = reviews.Count(r => (int)r.Rating == star);
            var percentage = (count / (double)totalCount) * 100;
            
            distribution[star] = new RatingInfo
            {
                Count = count,
                Percentage = Math.Round(percentage, 1)
            };
        }
        
        var averageRating = reviews.Average(r => r.Rating);
        var mostCommonRating = distribution
            .OrderByDescending(x => x.Value.Count)
            .First().Key;
        
        return new RatingDistributionDto
        {
            AppId = appId,
            AverageRating = Math.Round(averageRating, 1),
            TotalReviews = totalCount,
            Distribution = distribution,
            MostCommonRating = mostCommonRating
        };
    }
    
    public async Task<RatingTrendsDto> GetRatingTrendsAsync(Guid appId, int days)
    {
        var cutoffDate = DateTime.UtcNow.AddDays(-days);
        
        var dailyAverages = await _context.Reviews
            .Where(r => r.AppId == appId && 
                       !r.IsDeleted && 
                       r.IsApproved &&
                       r.CreatedAt >= cutoffDate)
            .GroupBy(r => r.CreatedAt.Date)
            .Select(g => new DailyRating
            {
                Date = g.Key,
                AverageRating = g.Average(r => r.Rating),
                Count = g.Count()
            })
            .OrderBy(x => x.Date)
            .ToListAsync();
        
        return new RatingTrendsDto
        {
            AppId = appId,
            Period = $"Last {days} days",
            DailyAverages = dailyAverages
        };
    }
}
```

### DTOs
```python
public class RatingDistributionDto
{
    public Guid AppId { get; set; }
    public decimal AverageRating { get; set; }
    public int TotalReviews { get; set; }
    public Dictionary<int, RatingInfo> Distribution { get; set; }
    public int MostCommonRating { get; set; }
}

public class RatingInfo
{
    public int Count { get; set; }
    public double Percentage { get; set; }
}

public class RatingTrendsDto
{
    public Guid AppId { get; set; }
    public string Period { get; set; }
    public List<DailyRating> DailyAverages { get; set; }
}

public class DailyRating
{
    public DateTime Date { get; set; }
    public decimal AverageRating { get; set; }
    public int Count { get; set; }
}
```

---

## 🔗 Dependencies
- US9.1: Review entities
- US9.2: Review submission API

---

## 📊 Definition of Done
- [ ] Distribution endpoint working
- [ ] Trends endpoint working
- [ ] Caching implemented
- [ ] Frontend visualization complete
- [ ] Performance optimized
- [ ] Unit tests pass

---

**Created:** October 6, 2025  
**Owner:** Abubakr Abduraghman, a.abduraghman@itqan.dev  
**Epic:** [Epic 9: User Reviews & Ratings](../epics/epic-9-user-reviews-ratings-system.md)
