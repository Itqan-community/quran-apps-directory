# US6.4: Implement Search Analytics Tracking

**Epic:** Epic 6 - Advanced Search System  
**Sprint:** Week 5, Day 3  
**Story Points:** 3  
**Priority:** P2  
**Assigned To:** Backend Developer  
**Status:** Not Started

---

## 📋 User Story

**As a** Product Manager  
**I want** to track search queries and filter usage  
**So that** I can understand user behavior and improve app discovery

---

## 🎯 Acceptance Criteria

### AC1: Search Event Logging (Backend)
- [ ] `SearchLog` entity created:
  - SearchTerm (string)
  - ResultsCount (int)
  - Filters (JSON)
  - UserId (nullable Guid)
  - Timestamp (DateTime)
  - SessionId (string)
- [ ] POST /api/analytics/search endpoint
- [ ] Async logging (non-blocking)

### AC2: Popular Search Terms API
- [ ] GET /api/search/popular-terms endpoint
- [ ] Returns top 20 search terms (last 30 days)
- [ ] Excludes single-character queries
- [ ] Cached for 1 hour

### AC3: Filter Usage Analytics
- [ ] Track which filters are most used
- [ ] Store filter combinations
- [ ] API endpoint: GET /api/analytics/filter-usage
- [ ] Admin-only access

### AC4: Zero-Results Queries
- [ ] Log searches returning 0 results
- [ ] Flag for review in admin dashboard
- [ ] Helps identify missing apps or poor search logic

### AC5: Search Performance Metrics
- [ ] Track search query execution time
- [ ] Log slow queries (> 200ms)
- [ ] Database index optimization insights

