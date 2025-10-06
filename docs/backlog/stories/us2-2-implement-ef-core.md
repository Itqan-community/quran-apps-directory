# US2.2: Implement Entity Framework Core 9

**Epic:** Epic 2 - Backend Infrastructure Setup  
**Sprint:** Week 1, Day 2-3  
**Story Points:** 5  
**Priority:** P1 (Critical)  
**Assigned To:** Backend Developer  
**Status:** Not Started

---

## 📋 User Story

**As a** Backend Developer  
**I want to** configure Entity Framework Core 9 with PostgreSQL  
**So that** we have a reliable ORM for database operations with migrations, LINQ queries, and type safety

---

## 🎯 Acceptance Criteria

### AC1: NuGet Packages Installed
- [ ] Core packages added to `.csproj`:
  ```xml
  <PackageReference Include="Microsoft.EntityFrameworkCore" Version="9.0.0" />
  <PackageReference Include="Microsoft.EntityFrameworkCore.Design" Version="9.0.0" />
  <PackageReference Include="Npgsql.EntityFrameworkCore.PostgreSQL" Version="9.0.0" />
  <PackageReference Include="Microsoft.EntityFrameworkCore.Tools" Version="9.0.0" />
  ```

### AC2: ApplicationDbContext Created
- [ ] DbContext class implemented with all DbSets:
  ```csharp
  public class ApplicationDbContext : DbContext
  {
      public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
          : base(options) { }
      
      public DbSet<App> Apps => Set<App>();
      public DbSet<Category> Categories => Set<Category>();
      public DbSet<Developer> Developers => Set<Developer>();
      public DbSet<Feature> Features => Set<Feature>();
      // ... other DbSets
  }
  ```
- [ ] OnModelCreating configured with Fluent API
- [ ] Naming conventions configured (snake_case for PostgreSQL)

### AC3: Fluent API Configurations
- [ ] Entity configurations created for complex mappings:
  ```csharp
  public class AppConfiguration : IEntityTypeConfiguration<App>
  {
      public void Configure(EntityTypeBuilder<App> builder)
      {
          builder.ToTable("apps");
          builder.HasKey(a => a.Id);
          builder.Property(a => a.NameAr).IsRequired().HasMaxLength(200);
          builder.HasIndex(a => a.NameEn);
          builder.HasOne(a => a.Developer)
              .WithMany(d => d.Apps)
              .HasForeignKey(a => a.DeveloperId);
      }
  }
  ```
- [ ] Many-to-many relationships configured
- [ ] Cascade delete behaviors defined

### AC4: Database Context Registration
- [ ] DbContext registered in `Program.cs`:
  ```csharp
  builder.Services.AddDbContext<ApplicationDbContext>(options =>
      options.UseNpgsql(
          builder.Configuration.GetConnectionString("DefaultConnection"),
          npgsqlOptions => {
              npgsqlOptions.EnableRetryOnFailure(maxRetryCount: 3);
              npgsqlOptions.CommandTimeout(30);
              npgsqlOptions.MigrationsAssembly("QuranAppsDirectory.Api");
          })
      .UseSnakeCaseNamingConvention()  // PostgreSQL naming
      .EnableSensitiveDataLogging(builder.Environment.IsDevelopment())
      .EnableDetailedErrors(builder.Environment.IsDevelopment()));
  ```

### AC5: Initial Migration Created
- [ ] Migration created with EF Core CLI:
  ```bash
  dotnet ef migrations add InitialCreate
  ```
- [ ] Migration reviewed for correctness
- [ ] Migration applied to dev database:
  ```bash
  dotnet ef database update
  ```
- [ ] Database schema verified in pgAdmin

### AC6: Connection Pooling Configured
- [ ] Connection string optimized for pooling
- [ ] Pool size configured (Min: 5, Max: 100)
- [ ] Connection lifetime set (5 minutes)
- [ ] Performance tested under load

### AC7: Development Experience Optimized
- [ ] Entity tracking behavior configured
- [ ] Query logging configured for development
- [ ] Lazy loading enabled/disabled as needed
- [ ] Model snapshot generated

---

## 📝 Technical Notes

### Complete DbContext Example
```csharp
public class ApplicationDbContext : DbContext
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
        : base(options)
    {
    }
    
    public DbSet<App> Apps => Set<App>();
    public DbSet<Category> Categories => Set<Category>();
    public DbSet<Developer> Developers => Set<Developer>();
    public DbSet<Feature> Features => Set<Feature>();
    public DbSet<AppCategory> AppCategories => Set<AppCategory>();
    public DbSet<AppFeature> AppFeatures => Set<AppFeature>();
    
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        
        // Apply all configurations from assembly
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(ApplicationDbContext).Assembly);
        
        // Configure many-to-many relationships
        modelBuilder.Entity<AppCategory>()
            .HasKey(ac => new { ac.AppId, ac.CategoryId });
        
        modelBuilder.Entity<AppFeature>()
            .HasKey(af => new { af.AppId, af.FeatureId });
        
        // Configure cascade deletes
        modelBuilder.Entity<App>()
            .HasMany(a => a.AppCategories)
            .WithOne(ac => ac.App)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
```

### Migration Commands
```bash
# Add new migration
dotnet ef migrations add <MigrationName>

# Update database to latest
dotnet ef database update

# Rollback to specific migration
dotnet ef database update <MigrationName>

# Generate SQL script
dotnet ef migrations script

# Remove last migration (if not applied)
dotnet ef migrations remove
```

---

## 🔗 Dependencies
- US2.1: Database Server Setup (must be complete)
- US1.4: Define Data Models (must be complete)

---

## 🚫 Blockers
- Database server must be accessible
- Entity classes must be finalized

---

## 📊 Definition of Done
- [ ] EF Core 9 configured with PostgreSQL
- [ ] ApplicationDbContext implemented
- [ ] Fluent API configurations complete
- [ ] Initial migration created and applied
- [ ] Database schema verified
- [ ] Connection pooling tested
- [ ] Code review passed
- [ ] Documentation updated

---

## 📚 Resources
- [EF Core with PostgreSQL](https://www.npgsql.org/efcore/)
- [EF Core Migrations](https://learn.microsoft.com/en-us/ef/core/managing-schemas/migrations/)
- [Fluent API](https://learn.microsoft.com/en-us/ef/core/modeling/)

---

**Created:** October 6, 2025  
**Owner:** Abubakr Abduraghman, a.abduraghman@itqan.dev  
**Epic:** [Epic 2: Backend Infrastructure Setup](../epics/epic-2-backend-infrastructure-setup.md)

