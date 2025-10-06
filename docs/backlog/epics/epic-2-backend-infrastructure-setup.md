# Epic 2: Backend Infrastructure Setup

## 📋 Epic Overview
Set up the complete backend infrastructure including database server, ORM integration, and API framework foundation.

## 🎯 Goal
Establish a production-ready backend environment that can handle database operations and API requests efficiently.

## 📊 Success Metrics
- Database connection pool handles 100+ concurrent requests
- API server starts in <3 seconds
- Database queries execute in <50ms average
- Zero connection timeouts under normal load

## 🏗️ Technical Scope (.NET 9)
- PostgreSQL server setup and configuration (Railway/Digital Ocean)
- Entity Framework Core 8 integration and DbContext setup
- ASP.NET Core 8 API server implementation
- Npgsql connection pooling and performance tuning
- Basic middleware and security setup (JWT, CORS, Rate Limiting)
- Serilog structured logging configuration
- Swagger/OpenAPI documentation setup

## 🔗 Dependencies
- Epic 1: Must complete database schema design first
- Provides foundation for: Epic 3, 4, 5

## 📈 Business Value
- High: Enables all backend functionality
- Impact: Performance and reliability foundation
- Effort: 1-2 weeks for complete setup

## ✅ Definition of Done
- PostgreSQL server running and accessible
- Prisma schema implemented and migrated
- API server framework operational
- Database connection pooling configured
- Basic authentication middleware in place
- Development environment fully functional
- Connection performance benchmarks met

## Related Stories
- US2.1: Database Server Setup (PostgreSQL on Railway/Digital Ocean) (#153)
- US2.2: Implement Entity Framework Core 8
- US2.3: Create ASP.NET Core 8 API Server
- US2.4: Configure Npgsql Connection Pooling
- US2.5: Implement Basic Authentication and Security Middleware (JWT Bearer)

## .NET 9 Implementation Details
### Project Structure
```
QuranAppsDirectory.Api/
├── Controllers/           # API endpoints
├── Data/
│   ├── Entities/         # EF Core entities
│   ├── Configurations/   # Fluent API configs
│   └── ApplicationDbContext.cs
├── Services/
│   ├── Interfaces/       # Service contracts
│   └── Implementations/  # Service logic
├── DTOs/                 # Request/Response objects
├── Middleware/           # Custom middleware
├── Program.cs            # Application entry point
└── appsettings.json      # Configuration
```

### Key NuGet Packages
- Microsoft.EntityFrameworkCore 8.0.0
- Npgsql.EntityFrameworkCore.PostgreSQL 8.0.0
- Microsoft.AspNetCore.Authentication.JwtBearer 8.0.0
- Swashbuckle.AspNetCore 6.5.0
- Serilog.AspNetCore 8.0.0
- AspNetCoreRateLimit 5.0.0

### Configuration Example
```csharp
// Program.cs
builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseNpgsql(
        builder.Configuration.GetConnectionString("DefaultConnection"),
        npgsqlOptions => npgsqlOptions.EnableRetryOnFailure()
    ));

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options => {
        // JWT configuration
    });
```

### Hosting Options
- **Primary:** Railway (simpler, $5-15/month)
- **Alternative:** Digital Ocean App Platform ($5-12/month)
- **Both support:** Dockerfile or Nixpacks auto-detection

## Priority
priority-1