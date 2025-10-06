# US1.4: Define Data Models

**Epic:** Epic 1 - Database Architecture Foundation  
**Sprint:** Week 1, Day 3-4  
**Story Points:** 5  
**Priority:** P1 (Critical)  
**Assigned To:** Backend Developer  
**Status:** Not Started

---

## 📋 User Story

**As a** Backend Developer  
**I want to** create comprehensive C# entity classes, DTOs, and validators  
**So that** we have type-safe data models for EF Core with proper validation and mapping between database entities and API responses

---

## 🎯 Acceptance Criteria

### AC1: Entity Classes Created
- [ ] All entity classes implemented in C# 13:
  - `App.cs` (main application entity)
  - `Category.cs`
  - `Developer.cs`
  - `Feature.cs`
  - `Screenshot.cs`
  - `AppCategory.cs` (junction table)
  - `AppFeature.cs` (junction table)
- [ ] Primary keys defined as `Guid` for all entities
- [ ] Navigation properties configured
- [ ] Required vs optional fields marked with `?` nullable

### AC2: Data Transfer Objects (DTOs)
- [ ] Request DTOs created for API inputs:
  ```csharp
  public record CreateAppRequest(
      string NameAr,
      string NameEn,
      string ShortDescriptionAr,
      string ShortDescriptionEn,
      Guid DeveloperId,
      List<Guid> CategoryIds
  );
  ```
- [ ] Response DTOs created for API outputs:
  ```csharp
  public record AppResponse(
      Guid Id,
      string NameAr,
      string NameEn,
      DeveloperResponse Developer,
      List<CategoryResponse> Categories,
      double AppsAvgRating
  );
  ```
- [ ] Separate DTOs for list vs detail views
- [ ] Bilingual support in all DTOs (_Ar, _En suffixes)

### AC3: FluentValidation Rules
- [ ] Validators created for all request DTOs:
  ```csharp
  public class CreateAppRequestValidator : AbstractValidator<CreateAppRequest>
  {
      public CreateAppRequestValidator()
      {
          RuleFor(x => x.NameAr).NotEmpty().MaximumLength(200);
          RuleFor(x => x.NameEn).NotEmpty().MaximumLength(200);
          RuleFor(x => x.DeveloperId).NotEmpty();
          RuleFor(x => x.CategoryIds).NotEmpty().Must(c => c.Count <= 5);
      }
  }
  ```
- [ ] Validation rules cover:
  - Required fields
  - String length limits
  - Format validation (URLs, emails)
  - Business rules (e.g., max 5 categories per app)
- [ ] Custom error messages defined (Arabic + English)

### AC4: AutoMapper Profiles
- [ ] Mapping profiles created for Entity ↔ DTO:
  ```csharp
  public class ApplicationMappingProfile : Profile
  {
      public ApplicationMappingProfile()
      {
          CreateMap<App, AppResponse>();
          CreateMap<CreateAppRequest, App>();
          // ... other mappings
      }
  }
  ```
- [ ] Complex mappings handled (nested objects, collections)
- [ ] Reverse mappings configured where needed

### AC5: Database Constraints Defined
- [ ] String length constraints specified:
  - Short text: 200 chars
  - Description: 5000 chars
  - URLs: 500 chars
- [ ] Index requirements documented:
  - `Apps.NameEn` (for search)
  - `Apps.NameAr` (for Arabic search)
  - `Apps.DeveloperId` (foreign key)
  - `Categories.NameEn` (for filtering)
- [ ] Unique constraints identified:
  - App names (within same developer)
  - Developer emails
- [ ] Check constraints defined (e.g., rating between 0-5)

### AC6: Enum Types Created
- [ ] Enumerations defined for fixed values:
  ```csharp
  public enum AppStatus
  {
      Draft = 0,
      UnderReview = 1,
      Published = 2,
      Archived = 3
  }
  
  public enum PlatformType
  {
      Android = 1,
      iOS = 2,
      Web = 3,
      Desktop = 4
  }
  ```

### AC7: Model Documentation
- [ ] XML documentation comments added to all classes/properties
- [ ] Usage examples provided in comments
- [ ] Entity relationship diagram updated
- [ ] Data dictionary document created

---

## 📝 Technical Notes

