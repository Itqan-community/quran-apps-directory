# US6.5: Optimize Search Performance & Relevance

**Epic:** Epic 6 - Advanced Search System  
**Sprint:** Week 5, Day 4  
**Story Points:** 5  
**Priority:** P2  
**Assigned To:** Backend Lead  
**Status:** Not Started

---

## 📋 User Story

**As a** User  
**I want** search results to load quickly and be highly relevant  
**So that** I can find the perfect Quran app without frustration

---

## 🎯 Acceptance Criteria

### AC1: Database Indexing
- [ ] Full-text search indexes on Names/Descriptions (PostgreSQL)
- [ ] Composite indexes for common filter combinations
- [ ] Index on average_rating column
- [ ] Index on created_at for "newest" sort
- [ ] Query execution plans analyzed

### AC2: Search Query Optimization
- [ ] Efficient LINQ queries (no N+1 problems)
- [ ] Projection to DTOs (don't load full entities)
- [ ] AsNoTracking() for read-only queries
- [ ] Pagination implemented at database level

### AC3: Relevance Ranking
- [ ] Text search ranking by:
  1. Exact match in name (highest)
  2. Partial match in name
  3. Match in description
  4. Match in developer name
- [ ] Boosting for highly-rated apps
- [ ] Boosting for popular apps (download count)
- [ ] Relevance score included in results

### AC4: Caching Strategy
- [ ] Redis cache for popular searches (optional)
- [ ] Category list cached (1 hour)
- [ ] Search results cached (5 minutes)
- [ ] Cache invalidation on app updates

### AC5: Performance Targets
- [ ] Search query execution: < 100ms (95th percentile)
- [ ] Full request/response: < 300ms
- [ ] Support 100 concurrent searches
- [ ] Database connection pooling optimized

### AC6: Search Suggestions Performance
- [ ] Autocomplete suggestions < 50ms
- [ ] Typeahead cached aggressively
- [ ] Debouncing on frontend (300ms)

### AC7: Monitoring & Alerts
- [ ] Slow query logging (> 200ms)
- [ ] Performance metrics dashboard
- [ ] Alerts for degraded performance

---

## 📝 Technical Notes

### Database Indexing Migration
```python
public class AddSearchIndexes : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        // Full-text search indexes (PostgreSQL)
        migrationBuilder.Sql(@"
            CREATE INDEX idx_apps_name_en_fulltext 
            ON apps USING gin(to_tsvector('english', name_en));
            
            CREATE INDEX idx_apps_name_ar_fulltext 
            ON apps USING gin(to_tsvector('arabic', name_ar));
            
            CREATE INDEX idx_apps_description_en_fulltext 
            ON apps USING gin(to_tsvector('english', description_en));
            
            CREATE INDEX idx_apps_description_ar_fulltext 
            ON apps USING gin(to_tsvector('arabic', description_ar));
        ");
        
        // Regular indexes for filtering/sorting
        migrationBuilder.CreateIndex(
            name: "IX_Apps_AverageRating",
            table: "apps",
            column: "average_rating",
            descending: true);
        
        migrationBuilder.CreateIndex(
            name: "IX_Apps_CreatedAt",
            table: "apps",
            column: "created_at",
            descending: true);
        
        // Composite index for common filter combinations
        migrationBuilder.CreateIndex(
            name: "IX_Apps_Rating_CreatedAt",
            table: "apps",
            columns: new[] { "average_rating", "created_at" },
            descending: new[] { true, true });
        
        // Index on junction table for category filtering
        migrationBuilder.CreateIndex(
            name: "IX_AppCategories_CategoryId_AppId",
            table: "app_categories",
            columns: new[] { "category_id", "app_id" });
    }
    
    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql(@"
            DROP INDEX IF EXISTS idx_apps_name_en_fulltext;
            DROP INDEX IF EXISTS idx_apps_name_ar_fulltext;
            DROP INDEX IF EXISTS idx_apps_description_en_fulltext;
            DROP INDEX IF EXISTS idx_apps_description_ar_fulltext;
        ");
        
        migrationBuilder.DropIndex(name: "IX_Apps_AverageRating", table: "apps");
        migrationBuilder.DropIndex(name: "IX_Apps_CreatedAt", table: "apps");
        migrationBuilder.DropIndex(name: "IX_Apps_Rating_CreatedAt", table: "apps");
        migrationBuilder.DropIndex(name: "IX_AppCategories_CategoryId_AppId", table: "app_categories");
    }
}
```

### Optimized Search Query
```python
public async Task<SearchResult<AppListDto>> SearchAppsAsync(SearchQuery query)
{
    var queryable = _context.Apps
        .AsNoTracking() // Read-only, no change tracking
        .Include(a => a.Developer)
        .Include(a => a.AppCategories)
            .ThenInclude(ac => ac.Category)
        .Where(a => !a.IsDeleted);
    
    // Full-text search with ranking
    if (!string.IsNullOrWhiteSpace(query.Q))
    {
        var searchTerm = query.Q.ToLower();
        
        queryable = queryable
            .Select(a => new 
            {
                App = a,
                Relevance = 
                    // Exact match in name (highest)
                    (a.NameEn.ToLower() == searchTerm || a.NameAr == searchTerm ? 100 : 0) +
                    // Partial match in name
                    (EF.Functions.ILike(a.NameEn, $"%{searchTerm}%") ? 50 : 0) +
                    (EF.Functions.ILike(a.NameAr, $"%{searchTerm}%") ? 50 : 0) +
                    // Match in description
                    (EF.Functions.ILike(a.DescriptionEn, $"%{searchTerm}%") ? 20 : 0) +
                    (EF.Functions.ILike(a.DescriptionAr, $"%{searchTerm}%") ? 20 : 0) +
                    // Boost by rating
                    (int)(a.AverageRating ?? 0 * 5)
            })
            .Where(x => x.Relevance > 0)
            .OrderByDescending(x => x.Relevance)
            .Select(x => x.App);
    }
    
    // Apply filters efficiently
    if (query.Categories?.Any() == true)
    {
        queryable = queryable.Where(a =>
            a.AppCategories.Any(ac => query.Categories.Contains(ac.CategoryId)));
    }
    
    if (query.MinRating.HasValue)
    {
        queryable = queryable.Where(a => a.AverageRating >= query.MinRating);
    }
    
    // Sorting
    queryable = ApplySorting(queryable, query.SortBy);
    
    // Get total count before pagination
    var totalCount = await queryable.CountAsync();
    
    // Pagination at database level
    var apps = await queryable
        .Skip((query.Page - 1) * query.PageSize)
        .Take(query.PageSize)
        .Select(a => new AppListDto  // Project to DTO directly
        {
            Id = a.Id,
            NameAr = a.NameAr,
            NameEn = a.NameEn,
            ShortDescriptionAr = a.ShortDescriptionAr,
            ShortDescriptionEn = a.ShortDescriptionEn,
            ApplicationIconUrl = a.ApplicationIconUrl,
            AverageRating = a.AverageRating,
            Categories = a.AppCategories.Select(ac => ac.Category.NameEn).ToList()
        })
        .ToListAsync();
    
    return new SearchResult<AppListDto>
    {
        Items = apps,
        TotalCount = totalCount,
        Page = query.Page,
        PageSize = query.PageSize
    };
}
```

### Redis Caching (Optional)
```python
public class CachedSearchService : ISearchService
{
    
    public async Task<SearchResult<AppListDto>> SearchAppsAsync(SearchQuery query)
    {
        var cacheKey = $"search:{JsonSerializer.Serialize(query)}";
        
        // Try cache
        var cached = await _cache.GetStringAsync(cacheKey);
        if (cached != null)
        {
            return JsonSerializer.Deserialize<SearchResult<AppListDto>>(cached);
        }
        
        // Execute search
        var result = await _innerService.SearchAppsAsync(query);
        
        // Cache result (5 minutes)
        await _cache.SetStringAsync(
            cacheKey, 
            JsonSerializer.Serialize(result),
            new DistributedCacheEntryOptions
            {
                AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(5)
            });
        
        return result;
    }
}
```

### Performance Monitoring
```python
public class SearchPerformanceMiddleware
{
    
    public async Task InvokeAsync(HttpContext context)
    {
        if (!context.Request.Path.StartsWithSegments("/api/apps/search"))
        {
            await _next(context);
            return;
        }
        
        var stopwatch = Stopwatch.StartNew();
        
        await _next(context);
        
        stopwatch.Stop();
        
        if (stopwatch.ElapsedMilliseconds > 200)
        {
            _logger.LogWarning(
                "Slow search query: {Path} took {ElapsedMs}ms",
                context.Request.Path + context.Request.QueryString,
                stopwatch.ElapsedMilliseconds);
        }
    }
}
```

---

## 🔗 Dependencies
- US4.3: Advanced Search API
- US6.3: Search Page Integration

---

## 📊 Definition of Done
- [ ] Database indexes created and tested
- [ ] Search queries optimized (< 100ms)
- [ ] Relevance ranking implemented
- [ ] Caching strategy implemented
- [ ] Performance targets met
- [ ] Load testing completed (100 concurrent users)
- [ ] Monitoring and alerting configured
- [ ] Documentation updated with performance best practices

---

**Created:** October 6, 2025  
**Owner:** Abubakr Abduraghman, a.abduraghman@itqan.dev  
**Epic:** [Epic 6: Advanced Search System](../epics/epic-6-advanced-search-system.md)
