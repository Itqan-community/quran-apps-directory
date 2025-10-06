# US8.3: Implement OAuth 2.0 Providers (Google, Apple, Facebook)

**Epic:** Epic 8 - User Accounts & Personalization  
**Sprint:** Week 7, Day 2-3  
**Story Points:** 8  
**Priority:** P1  
**Assigned To:** Backend Developer  
**Status:** Not Started

---

## 📋 User Story

**As a** User  
**I want** to sign in using my Google, Apple, or Facebook account  
**So that** I can register and login quickly without creating a new password

---

## 🎯 Acceptance Criteria

### AC1: Google OAuth Integration
- [ ] Google OAuth 2.0 configured
- [ ] POST /api/auth/google endpoint
- [ ] Accepts Google ID token
- [ ] Validates token with Google API
- [ ] Creates user if not exists
- [ ] Links to existing account if email matches
- [ ] Returns JWT + refresh token

### AC2: Apple Sign In Integration
- [ ] Apple Sign In configured
- [ ] POST /api/auth/apple endpoint
- [ ] Validates Apple identity token
- [ ] Handles Apple's privacy features (hidden email)
- [ ] Creates user with Apple ID
- [ ] Returns JWT + refresh token

### AC3: Facebook Login Integration
- [ ] Facebook Login configured
- [ ] POST /api/auth/facebook endpoint
- [ ] Validates Facebook access token
- [ ] Fetches user profile from Facebook Graph API
- [ ] Creates user if not exists
- [ ] Returns JWT + refresh token

### AC4: Account Linking
- [ ] If email exists, link OAuth provider to existing account
- [ ] User can have multiple OAuth providers
- [ ] UserLogins table tracks provider associations
- [ ] Prevent duplicate provider logins

### AC5: User Profile Mapping
- [ ] Map OAuth profile to ApplicationUser:
  - FullName from provider
  - Email (or placeholder if hidden)
  - ProfilePictureUrl from provider
  - EmailVerified = true (trust provider)

### AC6: Security Considerations
- [ ] Validate OAuth tokens server-side (never trust client)
- [ ] Token expiry checked
- [ ] Provider API calls with timeout
- [ ] Error handling for provider API failures

### AC7: Frontend Integration Ready
- [ ] CORS configured for OAuth redirects
- [ ] Frontend URLs whitelisted
- [ ] Error responses standardized

---

## 📝 Technical Notes

