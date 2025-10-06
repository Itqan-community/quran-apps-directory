# US4.5: API Documentation with Swagger/OpenAPI

**Epic:** Epic 4 - API Development & Integration  
**Sprint:** Week 3, Day 4  
**Story Points:** 3  
**Priority:** P1  
**Assigned To:** Backend Developer  
**Status:** Not Started

---

## 📋 User Story

**As a** Frontend Developer or API Consumer  
**I want** comprehensive, interactive API documentation  
**So that** I can understand and test all endpoints without reading source code

---

## 🎯 Acceptance Criteria

### AC1: Swagger UI Available
- [ ] Swagger UI accessible at `/swagger`
- [ ] Development environment: Always enabled
- [ ] Staging environment: Enabled
- [ ] Production environment: Disabled (security)
- [ ] Custom branding (Quran Apps Directory title, logo)

### AC2: Complete Endpoint Documentation
- [ ] All endpoints documented with:
  - Summary and description
  - Request parameters (path, query, body)
  - Response schemas (200, 400, 404, 500)
  - Example requests/responses
- [ ] Authentication requirements clearly marked

### AC3: Schema Definitions
- [ ] All DTOs defined in Swagger
- [ ] Validation rules visible (required, min/max, regex)
- [ ] Example values provided
- [ ] Bilingual field structure documented

### AC4: Authentication Integration
- [ ] JWT Bearer auth scheme configured in Swagger
- [ ] "Authorize" button functional
- [ ] Test requests with auth tokens

### AC5: OpenAPI JSON Export
- [ ] OpenAPI 3.0 JSON spec available at `/swagger/v1/swagger.json`
- [ ] Can be imported into Postman
- [ ] Can be used for client SDK generation

### AC6: Response Examples
- [ ] Example responses for each endpoint
- [ ] Success and error scenarios
- [ ] Realistic sample data (Quran apps)

### AC7: Versioning Support
- [ ] API versioning documented (v1)
- [ ] Future versions planned (v2 placeholder)

---

## 📝 Technical Notes

### Swagger Configuration (Program.cs)
```csharp
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo
    {
        Version = "v1",
        Title = "Quran Apps Directory API",
        Description = "RESTful API for managing Quran-related mobile applications",
        Contact = new OpenApiContact
        {
            Name = "Abubakr Abduraghman",
            Email = "a.abduraghman@itqan.dev",
            Url = new Uri("https://quran-apps.itqan.dev")
        },
        License = new OpenApiLicense
        {
            Name = "MIT License",
            Url = new Uri("https://opensource.org/licenses/MIT")
        }
    });
    
    // JWT Authentication
    options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = "JWT Authorization header using the Bearer scheme. Enter 'Bearer' [space] and then your token.",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.ApiKey,
        Scheme = "Bearer"
    });
    
    options.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
    
    // XML Comments
    var xmlFile = $"{Assembly.GetExecutingAssembly().GetName().Name}.xml";
    var xmlPath = Path.Combine(AppContext.BaseDirectory, xmlFile);
    options.IncludeXmlComments(xmlPath);
    
    // Example filters
    options.ExampleFilters();
});

builder.Services.AddSwaggerExamplesFromAssemblyOf<Program>();

// Middleware
if (app.Environment.IsDevelopment() || app.Environment.IsStaging())
{
    app.UseSwagger();
    app.UseSwaggerUI(options =>
    {
        options.SwaggerEndpoint("/swagger/v1/swagger.json", "Quran Apps API v1");
        options.RoutePrefix = "swagger";
        options.DocumentTitle = "Quran Apps API Documentation";
        options.DefaultModelsExpandDepth(2);
        options.DefaultModelExpandDepth(2);
    });
}
```

### Controller Documentation Examples
```csharp
/// <summary>
/// Retrieves a paginated list of Quran apps
/// </summary>
/// <param name="page">Page number (default: 1)</param>
/// <param name="pageSize">Number of items per page (default: 20, max: 100)</param>
/// <param name="sortBy">Sort field: name, rating, createdAt (default: name)</param>
/// <param name="sortOrder">Sort direction: asc, desc (default: asc)</param>
/// <returns>Paginated list of apps</returns>
/// <response code="200">Returns the paginated list</response>
/// <response code="400">Invalid query parameters</response>
[HttpGet]
[ProducesResponseType(typeof(PagedResult<AppListDto>), StatusCodes.Status200OK)]
[ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status400BadRequest)]
public async Task<ActionResult<PagedResult<AppListDto>>> GetApps(
    [FromQuery] int page = 1,
    [FromQuery] int pageSize = 20,
    [FromQuery] string sortBy = "name",
    [FromQuery] string sortOrder = "asc")
{
    // Implementation
}

/// <summary>
/// Retrieves a single app by ID
/// </summary>
/// <param name="id">The unique identifier of the app</param>
/// <returns>Complete app details including developer, categories, and screenshots</returns>
/// <response code="200">Returns the app</response>
/// <response code="404">App not found</response>
[HttpGet("{id:guid}")]
[ProducesResponseType(typeof(AppDetailDto), StatusCodes.Status200OK)]
[ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status404NotFound)]
public async Task<ActionResult<AppDetailDto>> GetApp(Guid id)
{
    // Implementation
}

/// <summary>
/// Creates a new app (requires authentication)
/// </summary>
/// <param name="dto">App creation data</param>
/// <returns>The created app</returns>
/// <response code="201">App created successfully</response>
/// <response code="400">Validation errors</response>
/// <response code="401">Unauthorized</response>
[HttpPost]
[Authorize]
[ProducesResponseType(typeof(AppDetailDto), StatusCodes.Status201Created)]
[ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status400BadRequest)]
[ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status401Unauthorized)]
public async Task<ActionResult<AppDetailDto>> CreateApp([FromBody] CreateAppDto dto)
{
    // Implementation
}
```

### Example Response Classes
```csharp
public class AppListDtoExample : IExamplesProvider<AppListDto>
{
    public AppListDto GetExamples()
    {
        return new AppListDto
        {
            Id = Guid.Parse("a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d"),
            NameAr = "مصحف التجويد الملون",
            NameEn = "Tajweed Quran",
            ShortDescriptionAr = "مصحف ملون بألوان التجويد",
            ShortDescriptionEn = "Color-coded Tajweed Quran",
            ApplicationIconUrl = "https://cdn.example.com/icons/tajweed.png",
            AverageRating = 4.7m,
            Categories = new List<string> { "Reading", "Learning" }
        };
    }
}
```

### csproj Configuration (Enable XML Documentation)
```xml
<PropertyGroup>
  <GenerateDocumentationFile>true</GenerateDocumentationFile>
  <NoWarn>$(NoWarn);1591</NoWarn>
</PropertyGroup>
```

---

## 🔗 Dependencies
- US4.1, US4.2, US4.3: All endpoints implemented
- US4.4: Error handling (for error response examples)

---

## 📊 Definition of Done
- [ ] Swagger UI accessible and branded
- [ ] All endpoints documented with XML comments
- [ ] Authentication integration working
- [ ] Example requests/responses provided
- [ ] OpenAPI JSON export available
- [ ] Postman collection importable
- [ ] Environment-specific configuration (disabled in prod)
- [ ] Documentation reviewed by team

---

**Created:** October 6, 2025  
**Owner:** Abubakr Abduraghman, a.abduraghman@itqan.dev  
**Epic:** [Epic 4: API Development](../epics/epic-4-api-development-integration.md)