### AC6: Frontend Integration
- [ ] SearchService calls analytics API after search
- [ ] Fire-and-forget (don't block UI)
- [ ] Include session ID for journey tracking
- [ ] No PII collected

### AC7: Privacy Compliance
- [ ] No user IP addresses stored
- [ ] Anonymized user IDs
- [ ] GDPR-compliant data retention (90 days)
- [ ] Opt-out mechanism (respect DNT header)

---

## 📝 Technical Notes

### Search Log Entity
```csharp
public class SearchLog
{
    public Guid Id { get; set; }
    public string SearchTerm { get; set; }
    public int ResultsCount { get; set; }
    public string FiltersJson { get; set; } // JSON serialized filters
    public Guid? UserId { get; set; }
    public string SessionId { get; set; }
    public DateTime Timestamp { get; set; }
    public int ExecutionTimeMs { get; set; }
    
    // Navigation
    public ApplicationUser User { get; set; }
}
```

### Analytics Controller
```csharp
[ApiController]
[Route("api/analytics")]
public class AnalyticsController : ControllerBase
{
    private readonly IAnalyticsService _analyticsService;
    
    [HttpPost("search")]
    [AllowAnonymous]
    public async Task<IActionResult> LogSearch([FromBody] SearchLogDto dto)
    {
        // Fire and forget - don't await
        _ = _analyticsService.LogSearchAsync(dto);
        
        return Accepted();
    }
    
    [HttpGet("popular-terms")]
    [ResponseCache(Duration = 3600)]
    public async Task<ActionResult<PopularTermsResponse>> GetPopularTerms(
        [FromQuery] int days = 30,
        [FromQuery] int limit = 20)
    {
        var terms = await _analyticsService.GetPopularSearchTermsAsync(days, limit);
        
        return Ok(new PopularTermsResponse { Terms = terms });
    }
    
    [HttpGet("filter-usage")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<FilterUsageResponse>> GetFilterUsage(
        [FromQuery] int days = 30)
    {
        var usage = await _analyticsService.GetFilterUsageAsync(days);
        
        return Ok(usage);
    }
    
    [HttpGet("zero-results")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<List<ZeroResultQuery>>> GetZeroResultQueries(
        [FromQuery] int days = 7,
        [FromQuery] int limit = 50)
    {
        var queries = await _analyticsService.GetZeroResultQueriesAsync(days, limit);
        
        return Ok(queries);
    }
}
```

### Analytics Service Implementation
```csharp
public class AnalyticsService : IAnalyticsService
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<AnalyticsService> _logger;
    
    public async Task LogSearchAsync(SearchLogDto dto)
    {
        try
        {
            var log = new SearchLog
            {
                Id = Guid.NewGuid(),
                SearchTerm = dto.SearchTerm?.Trim().ToLower(),
                ResultsCount = dto.ResultsCount,
                FiltersJson = JsonSerializer.Serialize(dto.Filters),
                UserId = dto.UserId,
                SessionId = dto.SessionId,
                Timestamp = DateTime.UtcNow,
                ExecutionTimeMs = dto.ExecutionTimeMs
            };
            
            await _context.SearchLogs.AddAsync(log);
            await _context.SaveChangesAsync();
        }
        catch (Exception ex)
        {
            // Log error but don't throw - analytics shouldn't break app
            _logger.LogError(ex, "Failed to log search analytics");
        }
    }
    
    public async Task<List<string>> GetPopularSearchTermsAsync(int days, int limit)
    {
        var cutoffDate = DateTime.UtcNow.AddDays(-days);
        
        var terms = await _context.SearchLogs
            .Where(s => s.Timestamp >= cutoffDate && 
                       !string.IsNullOrEmpty(s.SearchTerm) &&
                       s.SearchTerm.Length > 1)
            .GroupBy(s => s.SearchTerm)
            .Select(g => new 
            { 
                Term = g.Key, 
                Count = g.Count() 
            })
            .OrderByDescending(x => x.Count)
            .Take(limit)
            .Select(x => x.Term)
            .ToListAsync();
        
        return terms;
    }
    
    public async Task<FilterUsageStats> GetFilterUsageAsync(int days)
    {
        var cutoffDate = DateTime.UtcNow.AddDays(-days);
        
        var logs = await _context.SearchLogs
            .Where(s => s.Timestamp >= cutoffDate && 
                       !string.IsNullOrEmpty(s.FiltersJson))
            .Select(s => s.FiltersJson)
            .ToListAsync();
        
        // Parse and aggregate filter usage
        var filterCounts = new Dictionary<string, int>();
        
        foreach (var json in logs)
        {
            var filters = JsonSerializer.Deserialize<Dictionary<string, object>>(json);
            foreach (var filter in filters.Where(f => f.Value != null))
            {
                var key = filter.Key;
                filterCounts[key] = filterCounts.GetValueOrDefault(key, 0) + 1;
            }
        }
        
        return new FilterUsageStats
        {
            TotalSearches = logs.Count,
            FilterUsage = filterCounts
        };
    }
    
    public async Task<List<ZeroResultQuery>> GetZeroResultQueriesAsync(int days, int limit)
    {
        var cutoffDate = DateTime.UtcNow.AddDays(-days);
        
        var queries = await _context.SearchLogs
            .Where(s => s.Timestamp >= cutoffDate && s.ResultsCount == 0)
            .GroupBy(s => s.SearchTerm)
            .Select(g => new ZeroResultQuery
            {
                SearchTerm = g.Key,
                Count = g.Count(),
                LastSearched = g.Max(s => s.Timestamp)
            })
            .OrderByDescending(x => x.Count)
            .Take(limit)
            .ToListAsync();
        
        return queries;
    }
}
```

### Frontend Integration
```typescript
// search.service.ts
import { v4 as uuidv4 } from 'uuid';

export class SearchService {
  private sessionId: string;
  
  constructor(
    private api: ApiService,
    private analyticsService: AnalyticsService
  ) {
    this.sessionId = this.getOrCreateSessionId();
  }
  
  private executeSearch(query: SearchQuery): Observable<SearchResult<App>> {
    const startTime = Date.now();
    
    return this.api.get<SearchResult<App>>('apps/search', params)
      .pipe(
        tap(result => {
          const executionTime = Date.now() - startTime;
          
          // Log analytics (fire and forget)
          this.logSearchAnalytics(query, result, executionTime);
        })
      );
  }
  
  private logSearchAnalytics(
    query: SearchQuery, 
    result: SearchResult<App>,
    executionTime: number
  ): void {
    const logDto = {
      searchTerm: query.q,
      resultsCount: result.totalCount,
      filters: {
        categories: query.categories,
        mushafTypes: query.mushafTypes,
        riwayat: query.riwayat,
        languages: query.languages,
        audiences: query.audiences,
        platforms: query.platforms,
        minRating: query.minRating
      },
      userId: this.authService.getUserId(), // null if not logged in
      sessionId: this.sessionId,
      executionTimeMs: executionTime
    };
    
    // Fire and forget - don't wait for response
    this.analyticsService.logSearch(logDto).subscribe({
      error: (err) => console.warn('Analytics logging failed', err)
    });
  }
  
  private getOrCreateSessionId(): string {
    let sessionId = sessionStorage.getItem('search_session_id');
    if (!sessionId) {
      sessionId = uuidv4();
      sessionStorage.setItem('search_session_id', sessionId);
    }
    return sessionId;
  }
}
```

---

## 🔗 Dependencies
- US4.3: Advanced Search API endpoints
- US6.2: Search Service

---

## 📊 Definition of Done
- [ ] SearchLog entity and table created
- [ ] Analytics endpoints implemented
- [ ] Popular terms API working
- [ ] Filter usage tracking implemented
- [ ] Zero-results queries logged
- [ ] Frontend integration complete
- [ ] Privacy compliance verified
- [ ] No performance impact on search

---

**Created:** October 6, 2025  
**Owner:** Abubakr Abduraghman, a.abduraghman@itqan.dev  
**Epic:** [Epic 6: Advanced Search System](../epics/epic-6-advanced-search-system.md)
