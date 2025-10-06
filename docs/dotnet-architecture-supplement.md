# .NET 9 Architecture Supplement
# Quran Apps Directory - Backend Implementation Guide

**Document Version:** 2.0  
**Date:** October 2025  
**Architect:** ITQAN Architecture Team  
**Owner:** Abubakr Abduraghman, a.abduraghman@itqan.dev  
**Status:** Technical Implementation Guide

---

## 🎯 Purpose

This document supplements the main architecture document with .NET 9 specific implementation details, code examples, and best practices.

---

## 📦 Technology Stack (.NET 8)

### Core Stack
```
- Runtime: .NET 8 LTS (latest stable)
- Framework: ASP.NET Core 8
- Language: C# 12
- ORM: Entity Framework Core 8
- Database Driver: Npgsql (PostgreSQL driver for .NET)
- API Documentation: Swashbuckle (Swagger/OpenAPI)
- Authentication: ASP.NET Core Identity + JWT
- Caching: StackExchange.Redis
- Logging: Serilog
- Testing: xUnit + Moq
```

### Key NuGet Packages
```xml
<ItemGroup>
  <!-- Core Framework -->
  <PackageReference Include="Microsoft.AspNetCore.OpenApi" Version="8.0.0" />
  
  <!-- Entity Framework Core -->
  <PackageReference Include="Microsoft.EntityFrameworkCore" Version="8.0.0" />
  <PackageReference Include="Microsoft.EntityFrameworkCore.Design" Version="8.0.0" />
  <PackageReference Include="Npgsql.EntityFrameworkCore.PostgreSQL" Version="8.0.0" />
  
  <!-- Authentication -->
  <PackageReference Include="Microsoft.AspNetCore.Authentication.JwtBearer" Version="8.0.0" />
  <PackageReference Include="System.IdentityModel.Tokens.Jwt" Version="7.0.0" />
  
  <!-- Redis Caching -->
  <PackageReference Include="StackExchange.Redis" Version="2.7.0" />
  <PackageReference Include="Microsoft.Extensions.Caching.StackExchangeRedis" Version="8.0.0" />
  
  <!-- Logging -->
  <PackageReference Include="Serilog.AspNetCore" Version="8.0.0" />
  <PackageReference Include="Serilog.Sinks.Console" Version="5.0.0" />
  <PackageReference Include="Serilog.Sinks.File" Version="5.0.0" />
  
  <!-- API Documentation -->
  <PackageReference Include="Swashbuckle.AspNetCore" Version="6.5.0" />
  
  <!-- Rate Limiting -->
  <PackageReference Include="AspNetCoreRateLimit" Version="5.0.0" />
  
  <!-- Validation -->
  <PackageReference Include="FluentValidation.AspNetCore" Version="11.3.0" />
</ItemGroup>
```

---

## 🏗️ Project Structure

```
QuranAppsDirectory.Api/
├── Controllers/
│   ├── AppsController.cs
│   ├── CategoriesController.cs
│   ├── DevelopersController.cs
│   ├── UsersController.cs
│   └── ReviewsController.cs
│
├── Data/
│   ├── ApplicationDbContext.cs
│   ├── Entities/
│   │   ├── App.cs
│   │   ├── Category.cs
│   │   ├── Developer.cs
│   │   ├── User.cs
│   │   └── Review.cs
│   ├── Configurations/
│   │   ├── AppConfiguration.cs
│   │   └── UserConfiguration.cs
│   └── Migrations/
│       └── (auto-generated)
│
├── Services/
│   ├── Interfaces/
│   │   ├── IAppsService.cs
│   │   ├── IAuthService.cs
│   │   └── ICacheService.cs
│   └── Implementations/
│       ├── AppsService.cs
│       ├── AuthService.cs
│       └── CacheService.cs
│
├── DTOs/
│   ├── Requests/
│   │   ├── CreateAppRequest.cs
│   │   └── UpdateAppRequest.cs
│   └── Responses/
│       ├── AppResponse.cs
│       └── PaginatedResponse.cs
│
├── Middleware/
│   ├── ExceptionHandlingMiddleware.cs
│   ├── RequestLoggingMiddleware.cs
│   └── RateLimitingMiddleware.cs
│
├── Validators/
│   ├── CreateAppValidator.cs
│   └── UpdateAppValidator.cs
│
├── Helpers/
│   ├── JwtHelper.cs
│   └── PaginationHelper.cs
│
├── Program.cs
├── appsettings.json
├── appsettings.Development.json
└── appsettings.Production.json
```

