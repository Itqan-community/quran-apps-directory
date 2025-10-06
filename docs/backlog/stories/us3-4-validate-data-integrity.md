# US3.4: Validate Data Integrity

**Epic:** Epic 3 - Data Migration Engine  
**Sprint:** Week 2, Day 3  
**Story Points:** 5  
**Priority:** P1  
**Assigned To:** QA Lead + Backend Developer  
**Status:** Not Started

---

## 📋 User Story

**As a** QA Lead  
**I want to** create comprehensive validation tests to verify migration accuracy  
**So that** we can confirm 100% data integrity with zero loss between source and target databases

---

## 🎯 Acceptance Criteria

### AC1: Source vs Target Comparison
- [ ] Record count validation:
  - Apps: 44 in source = 44 in database
  - Developers: Unique count matches
  - Categories: All 11 categories present
  - AppCategories: Total junction records match
- [ ] Automated comparison script created

### AC2: Field-Level Validation
- [ ] xUnit test suite created with tests for:
  - All required fields populated
  - No null values where not allowed
  - String lengths within constraints
  - URLs are valid format
  - Ratings within 0-5 range
- [ ] 100% of migrated records validated

### AC3: Relationship Integrity
- [ ] Foreign key validation:
  - Every App.DeveloperId exists in Developers
  - Every AppCategory.AppId exists in Apps
  - Every AppCategory.CategoryId exists in Categories
- [ ] Orphan records check (none expected)
- [ ] Many-to-many relationships validated

### AC4: Bilingual Data Verification
- [ ] Arabic field completeness (NameAr, DescriptionAr)
- [ ] English field completeness (NameEn, DescriptionEn)
- [ ] Language-specific images correctly assigned
- [ ] No mixed language data in wrong fields

### AC5: Image URL Validation
- [ ] All image URLs accessibility tested
- [ ] Broken links identified and logged
- [ ] Image URLs follow expected CDN pattern
- [ ] Icon, screenshots, and main images all present

### AC6: Validation Report
- [ ] Detailed validation report generated:
  - Total records validated
  - Pass/fail status per validation rule
  - List of any discrepancies
  - Recommendations for fixes
- [ ] Report format: Markdown + JSON
- [ ] Report saved to `migration-validation-{timestamp}.md`

### AC7: Rollback Validation
- [ ] Pre-migration database snapshot taken
- [ ] Post-rollback comparison confirms restoration
- [ ] Rollback procedure tested successfully

---

## 📝 Technical Notes

### Validation Test Suite
```csharp
public class MigrationValidationTests
{
    private readonly ApplicationDbContext _context;
    private readonly List<StaticAppData> _sourceData;
    
    [Fact]
    public async Task ShouldMigrateAllApps()
    {
        // Arrange
        var sourceCount = _sourceData.Count;
        
        // Act
        var targetCount = await _context.Apps.CountAsync();
        
        // Assert
        Assert.Equal(sourceCount, targetCount);
    }
    
    [Fact]
    public async Task AllAppsShouldHaveRequiredFields()
    {
        // Act
        var appsWithMissingNames = await _context.Apps
            .Where(a => string.IsNullOrEmpty(a.NameAr) || 
                       string.IsNullOrEmpty(a.NameEn))
            .ToListAsync();
        
        // Assert
        Assert.Empty(appsWithMissingNames);
    }
    
    [Fact]
    public async Task AllDevelopersShouldBeUnique()
    {
        // Act
        var developers = await _context.Developers.ToListAsync();
        var duplicates = developers
            .GroupBy(d => new { d.NameEn, d.Website })
            .Where(g => g.Count() > 1)
            .ToList();
        
        // Assert
        Assert.Empty(duplicates);
    }
    
    [Fact]
    public async Task AllForeignKeysShouldBeValid()
    {
        // Check App.DeveloperId
        var invalidApps = await _context.Apps
            .Where(a => !_context.Developers.Any(d => d.Id == a.DeveloperId))
            .ToListAsync();
        
        Assert.Empty(invalidApps);
    }
    
    [Fact]
    public async Task AllCategoryMappingsShouldExist()
    {
        // Act
        var orphanMappings = await _context.AppCategories
            .Where(ac => !_context.Apps.Any(a => a.Id == ac.AppId) ||
                        !_context.Categories.Any(c => c.Id == ac.CategoryId))
            .ToListAsync();
        
        // Assert
        Assert.Empty(orphanMappings);
    }
    
    [Fact]
    public async Task BillingualFieldsShouldBeComplete()
    {
        var appsWithMissingTranslations = await _context.Apps
            .Where(a => string.IsNullOrEmpty(a.NameAr) ||
                       string.IsNullOrEmpty(a.NameEn) ||
                       string.IsNullOrEmpty(a.ShortDescriptionAr) ||
                       string.IsNullOrEmpty(a.ShortDescriptionEn))
            .Select(a => new { a.Id, a.NameEn })
            .ToListAsync();
        
        Assert.Empty(appsWithMissingTranslations);
    }
}
```

### Validation Report Generator
```csharp
public class ValidationReportGenerator
{
    public async Task<ValidationReport> GenerateReportAsync()
    {
        var report = new ValidationReport
        {
            Timestamp = DateTime.UtcNow,
            TotalApps = await _context.Apps.CountAsync(),
            TotalDevelopers = await _context.Developers.CountAsync(),
            ValidationResults = new List<ValidationResult>()
        };
        
        // Run all validations
        report.ValidationResults.Add(await ValidateRecordCounts());
        report.ValidationResults.Add(await ValidateRequiredFields());
        report.ValidationResults.Add(await ValidateForeignKeys());
        report.ValidationResults.Add(await ValidateBilingualData());
        
        // Calculate summary
        report.TotalTests = report.ValidationResults.Count;
        report.PassedTests = report.ValidationResults.Count(r => r.Passed);
        report.FailedTests = report.TotalTests - report.PassedTests;
        
        return report;
    }
    
    public async Task SaveReportAsync(ValidationReport report, string filePath)
    {
        var markdown = GenerateMarkdownReport(report);
        await File.WriteAllTextAsync(filePath, markdown);
        
        var json = JsonSerializer.Serialize(report, new JsonSerializerOptions 
        { 
            WriteIndented = true 
        });
        await File.WriteAllTextAsync(
            filePath.Replace(".md", ".json"), 
            json);
    }
}
```

---

## 🔗 Dependencies
- US3.3: Create Automated Migration Scripts (must be complete)

---

## 📊 Definition of Done
- [ ] All validation tests implemented (12+ tests)
- [ ] Test suite runs successfully
- [ ] All validations pass (100%)
- [ ] Validation report generated
- [ ] No data integrity issues found
- [ ] Rollback procedure validated
- [ ] Documentation complete

---

**Created:** October 6, 2025  
**Owner:** Abubakr Abduraghman, a.abduraghman@itqan.dev  
**Epic:** [Epic 3: Data Migration Engine](../epics/epic-3-data-migration-engine.md)
