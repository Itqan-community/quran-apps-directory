# US8.1: Implement django-allauth Authentication System

**Epic:** Epic 8 - User Accounts & Personalization
**Sprint:** Week 7, Day 1
**Story Points:** 8
**Priority:** P1
**Assigned To:** Backend Lead
**Status:** Not Started

---

## 📋 User Story

**As a** Backend Developer
**I want** django-allauth configured with custom user model
**So that** we have a robust foundation for user authentication and authorization

---

## 🎯 Acceptance Criteria

### AC1: Custom User Model
- [ ] Custom `User` model extends Django's `AbstractUser`
- [ ] Additional fields:
  - `avatar_url` (URLField, nullable)
  - `bio` (TextField, nullable)
  - `language_preference` (CharField: "en", "ar")
  - `theme_preference` (CharField: "light", "dark", "auto")
  - `email_verified` (BooleanField, default=False)
  - `created_at` (DateTimeField, auto_now_add=True)
  - `updated_at` (DateTimeField, auto_now=True)
  - `last_login_at` (DateTimeField, nullable)
- [ ] Foreign key relationships defined (to future models)

### AC2: django-allauth Configuration
- [ ] django-allauth installed and configured in settings.py
- [ ] Password validation configured:
  - Minimum length: 8 characters
  - Require uppercase, lowercase, digit, special char
  - Account lockout: 5 failed attempts, 15 minute lockout
- [ ] Email as username (USERNAME_FIELD = 'email')
- [ ] Email verification required before login
- [ ] Two-factor authentication support enabled

### AC3: Database Migrations
- [ ] Custom User model migrations created
- [ ] Django's built-in auth tables created:
  - `auth_user` (custom)
  - `auth_group`
  - `auth_user_groups`
  - `auth_user_user_permissions`
- [ ] UUID primary keys configured
- [ ] Proper indexes and foreign keys

### AC4: Roles/Groups Setup
- [ ] Predefined groups created via migration:
  - `Admin` (all permissions)
  - `Developer` (manage own apps)
  - `User` (standard user)
- [ ] Groups and permissions seeded
- [ ] Permission-based authorization configured

### AC5: Django Model Integration
- [ ] `User` model properly integrated with Django ORM
- [ ] Custom manager created (Django User Model)
- [ ] Relationships to app-specific models
- [ ] Model validation implemented

### AC6: django-allauth Service Configuration
- [ ] django-allauth apps registered in INSTALLED_APPS
- [ ] Email backend configured (SendGrid or similar)
- [ ] JWT authentication via djangorestframework-simplejwt
- [ ] Cookie authentication for admin portal (optional)

---

## 📝 Technical Notes

### ApplicationUser Model
```python
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
```python
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
```python
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
```python
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
- US2.2: Django ORM configured
- US2.3: Django REST API created

---

## 📊 Definition of Done
- [ ] Custom User model created
- [ ] django-allauth configured with password policies
- [ ] Database migrations created and applied
- [ ] Roles/groups created and seeded
- [ ] Email verification configured
- [ ] JWT authentication configured
- [ ] Authorization system tested
- [ ] Unit tests for user creation (80%+ coverage)
- [ ] Documentation complete

---

**Created:** October 6, 2025
**Owner:** Abubakr Abduraghman, a.abduraghman@itqan.dev
**Updated:** October 19, 2025 (Django alignment)
**Epic:** [Epic 8: User Accounts & Personalization](../epics/epic-8-user-accounts-personalization.md)
