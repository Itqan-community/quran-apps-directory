# US10.3-10.5: Complete Favorites & Collections Features

**Epic:** Epic 10 - Favorites & Personal Collections  
**Sprint:** Week 10, Day 2-4  
**Story Points:** 10 (combined)  
**Priority:** P1-P2  
**Assigned To:** Full Stack Developer  
**Status:** Not Started

---

## 📋 Combined User Stories

### US10.3: Build Favorites UI
**As a** User, **I want** an intuitive favorites interface **So that** I can easily manage my favorite apps

### US10.4: Add Collection Sharing
**As a** User, **I want** to share my collections **So that** others can discover my curated app lists

### US10.5: Implement Bulk Operations
**As a** User, **I want** to perform bulk actions **So that** I can efficiently manage multiple apps at once

---

## 🎯 Combined Acceptance Criteria

### US10.3 - Favorites UI (AC1-AC4)
- [ ] Favorite button on app cards (heart icon)
- [ ] Toggle favorite with single click
- [ ] Optimistic UI updates
- [ ] Favorites page (/favorites) with app grid
- [ ] Empty state ("No favorites yet")
- [ ] Remove from favorites option

### US10.4 - Collection Sharing (AC5-AC8)
- [ ] Share collection button
- [ ] Shareable URL: `/collections/{id}`
- [ ] Public collection view page
- [ ] Privacy toggle (public/private)
- [ ] Copy link functionality
- [ ] Social media sharing integration

### US10.5 - Bulk Operations (AC9-AC12)
- [ ] Multi-select mode in favorites/collections
- [ ] "Add to collection" bulk action
- [ ] "Remove from collection" bulk action
- [ ] Move apps between collections
- [ ] Select all / deselect all
- [ ] Bulk operation confirmation

---

## 📝 Technical Implementation

### Favorite Button Component (US10.3)
```typescript
@Component({
  selector: 'app-favorite-button',
  standalone: true,
  template: `
    <button 
      mat-icon-button
      [class.favorited]="isFavorited$ | async"
      (click)="toggleFavorite()"
      [disabled]="isLoading">
      <mat-icon>{{ (isFavorited$ | async) ? 'favorite' : 'favorite_border' }}</mat-icon>
    </button>
  `,
  styles: [`
    .favorited {
      color: #e91e63;
    }
  `]
})
export class FavoriteButtonComponent {
  @Input() appId!: string;
  
  isFavorited$: Observable<boolean>;
  isLoading = false;
  
  constructor(
    private favoritesService: FavoritesService,
    private snackBar: MatSnackBar
  ) {}
  
  ngOnInit(): void {
    this.isFavorited$ = this.favoritesService.isFavorited(this.appId);
  }
  
  toggleFavorite(): void {
    this.isLoading = true;
    
    this.isFavorited$.pipe(
      take(1),
      switchMap(isFavorited => 
        isFavorited
          ? this.favoritesService.removeFavorite(this.appId)
          : this.favoritesService.addFavorite(this.appId)
      )
    ).subscribe({
      next: () => {
        this.isLoading = false;
        this.snackBar.open(
          isFavorited ? 'Removed from favorites' : 'Added to favorites',
          'Close',
          { duration: 2000 }
        );
      },
      error: (err) => {
        this.isLoading = false;
        this.snackBar.open('Failed to update favorites', 'Close', { duration: 3000 });
      }
    });
  }
}
```

### Collection Sharing (US10.4)
```typescript
// Backend - Share URL endpoint
[HttpGet("{id:guid}/share-url")]
public ActionResult<ShareUrlDto> GetShareUrl(Guid id)
{
    var collection = await _context.Collections.FindAsync(id);
    
    if (collection == null || !collection.IsPublic)
        return NotFound();
    
    var url = $"{_configuration["Frontend:BaseUrl"]}/collections/{id}";
    
    return Ok(new ShareUrlDto { Url = url });
}

// Frontend - Share Collection Component
@Component({
  selector: 'app-share-collection',
  template: `
    <button mat-button (click)="shareCollection()">
      <mat-icon>share</mat-icon>
      Share Collection
    </button>
  `
})
export class ShareCollectionComponent {
  @Input() collection!: Collection;
  
  shareCollection(): void {
    if (!this.collection.isPublic) {
      this.snackBar.open('Make collection public to share', 'Close');
      return;
    }
    
    const url = `${window.location.origin}/collections/${this.collection.id}`;
    
    if (navigator.share) {
      navigator.share({
        title: this.collection.name,
        text: this.collection.description,
        url: url
      });
    } else {
      this.clipboard.copy(url);
      this.snackBar.open('Link copied to clipboard', 'Close', { duration: 2000 });
    }
  }
}
```

