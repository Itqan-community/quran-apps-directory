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

## 🏗️ Technical Scope (Django)
- PostgreSQL server setup and configuration (Railway/Digital Ocean)
- Django ORM Core 8 integration and DbContext setup
- Django Core 8 API server implementation
- psycopg2 connection pooling and performance tuning
- Basic middleware and security setup (JWT, CORS, Rate Limiting)
- Serilog structured logging configuration
- drf-spectacular/OpenAPI documentation setup

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
- US2.2: Implement Django ORM Core 8
- US2.3: Create Django Core 8 API Server
- US2.4: Configure psycopg2 Connection Pooling
- US2.5: Implement Basic Authentication and Security Middleware (JWT Bearer)

## Django Implementation Details
### Project Structure
```
QuranAppsDirectory.Api/
├── ViewSets/           # API endpoints
├── Data/
│   ├── Entities/         # Django ORM entities
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

### Key pip Packages
- Microsoft.EntityFrameworkCore 8.0.0
- psycopg2.EntityFrameworkCore.PostgreSQL 8.0.0
- Microsoft.AspNetCore.Authentication.JwtBearer 8.0.0
- drf-spectacular 6.5.0
- Serilog.AspNetCore 8.0.0
- AspNetCoreRateLimit 5.0.0

### Configuration Example
```python
// Program.cs
builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.Usepsycopg2(
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