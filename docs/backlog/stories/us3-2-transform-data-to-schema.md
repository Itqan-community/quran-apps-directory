# US3.2: Transform Data to Match New Schema

**Epic:** Epic 3 - Data Migration Engine  
**Sprint:** Week 2, Day 1-2  
**Story Points:** 5  
**Priority:** P1  
**Assigned To:** Backend Developer  
**Status:** Not Started

---

## 📋 User Story

**As a** Backend Developer
**I want to** create Python transformation logic to convert static TypeScript data to Django models
**So that** the existing 44 apps can be accurately migrated to the new PostgreSQL database with proper relationships

---

## 🎯 Acceptance Criteria

### AC1: Transformation Service Created
- [ ] `DataTransformationService` class implemented
- [ ] Django serializer-based data mapping configured
- [ ] All transformations covered:
  - App data transformation
  - Developer extraction and deduplication
  - Category mapping
  - Screenshot organization
  - URL normalization

### AC2: Developer Extraction Logic
- [ ] Unique developers extracted from app data
- [ ] Developer deduplication logic (match by name or website)
- [ ] Developer entity creation with bilingual names
- [ ] Developer-App relationships maintained

### AC3: Category Mapping
- [ ] Static category strings mapped to database Category IDs
- [ ] Category lookup dictionary created
- [ ] Missing categories handled (create new or error)
- [ ] AppCategory junction records generated

### AC4: Bilingual Data Handling
- [ ] Arabic and English fields properly separated
- [ ] Language-specific images correctly assigned
- [ ] Screenshots organized by language
- [ ] RTL considerations documented

### AC5: Data Validation During Transform
- [ ] Required fields validated (throw exception if missing)
- [ ] String lengths checked (truncate or warn)
- [ ] URLs validated and normalized
- [ ] Ratings validated (0-5 range)
- [ ] Transformation errors logged with app context

### AC6: Guid Generation
- [ ] New Guids generated for all entities
- [ ] Original IDs preserved in migration log for reference
- [ ] Guid mapping dictionary maintained

---

## 📝 Technical Notes

### Transformation Service
```python
public class DataTransformationService
{
    
    public TransformationResult TransformApps(List<StaticAppData> staticApps)
    {
        var developers = ExtractUniqueDevelopers(staticApps);
        var apps = new List<App>();
        var appCategories = new List<AppCategory>();
        
        foreach (var staticApp in staticApps)
        {
            var app = TransformSingleApp(staticApp);
            apps.Add(app);
            
            // Create junction records
            foreach (var category in staticApp.Categories)
            {
                appCategories.Add(new AppCategory
                {
                    AppId = app.Id,
                    CategoryId = _categoryMap[category]
                });
            }
        }
        
        return new TransformationResult
        {
            Apps = apps,
            Developers = developers,
            AppCategories = appCategories
        };
    }
    
    private List<Developer> ExtractUniqueDevelopers(List<StaticAppData> apps)
    {
        var uniqueDevelopers = apps
            .GroupBy(a => new { a.Developer_Website, a.Developer_Name_En })
            .Select(g => g.First())
            .Select(a => new Developer
            {
                Id = Guid.NewGuid(),
                NameAr = a.Developer_Name_Ar,
                NameEn = a.Developer_Name_En,
                Website = a.Developer_Website,
                LogoUrl = a.Developer_Logo
            })
            .ToList();
        
        // Build lookup map
        foreach (var dev in uniqueDevelopers)
        {
            _developerMap[dev.NameEn] = dev.Id;
        }
        
        return uniqueDevelopers;
    }
}
```

---

## 🔗 Dependencies
- US3.1: Data Structure Analysis (must be complete)
- US1.4: Define Data Models (entity classes must exist)

---

## 📊 Definition of Done
- [ ] Transformation service implemented and tested
- [ ] All 44 apps transform successfully
- [ ] Unique developers extracted correctly
- [ ] Category mappings complete
- [ ] Unit tests pass (90%+ coverage)
- [ ] Transformation errors logged clearly

---

**Created:** October 6, 2025  
**Owner:** Abubakr Abduraghman, a.abduraghman@itqan.dev  
**Epic:** [Epic 3: Data Migration Engine](../epics/epic-3-data-migration-engine.md)
