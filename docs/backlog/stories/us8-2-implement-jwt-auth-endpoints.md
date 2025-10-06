# US8.2: Implement JWT Authentication Endpoints

**Epic:** Epic 8 - User Accounts & Personalization  
**Sprint:** Week 7, Day 1-2  
**Story Points:** 5  
**Priority:** P1  
**Assigned To:** Backend Developer  
**Status:** Not Started

---

## 📋 User Story

**As a** User  
**I want** to register, login, and manage my authentication  
**So that** I can access personalized features securely

---

## 🎯 Acceptance Criteria

### AC1: Register Endpoint
- [ ] POST /api/auth/register
- [ ] Accepts: Email, Password, FullName, PreferredLanguage
- [ ] Validates email format and uniqueness
- [ ] Creates user with "User" role
- [ ] Sends email verification
- [ ] Returns HTTP 201 with JWT token
- [ ] Errors: 400 (validation), 409 (email exists)

### AC2: Login Endpoint
- [ ] POST /api/auth/login
- [ ] Accepts: Email, Password
- [ ] Validates credentials
- [ ] Checks email confirmation
- [ ] Updates `LastLoginAt`
- [ ] Returns JWT + Refresh Token
- [ ] HTTP 200 on success, 401 on failure

### AC3: Refresh Token Endpoint
- [ ] POST /api/auth/refresh-token
- [ ] Accepts: RefreshToken
- [ ] Validates and rotates refresh token
- [ ] Returns new JWT + new Refresh Token
- [ ] Revokes old refresh token

### AC4: Logout Endpoint
- [ ] POST /api/auth/logout
- [ ] Requires authentication
- [ ] Revokes refresh tokens
- [ ] HTTP 204 on success

### AC5: Email Verification
- [ ] GET /api/auth/verify-email?userId={id}&token={token}
- [ ] Validates token
- [ ] Marks email as verified
- [ ] Redirects to frontend success page

### AC6: Password Reset Flow
- [ ] POST /api/auth/forgot-password (Email)
- [ ] POST /api/auth/reset-password (Token, NewPassword)
- [ ] Sends reset email
- [ ] Token expires in 1 hour

### AC7: JWT Token Structure
- [ ] Claims: UserId, Email, FullName, Roles
- [ ] Expiry: 60 minutes
- [ ] Refresh token expiry: 7 days

---

## 📝 Technical Notes

### Auth Controller
```csharp
[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly SignInManager<ApplicationUser> _signInManager;
    private readonly ITokenService _tokenService;
    private readonly IEmailService _emailService;
    
    [HttpPost("register")]
    [ProducesResponseType(typeof(AuthResponse), StatusCodes.Status201Created)]
    public async Task<ActionResult<AuthResponse>> Register([FromBody] RegisterDto dto)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);
        
        var user = new ApplicationUser
        {
            Id = Guid.NewGuid(),
            Email = dto.Email,
            UserName = dto.Email,
            FullName = dto.FullName,
            PreferredLanguage = dto.PreferredLanguage ?? "en",
            CreatedAt = DateTime.UtcNow
        };
        
        var result = await _userManager.CreateAsync(user, dto.Password);
        
        if (!result.Succeeded)
            return BadRequest(result.Errors);
        
        // Assign default role
        await _userManager.AddToRoleAsync(user, "User");
        
        // Send email verification
        var token = await _userManager.GenerateEmailConfirmationTokenAsync(user);
        var callbackUrl = Url.Action(
            "VerifyEmail",
            "Auth",
            new { userId = user.Id, token },
            Request.Scheme);
        
        await _emailService.SendEmailVerificationAsync(user.Email, callbackUrl);
        
        // Generate JWT
        var authResponse = await _tokenService.GenerateTokenAsync(user);
        
        return CreatedAtAction(nameof(GetCurrentUser), authResponse);
    }
    
    [HttpPost("login")]
    [ProducesResponseType(typeof(AuthResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<AuthResponse>> Login([FromBody] LoginDto dto)
    {
        var user = await _userManager.FindByEmailAsync(dto.Email);
        
        if (user == null)
            return Unauthorized(new { message = "Invalid credentials" });
        
        if (!user.EmailVerified && !await _userManager.IsEmailConfirmedAsync(user))
            return Unauthorized(new { message = "Email not verified" });
        
        var result = await _signInManager.CheckPasswordSignInAsync(
            user, dto.Password, lockoutOnFailure: true);
        
        if (!result.Succeeded)
        {
            if (result.IsLockedOut)
                return Unauthorized(new { message = "Account locked" });
            
            return Unauthorized(new { message = "Invalid credentials" });
        }
        
        // Update last login
        user.LastLoginAt = DateTime.UtcNow;
        await _userManager.UpdateAsync(user);
        
        var authResponse = await _tokenService.GenerateTokenAsync(user);
        
        return Ok(authResponse);
    }
    
    [HttpPost("refresh-token")]
    public async Task<ActionResult<AuthResponse>> RefreshToken([FromBody] RefreshTokenDto dto)
    {
        var authResponse = await _tokenService.RefreshTokenAsync(dto.RefreshToken);
        
        if (authResponse == null)
            return Unauthorized(new { message = "Invalid refresh token" });
        
        return Ok(authResponse);
    }
    
    [HttpPost("logout")]
    [Authorize]
    public async Task<IActionResult> Logout()
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        
        if (Guid.TryParse(userId, out var userGuid))
        {
            await _tokenService.RevokeRefreshTokensAsync(userGuid);
        }
        
        return NoContent();
    }
    
    [HttpGet("verify-email")]
    public async Task<IActionResult> VerifyEmail(
        [FromQuery] string userId,
        [FromQuery] string token)
    {
        if (!Guid.TryParse(userId, out var userGuid))
            return BadRequest();
        
        var user = await _userManager.FindByIdAsync(userId);
        if (user == null)
            return NotFound();
        
        var result = await _userManager.ConfirmEmailAsync(user, token);
        
        if (result.Succeeded)
        {
            user.EmailVerified = true;
            await _userManager.UpdateAsync(user);
            
            // Redirect to frontend success page
            return Redirect($"{_configuration["Frontend:BaseUrl"]}/email-verified");
        }
        
        return BadRequest(new { message = "Email verification failed" });
    }
    
    [HttpPost("forgot-password")]
    public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordDto dto)
    {
        var user = await _userManager.FindByEmailAsync(dto.Email);
        
        if (user == null)
            // Don't reveal that user doesn't exist
            return Ok(new { message = "If email exists, reset link sent" });
        
        var token = await _userManager.GeneratePasswordResetTokenAsync(user);
        var callbackUrl = $"{_configuration["Frontend:BaseUrl"]}/reset-password?token={Uri.EscapeDataString(token)}&email={Uri.EscapeDataString(user.Email)}";
        
        await _emailService.SendPasswordResetAsync(user.Email, callbackUrl);
        
        return Ok(new { message = "If email exists, reset link sent" });
    }
    
    [HttpPost("reset-password")]
    public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordDto dto)
    {
        var user = await _userManager.FindByEmailAsync(dto.Email);
        
        if (user == null)
            return BadRequest(new { message = "Invalid request" });
        
        var result = await _userManager.ResetPasswordAsync(
            user, dto.Token, dto.NewPassword);
        
        if (result.Succeeded)
            return Ok(new { message = "Password reset successful" });
        
        return BadRequest(result.Errors);
    }
}
```

