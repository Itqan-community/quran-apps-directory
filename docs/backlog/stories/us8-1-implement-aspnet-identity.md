# US8.1: Implement ASP.NET Core Identity

**Epic:** Epic 8 - User Accounts & Personalization  
**Sprint:** Week 7, Day 1  
**Story Points:** 8  
**Priority:** P1  
**Assigned To:** Backend Lead  
**Status:** Not Started

---

## 📋 User Story

**As a** Backend Developer  
**I want** ASP.NET Core Identity configured with custom user model  
**So that** we have a robust foundation for user authentication and authorization

---

## 🎯 Acceptance Criteria

### AC1: ApplicationUser Model
- [ ] Custom `ApplicationUser` extends `IdentityUser<Guid>`
- [ ] Additional properties:
  - `FullName` (string, max 200)
  - `ProfilePictureUrl` (string, nullable)
  - `PreferredLanguage` (string: "en", "ar")
  - `EmailVerified` (bool)
  - `PhoneNumberVerified` (bool)
  - `CreatedAt` (DateTime)
  - `UpdatedAt` (DateTime, nullable)
  - `LastLoginAt` (DateTime, nullable)
- [ ] Navigation properties for related entities

### AC2: Identity Configuration
- [ ] Password requirements configured:
  - Minimum length: 8 characters
  - Require uppercase, lowercase, digit, special char
  - Max failed attempts: 5
  - Lockout duration: 15 minutes
- [ ] Username = Email (no separate username)
- [ ] Email confirmation required
- [ ] Two-factor authentication supported

### AC3: Database Schema
- [ ] Identity tables created via migration:
  - `AspNetUsers`
  - `AspNetRoles`
  - `AspNetUserRoles`
  - `AspNetUserClaims`
  - `AspNetUserLogins`
  - `AspNetUserTokens`
  - `AspNetRoleClaims`
- [ ] Guid primary keys (not default int)
- [ ] Proper indexes and foreign keys

### AC4: Roles Setup
- [ ] Predefined roles created:
  - `Admin` (full access)
  - `Developer` (manage own apps)
  - `User` (standard user)
- [ ] Role seeding in migration
- [ ] Role-based authorization configured

### AC5: DbContext Integration
- [ ] `ApplicationDbContext` extends `IdentityDbContext<ApplicationUser, IdentityRole<Guid>, Guid>`
- [ ] Identity entities configured
- [ ] Relationships to app-specific entities

### AC6: Service Registration
- [ ] Identity services registered in `Program.cs`
- [ ] JWT authentication configured
- [ ] Cookie authentication for admin portal (optional)

---

## 📝 Technical Notes

### ApplicationUser Model
```csharp
public class ApplicationUser : IdentityUser<Guid>
{
    [Required]
    [MaxLength(200)]
    public string FullName { get; set; }
    
    [MaxLength(500)]
    public string ProfilePictureUrl { get; set; }
    
    [Required]
    [MaxLength(5)]
    public string PreferredLanguage { get; set; } = "en";
    
    public bool EmailVerified { get; set; }
    public bool PhoneNumberVerified { get; set; }
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
    public DateTime? LastLoginAt { get; set; }
    
    // Navigation properties
    public virtual ICollection<Favorite> Favorites { get; set; }
    public virtual ICollection<Review> Reviews { get; set; }
    public virtual ICollection<Collection> Collections { get; set; }
}
```

### ApplicationDbContext
```csharp
public class ApplicationDbContext : IdentityDbContext<ApplicationUser, IdentityRole<Guid>, Guid>
{
    public DbSet<App> Apps { get; set; }
    public DbSet<Category> Categories { get; set; }
    public DbSet<Developer> Developers { get; set; }
    public DbSet<Favorite> Favorites { get; set; }
    public DbSet<Review> Reviews { get; set; }
    public DbSet<Collection> Collections { get; set; }
    // ... other DbSets
    
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
        : base(options)
    {
    }
    
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder); // IMPORTANT: Call base first
        
        // Customize Identity table names (optional)
        modelBuilder.Entity<ApplicationUser>().ToTable("Users");
        modelBuilder.Entity<IdentityRole<Guid>>().ToTable("Roles");
        modelBuilder.Entity<IdentityUserRole<Guid>>().ToTable("UserRoles");
        modelBuilder.Entity<IdentityUserClaim<Guid>>().ToTable("UserClaims");
        modelBuilder.Entity<IdentityUserLogin<Guid>>().ToTable("UserLogins");
        modelBuilder.Entity<IdentityUserToken<Guid>>().ToTable("UserTokens");
        modelBuilder.Entity<IdentityRoleClaim<Guid>>().ToTable("RoleClaims");
        
        // Configure ApplicationUser
        modelBuilder.Entity<ApplicationUser>(entity =>
        {
            entity.Property(u => u.FullName).IsRequired();
            entity.Property(u => u.PreferredLanguage).HasDefaultValue("en");
            entity.HasIndex(u => u.Email).IsUnique();
        });
        
        // Configure other entities...
    }
}
```

