# Epic 10: Favorites & Personal Collections

## 📋 Epic Overview
Enable users to save favorite apps and organize them into custom collections for personalized app discovery and management.

## 🎯 Goal
Increase user engagement and retention by allowing personalized app curation and easy access to saved apps.

## 📊 Success Metrics
- 40% of authenticated users use favorites
- Average 3-5 apps favorited per user
- 20% create at least one custom collection
- 60% return rate for users with favorites
- Collection sharing adoption >15%

## 🏗️ Technical Scope (.NET 9)
- Favorites system (one-click save/unsave)
- Custom collections with names and descriptions
- Collection privacy settings (public/private)
- Collection sharing via unique URLs
- Bulk operations (add multiple apps to collection)
- Export collections as JSON/CSV
- Real-time sync across devices

## 🔗 Dependencies
- Epic 8: User authentication system
- Epic 5: Frontend integration complete

## 📈 Business Value
- High: Drives engagement and retention
- Impact: Creates user investment in platform
- Effort: 3-4 days implementation

## ✅ Definition of Done
- Users can favorite/unfavorite apps
- Custom collections creatable
- Collections manageable (CRUD operations)
- Public collections shareable
- Export functionality working
- Mobile-optimized UI

## Related Stories
- US10.1: Favorites System Implementation
- US10.2: Custom Collections CRUD
- US10.3: Collection Sharing & Privacy
- US10.4: Bulk Operations
- US10.5: Collection Export Features

## .NET 9 Implementation Details
### Entity Models
```csharp
public class Favorite
{
    public Guid UserId { get; set; }
    public Guid AppId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    public ApplicationUser User { get; set; } = null!;
    public App App { get; set; } = null!;
}

public class Collection
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public bool IsPublic { get; set; }
    public string? ShareToken { get; set; } // For public sharing
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    
    public ApplicationUser User { get; set; } = null!;
    public ICollection<CollectionApp> CollectionApps { get; set; } = new List<CollectionApp>();
}

public class CollectionApp
{
    public Guid CollectionId { get; set; }
    public Guid AppId { get; set; }
    public int SortOrder { get; set; }
    public DateTime AddedAt { get; set; } = DateTime.UtcNow;
    public string? Note { get; set; } // Optional user note
    
    public Collection Collection { get; set; } = null!;
    public App App { get; set; } = null!;
}
```

### FavoritesController
```csharp
[ApiController]
[Route("api/v1/[controller]")]
[Authorize]
public class FavoritesController : ControllerBase
{
    private readonly IFavoritesService _favoritesService;
    
    [HttpGet]
    public async Task<ActionResult<List<AppResponse>>> GetFavorites()
    {
        var userId = GetUserId();
        var favorites = await _favoritesService.GetUserFavoritesAsync(userId);
        return Ok(favorites);
    }
    
    [HttpPost("{appId:guid}")]
    public async Task<IActionResult> AddFavorite(Guid appId)
    {
        var userId = GetUserId();
        await _favoritesService.AddFavoriteAsync(userId, appId);
        return NoContent();
    }
    
    [HttpDelete("{appId:guid}")]
    public async Task<IActionResult> RemoveFavorite(Guid appId)
    {
        var userId = GetUserId();
        await _favoritesService.RemoveFavoriteAsync(userId, appId);
        return NoContent();
    }
    
    [HttpGet("{appId:guid}/is-favorite")]
    public async Task<ActionResult<bool>> IsFavorite(Guid appId)
    {
        var userId = GetUserId();
        var isFavorite = await _favoritesService.IsFavoriteAsync(userId, appId);
        return Ok(isFavorite);
    }
}

[ApiController]
[Route("api/v1/[controller]")]
[Authorize]
public class CollectionsController : ControllerBase
{
    private readonly ICollectionsService _collectionsService;
    
    [HttpGet]
    public async Task<ActionResult<List<CollectionResponse>>> GetCollections()
    {
        var userId = GetUserId();
        var collections = await _collectionsService.GetUserCollectionsAsync(userId);
        return Ok(collections);
    }
    
    [HttpPost]
    public async Task<ActionResult<CollectionResponse>> CreateCollection(
        [FromBody] CreateCollectionRequest request)
    {
        var userId = GetUserId();
        var collection = await _collectionsService.CreateCollectionAsync(userId, request);
        return CreatedAtAction(nameof(GetCollection), new { id = collection.Id }, collection);
    }
    
    [HttpGet("{id:guid}")]
    public async Task<ActionResult<CollectionDetailResponse>> GetCollection(Guid id)
    {
        var userId = User.Identity?.IsAuthenticated == true ? GetUserId() : (Guid?)null;
        var collection = await _collectionsService.GetCollectionAsync(id, userId);
        return collection == null ? NotFound() : Ok(collection);
    }
    
    [HttpPost("{id:guid}/apps/{appId:guid}")]
    public async Task<IActionResult> AddAppToCollection(Guid id, Guid appId)
    {
        var userId = GetUserId();
        await _collectionsService.AddAppToCollectionAsync(id, appId, userId);
        return NoContent();
    }
    
    [HttpDelete("{id:guid}/apps/{appId:guid}")]
    public async Task<IActionResult> RemoveAppFromCollection(Guid id, Guid appId)
    {
        var userId = GetUserId();
        await _collectionsService.RemoveAppFromCollectionAsync(id, appId, userId);
        return NoContent();
    }
    
    [HttpGet("{id:guid}/export")]
    public async Task<IActionResult> ExportCollection(Guid id, [FromQuery] string format = "json")
    {
        var userId = GetUserId();
        var content = await _collectionsService.ExportCollectionAsync(id, userId, format);
        
        var contentType = format == "csv" ? "text/csv" : "application/json";
        var fileName = $"collection-{id}.{format}";
        
        return File(content, contentType, fileName);
    }
    
    [AllowAnonymous]
    [HttpGet("shared/{shareToken}")]
    public async Task<ActionResult<CollectionDetailResponse>> GetSharedCollection(string shareToken)
    {
        var collection = await _collectionsService.GetCollectionByShareTokenAsync(shareToken);
        return collection == null ? NotFound() : Ok(collection);
    }
}
```