### Bulk Operations (US10.5)
```typescript
// Backend - Bulk operations endpoint
[HttpPost("bulk-operations")]
public async Task<IActionResult> BulkOperation([FromBody] BulkOperationDto dto)
{
    var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
    
    switch (dto.Operation)
    {
        case "add-to-collection":
            await _collectionsService.BulkAddAppsAsync(
                dto.CollectionId.Value,
                dto.AppIds,
                Guid.Parse(userId));
            break;
        
        case "remove-from-collection":
            await _collectionsService.BulkRemoveAppsAsync(
                dto.CollectionId.Value,
                dto.AppIds,
                Guid.Parse(userId));
            break;
        
        case "move-to-collection":
            await _collectionsService.BulkMoveAppsAsync(
                dto.SourceCollectionId.Value,
                dto.CollectionId.Value,
                dto.AppIds,
                Guid.Parse(userId));
            break;
        
        default:
            return BadRequest();
    }
    
    return Ok(new { message = $"Bulk operation completed for {dto.AppIds.Count} apps" });
}

// Frontend - Bulk Selection Component
@Component({
  selector: 'app-bulk-selection',
  template: `
    <div class="bulk-actions" *ngIf="selectionMode">
      <mat-checkbox 
        [checked]="allSelected"
        (change)="toggleSelectAll()">
        Select All
      </mat-checkbox>
      
      <span>{{ selectedApps.size }} selected</span>
      
      <button 
        mat-button 
        [matMenuTriggerFor]="bulkMenu"
        [disabled]="selectedApps.size === 0">
        <mat-icon>more_vert</mat-icon>
        Actions
      </button>
      
      <mat-menu #bulkMenu="matMenu">
        <button mat-menu-item (click)="addToCollection()">
          <mat-icon>add</mat-icon>
          Add to Collection
        </button>
        <button mat-menu-item (click)="removeFromCollection()">
          <mat-icon>remove</mat-icon>
          Remove from Collection
        </button>
        <button mat-menu-item (click)="moveToCollection()">
          <mat-icon>drive_file_move</mat-icon>
          Move to Collection
        </button>
      </mat-menu>
    </div>
    
    <!-- App Grid with Selection -->
    <div class="apps-grid">
      <div *ngFor="let app of apps" class="app-card-wrapper">
        <mat-checkbox 
          *ngIf="selectionMode"
          [checked]="selectedApps.has(app.id)"
          (change)="toggleSelection(app.id)">
        </mat-checkbox>
        <app-card [app]="app"></app-card>
      </div>
    </div>
  `
})
export class BulkSelectionComponent {
  @Input() apps: App[] = [];
  @Input() collectionId?: string;
  
  selectionMode = false;
  selectedApps = new Set<string>();
  allSelected = false;
  
  toggleSelectAll(): void {
    if (this.allSelected) {
      this.selectedApps.clear();
    } else {
      this.apps.forEach(app => this.selectedApps.add(app.id));
    }
    this.allSelected = !this.allSelected;
  }
  
  toggleSelection(appId: string): void {
    if (this.selectedApps.has(appId)) {
      this.selectedApps.delete(appId);
    } else {
      this.selectedApps.add(appId);
    }
  }
  
  addToCollection(): void {
    const dialogRef = this.dialog.open(SelectCollectionDialogComponent);
    
    dialogRef.afterClosed().subscribe(collectionId => {
      if (collectionId) {
        this.collectionsService.bulkAddApps(
          collectionId,
          Array.from(this.selectedApps)
        ).subscribe({
          next: () => {
            this.snackBar.open('Apps added to collection', 'Close', { duration: 2000 });
            this.selectedApps.clear();
          }
        });
      }
    });
  }
}
```

### Collections Service - Bulk Methods
```csharp
public async Task BulkAddAppsAsync(
    Guid collectionId,
    List<Guid> appIds,
    Guid userId)
{
    var collection = await _context.Collections.FindAsync(collectionId);
    if (collection == null || collection.UserId != userId)
        throw new UnauthorizedException();
    
    // Get existing apps in collection
    var existing = await _context.Set<AppCollection>()
        .Where(ac => ac.CollectionId == collectionId)
        .Select(ac => ac.AppId)
        .ToListAsync();
    
    // Filter out already added apps
    var newApps = appIds.Except(existing).ToList();
    
    var appCollections = newApps.Select(appId => new AppCollection
    {
        CollectionId = collectionId,
        AppId = appId,
        AddedAt = DateTime.UtcNow
    }).ToList();
    
    await _context.Set<AppCollection>().AddRangeAsync(appCollections);
    await _context.SaveChangesAsync();
}

public async Task BulkRemoveAppsAsync(
    Guid collectionId,
    List<Guid> appIds,
    Guid userId)
{
    var collection = await _context.Collections.FindAsync(collectionId);
    if (collection == null || collection.UserId != userId)
        throw new UnauthorizedException();
    
    var toRemove = await _context.Set<AppCollection>()
        .Where(ac => ac.CollectionId == collectionId && appIds.Contains(ac.AppId))
        .ToListAsync();
    
    _context.Set<AppCollection>().RemoveRange(toRemove);
    await _context.SaveChangesAsync();
}
```

---

## 🔗 Dependencies
- US10.1: Favorites API
- US10.2: Collections system
- Angular Material for UI components

---

## 📊 Definition of Done
- [ ] Favorite button working on all app cards
- [ ] Favorites page complete with grid
- [ ] Collection sharing functional
- [ ] Public collection view working
- [ ] Bulk selection UI implemented
- [ ] Bulk operations (add/remove/move) working
- [ ] Confirmation dialogs for bulk actions
- [ ] All UI responsive
- [ ] Unit tests pass
- [ ] E2E tests pass

---

**Created:** October 6, 2025  
**Owner:** Abubakr Abduraghman, a.abduraghman@itqan.dev  
**Epic:** [Epic 10: Favorites & Personal Collections](../epics/epic-10-favorites-collections.md)