### Identity Configuration (Program.cs)
```csharp
// Add Identity services
builder.Services.AddIdentity<ApplicationUser, IdentityRole<Guid>>(options =>
{
    // Password settings
    options.Password.RequireDigit = true;
    options.Password.RequireLowercase = true;
    options.Password.RequireUppercase = true;
    options.Password.RequireNonAlphanumeric = true;
    options.Password.RequiredLength = 8;
    options.Password.RequiredUniqueChars = 1;
    
    // Lockout settings
    options.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(15);
    options.Lockout.MaxFailedAccessAttempts = 5;
    options.Lockout.AllowedForNewUsers = true;
    
    // User settings
    options.User.RequireUniqueEmail = true;
    
    // Sign-in settings
    options.SignIn.RequireConfirmedEmail = true;
    options.SignIn.RequireConfirmedPhoneNumber = false;
    
    // Token providers
    options.Tokens.EmailConfirmationTokenProvider = TokenOptions.DefaultEmailProvider;
    options.Tokens.PasswordResetTokenProvider = TokenOptions.DefaultEmailProvider;
})
.AddEntityFrameworkStores<ApplicationDbContext>()
.AddDefaultTokenProviders();

// Configure JWT Authentication
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
            Encoding.UTF8.GetBytes(builder.Configuration["Jwt:SecretKey"]))
    };
});

// Configure Authorization
builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("AdminOnly", policy => policy.RequireRole("Admin"));
    options.AddPolicy("DeveloperOrAdmin", policy => 
        policy.RequireRole("Developer", "Admin"));
    options.AddPolicy("AuthenticatedUser", policy => 
        policy.RequireAuthenticatedUser());
});
```

### Initial Migration with Role Seeding
```csharp
public class SeedRoles : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        var adminRoleId = Guid.NewGuid();
        var developerRoleId = Guid.NewGuid();
        var userRoleId = Guid.NewGuid();
        
        migrationBuilder.InsertData(
            table: "Roles",
            columns: new[] { "Id", "Name", "NormalizedName", "ConcurrencyStamp" },
            values: new object[,]
            {
                { adminRoleId, "Admin", "ADMIN", Guid.NewGuid().ToString() },
                { developerRoleId, "Developer", "DEVELOPER", Guid.NewGuid().ToString() },
                { userRoleId, "User", "USER", Guid.NewGuid().ToString() }
            });
    }
    
    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DeleteData(
            table: "Roles",
            keyColumn: "NormalizedName",
            keyValues: new object[] { "ADMIN", "DEVELOPER", "USER" });
    }
}
```

### appsettings.json
```json
{
  "Jwt": {
    "SecretKey": "your-super-secret-key-change-in-production",
    "Issuer": "QuranAppsAPI",
    "Audience": "QuranAppsClients",
    "ExpiryMinutes": 60
  },
  "ConnectionStrings": {
    "DefaultConnection": "Host=localhost;Database=quran_apps;Username=postgres;Password=..."
  }
}
```

---

## 🔗 Dependencies
- US2.2: EF Core configured
- US2.3: ASP.NET Core API created

---

## 📊 Definition of Done
- [ ] ApplicationUser model created
- [ ] Identity configured with password policies
- [ ] Database migration applied
- [ ] Roles created and seeded
- [ ] JWT authentication configured
- [ ] Authorization policies defined
- [ ] Unit tests for user creation
- [ ] Documentation complete

---

**Created:** October 6, 2025  
**Owner:** Abubakr Abduraghman, a.abduraghman@itqan.dev  
**Epic:** [Epic 8: User Accounts & Personalization](../epics/epic-8-user-accounts-personalization.md)
