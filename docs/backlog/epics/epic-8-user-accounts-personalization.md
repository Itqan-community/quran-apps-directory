# Epic 8: User Accounts & Personalization

## 📋 Epic Overview
Implement comprehensive user account system enabling personalized experiences, saved preferences, and community features.

## 🎯 Goal
Transform the platform from anonymous browsing to authenticated user experience with profiles, preferences, and activity tracking.

## 📊 Success Metrics
- 15% registration conversion rate
- 70% OAuth adoption (Google, Apple, Facebook)
- 60% profile completion rate
- 5-10x user retention increase
- Email verification >90% completion

## 🏗️ Technical Scope (Django)
- User registration and authentication (Django Core Identity)
- OAuth 2.0 integration (Google, Apple, Facebook, Twitter)
- JWT token-based authentication
- Profile management with avatar uploads
- Email verification with SendGrid
- Password reset flow
- Two-factor authentication (2FA) support
- User activity tracking
- Notification system (email + in-app)
- GDPR compliance (data export, account deletion)

## 🔗 Dependencies
- Epic 2: Backend infrastructure with JWT middleware
- Provides foundation for: Epic 9, 10, 11 (all user-related features)

## 📈 Business Value
- Critical: Foundation for all community features
- Impact: Transforms platform into sticky service
- Effort: 4-5 weeks for complete implementation

## ✅ Definition of Done
- User registration via email/password functional
- OAuth providers integrated (4 providers minimum)
- Email verification working
- Password reset flow tested
- Profile management complete
- Activity tracking operational
- Notification system sending emails
- 2FA implemented (optional for users)
- GDPR compliance features working
- Security audit passed

## Related Stories
- US8.1: User Registration & Authentication (Identity + JWT)
- US8.2: OAuth Integration (Google, Apple, Facebook, Twitter)
- US8.3: Profile Management (Avatar upload to R2)
- US8.4: Email Verification (SendGrid integration)
- US8.5: Password Reset Flow
- US8.6: Two-Factor Authentication (TOTP)
- US8.7: User Activity Tracking
- US8.8: Notification System (Email + In-app)
- US8.9: GDPR Compliance Features

## Django Implementation Details
### Django Core Identity Setup
```python
// User Entity (extends IdentityUser)
public class ApplicationUser : IdentityUser<Guid>
{
    public string? Name { get; set; }
    public string? AvatarUrl { get; set; }
    public string? Bio { get; set; }
    public string LanguagePreference { get; set; } = "en";
    public string ThemePreference { get; set; } = "auto";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? LastLoginAt { get; set; }
    
    // Navigation properties
    public ICollection<Review> Reviews { get; set; }
    public ICollection<Favorite> Favorites { get; set; }
    public ICollection<Collection> Collections { get; set; }
}

// DbContext configuration
public class ApplicationDbContext : IdentityDbContext<ApplicationUser, IdentityRole<Guid>, Guid>
{
    // ... existing DbSets
}

// Program.cs
builder.Services.AddIdentity<ApplicationUser, IdentityRole<Guid>>()
    .AddEntityFrameworkStores<ApplicationDbContext>()
    .AddDefaultTokenProviders();

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options => { /* JWT config */ })
    .AddGoogle(options => { /* Google OAuth */ })
    .AddApple(options => { /* Apple OAuth */ })
    .AddFacebook(options => { /* Facebook OAuth */ });
```

### Authentication ViewSet
```python
[ApiViewSet]
public class AuthViewSet : ViewSetBase
{
    
    public async Task<Response<AuthResponse>> Register(RegisterRequest request)
    {
        // Create user, send verification email, return JWT
    }
    
    public async Task<Response<AuthResponse>> Login(LoginRequest request)
    {
        // Validate credentials, return JWT + refresh token
    }
    
    {
        // Handle OAuth callback, create/login user, return JWT
    }
    
    public async Task<Response> VerifyEmail(VerifyEmailRequest request)
    {
        // Verify email token
    }
    
    public async Task<Response> ForgotPassword(ForgotPasswordRequest request)
    {
        // Send password reset email
    }
    
    public async Task<Response> ResetPassword(ResetPasswordRequest request)
    {
        // Reset password with token
    }
    
    public async Task<Response<AuthResponse>> RefreshToken(RefreshTokenRequest request)
    {
        // Refresh JWT using refresh token
    }
}
```

