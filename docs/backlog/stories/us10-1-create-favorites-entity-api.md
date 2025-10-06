# US10.1: Create Favorites Entity & API

**Epic:** Epic 10 - Favorites & Personal Collections  
**Sprint:** Week 10, Day 1  
**Story Points:** 5  
**Priority:** P1  
**Assigned To:** Backend Developer  
**Status:** Not Started

---

## 📋 User Story

**As a** User  
**I want** to save apps to my favorites  
**So that** I can quickly access apps I like and might want to use later

---

## 🎯 Acceptance Criteria

### AC1: Favorite Entity Created
- [ ] `Favorite` table with UserId, AppId, CreatedAt
- [ ] Composite unique index on (UserId, AppId)
- [ ] Foreign keys to Users and Apps
- [ ] Cascade delete on user deletion

### AC2: Add to Favorites Endpoint
- [ ] POST /api/users/me/favorites/{appId}
- [ ] Requires authentication
- [ ] Prevents duplicates
- [ ] Returns HTTP 201 on success
- [ ] Returns 409 if already favorited

### AC3: Remove from Favorites Endpoint
- [ ] DELETE /api/users/me/favorites/{appId}
- [ ] Returns HTTP 204 on success
- [ ] Returns 404 if not favorited

### AC4: Get User's Favorites Endpoint
- [ ] GET /api/users/me/favorites
- [ ] Paginated list (default 20)
- [ ] Sort by date added (newest first)
- [ ] Returns app details with each favorite

### AC5: Check if Favorited Endpoint
- [ ] GET /api/users/me/favorites/{appId}/exists
- [ ] Returns boolean
- [ ] Used to show/hide favorite button state

### AC6: Favorites Count
- [ ] GET /api/apps/{appId}/favorites-count
- [ ] Returns total favorites for app
- [ ] Cached for 5 minutes

---

## 📝 Technical Notes

### Favorite Entity
```csharp
public class Favorite
{
    public Guid Id { get; set; }
    
    [Required]
    public Guid UserId { get; set; }
    
    [Required]
    public Guid AppId { get; set; }
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    // Navigation properties
    public ApplicationUser User { get; set; }
    public App App { get; set; }
}
```

### DbContext Configuration
```csharp
modelBuilder.Entity<Favorite>(entity =>
{
    entity.HasKey(f => f.Id);
    
    entity.HasOne(f => f.User)
        .WithMany(u => u.Favorites)
        .HasForeignKey(f => f.UserId)
        .OnDelete(DeleteBehavior.Cascade);
    
    entity.HasOne(f => f.App)
        .WithMany()
        .HasForeignKey(f => f.AppId)
        .OnDelete(DeleteBehavior.Cascade);
    
    // Prevent duplicates
    entity.HasIndex(f => new { f.UserId, f.AppId })
        .IsUnique();
    
    entity.HasIndex(f => f.CreatedAt);
});
```

### Favorites Controller
```csharp
[ApiController]
[Route("api/users/me/favorites")]
[Authorize]
public class FavoritesController : ControllerBase
{
    private readonly IFavoritesService _favoritesService;
    
    [HttpPost("{appId:guid}")]
    [ProducesResponseType(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> AddFavorite(Guid appId)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        
        try
        {
            await _favoritesService.AddFavoriteAsync(Guid.Parse(userId), appId);
            return StatusCode(201, new { message = "Added to favorites" });
        }
        catch (DuplicateException)
        {
            return Conflict(new { message = "Already in favorites" });
        }
    }
    
    [HttpDelete("{appId:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> RemoveFavorite(Guid appId)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        
        await _favoritesService.RemoveFavoriteAsync(Guid.Parse(userId), appId);
        
        return NoContent();
    }
    
    [HttpGet]
    [ProducesResponseType(typeof(PagedResult<FavoriteAppDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<PagedResult<FavoriteAppDto>>> GetFavorites(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        
        var favorites = await _favoritesService.GetUserFavoritesAsync(
            Guid.Parse(userId), page, pageSize);
        
        return Ok(favorites);
    }
    
    [HttpGet("{appId:guid}/exists")]
    [ProducesResponseType(typeof(bool), StatusCodes.Status200OK)]
    public async Task<ActionResult<bool>> IsFavorited(Guid appId)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        
        var exists = await _favoritesService.IsFavoritedAsync(
            Guid.Parse(userId), appId);
        
        return Ok(exists);
    }
}
```

