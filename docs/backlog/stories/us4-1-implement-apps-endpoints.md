# US4.1: Implement Core Apps API Endpoints

**Epic:** Epic 4 - API Development & Integration  
**Sprint:** Week 3, Day 1-2  
**Story Points:** 8  
**Priority:** P0  
**Assigned To:** Backend Developer  
**Status:** Not Started

---

## 📋 User Story

**As a** Frontend Developer  
**I want** RESTful API endpoints for CRUD operations on apps  
**So that** the Angular frontend can fetch, create, update, and delete apps dynamically

---

## 🎯 Acceptance Criteria

### AC1: GET /api/apps - List All Apps
- [ ] Returns paginated list of apps
- [ ] Default page size: 20 apps
- [ ] Query parameters:
  - `page` (default: 1)
  - `pageSize` (default: 20, max: 100)
  - `sortBy` (name, rating, createdAt)
  - `sortOrder` (asc, desc)
- [ ] Response includes total count for pagination
- [ ] HTTP 200 on success

### AC2: GET /api/apps/{id} - Get Single App
- [ ] Returns complete app details by Guid
- [ ] Includes related data:
  - Developer information
  - Categories
  - Screenshots
  - Average rating
- [ ] HTTP 200 on success
- [ ] HTTP 404 if app not found

### AC3: POST /api/apps - Create New App
- [ ] Accepts app creation DTO
- [ ] Validates all required fields
- [ ] Generates new Guid
- [ ] Sets CreatedAt timestamp
- [ ] Returns created app with HTTP 201
- [ ] Location header with new resource URL
- [ ] Requires authentication (JWT)

### AC4: PUT /api/apps/{id} - Update App
- [ ] Updates existing app
- [ ] Validates all fields
- [ ] Sets UpdatedAt timestamp
- [ ] Returns updated app with HTTP 200
- [ ] HTTP 404 if app not found
- [ ] HTTP 400 for validation errors
- [ ] Requires authentication

### AC5: DELETE /api/apps/{id} - Soft Delete
- [ ] Soft delete (sets IsDeleted flag)
- [ ] HTTP 204 on success
- [ ] HTTP 404 if app not found
- [ ] Requires admin authentication

### AC6: Response DTOs
- [ ] AppListDto (lightweight for lists)
- [ ] AppDetailDto (complete details)
- [ ] Bilingual fields properly structured
- [ ] JSON camelCase naming convention

### AC7: Error Handling
- [ ] Validation errors return HTTP 400 with details
- [ ] Not found returns HTTP 404 with message
- [ ] Server errors return HTTP 500 (generic message)
- [ ] All errors follow consistent error response format

---

## 📝 Technical Notes

### AppsViewSet Implementation
```python
class AppsViewSet(viewsets.ModelViewSet):
{
    
    def <PagedResult<AppListDto>>> GetApps(
    {
        if (pageSize > 100) pageSize = 100;
        
        var result = await _appsService.GetAppsAsync(
            page, pageSize, sortBy, sortOrder);
        
        return Ok(result);
    }
    
    def <AppDetailDto>> GetApp(uuid_id)
    {
        var app = await _appsService.GetAppByIdAsync(id);
        
        if (app == null)
        
        return Ok(app);
    }
    
    def <AppDetailDto>> CreateApp(
    {
        
        var createdApp = await _appsService.CreateAppAsync(dto);
        
            nameof(GetApp),
            new { id = createdApp.Id },
            createdApp);
    }
    
    def <AppDetailDto>> UpdateApp(
        uuid_id,
    {
        var updatedApp = await _appsService.UpdateAppAsync(id, dto);
        
        if (updatedApp == null)
        
        return Ok(updatedApp);
    }
    
    def  DeleteApp(uuid_id)
    {
        var deleted = await _appsService.DeleteAppAsync(id);
        
        if (!deleted)
        
    }
}
```

### DTOs
```python
// Lightweight for lists
public class AppListDto
{
    public Guid Id { get; set; }
    public string NameAr { get; set; }
    public string NameEn { get; set; }
    public string ShortDescriptionAr { get; set; }
    public string ShortDescriptionEn { get; set; }
    public string ApplicationIconUrl { get; set; }
    public decimal? AverageRating { get; set; }
    public List<string> Categories { get; set; }
}

// Complete details
public class AppDetailDto : AppListDto
{
    public string DescriptionAr { get; set; }
    public string DescriptionEn { get; set; }
    public DeveloperDto Developer { get; set; }
    public List<string> ScreenshotsAr { get; set; }
    public List<string> ScreenshotsEn { get; set; }
    public string MainImageAr { get; set; }
    public string MainImageEn { get; set; }
    public string GooglePlayLink { get; set; }
    public string AppStoreLink { get; set; }
    public string AppGalleryLink { get; set; }
    public DateTime CreatedAt { get; set; }
}
```

### Pagination Response
```python
public class PagedResult<T>
{
    public List<T> Items { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
    public int TotalCount { get; set; }
    public int TotalPages => (int)Math.Ceiling(TotalCount / (double)PageSize);
    public bool HasPrevious => Page > 1;
    public bool HasNext => Page < TotalPages;
}
```

---

## 🔗 Dependencies
- US2.3: Django REST Framework created
- US2.2: Django ORM configured
- US3.3: Data migrated to database

---

## 📊 Definition of Done
- [ ] All 5 CRUD endpoints implemented
- [ ] DTOs created and properly mapped
- [ ] Pagination working correctly
- [ ] Error handling complete
- [ ] Authentication/authorization enforced
- [ ] drf-spectacular documentation updated
- [ ] Postman collection created
- [ ] Unit tests written (80%+ coverage)
- [ ] Integration tests pass

---

**Created:** October 6, 2025  
**Owner:** Abubakr Abduraghman, a.abduraghman@itqan.dev  
**Epic:** [Epic 4: API Development](../epics/epic-4-api-development-integration.md)