### OAuth Controller
```csharp
[ApiController]
[Route("api/auth")]
public class OAuthController : ControllerBase
{
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly ITokenService _tokenService;
    private readonly IGoogleAuthService _googleAuth;
    private readonly IAppleAuthService _appleAuth;
    private readonly IFacebookAuthService _facebookAuth;
    
    [HttpPost("google")]
    [ProducesResponseType(typeof(AuthResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<AuthResponse>> GoogleLogin([FromBody] GoogleLoginDto dto)
    {
        // Validate Google ID token
        var payload = await _googleAuth.ValidateTokenAsync(dto.IdToken);
        
        if (payload == null)
            return Unauthorized(new { message = "Invalid Google token" });
        
        // Find or create user
        var user = await _userManager.FindByLoginAsync("Google", payload.Subject);
        
        if (user == null)
        {
            // Check if email already exists
            user = await _userManager.FindByEmailAsync(payload.Email);
            
            if (user == null)
            {
                // Create new user
                user = new ApplicationUser
                {
                    Id = Guid.NewGuid(),
                    Email = payload.Email,
                    UserName = payload.Email,
                    FullName = payload.Name,
                    EmailVerified = payload.EmailVerified,
                    ProfilePictureUrl = payload.Picture,
                    CreatedAt = DateTime.UtcNow
                };
                
                var createResult = await _userManager.CreateAsync(user);
                if (!createResult.Succeeded)
                    return BadRequest(createResult.Errors);
                
                await _userManager.AddToRoleAsync(user, "User");
            }
            
            // Add Google login
            var loginInfo = new UserLoginInfo("Google", payload.Subject, "Google");
            await _userManager.AddLoginAsync(user, loginInfo);
        }
        
        // Update last login
        user.LastLoginAt = DateTime.UtcNow;
        await _userManager.UpdateAsync(user);
        
        // Generate JWT
        var authResponse = await _tokenService.GenerateTokenAsync(user);
        
        return Ok(authResponse);
    }
    
    [HttpPost("apple")]
    public async Task<ActionResult<AuthResponse>> AppleLogin([FromBody] AppleLoginDto dto)
    {
        var payload = await _appleAuth.ValidateTokenAsync(dto.IdentityToken);
        
        if (payload == null)
            return Unauthorized(new { message = "Invalid Apple token" });
        
        var user = await _userManager.FindByLoginAsync("Apple", payload.Subject);
        
        if (user == null)
        {
            // Apple may hide email - use fallback
            var email = payload.Email ?? $"{payload.Subject}@privaterelay.appleid.com";
            
            user = new ApplicationUser
            {
                Id = Guid.NewGuid(),
                Email = email,
                UserName = email,
                FullName = dto.FullName ?? "Apple User",
                EmailVerified = !string.IsNullOrEmpty(payload.Email),
                CreatedAt = DateTime.UtcNow
            };
            
            var createResult = await _userManager.CreateAsync(user);
            if (!createResult.Succeeded)
                return BadRequest(createResult.Errors);
            
            await _userManager.AddToRoleAsync(user, "User");
            
            var loginInfo = new UserLoginInfo("Apple", payload.Subject, "Apple");
            await _userManager.AddLoginAsync(user, loginInfo);
        }
        
        user.LastLoginAt = DateTime.UtcNow;
        await _userManager.UpdateAsync(user);
        
        var authResponse = await _tokenService.GenerateTokenAsync(user);
        
        return Ok(authResponse);
    }
    
    [HttpPost("facebook")]
    public async Task<ActionResult<AuthResponse>> FacebookLogin([FromBody] FacebookLoginDto dto)
    {
        var profile = await _facebookAuth.GetUserProfileAsync(dto.AccessToken);
        
        if (profile == null)
            return Unauthorized(new { message = "Invalid Facebook token" });
        
        var user = await _userManager.FindByLoginAsync("Facebook", profile.Id);
        
        if (user == null)
        {
            user = await _userManager.FindByEmailAsync(profile.Email);
            
            if (user == null)
            {
                user = new ApplicationUser
                {
                    Id = Guid.NewGuid(),
                    Email = profile.Email,
                    UserName = profile.Email,
                    FullName = profile.Name,
                    EmailVerified = true,
                    ProfilePictureUrl = profile.Picture?.Data?.Url,
                    CreatedAt = DateTime.UtcNow
                };
                
                var createResult = await _userManager.CreateAsync(user);
                if (!createResult.Succeeded)
                    return BadRequest(createResult.Errors);
                
                await _userManager.AddToRoleAsync(user, "User");
            }
            
            var loginInfo = new UserLoginInfo("Facebook", profile.Id, "Facebook");
            await _userManager.AddLoginAsync(user, loginInfo);
        }
        
        user.LastLoginAt = DateTime.UtcNow;
        await _userManager.UpdateAsync(user);
        
        var authResponse = await _tokenService.GenerateTokenAsync(user);
        
        return Ok(authResponse);
    }
}
```

### Google Auth Service
```csharp
public interface IGoogleAuthService
{
    Task<GoogleJsonWebSignature.Payload> ValidateTokenAsync(string idToken);
}

public class GoogleAuthService : IGoogleAuthService
{
    private readonly IConfiguration _configuration;
    
    public async Task<GoogleJsonWebSignature.Payload> ValidateTokenAsync(string idToken)
    {
        try
        {
            var settings = new GoogleJsonWebSignature.ValidationSettings
            {
                Audience = new[] { _configuration["Google:ClientId"] }
            };
            
            var payload = await GoogleJsonWebSignature.ValidateAsync(idToken, settings);
            
            return payload;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Google token validation failed");
            return null;
        }
    }
}
```

