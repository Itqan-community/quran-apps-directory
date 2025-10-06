# Epic 1: Database Architecture Foundation

## 📋 Epic Overview
Establish the foundational database architecture and design patterns for the Quran Apps Directory migration from static data to relational database.

## 🎯 Goal
Create a robust, scalable database schema and API architecture that can support current needs and future growth.

## 📊 Success Metrics
- Database schema supports all current 44 apps and 11 categories
- API response times <100ms for typical queries
- Schema supports complex filtering and search operations
- Zero data loss during migration planning

## 🏗️ Technical Scope (.NET 9)
- PostgreSQL database selection and setup (with Npgsql driver)
- Complete relational schema design using EF Core Code-First
- API architecture planning (ASP.NET Core REST API)
- Data modeling with C# 13 entity classes and DTOs
- Performance optimization planning (EF Core compiled queries, indexing)
- Entity Framework Core 9 configuration
- Migration strategy with EF Core Migrations

## 🔗 Dependencies
- None - This is the foundation epic

## 📈 Business Value
- Critical: Enables entire migration strategy
- Impact: Long-term scalability and maintainability
- Effort: 1 week for design completion

## ✅ Definition of Done
- PostgreSQL selected as database technology
- Complete database schema designed and documented
- API architecture decided (REST/GraphQL hybrid)
- Data models created for all entities
- Migration strategy documented
- Performance and security requirements defined
- Team review and approval obtained

## Related Stories
- US1.1: Database Technology Selection - PostgreSQL + Npgsql (#151)
- US1.2: Design Complete Relational Schema (EF Core Code-First)
- US1.3: Plan API Architecture (ASP.NET Core REST)
- US1.4: Define Data Models (C# Entities, DTOs, Validators)
- US1.5: Create Database Performance Optimization Strategy (Indexes, Compiled Queries)

## .NET 9 Implementation Details
### Technology Stack
- **Database:** PostgreSQL 15+
- **Driver:** Npgsql.EntityFrameworkCore.PostgreSQL 8.0
- **ORM:** Entity Framework Core 8
- **Migrations:** EF Core Migrations (dotnet ef)
- **Validation:** FluentValidation.AspNetCore 11.3

### Key C# Components
```csharp
// Entity Example
public class App
{
    public Guid Id { get; set; }
    public string NameAr { get; set; }
    public string NameEn { get; set; }
    // ... other properties
    
    // Navigation properties
    public Developer? Developer { get; set; }
    public ICollection<AppCategory> AppCategories { get; set; }
}

// DbContext
public class ApplicationDbContext : DbContext
{
    public DbSet<App> Apps => Set<App>();
    public DbSet<Category> Categories => Set<Category>();
    // ... other DbSets
}
```

### Architecture Decisions
- **ADR-001:** PostgreSQL chosen for relational data + excellent .NET support
- **ADR-002:** EF Core 8 chosen for type-safe LINQ queries and code-first migrations
- **ADR-003:** Code-First approach for better version control and team collaboration
- **ADR-004:** Fluent API configuration for complex relationships

## Priority
priority-1