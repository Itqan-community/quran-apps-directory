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

### AppsController Implementation
```csharp
[ApiController]
[Route("api/[controller]")]
public class AppsController : ControllerBase
{
    private readonly IAppsService _appsService;
    private readonly ILogger<AppsController> _logger;
    
    [HttpGet]
    [ProducesResponseType(typeof(PagedResult<AppListDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<PagedResult<AppListDto>>> GetApps(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] string sortBy = "name",
        [FromQuery] string sortOrder = "asc")
    {
        if (pageSize > 100) pageSize = 100;
        
        var result = await _appsService.GetAppsAsync(
            page, pageSize, sortBy, sortOrder);
        
        return Ok(result);
    }
    
    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(AppDetailDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<AppDetailDto>> GetApp(Guid id)
    {
        var app = await _appsService.GetAppByIdAsync(id);
        
        if (app == null)
            return NotFound(new { message = $"App with ID {id} not found" });
        
        return Ok(app);
    }
    
    [HttpPost]
    [Authorize]
    [ProducesResponseType(typeof(AppDetailDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<AppDetailDto>> CreateApp(
        [FromBody] CreateAppDto dto)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);
        
        var createdApp = await _appsService.CreateAppAsync(dto);
        
        return CreatedAtAction(
            nameof(GetApp),
            new { id = createdApp.Id },
            createdApp);
    }
    
    [HttpPut("{id:guid}")]
    [Authorize]
    [ProducesResponseType(typeof(AppDetailDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<AppDetailDto>> UpdateApp(
        Guid id,
        [FromBody] UpdateAppDto dto)
    {
        var updatedApp = await _appsService.UpdateAppAsync(id, dto);
        
        if (updatedApp == null)
            return NotFound();
        
        return Ok(updatedApp);
    }
    
    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteApp(Guid id)
    {
        var deleted = await _appsService.DeleteAppAsync(id);
        
        if (!deleted)
            return NotFound();
        
        return NoContent();
    }
}
```

### DTOs
```csharp
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
```csharp
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
- US2.3: ASP.NET Core API created
- US2.2: EF Core configured
- US3.3: Data migrated to database

---

## 📊 Definition of Done
- [ ] All 5 CRUD endpoints implemented
- [ ] DTOs created and properly mapped
- [ ] Pagination working correctly
- [ ] Error handling complete
- [ ] Authentication/authorization enforced
- [ ] Swagger documentation updated
- [ ] Postman collection created
- [ ] Unit tests written (80%+ coverage)
- [ ] Integration tests pass

---

**Created:** October 6, 2025  
**Owner:** Abubakr Abduraghman, a.abduraghman@itqan.dev  
**Epic:** [Epic 4: API Development](../epics/epic-4-api-development-integration.md)
