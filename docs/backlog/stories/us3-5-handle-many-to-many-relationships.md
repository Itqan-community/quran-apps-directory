# US3.5: Handle Complex Many-to-Many Relationships

**Epic:** Epic 3 - Data Migration Engine  
**Sprint:** Week 2, Day 3  
**Story Points:** 5  
**Priority:** P1  
**Assigned To:** Backend Developer  
**Status:** Not Started

---

## 📋 User Story

**As a** Backend Developer  
**I want to** properly handle many-to-many relationships during migration  
**So that** app-category associations and future app-feature relationships are correctly established in the database

---

## 🎯 Acceptance Criteria

### AC1: App-Category Relationships Migrated
- [ ] All 44 apps have correct category associations
- [ ] AppCategories junction table populated
- [ ] Average 2-3 categories per app maintained
- [ ] No orphan junction records

### AC2: Category Lookup Dictionary
- [ ] Category name → Guid mapping created
- [ ] Case-insensitive category matching
- [ ] Handles category name variations (if any)
- [ ] Missing category handling defined (error vs. create)

### AC3: Future-Proof for App-Features
- [ ] AppFeatures junction table structure ready
- [ ] Migration placeholder for future features data
- [ ] Features extraction logic documented (not implemented)
- [ ] Schema supports future feature additions

### AC4: Junction Record Generation
- [ ] Efficient bulk insert for junction records
- [ ] Proper foreign key references
- [ ] No duplicate junction records
- [ ] Transaction support for atomicity

### AC5: Developer-App Relationships
- [ ] One-to-many relationship correctly established
- [ ] Developer deduplication working
- [ ] All apps linked to correct developer
- [ ] No orphan apps (all have valid DeveloperId)

### AC6: Screenshot Collections
- [ ] Screenshots linked to apps correctly
- [ ] Language-specific screenshot grouping
- [ ] Screenshot order preserved (if applicable)
- [ ] Broken image URLs handled gracefully

---

## 📝 Technical Notes

### Many-to-Many Handling
```csharp
public async Task MigrateRelationshipsAsync(
    List<App> apps,
    List<StaticAppData> sourceData,
    Dictionary<string, Guid> categoryMap)
{
    var appCategories = new List<AppCategory>();
    
    // Build App lookup by original name (for matching)
    var appLookup = apps.ToDictionary(
        a => a.NameEn,
        a => a.Id
    );
    
    foreach (var source in sourceData)
    {
        var appId = appLookup[source.Name_En];
        
        foreach (var categoryName in source.Categories)
        {
            if (categoryMap.TryGetValue(categoryName, out var categoryId))
            {
                appCategories.Add(new AppCategory
                {
                    AppId = appId,
                    CategoryId = categoryId
                });
            }
            else
            {
                _logger.LogWarning(
                    "Category '{Category}' not found for app '{App}'",
                    categoryName,
                    source.Name_En);
            }
        }
    }
    
    // Bulk insert junction records
    await _context.AppCategories.AddRangeAsync(appCategories);
    await _context.SaveChangesAsync();
    
    _logger.LogInformation(
        "Created {Count} app-category associations",
        appCategories.Count);
}
```

### Category Mapping Setup
```csharp
public async Task<Dictionary<string, Guid>> BuildCategoryMapAsync()
{
    var categories = await _context.Categories.ToListAsync();
    
    var map = new Dictionary<string, Guid>(StringComparer.OrdinalIgnoreCase);
    
    foreach (var category in categories)
    {
        // Map both English and Arabic names
        map[category.NameEn] = category.Id;
        map[category.NameAr] = category.Id;
        
        // Handle common variations
        map[category.NameEn.ToLower()] = category.Id;
    }
    
    return map;
}
```

### EF Core Navigation Configuration
```csharp
// In ApplicationDbContext.OnModelCreating
modelBuilder.Entity<AppCategory>()
    .HasKey(ac => new { ac.AppId, ac.CategoryId });

modelBuilder.Entity<AppCategory>()
    .HasOne(ac => ac.App)
    .WithMany(a => a.AppCategories)
    .HasForeignKey(ac => ac.AppId)
    .OnDelete(DeleteBehavior.Cascade);

modelBuilder.Entity<AppCategory>()
    .HasOne(ac => ac.Category)
    .WithMany(c => c.AppCategories)
    .HasForeignKey(ac => ac.CategoryId)
    .OnDelete(DeleteBehavior.Restrict);

// Future: App-Feature relationship
modelBuilder.Entity<AppFeature>()
    .HasKey(af => new { af.AppId, af.FeatureId });
```

### Validation Query
```sql
-- Verify all apps have categories
SELECT a.id, a.name_en, COUNT(ac.category_id) as category_count
FROM apps a
LEFT JOIN app_categories ac ON a.id = ac.app_id
GROUP BY a.id, a.name_en
HAVING COUNT(ac.category_id) = 0;
-- Should return 0 rows

-- Check for orphan junction records
SELECT ac.*
FROM app_categories ac
WHERE NOT EXISTS (SELECT 1 FROM apps WHERE id = ac.app_id)
   OR NOT EXISTS (SELECT 1 FROM categories WHERE id = ac.category_id);
-- Should return 0 rows
```

---

## 🔗 Dependencies
- US3.2: Transform Data to Match Schema
- US3.3: Create Automated Migration Scripts

---

## 📊 Definition of Done
- [ ] App-Category relationships migrated (100% accuracy)
- [ ] Category lookup dictionary working
- [ ] Junction records created and validated
- [ ] Developer-App relationships correct
- [ ] Screenshot collections linked properly
- [ ] No orphan records
- [ ] Future feature relationships documented
- [ ] Validation tests pass

---

**Created:** October 6, 2025  
**Owner:** Abubakr Abduraghman, a.abduraghman@itqan.dev  
**Epic:** [Epic 3: Data Migration Engine](../epics/epic-3-data-migration-engine.md)