### Favorites Service
```csharp
public interface IFavoritesService
{
    Task AddFavoriteAsync(Guid userId, Guid appId);
    Task RemoveFavoriteAsync(Guid userId, Guid appId);
    Task<PagedResult<FavoriteAppDto>> GetUserFavoritesAsync(Guid userId, int page, int pageSize);
    Task<bool> IsFavoritedAsync(Guid userId, Guid appId);
    Task<int> GetAppFavoritesCountAsync(Guid appId);
}

public class FavoritesService : IFavoritesService
{
    private readonly ApplicationDbContext _context;
    
    public async Task AddFavoriteAsync(Guid userId, Guid appId)
    {
        // Check if already exists
        var exists = await _context.Favorites
            .AnyAsync(f => f.UserId == userId && f.AppId == appId);
        
        if (exists)
            throw new DuplicateException("Already in favorites");
        
        var favorite = new Favorite
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            AppId = appId,
            CreatedAt = DateTime.UtcNow
        };
        
        await _context.Favorites.AddAsync(favorite);
        await _context.SaveChangesAsync();
    }
    
    public async Task RemoveFavoriteAsync(Guid userId, Guid appId)
    {
        var favorite = await _context.Favorites
            .FirstOrDefaultAsync(f => f.UserId == userId && f.AppId == appId);
        
        if (favorite != null)
        {
            _context.Favorites.Remove(favorite);
            await _context.SaveChangesAsync();
        }
    }
    
    public async Task<PagedResult<FavoriteAppDto>> GetUserFavoritesAsync(
        Guid userId,
        int page,
        int pageSize)
    {
        var query = _context.Favorites
            .Include(f => f.App)
                .ThenInclude(a => a.Developer)
            .Where(f => f.UserId == userId)
            .OrderByDescending(f => f.CreatedAt);
        
        var totalCount = await query.CountAsync();
        
        var favorites = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(f => new FavoriteAppDto
            {
                FavoriteId = f.Id,
                AppId = f.AppId,
                AppName = f.App.NameEn,
                AppIcon = f.App.ApplicationIconUrl,
                DeveloperName = f.App.Developer.NameEn,
                AverageRating = f.App.AverageRating,
                AddedAt = f.CreatedAt
            })
            .ToListAsync();
        
        return new PagedResult<FavoriteAppDto>
        {
            Items = favorites,
            TotalCount = totalCount,
            Page = page,
            PageSize = pageSize
        };
    }
    
    public async Task<bool> IsFavoritedAsync(Guid userId, Guid appId)
    {
        return await _context.Favorites
            .AnyAsync(f => f.UserId == userId && f.AppId == appId);
    }
    
    public async Task<int> GetAppFavoritesCountAsync(Guid appId)
    {
        return await _context.Favorites
            .Where(f => f.AppId == appId)
            .CountAsync();
    }
}
```

### Frontend Service
```typescript
@Injectable({ providedIn: 'root' })
export class FavoritesService {
  private favoritesSubject = new BehaviorSubject<Set<string>>(new Set());
  favorites$ = this.favoritesSubject.asObservable();
  
  constructor(private api: ApiService) {
    this.loadFavorites();
  }
  
  private loadFavorites(): void {
    this.api.get<PagedResult<FavoriteApp>>('users/me/favorites?pageSize=1000')
      .subscribe(result => {
        const favoriteIds = new Set(result.items.map(f => f.appId));
        this.favoritesSubject.next(favoriteIds);
      });
  }
  
  addFavorite(appId: string): Observable<void> {
    return this.api.post<void>(`users/me/favorites/${appId}`, {})
      .pipe(tap(() => {
        const favorites = this.favoritesSubject.value;
        favorites.add(appId);
        this.favoritesSubject.next(new Set(favorites));
      }));
  }
  
  removeFavorite(appId: string): Observable<void> {
    return this.api.delete(`users/me/favorites/${appId}`)
      .pipe(tap(() => {
        const favorites = this.favoritesSubject.value;
        favorites.delete(appId);
        this.favoritesSubject.next(new Set(favorites));
      }));
  }
  
  isFavorited(appId: string): Observable<boolean> {
    return this.favorites$.pipe(
      map(favorites => favorites.has(appId))
    );
  }
}
```

---

## 🔗 Dependencies
- US8.1: ASP.NET Identity
- US4.1: Apps API

---

## 📊 Definition of Done
- [ ] Favorite entity created
- [ ] All endpoints implemented
- [ ] Duplicate prevention working
- [ ] Frontend service complete
- [ ] Favorite button UI working
- [ ] Unit tests pass
- [ ] Integration tests pass

---

**Created:** October 6, 2025  
**Owner:** Abubakr Abduraghman, a.abduraghman@itqan.dev  
**Epic:** [Epic 10: Favorites & Personal Collections](../epics/epic-10-favorites-collections.md)