### Apple Auth Service
```csharp
public class AppleAuthService : IAppleAuthService
{
    private readonly HttpClient _httpClient;
    private readonly IConfiguration _configuration;
    
    public async Task<AppleTokenPayload> ValidateTokenAsync(string identityToken)
    {
        try
        {
            // Decode JWT without validation first to get key ID
            var handler = new JwtSecurityTokenHandler();
            var token = handler.ReadJwtToken(identityToken);
            
            // Get Apple's public keys
            var keys = await GetApplePublicKeysAsync();
            
            // Validate token
            var validationParameters = new TokenValidationParameters
            {
                ValidIssuer = "https://appleid.apple.com",
                ValidAudience = _configuration["Apple:ClientId"],
                IssuerSigningKeys = keys
            };
            
            var principal = handler.ValidateToken(identityToken, validationParameters, out _);
            
            return new AppleTokenPayload
            {
                Subject = principal.FindFirst("sub")?.Value,
                Email = principal.FindFirst("email")?.Value
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Apple token validation failed");
            return null;
        }
    }
    
    private async Task<IEnumerable<SecurityKey>> GetApplePublicKeysAsync()
    {
        // Fetch and cache Apple's public keys
        var response = await _httpClient.GetStringAsync("https://appleid.apple.com/auth/keys");
        var keySet = JsonSerializer.Deserialize<AppleKeySet>(response);
        
        return keySet.Keys.Select(k => new RsaSecurityKey(
            new RSAParameters
            {
                Modulus = Base64UrlEncoder.DecodeBytes(k.N),
                Exponent = Base64UrlEncoder.DecodeBytes(k.E)
            }));
    }
}
```

### Facebook Auth Service
```csharp
public class FacebookAuthService : IFacebookAuthService
{
    private readonly HttpClient _httpClient;
    
    public async Task<FacebookUserProfile> GetUserProfileAsync(string accessToken)
    {
        try
        {
            var url = $"https://graph.facebook.com/me?fields=id,name,email,picture&access_token={accessToken}";
            var response = await _httpClient.GetStringAsync(url);
            var profile = JsonSerializer.Deserialize<FacebookUserProfile>(response);
            
            return profile;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Facebook profile fetch failed");
            return null;
        }
    }
}
```

### Configuration (appsettings.json)
```json
{
  "Google": {
    "ClientId": "your-google-client-id.apps.googleusercontent.com"
  },
  "Apple": {
    "ClientId": "com.itqan.quran-apps",
    "TeamId": "YOUR_TEAM_ID",
    "KeyId": "YOUR_KEY_ID"
  },
  "Facebook": {
    "AppId": "your-facebook-app-id",
    "AppSecret": "your-facebook-app-secret"
  }
}
```

### NuGet Packages
```xml
<PackageReference Include="Google.Apis.Auth" Version="1.68.0" />
<PackageReference Include="System.IdentityModel.Tokens.Jwt" Version="7.0.0" />
```

---

## 🔗 Dependencies
- US8.1: ASP.NET Identity
- US8.2: JWT Auth Endpoints

---

## 📊 Definition of Done
- [ ] Google OAuth working
- [ ] Apple Sign In working
- [ ] Facebook Login working
- [ ] Account linking functional
- [ ] Profile mapping complete
- [ ] Security validation in place
- [ ] Integration tests pass
- [ ] Frontend integration documented

---

**Created:** October 6, 2025  
**Owner:** Abubakr Abduraghman, a.abduraghman@itqan.dev  
**Epic:** [Epic 8: User Accounts & Personalization](../epics/epic-8-user-accounts-personalization.md)
