# US4.2: Implement Categories & Developers Endpoints

**Epic:** Epic 4 - API Development & Integration  
**Sprint:** Week 3, Day 2  
**Story Points:** 5  
**Priority:** P0  
**Assigned To:** Backend Developer  
**Status:** Not Started

---

## 📋 User Story

**As a** Frontend Developer  
**I want** API endpoints for categories and developers  
**So that** I can display filtered lists, category chips, and developer profiles

---

## 🎯 Acceptance Criteria

### AC1: GET /api/categories - List All Categories
- [ ] Returns all categories (no pagination needed - only 11)
- [ ] Includes both Arabic and English names
- [ ] Includes app count per category
- [ ] HTTP 200 on success
- [ ] Response format:
```json
{
  "categories": [
    {
      "id": "uuid",
      "nameAr": "القراءة",
      "nameEn": "Reading",
      "appCount": 15
    }
  ]
}
```

### AC2: GET /api/categories/{id}/apps - Apps by Category
- [ ] Returns paginated apps for specific category
- [ ] Supports same pagination as /api/apps
- [ ] HTTP 200 on success
- [ ] HTTP 404 if category not found

### AC3: GET /api/developers - List All Developers
- [ ] Returns paginated list of developers
- [ ] Includes app count per developer
- [ ] Supports search by name
- [ ] HTTP 200 on success

### AC4: GET /api/developers/{id} - Get Single Developer
- [ ] Returns developer details
- [ ] Includes list of their apps
- [ ] HTTP 200 on success
- [ ] HTTP 404 if not found

### AC5: GET /api/developers/{id}/apps - Apps by Developer
- [ ] Returns all apps by specific developer
- [ ] Paginated response
- [ ] HTTP 200 on success

### AC6: POST /api/categories - Create Category (Admin)
- [ ] Requires admin authentication
- [ ] Validates bilingual names
- [ ] HTTP 201 on success
- [ ] HTTP 400 for validation errors

### AC7: PUT /api/developers/{id} - Update Developer
- [ ] Requires authentication (developer or admin)
- [ ] Updates developer profile
- [ ] HTTP 200 on success

---

## 📝 Technical Notes

### CategoriesController
```csharp
[ApiController]
[Route("api/[controller]")]
public class CategoriesController : ControllerBase
{
    private readonly ICategoriesService _categoriesService;
    
    [HttpGet]
    [ProducesResponseType(typeof(CategoriesResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<CategoriesResponse>> GetCategories()
    {
        var categories = await _categoriesService.GetAllCategoriesAsync();
        
        return Ok(new CategoriesResponse { Categories = categories });
    }
    
    [HttpGet("{id:guid}/apps")]
    [ProducesResponseType(typeof(PagedResult<AppListDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<PagedResult<AppListDto>>> GetCategoryApps(
        Guid id,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        var apps = await _categoriesService.GetCategoryAppsAsync(
            id, page, pageSize);
        
        if (apps == null)
            return NotFound();
        
        return Ok(apps);
    }
    
    [HttpPost]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(typeof(CategoryDto), StatusCodes.Status201Created)]
    public async Task<ActionResult<CategoryDto>> CreateCategory(
        [FromBody] CreateCategoryDto dto)
    {
        var category = await _categoriesService.CreateCategoryAsync(dto);
        
        return CreatedAtAction(
            nameof(GetCategories),
            new { id = category.Id },
            category);
    }
}
```

### DevelopersController
```csharp
[ApiController]
[Route("api/[controller]")]
public class DevelopersController : ControllerBase
{
    private readonly IDevelopersService _developersService;
    
    [HttpGet]
    [ProducesResponseType(typeof(PagedResult<DeveloperListDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<PagedResult<DeveloperListDto>>> GetDevelopers(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] string search = null)
    {
        var result = await _developersService.GetDevelopersAsync(
            page, pageSize, search);
        
        return Ok(result);
    }
    
    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(DeveloperDetailDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<DeveloperDetailDto>> GetDeveloper(Guid id)
    {
        var developer = await _developersService.GetDeveloperByIdAsync(id);
        
        if (developer == null)
            return NotFound();
        
        return Ok(developer);
    }
    
    [HttpGet("{id:guid}/apps")]
    public async Task<ActionResult<List<AppListDto>>> GetDeveloperApps(Guid id)
    {
        var apps = await _developersService.GetDeveloperAppsAsync(id);
        
        if (apps == null)
            return NotFound();
        
        return Ok(apps);
    }
    
    [HttpPut("{id:guid}")]
    [Authorize]
    public async Task<ActionResult<DeveloperDetailDto>> UpdateDeveloper(
        Guid id,
        [FromBody] UpdateDeveloperDto dto)
    {
        // Verify user is developer or admin
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (!await _developersService.CanEditDeveloper(id, userId))
            return Forbid();
        
        var updated = await _developersService.UpdateDeveloperAsync(id, dto);
        
        if (updated == null)
            return NotFound();
        
        return Ok(updated);
    }
}
```

### DTOs
```csharp
public class CategoryDto
{
    public Guid Id { get; set; }
    public string NameAr { get; set; }
    public string NameEn { get; set; }
    public int AppCount { get; set; }
}

public class DeveloperListDto
{
    public Guid Id { get; set; }
    public string NameAr { get; set; }
    public string NameEn { get; set; }
    public string LogoUrl { get; set; }
    public int AppCount { get; set; }
}

public class DeveloperDetailDto : DeveloperListDto
{
    public string Website { get; set; }
    public string Email { get; set; }
    public List<AppListDto> Apps { get; set; }
    public DateTime CreatedAt { get; set; }
}
```

---

## 🔗 Dependencies
- US4.1: Core Apps Endpoints

---

## 📊 Definition of Done
- [ ] All 7 endpoints implemented
- [ ] DTOs created
- [ ] Authentication/authorization working
- [ ] Swagger documentation updated
- [ ] Unit tests written
- [ ] Integration tests pass

---

**Created:** October 6, 2025  
**Owner:** Abubakr Abduraghman, a.abduraghman@itqan.dev  
**Epic:** [Epic 4: API Development](../epics/epic-4-api-development-integration.md)