### CollectionsService
```csharp
public class CollectionsService : ICollectionsService
{
    public async Task<CollectionResponse> CreateCollectionAsync(Guid userId, CreateCollectionRequest request)
    {
        var collection = new Collection
        {
            UserId = userId,
            Name = request.Name,
            Description = request.Description,
            IsPublic = request.IsPublic,
            ShareToken = request.IsPublic ? GenerateShareToken() : null
        };
        
        _context.Collections.Add(collection);
        await _context.SaveChangesAsync();
        
        return _mapper.Map<CollectionResponse>(collection);
    }
    
    public async Task<byte[]> ExportCollectionAsync(Guid collectionId, Guid userId, string format)
    {
        var collection = await _context.Collections
            .Include(c => c.CollectionApps)
            .ThenInclude(ca => ca.App)
            .FirstOrDefaultAsync(c => c.Id == collectionId && c.UserId == userId);
        
        if (collection == null)
            throw new NotFoundException("Collection not found");
        
        if (format == "csv")
        {
            return ExportToCsv(collection);
        }
        else
        {
            var json = JsonSerializer.Serialize(collection, new JsonSerializerOptions
            {
                WriteIndented = true
            });
            return Encoding.UTF8.GetBytes(json);
        }
    }
    
    private string GenerateShareToken()
    {
        return Convert.ToBase64String(Guid.NewGuid().ToByteArray())
            .Replace("/", "_").Replace("+", "-").Substring(0, 16);
    }
}
```

### Frontend Implementation
```typescript
// favorites.service.ts
@Injectable({ providedIn: 'root' })
export class FavoritesService {
  toggleFavorite(appId: string): Observable<void> {
    return this.isFavorite(appId).pipe(
      switchMap(isFav => 
        isFav 
          ? this.http.delete<void>(`${this.baseUrl}/api/v1/favorites/${appId}`)
          : this.http.post<void>(`${this.baseUrl}/api/v1/favorites/${appId}`, {})
      )
    );
  }
  
  getFavorites(): Observable<App[]> {
    return this.http.get<App[]>(`${this.baseUrl}/api/v1/favorites`);
  }
}

// collections.service.ts
@Injectable({ providedIn: 'root' })
export class CollectionsService {
  createCollection(collection: CreateCollectionRequest): Observable<Collection> {
    return this.http.post<Collection>(`${this.baseUrl}/api/v1/collections`, collection);
  }
  
  addToCollection(collectionId: string, appId: string): Observable<void> {
    return this.http.post<void>(
      `${this.baseUrl}/api/v1/collections/${collectionId}/apps/${appId}`,
      {}
    );
  }
  
  exportCollection(collectionId: string, format: 'json' | 'csv'): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/api/v1/collections/${collectionId}/export`, {
      params: { format },
      responseType: 'blob'
    });
  }
}
```

## Priority
priority-2 (Phase 2 - User Engagement)