---

## 💾 Entity Framework Core Implementation

### DbContext

```csharp
using Microsoft.EntityFrameworkCore;
using QuranAppsDirectory.Api.Data.Entities;

namespace QuranAppsDirectory.Api.Data;

public class ApplicationDbContext : DbContext
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
        : base(options)
    {
    }

    // DbSets
    public DbSet<App> Apps => Set<App>();
    public DbSet<Category> Categories => Set<Category>();
    public DbSet<AppCategory> AppCategories => Set<AppCategory>();
    public DbSet<Developer> Developers => Set<Developer>();
    public DbSet<Screenshot> Screenshots => Set<Screenshot>();
    public DbSet<User> Users => Set<User>();
    public DbSet<Review> Reviews => Set<Review>();
    public DbSet<Favorite> Favorites => Set<Favorite>();
    public DbSet<Collection> Collections => Set<Collection>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Apply configurations
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(ApplicationDbContext).Assembly);

        // Global query filters (soft delete, etc.)
        modelBuilder.Entity<App>()
            .HasQueryFilter(a => a.Status == "published");

        // Indexes
        modelBuilder.Entity<App>()
            .HasIndex(a => a.Slug)
            .IsUnique();

        modelBuilder.Entity<App>()
            .HasIndex(a => a.AvgRating);

        // Many-to-many: Apps <-> Categories
        modelBuilder.Entity<AppCategory>()
            .HasKey(ac => new { ac.AppId, ac.CategoryId });

        modelBuilder.Entity<AppCategory>()
            .HasOne(ac => ac.App)
            .WithMany(a => a.AppCategories)
            .HasForeignKey(ac => ac.AppId);

        modelBuilder.Entity<AppCategory>()
            .HasOne(ac => ac.Category)
            .WithMany(c => c.AppCategories)
            .HasForeignKey(ac => ac.CategoryId);

        // Ensure one review per user per app
        modelBuilder.Entity<Review>()
            .HasIndex(r => new { r.AppId, r.UserId })
            .IsUnique();
    }
}
```

### Entity Example: App

```csharp
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace QuranAppsDirectory.Api.Data.Entities;

[Table("apps")]
public class App
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    [MaxLength(255)]
    [Column("name_ar")]
    public string NameAr { get; set; } = string.Empty;

    [Required]
    [MaxLength(255)]
    [Column("name_en")]
    public string NameEn { get; set; } = string.Empty;

    [Required]
    [Column("short_description_ar", TypeName = "text")]
    public string ShortDescriptionAr { get; set; } = string.Empty;

    [Required]
    [Column("short_description_en", TypeName = "text")]
    public string ShortDescriptionEn { get; set; } = string.Empty;

    [Required]
    [Column("description_ar", TypeName = "text")]
    public string DescriptionAr { get; set; } = string.Empty;

    [Required]
    [Column("description_en", TypeName = "text")]
    public string DescriptionEn { get; set; } = string.Empty;

    [Required]
    [MaxLength(255)]
    [Column("slug")]
    public string Slug { get; set; } = string.Empty;

    [MaxLength(50)]
    [Column("status")]
    public string Status { get; set; } = "published";

    [Column("sort_order")]
    public int? SortOrder { get; set; }

    [Column("avg_rating", TypeName = "decimal(3,2)")]
    public decimal AvgRating { get; set; } = 0.0m;

    [Column("review_count")]
    public int ReviewCount { get; set; } = 0;

    [Column("view_count")]
    public int ViewCount { get; set; } = 0;

    [MaxLength(500)]
    [Column("application_icon")]
    public string? ApplicationIcon { get; set; }

    [MaxLength(500)]
    [Column("main_image_ar")]
    public string? MainImageAr { get; set; }

    [MaxLength(500)]
    [Column("main_image_en")]
    public string? MainImageEn { get; set; }

    [MaxLength(500)]
    [Column("google_play_link")]
    public string? GooglePlayLink { get; set; }

    [MaxLength(500)]
    [Column("app_store_link")]
    public string? AppStoreLink { get; set; }

    [MaxLength(500)]
    [Column("app_gallery_link")]
    public string? AppGalleryLink { get; set; }

    [Column("developer_id")]
    public Guid? DeveloperId { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    [Column("published_at")]
    public DateTime? PublishedAt { get; set; }

    // Navigation properties
    [ForeignKey("DeveloperId")]
    public Developer? Developer { get; set; }

    public ICollection<AppCategory> AppCategories { get; set; } = new List<AppCategory>();
    public ICollection<Screenshot> Screenshots { get; set; } = new List<Screenshot>();
    public ICollection<Review> Reviews { get; set; } = new List<Review>();
    public ICollection<Favorite> Favorites { get; set; } = new List<Favorite>();
}
```

