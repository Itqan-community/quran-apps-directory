# US3.3: Create Automated Migration Scripts

**Epic:** Epic 3 - Data Migration Engine  
**Sprint:** Week 2, Day 2-3  
**Story Points:** 8  
**Priority:** P1  
**Assigned To:** Backend Lead  
**Status:** Not Started

---

## 📋 User Story

**As a** Backend Lead  
**I want to** create automated migration scripts with transaction support and rollback capabilities  
**So that** the data migration can be executed safely with zero data loss and full recovery options

---

## 🎯 Acceptance Criteria

### AC1: Migration Console App Created
- [ ] Django management command for data migration created
- [ ] Command-line arguments supported (file path, connection string)
- [ ] Progress reporting implemented (console output)
- [ ] Dry-run mode available (no database writes)

### AC2: ETL Pipeline Implemented
- [ ] **Extract:** Read and parse `applicationsData.ts`
- [ ] **Transform:** Apply transformation logic (US3.2)
- [ ] **Load:** Insert data into PostgreSQL with transactions
- [ ] Pipeline stages clearly separated
- [ ] Error handling at each stage

### AC3: Transaction Management
- [ ] Single database transaction for entire migration
- [ ] Rollback on any error
- [ ] Transaction timeout configured (5 minutes)
- [ ] Commit only after all validations pass

### AC4: Batch Processing
- [ ] Data inserted in batches (10 apps at a time)
- [ ] Progress reported after each batch
- [ ] Memory-efficient processing

### AC5: Migration Logging
- [ ] Detailed logs written to file
- [ ] Log levels: Info, Warning, Error
- [ ] Each migrated entity logged with ID
- [ ] Errors include stack traces and context

### AC6: Rollback Mechanism
- [ ] Automatic rollback on exception
- [ ] Manual rollback command available
- [ ] Pre-migration database backup recommended
- [ ] Rollback procedure documented

### AC7: Idempotency
- [ ] Migration can be safely re-run
- [ ] Existing data detection (by name/URL)
- [ ] Skip or update strategy documented
- [ ] Duplicate prevention logic

---

## 📝 Technical Notes

### Migration Console App
```python
public class Program
{
    public static async Task<int> Main(string[] args)
    {
        var options = ParseArguments(args);
        
        var services = new ServiceCollection()
            .AddDbContext<ApplicationDbContext>(opts =>
                opts.Usepsycopg2(options.ConnectionString))
            .AddSingleton<DataTransformationService>()
            .AddSingleton<MigrationService>()
            .BuildServiceProvider();
        
        var migrationService = services.GetRequiredService<MigrationService>();
        
        try
        {
            var result = await migrationService.ExecuteMigrationAsync(
                options.SourceFilePath,
                options.DryRun);
            
            Console.WriteLine($"✅ Migration completed successfully!");
            Console.WriteLine($"   Apps migrated: {result.AppsCount}");
            Console.WriteLine($"   Developers created: {result.DevelopersCount}");
            Console.WriteLine($"   Categories mapped: {result.CategoriesCount}");
            
            return 0;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"❌ Migration failed: {ex.Message}");
            return 1;
        }
    }
}

public class MigrationService
{
    public async Task<MigrationResult> ExecuteMigrationAsync(
        string sourceFilePath,
        bool dryRun)
    {
        // 1. Extract
        var staticData = await ExtractDataAsync(sourceFilePath);
        _logger.LogInformation("Extracted {Count} apps from source", staticData.Count);
        
        // 2. Transform
        var transformed = _transformationService.TransformApps(staticData);
        _logger.LogInformation("Transformed data: {Apps} apps, {Devs} developers",
            transformed.Apps.Count, transformed.Developers.Count);
        
        if (dryRun)
        {
            _logger.LogInformation("Dry run mode - skipping database write");
            return new MigrationResult { DryRun = true };
        }
        
        // 3. Load with transaction
        using var transaction = await _context.Database.BeginTransactionAsync();
        try
        {
            // Insert developers first (foreign key dependency)
            await _context.Developers.AddRangeAsync(transformed.Developers);
            await _context.SaveChangesAsync();
            
            // Insert categories (if new ones exist)
            // ... 
            
            // Insert apps in batches
            for (int i = 0; i < transformed.Apps.Count; i += 10)
            {
                var batch = transformed.Apps.Skip(i).Take(10);
                await _context.Apps.AddRangeAsync(batch);
                await _context.SaveChangesAsync();
                
                Console.WriteLine($"Progress: {i + batch.Count()}/{transformed.Apps.Count}");
            }
            
            // Insert junction tables
            await _context.AppCategories.AddRangeAsync(transformed.AppCategories);
            await _context.SaveChangesAsync();
            
            // Commit transaction
            await transaction.CommitAsync();
            
            return new MigrationResult
            {
                Success = true,
                AppsCount = transformed.Apps.Count,
                DevelopersCount = transformed.Developers.Count
            };
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync();
            _logger.LogError(ex, "Migration failed, transaction rolled back");
            throw;
        }
    }
}
```

### Usage
```bash
# Dry run
dotnet run --project QuranApps.DataMigration -- \
  --source ./applicationsData.ts \
  --connection "Host=localhost;Database=quran_apps;..." \
  --dry-run

# Actual migration
dotnet run --project QuranApps.DataMigration -- \
  --source ./applicationsData.ts \
  --connection "Host=localhost;Database=quran_apps;..." \
  --verbose
```

---

## 🔗 Dependencies
- US3.2: Transform Data to Match Schema
- US2.2: Django ORM configured

---

## 📊 Definition of Done
- [ ] Migration console app created
- [ ] ETL pipeline functional
- [ ] Transaction support implemented
- [ ] Rollback mechanism tested
- [ ] Dry-run mode working
- [ ] Documentation complete
- [ ] Successfully migrated 44 apps in test environment

---

**Created:** October 6, 2025  
**Owner:** Abubakr Abduraghman, a.abduraghman@itqan.dev  
**Epic:** [Epic 3: Data Migration Engine](../epics/epic-3-data-migration-engine.md)
