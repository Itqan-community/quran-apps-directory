# US4.3: Implement Advanced Search & Filtering

**Epic:** Epic 4 - API Development & Integration  
**Sprint:** Week 3, Day 3  
**Story Points:** 8  
**Priority:** P1  
**Assigned To:** Backend Developer  
**Status:** Not Started

---

## 📋 User Story

**As a** User  
**I want** to search and filter apps by multiple criteria  
**So that** I can quickly find apps that match my specific needs (e.g., Tajweed apps in Arabic for Hafs recitation)

---

## 🎯 Acceptance Criteria

### AC1: Full-Text Search Implementation
- [ ] GET /api/apps/search endpoint created
- [ ] Search query parameter `q` searches across:
  - App names (Arabic & English)
  - Descriptions (Arabic & English)
  - Developer names
- [ ] PostgreSQL full-text search used (ts_vector)
- [ ] Results ranked by relevance
- [ ] HTTP 200 with paginated results

### AC2: Multi-Dimensional Filtering
- [ ] Filter by categories (multiple): `?categories=uuid1,uuid2`
- [ ] Filter by developer: `?developerId=uuid`
- [ ] Filter by platform: `?platforms=android,ios,huawei`
- [ ] Filter by rating: `?minRating=4.0`
- [ ] Filters can be combined (AND logic)

### AC3: Specialized Filters for Quran Apps
- [ ] Filter by Mushaf type: `?mushafTypes=colored,regular,digital`
- [ ] Filter by recitation (Riwayat): `?riwayat=hafs,warsh,qalun`
- [ ] Filter by language: `?languages=ar,en,ur`
- [ ] Filter by target audience: `?audiences=children,adults,scholars`

### AC4: Query Performance Optimization
- [ ] Database indexes on searchable columns
- [ ] Full-text search indexes on Names/Descriptions
- [ ] Query execution time < 100ms for typical queries
- [ ] Efficient LINQ-to-SQL generation

### AC5: Search Analytics
- [ ] Log search queries for analytics
- [ ] Track popular search terms
- [ ] Track filter usage patterns
- [ ] No PII collected

### AC6: Response Format
- [ ] Paginated response (same as /api/apps)
- [ ] Includes applied filters in response
- [ ] Total results count
- [ ] Search suggestions if no results (future placeholder)

---

## 📝 Technical Notes

### Search Endpoint Implementation
```python
def <SearchResult<AppListDto>>> SearchApps(
{
    var result = await _appsService.SearchAppsAsync(query);
    
    // Log search for analytics (async, non-blocking)
    _ = _analyticsService.LogSearchAsync(query.Q, result.TotalCount);
    
    return Ok(result);
}

public class SearchAppsQuery
{
    public string Q { get; set; }
    public List<Guid> Categories { get; set; }
    public Guid? DeveloperId { get; set; }
    public List<string> Platforms { get; set; }
    public decimal? MinRating { get; set; }
    public List<string> MushafTypes { get; set; }
    public List<string> Riwayat { get; set; }
    public List<string> Languages { get; set; }
    public List<string> Audiences { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 20;
    public string SortBy { get; set; } = "relevance";
}
```

