# US2.3: Create ASP.NET Core 9 API Server

**Epic:** Epic 2 - Backend Infrastructure Setup  
**Sprint:** Week 1, Day 3-4  
**Story Points:** 8  
**Priority:** P1  
**Assigned To:** Backend Lead  
**Status:** Not Started

---

## 📋 User Story

**As a** Backend Lead  
**I want to** scaffold and configure an ASP.NET Core 9 Web API project  
**So that** we have a production-ready API server with Swagger, middleware, and proper project structure

---

## 🎯 Acceptance Criteria

### AC1: Project Created & Structured
- [ ] ASP.NET Core 9 Web API project created
- [ ] Project structure organized:
  ```
  QuranAppsDirectory.Api/
  ├── Controllers/
  ├── Services/
  ├── DTOs/
  ├── Data/
  ├── Middleware/
  ├── Extensions/
  ├── Program.cs
  └── appsettings.json
  ```
- [ ] Solution file created with proper organization

### AC2: Program.cs Configured
- [ ] Minimal hosting model implemented
- [ ] Services registered (DbContext, AutoMapper, FluentValidation)
- [ ] Middleware pipeline configured:
  - Exception handling
  - HTTPS redirection
  - CORS
  - Authentication/Authorization
  - Swagger
- [ ] Environment-specific configuration loaded

### AC3: Swagger/OpenAPI Setup
- [ ] Swashbuckle.AspNetCore 6.8.0 installed
- [ ] Swagger UI configured at `/swagger`
- [ ] API documentation generated from XML comments
- [ ] Authorization support added to Swagger
- [ ] API versioning configured

### AC4: CORS Configuration
- [ ] CORS policy defined for frontend origins:
  - Development: `http://localhost:4200`
  - Staging: `https://staging.quran-apps.itqan.dev`
  - Production: `https://quran-apps.itqan.dev`
- [ ] Preflight requests handled

### AC5: Logging with Serilog
- [ ] Serilog.AspNetCore 9.0.0 configured
- [ ] Structured logging to console and file
- [ ] Request logging middleware added
- [ ] Log levels configured per environment

### AC6: Health Checks
- [ ] Health check endpoints configured (`/health`)
- [ ] Database health check added
- [ ] Readiness and liveness probes defined

### AC7: Development Environment
- [ ] Hot reload configured
- [ ] HTTPS certificate trusted
- [ ] Launch settings configured (ports, environment variables)
- [ ] Server runs successfully on `https://localhost:5001`

---

## 📝 Technical Notes

### Program.cs Example
```csharp
var builder = WebApplication.CreateBuilder(args);

// Add services
builder.Services.AddControllers();
builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

builder.Services.AddAutoMapper(typeof(Program));
builder.Services.AddValidatorsFromAssemblyContaining<Program>();

builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "Quran Apps Directory API", Version = "v1" });
    var xmlFile = $"{Assembly.GetExecutingAssembly().GetName().Name}.xml";
    c.IncludeXmlComments(Path.Combine(AppContext.BaseDirectory, xmlFile));
});

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.WithOrigins(builder.Configuration.GetSection("AllowedOrigins").Get<string[]>()!)
              .AllowAnyMethod()
              .AllowAnyHeader()
              .AllowCredentials();
    });
});

builder.Services.AddHealthChecks()
    .AddNpgSql(builder.Configuration.GetConnectionString("DefaultConnection")!);

var app = builder.Build();

// Configure middleware
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseCors();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.MapHealthChecks("/health");

app.Run();
```

---

## 🔗 Dependencies
- US2.1: Database Server Setup
- US2.2: Implement EF Core

---

## 📊 Definition of Done
- [ ] API project runs successfully
- [ ] Swagger UI accessible and functional
- [ ] All middleware configured and tested
- [ ] Health checks passing
- [ ] Logging working correctly
- [ ] Code review passed

---

**Created:** October 6, 2025  
**Owner:** Abubakr Abduraghman, a.abduraghman@itqan.dev  
**Epic:** [Epic 2: Backend Infrastructure Setup](../epics/epic-2-backend-infrastructure-setup.md)