### JWT Service
```python
public interface IJwtService
{
    string GenerateAccessToken(ApplicationUser user);
    string GenerateRefreshToken();
    ClaimsPrincipal? ValidateToken(string token);
}

public class JwtService : IJwtService
{
    
    public string GenerateAccessToken(ApplicationUser user)
    {
        var claims = new[]
        {
            new Claim(JWT claims.NameIdentifier, user.Id.ToString()),
            new Claim(JWT claims.Email, user.Email!),
            new Claim(JWT claims.Name, user.Name ?? user.Email!),
            new Claim("language_pref", user.LanguagePreference)
        };
        
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_configuration["Jwt:SecretKey"]!));
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
}
```

### Email Service (SendGrid)
```python
public interface IEmailService
{
    Task SendVerificationEmailAsync(string email, string token);
    Task SendPasswordResetEmailAsync(string email, string token);
    Task SendWelcomeEmailAsync(string email, string name);
}

public class EmailService : IEmailService
{
    
    public async Task SendVerificationEmailAsync(string email, string token)
    {
        var msg = new SendGridMessage();
        msg.SetFrom(new EmailAddress("noreply@quran-apps.itqan.dev", "Quran Apps Directory"));
        msg.AddTo(new EmailAddress(email));
        msg.SetTemplateId("d-verification-template-id");
        msg.SetTemplateData(new
        {
            verification_url = $"https://quran-apps.itqan.dev/verify-email?token={token}"
        });
        
        await _sendGridClient.SendEmailAsync(msg);
    }
}
```

### Avatar Upload to Cloudflare R2
```python
public interface IStorageService
{
    Task<string> UploadAvatarAsync(IFormFile file, Guid userId);
    Task DeleteAvatarAsync(string url);
}

public class R2StorageService : IStorageService
{
    
    public async Task<string> UploadAvatarAsync(IFormFile file, Guid userId)
    {
        var key = $"avatars/{userId}/{Guid.NewGuid()}{Path.GetExtension(file.FileName)}";
        
        using var stream = file.OpenReadStream();
        var request = new PutObjectRequest
        {
            BucketName = "quran-apps",
            Key = key,
            InputStream = stream,
            ContentType = file.ContentType,
            CannedACL = S3CannedACL.PublicRead
        };
        
        await _s3Client.PutObjectAsync(request);
        
        return $"https://pub-xxx.r2.dev/{key}";
    }
}
```

### Activity Tracking
```python
public class UserActivityService
{
    
    public async Task TrackActivityAsync(Guid userId, string activityType, Guid? appId = null)
    {
        var activity = new UserActivity
        {
            UserId = userId,
            ActivityType = activityType,
            AppId = appId,
            Timestamp = DateTime.UtcNow
        };
        
        _context.UserActivities.Add(activity);
        await _context.SaveChangesAsync();
    }
}
```

### Security Considerations
- **Password Hashing:** Django Core Identity uses PBKDF2 by default (configurable)
- **JWT Secret:** Store in environment variables, never in code
- **OAuth Secrets:** Store in Azure Key Vault or environment variables
- **HTTPS Only:** Enforce SSL/TLS
- **CORS:** Whitelist frontend domain only
- **Rate Limiting:** 5 login attempts per 15 minutes
- **Email Verification:** Required before full account access
- **2FA:** TOTP-based (Google Authenticator compatible)

### Key pip Packages
```xml
<ItemGroup>
  <PackageReference Include="Microsoft.AspNetCore.Identity.EntityFrameworkCore" Version="8.0.0" />
  <PackageReference Include="Microsoft.AspNetCore.Authentication.Google" Version="8.0.0" />
  <PackageReference Include="Microsoft.AspNetCore.Authentication.Facebook" Version="8.0.0" />
  <PackageReference Include="AspNet.Security.OAuth.Apple" Version="8.0.0" />
  <PackageReference Include="SendGrid" Version="9.28.1" />
  <PackageReference Include="AWSSDK.S3" Version="3.7.0" /> <!-- For R2 -->
  <PackageReference Include="GoogleAuthenticator" Version="3.0.0" /> <!-- For 2FA -->
</ItemGroup>
```

## Priority
priority-1 (Phase 2 - User Engagement)