### Fluent API Configuration

```csharp
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using QuranAppsDirectory.Api.Data.Entities;

namespace QuranAppsDirectory.Api.Data.Configurations;

public class AppConfiguration : IEntityTypeConfiguration<App>
{
    public void Configure(EntityTypeBuilder<App> builder)
    {
        builder.ToTable("apps");

        builder.HasKey(a => a.Id);

        builder.Property(a => a.Id)
            .HasColumnName("id")
            .HasDefaultValueSql("gen_random_uuid()");

        builder.Property(a => a.NameAr)
            .IsRequired()
            .HasMaxLength(255)
            .HasColumnName("name_ar");

        builder.Property(a => a.NameEn)
            .IsRequired()
            .HasMaxLength(255)
            .HasColumnName("name_en");

        builder.Property(a => a.Slug)
            .IsRequired()
            .HasMaxLength(255)
            .HasColumnName("slug");

        builder.HasIndex(a => a.Slug)
            .IsUnique();

        builder.HasIndex(a => a.AvgRating);
        builder.HasIndex(a => a.Status);
        builder.HasIndex(a => a.DeveloperId);

        // Relationships
        builder.HasOne(a => a.Developer)
            .WithMany(d => d.Apps)
            .HasForeignKey(a => a.DeveloperId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasMany(a => a.Screenshots)
            .WithOne(s => s.App)
            .HasForeignKey(s => s.AppId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
```

---

## 🔌 API Controller Implementation

### AppsController Example