### Service Layer Implementation
```python
public async Task<SearchResult<AppListDto>> SearchAppsAsync(SearchAppsQuery query)
{
    var queryable = _context.Apps
        .Include(a => a.Developer)
        .Include(a => a.AppCategories)
            .ThenInclude(ac => ac.Category)
        .Where(a => !a.IsDeleted);
    
    // Full-text search
    if (!string.IsNullOrWhiteSpace(query.Q))
    {
        var searchTerm = query.Q.ToLower();
        queryable = queryable.Where(a =>
            EF.Functions.ILike(a.NameEn, $"%{searchTerm}%") ||
            EF.Functions.ILike(a.NameAr, $"%{searchTerm}%") ||
            EF.Functions.ILike(a.DescriptionEn, $"%{searchTerm}%") ||
            EF.Functions.ILike(a.DescriptionAr, $"%{searchTerm}%") ||
            EF.Functions.ILike(a.Developer.NameEn, $"%{searchTerm}%"));
    }
    
    // Category filter
    if (query.Categories?.Any() == true)
    {
        queryable = queryable.Where(a =>
            a.AppCategories.Any(ac => query.Categories.Contains(ac.CategoryId)));
    }
    
    // Developer filter
    if (query.DeveloperId.HasValue)
    {
        queryable = queryable.Where(a => a.DeveloperId == query.DeveloperId);
    }
    
    // Platform filter
    if (query.Platforms?.Any() == true)
    {
        queryable = queryable.Where(a =>
            (query.Platforms.Contains("android") && a.GooglePlayLink != null) ||
            (query.Platforms.Contains("ios") && a.AppStoreLink != null) ||
            (query.Platforms.Contains("huawei") && a.AppGalleryLink != null));
    }
    
    // Rating filter
    if (query.MinRating.HasValue)
    {
        queryable = queryable.Where(a =>
            a.AverageRating >= query.MinRating.Value);
    }
    
    // Specialized filters (requires metadata columns)
    if (query.MushafTypes?.Any() == true)
    {
        queryable = queryable.Where(a =>
            a.MushafType != null && query.MushafTypes.Contains(a.MushafType));
    }
    
    // Sorting
    queryable = query.SortBy?.ToLower() switch
    {
        "rating" => queryable.OrderByDescending(a => a.AverageRating),
        "name" => queryable.OrderBy(a => a.NameEn),
        "newest" => queryable.OrderByDescending(a => a.CreatedAt),
        _ => queryable.OrderByDescending(a => a.AverageRating) // Default
    };
    
    // Pagination
    var totalCount = await queryable.CountAsync();
    var items = await queryable
        .Skip((query.Page - 1) * query.PageSize)
        .Take(query.PageSize)
        .Select(a => _mapper.Map<AppListDto>(a))
        .ToListAsync();
    
    return new SearchResult<AppListDto>
    {
        Items = items,
        TotalCount = totalCount,
        Page = query.Page,
        PageSize = query.PageSize,
        AppliedFilters = new
        {
            query.Q,
            CategoriesCount = query.Categories?.Count ?? 0,
            query.DeveloperId,
            PlatformsCount = query.Platforms?.Count ?? 0,
            query.MinRating
        }
    };
}
```

### Database Indexes (Migration)
```python
protected override void Up(MigrationBuilder migrationBuilder)
{
    // Full-text search indexes
    migrationBuilder.Sql(@"
        CREATE INDEX idx_apps_name_en_gin 
        ON apps USING gin(to_tsvector('english', name_en));
        
        CREATE INDEX idx_apps_name_ar_gin 
        ON apps USING gin(to_tsvector('arabic', name_ar));
        
        CREATE INDEX idx_apps_description_en_gin 
        ON apps USING gin(to_tsvector('english', description_en));
    ");
    
    // Regular indexes for filtering
    migrationBuilder.CreateIndex(
        name: "IX_Apps_AverageRating",
        table: "apps",
        column: "average_rating");
    
    migrationBuilder.CreateIndex(
        name: "IX_Apps_CreatedAt",
        table: "apps",
        column: "created_at");
    
    migrationBuilder.CreateIndex(
        name: "IX_AppCategories_CategoryId",
        table: "app_categories",
        column: "category_id");
}
```

---

## 🔗 Dependencies
- US4.1: Core Apps Endpoints
- US4.2: Categories & Developers Endpoints

---

## 📊 Definition of Done
- [ ] Search endpoint implemented
- [ ] All filters working correctly
- [ ] Database indexes created
- [ ] Query performance < 100ms
- [ ] Search analytics logging
- [ ] Unit tests (80%+ coverage)
- [ ] Integration tests pass
- [ ] drf-spectacular documentation complete

---

**Created:** October 6, 2025  
**Owner:** Abubakr Abduraghman, a.abduraghman@itqan.dev  
**Epic:** [Epic 4: API Development](../epics/epic-4-api-development-integration.md)
