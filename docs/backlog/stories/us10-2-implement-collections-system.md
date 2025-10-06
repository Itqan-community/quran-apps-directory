# US10.2: Implement Collections System

**Epic:** Epic 10 - Favorites & Personal Collections  
**Sprint:** Week 10, Day 1-2  
**Story Points:** 8  
**Priority:** P1  
**Assigned To:** Backend Developer  
**Status:** Not Started

---

## 📋 User Story

**As a** User  
**I want** to organize apps into custom collections  
**So that** I can group related apps by theme or purpose (e.g., "Learning Tools", "Kids Apps")

---

## 🎯 Acceptance Criteria

### AC1: Collection Entity
- [ ] `Collection` table: Id, UserId, Name, Description, IsPublic, CreatedAt
- [ ] `AppCollection` junction table: CollectionId, AppId, AddedAt
- [ ] Proper relationships and indexes

### AC2: Create Collection Endpoint
- [ ] POST /api/users/me/collections
- [ ] Accepts: Name (required, max 100), Description (optional, max 500), IsPublic
- [ ] Returns created collection with HTTP 201

### AC3: Update Collection Endpoint
- [ ] PUT /api/users/me/collections/{id}
- [ ] User can only edit own collections
- [ ] Update name, description, privacy

### AC4: Delete Collection Endpoint
- [ ] DELETE /api/users/me/collections/{id}
- [ ] Soft delete or hard delete (configurable)
- [ ] Cascade deletes AppCollection entries

### AC5: Add App to Collection
- [ ] POST /api/users/me/collections/{collectionId}/apps/{appId}
- [ ] Prevents duplicates
- [ ] Returns HTTP 201

### AC6: Remove App from Collection
- [ ] DELETE /api/users/me/collections/{collectionId}/apps/{appId}
- [ ] Returns HTTP 204

### AC7: Get Collection Details
- [ ] GET /api/collections/{id}
- [ ] Returns collection with apps
- [ ] Public collections accessible by anyone
- [ ] Private collections only by owner

### AC8: List User's Collections
- [ ] GET /api/users/me/collections
- [ ] Paginated list
- [ ] Includes app count per collection

---

## 📝 Technical Notes

### Collection Entities
```csharp
public class Collection
{
    public Guid Id { get; set; }
    
    [Required]
    public Guid UserId { get; set; }
    
    [Required]
    [MaxLength(100)]
    public string Name { get; set; }
    
    [MaxLength(500)]
    public string Description { get; set; }
    
    public bool IsPublic { get; set; }
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
    
    // Navigation
    public ApplicationUser User { get; set; }
    public ICollection<AppCollection> AppCollections { get; set; }
}

public class AppCollection
{
    public Guid CollectionId { get; set; }
    public Guid AppId { get; set; }
    public DateTime AddedAt { get; set; } = DateTime.UtcNow;
    
    // Navigation
    public Collection Collection { get; set; }
    public App App { get; set; }
}
```

### Collections Controller
```csharp
[ApiController]
[Route("api/users/me/collections")]
[Authorize]
public class CollectionsController : ControllerBase
{
    private readonly ICollectionsService _collectionsService;
    
    [HttpPost]
    [ProducesResponseType(typeof(CollectionDto), StatusCodes.Status201Created)]
    public async Task<ActionResult<CollectionDto>> CreateCollection(
        [FromBody] CreateCollectionDto dto)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        
        var collection = await _collectionsService.CreateCollectionAsync(
            Guid.Parse(userId), dto);
        
        return CreatedAtAction(
            nameof(GetCollection),
            new { id = collection.Id },
            collection);
    }
    
    [HttpPut("{id:guid}")]
    public async Task<ActionResult<CollectionDto>> UpdateCollection(
        Guid id,
        [FromBody] UpdateCollectionDto dto)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        
        var collection = await _collectionsService.UpdateCollectionAsync(
            id, Guid.Parse(userId), dto);
        
        if (collection == null)
            return NotFound();
        
        return Ok(collection);
    }
    
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> DeleteCollection(Guid id)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        
        var deleted = await _collectionsService.DeleteCollectionAsync(
            id, Guid.Parse(userId));
        
        if (!deleted)
            return NotFound();
        
        return NoContent();
    }
    
    [HttpPost("{collectionId:guid}/apps/{appId:guid}")]
    public async Task<IActionResult> AddAppToCollection(
        Guid collectionId,
        Guid appId)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        
        await _collectionsService.AddAppToCollectionAsync(
            collectionId, appId, Guid.Parse(userId));
        
        return StatusCode(201);
    }
    
    [HttpDelete("{collectionId:guid}/apps/{appId:guid}")]
    public async Task<IActionResult> RemoveAppFromCollection(
        Guid collectionId,
        Guid appId)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        
        await _collectionsService.RemoveAppFromCollectionAsync(
            collectionId, appId, Guid.Parse(userId));
        
        return NoContent();
    }
    
    [HttpGet]
    public async Task<ActionResult<List<CollectionSummaryDto>>> GetUserCollections()
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        
        var collections = await _collectionsService.GetUserCollectionsAsync(
            Guid.Parse(userId));
        
        return Ok(collections);
    }
}

[ApiController]
[Route("api/collections")]
public class PublicCollectionsController : ControllerBase
{
    [HttpGet("{id:guid}")]
    [AllowAnonymous]
    public async Task<ActionResult<CollectionDetailDto>> GetCollection(Guid id)
    {
        var userId = User.Identity?.IsAuthenticated == true
            ? Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value)
            : (Guid?)null;
        
        var collection = await _collectionsService.GetCollectionAsync(id, userId);
        
        if (collection == null)
            return NotFound();
        
        return Ok(collection);
    }
}
```