```csharp
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using QuranAppsDirectory.Api.Services.Interfaces;
using QuranAppsDirectory.Api.DTOs.Requests;
using QuranAppsDirectory.Api.DTOs.Responses;

namespace QuranAppsDirectory.Api.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
[Produces("application/json")]
public class AppsController : ControllerBase
{
    private readonly IAppsService _appsService;
    private readonly ILogger<AppsController> _logger;

    public AppsController(IAppsService appsService, ILogger<AppsController> logger)
    {
        _appsService = appsService;
        _logger = logger;
    }

    /// <summary>
    /// Get all apps with filtering and pagination
    /// </summary>
    /// <param name="request">Query parameters for filtering and pagination</param>
    /// <returns>Paginated list of apps</returns>
    [HttpGet]
    [ProducesResponseType(typeof(PaginatedResponse<AppResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<PaginatedResponse<AppResponse>>> GetApps(
        [FromQuery] GetAppsRequest request)
    {
        var result = await _appsService.GetAppsAsync(request);
        return Ok(result);
    }

    /// <summary>
    /// Get a specific app by ID
    /// </summary>
    /// <param name="id">App ID</param>
    /// <returns>App details</returns>
    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(AppResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<AppResponse>> GetAppById(Guid id)
    {
        var app = await _appsService.GetAppByIdAsync(id);
        if (app == null)
            return NotFound(new { error = "App not found" });

        return Ok(app);
    }

    /// <summary>
    /// Get app by slug
    /// </summary>
    /// <param name="slug">App slug</param>
    /// <returns>App details</returns>
    [HttpGet("slug/{slug}")]
    [ProducesResponseType(typeof(AppResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<AppResponse>> GetAppBySlug(string slug)
    {
        var app = await _appsService.GetAppBySlugAsync(slug);
        if (app == null)
            return NotFound(new { error = "App not found" });

        return Ok(app);
    }

    /// <summary>
    /// Create a new app (Admin only)
    /// </summary>
    /// <param name="request">App creation data</param>
    /// <returns>Created app</returns>
    [HttpPost]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(typeof(AppResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<AppResponse>> CreateApp(
        [FromBody] CreateAppRequest request)
    {
        var app = await _appsService.CreateAppAsync(request);
        return CreatedAtAction(nameof(GetAppById), new { id = app.Id }, app);
    }

    /// <summary>
    /// Update an existing app (Admin/Developer)
    /// </summary>
    /// <param name="id">App ID</param>
    /// <param name="request">Updated app data</param>
    /// <returns>Updated app</returns>
    [HttpPut("{id:guid}")]
    [Authorize(Roles = "Admin,Developer")]
    [ProducesResponseType(typeof(AppResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<AppResponse>> UpdateApp(
        Guid id,
        [FromBody] UpdateAppRequest request)
    {
        var app = await _appsService.UpdateAppAsync(id, request);
        if (app == null)
            return NotFound(new { error = "App not found" });

        return Ok(app);
    }

    /// <summary>
    /// Delete an app (Admin only)
    /// </summary>
    /// <param name="id">App ID</param>
    /// <returns>No content</returns>
    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> DeleteApp(Guid id)
    {
        var result = await _appsService.DeleteAppAsync(id);
        if (!result)
            return NotFound(new { error = "App not found" });

        return NoContent();
    }
}
```

### Service Implementation