### Token Service
```csharp
public interface ITokenService
{
    Task<AuthResponse> GenerateTokenAsync(ApplicationUser user);
    Task<AuthResponse> RefreshTokenAsync(string refreshToken);
    Task RevokeRefreshTokensAsync(Guid userId);
}

public class TokenService : ITokenService
{
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly IConfiguration _configuration;
    private readonly ApplicationDbContext _context;
    
    public async Task<AuthResponse> GenerateTokenAsync(ApplicationUser user)
    {
        var roles = await _userManager.GetRolesAsync(user);
        
        var claims = new List<Claim>
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(ClaimTypes.Email, user.Email),
            new Claim(ClaimTypes.Name, user.FullName),
            new Claim("PreferredLanguage", user.PreferredLanguage)
        };
        
        foreach (var role in roles)
        {
            claims.Add(new Claim(ClaimTypes.Role, role));
        }
        
        var key = new SymmetricSecurityKey(
            Encoding.UTF8.GetBytes(_configuration["Jwt:SecretKey"]));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        var expiry = DateTime.UtcNow.AddMinutes(
            int.Parse(_configuration["Jwt:ExpiryMinutes"]));
        
        var token = new JwtSecurityToken(
            issuer: _configuration["Jwt:Issuer"],
            audience: _configuration["Jwt:Audience"],
            claims: claims,
            expires: expiry,
            signingCredentials: creds
        );
        
        var jwt = new JwtSecurityTokenHandler().WriteToken(token);
        
        // Generate refresh token
        var refreshToken = await GenerateRefreshTokenAsync(user.Id);
        
        return new AuthResponse
        {
            Token = jwt,
            RefreshToken = refreshToken.Token,
            ExpiresAt = expiry,
            User = new UserDto
            {
                Id = user.Id,
                Email = user.Email,
                FullName = user.FullName,
                PreferredLanguage = user.PreferredLanguage,
                ProfilePictureUrl = user.ProfilePictureUrl
            }
        };
    }
    
    private async Task<RefreshToken> GenerateRefreshTokenAsync(Guid userId)
    {
        var refreshToken = new RefreshToken
        {
            Token = Convert.ToBase64String(RandomNumberGenerator.GetBytes(64)),
            UserId = userId,
            ExpiresAt = DateTime.UtcNow.AddDays(7),
            CreatedAt = DateTime.UtcNow
        };
        
        await _context.RefreshTokens.AddAsync(refreshToken);
        await _context.SaveChangesAsync();
        
        return refreshToken;
    }
}
```

---

## 🔗 Dependencies
- US8.1: ASP.NET Identity configured

---

## 📊 Definition of Done
- [ ] All auth endpoints implemented
- [ ] JWT generation working
- [ ] Refresh token mechanism working
- [ ] Email verification flow complete
- [ ] Password reset flow complete
- [ ] Unit tests (80%+ coverage)
- [ ] Integration tests pass
- [ ] Postman collection created

---

**Created:** October 6, 2025  
**Owner:** Abubakr Abduraghman, a.abduraghman@itqan.dev  
**Epic:** [Epic 8: User Accounts & Personalization](../epics/epic-8-user-accounts-personalization.md)
