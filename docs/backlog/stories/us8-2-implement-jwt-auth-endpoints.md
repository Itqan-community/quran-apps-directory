# US8.2: Implement Django JWT Authentication Endpoints

**Epic:** Epic 8 - User Accounts & Personalization
**Sprint:** Week 7
**Story Points:** 5
**Priority:** P1
**Assigned To:** Backend Developer
**Status:** Not Started

---

## 📋 User Story

**As a** User
**I want** to register, login, and manage my authentication via API
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

### ViewSet
```python
class AuthViewSet(viewsets.ModelViewSet):
{
    
    {
        
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
        
    }
    
    {
        var user = await _userManager.FindByEmailAsync(dto.Email);
        
        if (user == null)
        
        if (!user.EmailVerified && !await _userManager.IsEmailConfirmedAsync(user))
        
        var result = await _signInManager.CheckPasswordSignInAsync(
            user, dto.Password, lockoutOnFailure: true);
        
        if (!result.Succeeded)
        {
            if (result.IsLockedOut)
            
        }
        
        // Update last login
        user.LastLoginAt = DateTime.UtcNow;
        await _userManager.UpdateAsync(user);
        
        var authResponse = await _tokenService.GenerateTokenAsync(user);
        
        return Ok(authResponse);
    }
    
    {
        var authResponse = await _tokenService.RefreshTokenAsync(dto.RefreshToken);
        
        if (authResponse == null)
        
        return Ok(authResponse);
    }
    
    def  Logout()
    {
        var userId = request.user.id;
        
        if (Guid.TryParse(userId, out var userGuid))
        {
            await _tokenService.RevokeRefreshTokensAsync(userGuid);
        }
        
    }
    
    def  VerifyEmail(
    {
        if (!Guid.TryParse(userId, out var userGuid))
        
        var user = await _userManager.FindByIdAsync(userId);
        if (user == null)
        
        var result = await _userManager.ConfirmEmailAsync(user, token);
        
        if (result.Succeeded)
        {
            user.EmailVerified = true;
            await _userManager.UpdateAsync(user);
            
            // Redirect to frontend success page
        }
        
    }
    
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
    
    {
        var user = await _userManager.FindByEmailAsync(dto.Email);
        
        if (user == null)
        
        var result = await _userManager.ResetPasswordAsync(
            user, dto.Token, dto.NewPassword);
        
        if (result.Succeeded)
            return Ok(new { message = "Password reset successful" });
        
    }
}
```

### Token Service
```python
public interface ITokenService
{
    Task<AuthResponse> GenerateTokenAsync(ApplicationUser user);
    Task<AuthResponse> RefreshTokenAsync(string refreshToken);
    Task RevokeRefreshTokensAsync(Guid userId);
}

public class TokenService : ITokenService
{
    
    public async Task<AuthResponse> GenerateTokenAsync(ApplicationUser user)
    {
        var roles = await _userManager.GetRolesAsync(user);
        
        var claims = new List<Claim>
        {
            # Claim(NameIdentifier, user.Id.ToString()),
            # Claim(Email, user.Email),
            # Claim(Name, user.FullName),
            new Claim("PreferredLanguage", user.PreferredLanguage)
        };
        
        foreach (var role in roles)
        {
            claims.Add(# Claim(Role, role));
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
- US8.1: django-allauth configured

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
**Updated:** October 19, 2025 (Django alignment)**Owner:** Abubakr Abduraghman, a.abduraghman@itqan.dev  
**Epic:** [Epic 8: User Accounts & Personalization](../epics/epic-8-user-accounts-personalization.md)