```csharp
using Microsoft.EntityFrameworkCore;
using QuranAppsDirectory.Api.Data;
using QuranAppsDirectory.Api.Data.Entities;
using QuranAppsDirectory.Api.DTOs.Requests;
using QuranAppsDirectory.Api.DTOs.Responses;
using QuranAppsDirectory.Api.Services.Interfaces;

namespace QuranAppsDirectory.Api.Services.Implementations;

public class AppsService : IAppsService
{
    private readonly ApplicationDbContext _context;
    private readonly ICacheService _cacheService;
    private readonly ILogger<AppsService> _logger;

    public AppsService(
        ApplicationDbContext context,
        ICacheService cacheService,
        ILogger<AppsService> logger)
    {
        _context = context;
        _cacheService = cacheService;
        _logger = logger;
    }

    public async Task<PaginatedResponse<AppResponse>> GetAppsAsync(GetAppsRequest request)
    {
        var query = _context.Apps
            .Include(a => a.Developer)
            .Include(a => a.AppCategories)
                .ThenInclude(ac => ac.Category)
            .AsQueryable();

        // Apply filters
        if (!string.IsNullOrEmpty(request.Category))
        {
            query = query.Where(a => a.AppCategories
                .Any(ac => ac.Category.Name == request.Category));
        }

        if (!string.IsNullOrEmpty(request.Search))
        {
            query = query.Where(a =>
                a.NameEn.Contains(request.Search) ||
                a.NameAr.Contains(request.Search) ||
                a.DescriptionEn.Contains(request.Search) ||
                a.DescriptionAr.Contains(request.Search));
        }

        if (request.RatingMin.HasValue)
        {
            query = query.Where(a => a.AvgRating >= request.RatingMin.Value);
        }

        if (request.DeveloperId.HasValue)
        {
            query = query.Where(a => a.DeveloperId == request.DeveloperId.Value);
        }

        // Get total count
        var total = await query.CountAsync();

        // Apply sorting
        query = request.Sort?.ToLower() switch
        {
            "rating" => request.Order == "asc"
                ? query.OrderBy(a => a.AvgRating)
                : query.OrderByDescending(a => a.AvgRating),
            "created" => request.Order == "asc"
                ? query.OrderBy(a => a.CreatedAt)
                : query.OrderByDescending(a => a.CreatedAt),
            "name" => request.Order == "asc"
                ? query.OrderBy(a => a.NameEn)
                : query.OrderByDescending(a => a.NameEn),
            _ => query.OrderByDescending(a => a.AvgRating)
        };

        // Apply pagination
        var apps = await query
            .Skip((request.Page - 1) * request.Limit)
            .Take(request.Limit)
            .Select(a => MapToAppResponse(a))
            .ToListAsync();

        return new PaginatedResponse<AppResponse>
        {
            Data = apps,
            Meta = new PaginationMeta
            {
                Total = total,
                Page = request.Page,
                Limit = request.Limit,
                TotalPages = (int)Math.Ceiling(total / (double)request.Limit)
            }
        };
    }

    public async Task<AppResponse?> GetAppByIdAsync(Guid id)
    {
        // Check cache first
        var cacheKey = $"app:{id}";
        var cached = await _cacheService.GetAsync<AppResponse>(cacheKey);
        if (cached != null)
            return cached;

        var app = await _context.Apps
            .Include(a => a.Developer)
            .Include(a => a.AppCategories)
                .ThenInclude(ac => ac.Category)
            .Include(a => a.Screenshots)
            .FirstOrDefaultAsync(a => a.Id == id);

        if (app == null)
            return null;

        var response = MapToAppResponse(app);

        // Cache for 5 minutes
        await _cacheService.SetAsync(cacheKey, response, TimeSpan.FromMinutes(5));

        return response;
    }

    public async Task<AppResponse?> GetAppBySlugAsync(string slug)
    {
        var cacheKey = $"app:slug:{slug}";
        var cached = await _cacheService.GetAsync<AppResponse>(cacheKey);
        if (cached != null)
            return cached;

        var app = await _context.Apps
            .Include(a => a.Developer)
            .Include(a => a.AppCategories)
                .ThenInclude(ac => ac.Category)
            .Include(a => a.Screenshots)
            .FirstOrDefaultAsync(a => a.Slug == slug);

        if (app == null)
            return null;

        var response = MapToAppResponse(app);
        await _cacheService.SetAsync(cacheKey, response, TimeSpan.FromMinutes(5));

        return response;
    }

    private static AppResponse MapToAppResponse(App app)
    {
        return new AppResponse
        {
            Id = app.Id,
            NameAr = app.NameAr,
            NameEn = app.NameEn,
            Slug = app.Slug,
            ShortDescriptionAr = app.ShortDescriptionAr,
            ShortDescriptionEn = app.ShortDescriptionEn,
            DescriptionAr = app.DescriptionAr,
            DescriptionEn = app.DescriptionEn,
            AvgRating = app.AvgRating,
            ReviewCount = app.ReviewCount,
            ApplicationIcon = app.ApplicationIcon,
            MainImageAr = app.MainImageAr,
            MainImageEn = app.MainImageEn,
            GooglePlayLink = app.GooglePlayLink,
            AppStoreLink = app.AppStoreLink,
            AppGalleryLink = app.AppGalleryLink,
            Developer = app.Developer != null
                ? new DeveloperResponse
                {
                    Id = app.Developer.Id,
                    NameEn = app.Developer.NameEn,
                    NameAr = app.Developer.NameAr,
                    Slug = app.Developer.Slug
                }
                : null,
            Categories = app.AppCategories
                .Select(ac => ac.Category.Name)
                .ToList(),
            Screenshots = app.Screenshots
                .Select(s => new ScreenshotResponse
                {
                    Url = s.Url,
                    Language = s.Language
                })
                .ToList(),
            CreatedAt = app.CreatedAt
        };
    }
}
```

---

## 🔐 Authentication Implementation

### JWT Configuration in Program.cs

```csharp
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

// Add JWT Authentication
builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = builder.Configuration["Jwt:Issuer"],
        ValidAudience = builder.Configuration["Jwt:Audience"],
        IssuerSigningKey = new SymmetricSecurityKey(
            Encoding.UTF8.GetBytes(builder.Configuration["Jwt:SecretKey"]!))
    };

    options.Events = new JwtBearerEvents
    {
        OnAuthenticationFailed = context =>
        {
            if (context.Exception.GetType() == typeof(SecurityTokenExpiredException))
            {
                context.Response.Headers.Add("Token-Expired", "true");
            }
            return Task.CompletedTask;
        }
    };
});

builder.Services.AddAuthorization();
```