### Complete Entity Example
```csharp
/// <summary>
/// Represents a Quran application in the directory
/// </summary>
public class App
{
    /// <summary>
    /// Unique identifier for the application
    /// </summary>
    public Guid Id { get; set; }
    
    /// <summary>
    /// Arabic name of the application
    /// </summary>
    [Required]
    [StringLength(200)]
    public string NameAr { get; set; } = string.Empty;
    
    /// <summary>
    /// English name of the application
    /// </summary>
    [Required]
    [StringLength(200)]
    public string NameEn { get; set; } = string.Empty;
    
    /// <summary>
    /// Arabic short description (for list views)
    /// </summary>
    [StringLength(500)]
    public string? ShortDescriptionAr { get; set; }
    
    /// <summary>
    /// English short description (for list views)
    /// </summary>
    [StringLength(500)]
    public string? ShortDescriptionEn { get; set; }
    
    /// <summary>
    /// Arabic full description (for detail views)
    /// </summary>
    [StringLength(5000)]
    public string? DescriptionAr { get; set; }
    
    /// <summary>
    /// English full description (for detail views)
    /// </summary>
    [StringLength(5000)]
    public string? DescriptionEn { get; set; }
    
    /// <summary>
    /// Foreign key to the developer/company
    /// </summary>
    public Guid DeveloperId { get; set; }
    
    /// <summary>
    /// Average user rating (0.0 to 5.0)
    /// </summary>
    [Range(0, 5)]
    public double AppsAvgRating { get; set; }
    
    /// <summary>
    /// Total number of reviews
    /// </summary>
    public int TotalReviews { get; set; }
    
    /// <summary>
    /// Google Play Store link
    /// </summary>
    [Url]
    [StringLength(500)]
    public string? GooglePlayLink { get; set; }
    
    /// <summary>
    /// Apple App Store link
    /// </summary>
    [Url]
    [StringLength(500)]
    public string? AppStoreLink { get; set; }
    
    /// <summary>
    /// Huawei App Gallery link
    /// </summary>
    [Url]
    [StringLength(500)]
    public string? AppGalleryLink { get; set; }
    
    /// <summary>
    /// Application icon URL (CDN)
    /// </summary>
    [Url]
    [StringLength(500)]
    public string? ApplicationIcon { get; set; }
    
    /// <summary>
    /// Main promotional image (Arabic version)
    /// </summary>
    [Url]
    [StringLength(500)]
    public string? MainImageAr { get; set; }
    
    /// <summary>
    /// Main promotional image (English version)
    /// </summary>
    [Url]
    [StringLength(500)]
    public string? MainImageEn { get; set; }
    
    /// <summary>
    /// Creation timestamp
    /// </summary>
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    /// <summary>
    /// Last update timestamp
    /// </summary>
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    
    // Navigation Properties
    
    /// <summary>
    /// Developer/Company that created this app
    /// </summary>
    public Developer Developer { get; set; } = null!;
    
    /// <summary>
    /// Categories this app belongs to
    /// </summary>
    public ICollection<AppCategory> AppCategories { get; set; } = new List<AppCategory>();
    
    /// <summary>
    /// Features offered by this app
    /// </summary>
    public ICollection<AppFeature> AppFeatures { get; set; } = new List<AppFeature>();
    
    /// <summary>
    /// Screenshots (Arabic)
    /// </summary>
    public ICollection<Screenshot> ScreenshotsAr { get; set; } = new List<Screenshot>();
    
    /// <summary>
    /// Screenshots (English)
    /// </summary>
    public ICollection<Screenshot> ScreenshotsEn { get; set; } = new List<Screenshot>();
}
```

### DTO Pattern with Records (C# 13)
```csharp
// Request DTOs (immutable)
public record CreateAppRequest(
    string NameAr,
    string NameEn,
    string? ShortDescriptionAr,
    string? ShortDescriptionEn,
    string? DescriptionAr,
    string? DescriptionEn,
    Guid DeveloperId,
    List<Guid> CategoryIds,
    string? GooglePlayLink,
    string? AppStoreLink
);

// Response DTOs (immutable)
public record AppResponse(
    Guid Id,
    string NameAr,
    string NameEn,
    string? ShortDescriptionAr,
    string? ShortDescriptionEn,
    DeveloperResponse Developer,
    List<CategoryResponse> Categories,
    double AppsAvgRating,
    int TotalReviews,
    string? GooglePlayLink,
    string? AppStoreLink,
    string? ApplicationIcon,
    DateTime CreatedAt
);

// Nested DTOs
public record DeveloperResponse(
    Guid Id,
    string NameAr,
    string NameEn,
    string? Website,
    string? LogoUrl
);

public record CategoryResponse(
    Guid Id,
    string NameAr,
    string NameEn,
    string? Icon
);
```

---

## 🔗 Dependencies
- US1.2: Design Complete Relational Schema (must be complete)

---

## 🚫 Blockers
- Final database schema must be approved

---

## 📊 Definition of Done
- [ ] All entity classes created and reviewed
- [ ] All DTOs created (Request + Response)
- [ ] FluentValidation validators implemented
- [ ] AutoMapper profiles configured
- [ ] XML documentation complete
- [ ] Code review passed
- [ ] Unit tests for validators created

---

## 📚 Resources
- [EF Core Entity Configuration](https://learn.microsoft.com/en-us/ef/core/modeling/)
- [FluentValidation Documentation](https://docs.fluentvalidation.net/)
- [AutoMapper Documentation](https://docs.automapper.org/)
- [C# 13 Records](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/builtin-types/record)

---

**Created:** October 6, 2025  
**Owner:** Abubakr Abduraghman, a.abduraghman@itqan.dev  
**Epic:** [Epic 1: Database Architecture Foundation](../epics/epic-1-database-architecture-foundation.md)