### Collections Service
```csharp
public class CollectionsService : ICollectionsService
{
    public async Task<CollectionDto> CreateCollectionAsync(
        Guid userId,
        CreateCollectionDto dto)
    {
        var collection = new Collection
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Name = dto.Name,
            Description = dto.Description,
            IsPublic = dto.IsPublic,
            CreatedAt = DateTime.UtcNow
        };
        
        await _context.Collections.AddAsync(collection);
        await _context.SaveChangesAsync();
        
        return new CollectionDto
        {
            Id = collection.Id,
            Name = collection.Name,
            Description = collection.Description,
            IsPublic = collection.IsPublic,
            AppCount = 0,
            CreatedAt = collection.CreatedAt
        };
    }
    
    public async Task AddAppToCollectionAsync(
        Guid collectionId,
        Guid appId,
        Guid userId)
    {
        // Verify ownership
        var collection = await _context.Collections.FindAsync(collectionId);
        if (collection == null || collection.UserId != userId)
            throw new UnauthorizedException();
        
        // Check if already exists
        var exists = await _context.Set<AppCollection>()
            .AnyAsync(ac => ac.CollectionId == collectionId && ac.AppId == appId);
        
        if (exists)
            return; // Idempotent
        
        var appCollection = new AppCollection
        {
            CollectionId = collectionId,
            AppId = appId,
            AddedAt = DateTime.UtcNow
        };
        
        await _context.Set<AppCollection>().AddAsync(appCollection);
        await _context.SaveChangesAsync();
    }
    
    public async Task<CollectionDetailDto> GetCollectionAsync(
        Guid id,
        Guid? requestingUserId)
    {
        var collection = await _context.Collections
            .Include(c => c.User)
            .Include(c => c.AppCollections)
                .ThenInclude(ac => ac.App)
            .FirstOrDefaultAsync(c => c.Id == id);
        
        if (collection == null)
            return null;
        
        // Check access
        if (!collection.IsPublic && collection.UserId != requestingUserId)
            return null;
        
        return new CollectionDetailDto
        {
            Id = collection.Id,
            Name = collection.Name,
            Description = collection.Description,
            IsPublic = collection.IsPublic,
            OwnerName = collection.User.FullName,
            Apps = collection.AppCollections
                .Select(ac => new AppListDto
                {
                    Id = ac.AppId,
                    NameEn = ac.App.NameEn,
                    // ... other fields
                })
                .ToList(),
            CreatedAt = collection.CreatedAt
        };
    }
}
```

---

## 🔗 Dependencies
- US10.1: Favorites system
- US8.1: User authentication

---

## 📊 Definition of Done
- [ ] Collection entities created
- [ ] All CRUD endpoints working
- [ ] App management in collections
- [ ] Privacy controls (public/private)
- [ ] Frontend UI complete
- [ ] Unit tests pass
- [ ] Integration tests pass

---

**Created:** October 6, 2025  
**Owner:** Abubakr Abduraghman, a.abduraghman@itqan.dev  
**Epic:** [Epic 10: Favorites & Personal Collections](../epics/epic-10-favorites-collections.md)