### JWT Helper

```csharp
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace QuranAppsDirectory.Api.Helpers;

public class JwtHelper
{
    private readonly IConfiguration _configuration;

    public JwtHelper(IConfiguration configuration)
    {
        _configuration = configuration;
    }

    public string GenerateToken(User user)
    {
        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(ClaimTypes.Email, user.Email),
            new Claim(ClaimTypes.Role, user.Role),
            new Claim("name", user.Name ?? user.Email),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
        };

        var key = new SymmetricSecurityKey(
            Encoding.UTF8.GetBytes(_configuration["Jwt:SecretKey"]!));

        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer: _configuration["Jwt:Issuer"],
            audience: _configuration["Jwt:Audience"],
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(15), // 15 minutes
            signingCredentials: credentials
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    public string GenerateRefreshToken()
    {
        return Convert.ToBase64String(RandomNumberGenerator.GetBytes(64));
    }
}
```

---

## 🚀 Deployment Configuration

### Railway Deployment

**railway.json:**
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "dotnet restore && dotnet publish -c Release -o out"
  },
  "deploy": {
    "startCommand": "cd out && dotnet QuranAppsDirectory.Api.dll",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

**Dockerfile (alternative):**
```dockerfile
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /source

# Copy csproj and restore dependencies
COPY *.csproj .
RUN dotnet restore

# Copy everything else and build
COPY . .
RUN dotnet publish -c Release -o /app

# Build runtime image
FROM mcr.microsoft.com/dotnet/aspnet:8.0
WORKDIR /app
COPY --from=build /app .

# Set environment
ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080

ENTRYPOINT ["dotnet", "QuranAppsDirectory.Api.dll"]
```

### Digital Ocean App Platform

**app.yaml:**
```yaml
name: quran-apps-api
region: nyc
services:
  - name: api
    github:
      repo: your-org/quran-apps-directory
      branch: main
      deploy_on_push: true
    build_command: dotnet publish -c Release -o out
    run_command: cd out && dotnet QuranAppsDirectory.Api.dll
    environment_slug: dotnet
    http_port: 8080
    instance_count: 1
    instance_size_slug: basic-xs
    routes:
      - path: /
    envs:
      - key: ASPNETCORE_ENVIRONMENT
        value: Production
      - key: DATABASE_URL
        type: SECRET
      - key: JWT_SECRET
        type: SECRET
databases:
  - name: quran-apps-db
    engine: PG
    version: "15"
```

---

## 📋 Performance Optimizations

### Response Caching

```csharp
builder.Services.AddResponseCaching();

app.UseResponseCaching();

// In controller
[ResponseCache(Duration = 300, VaryByQueryKeys = new[] { "page", "category" })]
[HttpGet]
public async Task<ActionResult<PaginatedResponse<AppResponse>>> GetApps(...)
{
    // ...
}
```

### Database Query Optimization

```csharp
// Use AsNoTracking for read-only queries
var apps = await _context.Apps
    .AsNoTracking()
    .Include(a => a.Developer)
    .ToListAsync();

// Use Select to project only needed fields
var apps = await _context.Apps
    .Select(a => new AppResponse
    {
        Id = a.Id,
        NameEn = a.NameEn,
        // Only fields you need
    })
    .ToListAsync();

// Use compiled queries for frequently executed queries
private static readonly Func<ApplicationDbContext, Guid, Task<App?>> GetAppByIdQuery =
    EF.CompileAsyncQuery((ApplicationDbContext context, Guid id) =>
        context.Apps
            .Include(a => a.Developer)
            .FirstOrDefault(a => a.Id == id));
```

---

**This supplement provides .NET-specific implementation details to complement the main architecture document.**

**Next Steps:**
1. Initialize .NET project: `dotnet new webapi -n QuranAppsDirectory.Api`
2. Install NuGet packages
3. Create Entity classes
4. Setup DbContext and migrations
5. Implement controllers and services

**Document Owner:** Abubakr Abduraghman, a.abduraghman@itqan.dev  
**Status:** Ready for Implementation
