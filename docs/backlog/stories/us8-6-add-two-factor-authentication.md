# US8.6: Add Two-Factor Authentication (2FA)

**Epic:** Epic 8 - User Accounts & Personalization  
**Sprint:** Week 8, Day 1  
**Story Points:** 5  
**Priority:** P2  
**Assigned To:** Backend Developer  
**Status:** Not Started

---

## 📋 User Story

**As a** User  
**I want** to enable two-factor authentication on my account  
**So that** my account is more secure against unauthorized access

---

## 🎯 Acceptance Criteria

### AC1: Enable 2FA Endpoint
- [ ] POST /api/users/me/2fa/enable
- [ ] Generates TOTP secret
- [ ] Returns QR code (base64)
- [ ] Returns manual entry key
- [ ] Requires authentication

### AC2: Verify 2FA Setup
- [ ] POST /api/users/me/2fa/verify
- [ ] Accepts TOTP code
- [ ] Validates code
- [ ] Enables 2FA on user account
- [ ] Generates recovery codes (10)
- [ ] Returns recovery codes once

### AC3: Disable 2FA
- [ ] POST /api/users/me/2fa/disable
- [ ] Requires password + current TOTP code
- [ ] Disables 2FA
- [ ] Invalidates recovery codes

### AC4: Login with 2FA
- [ ] Modified login flow
- [ ] After password validation, request TOTP code
- [ ] POST /api/auth/verify-2fa (code, sessionToken)
- [ ] Returns JWT only after valid TOTP
- [ ] Supports recovery code as fallback

### AC5: Recovery Codes
- [ ] 10 single-use recovery codes generated
- [ ] Each code can bypass TOTP once
- [ ] Codes stored hashed
- [ ] User can regenerate codes

### AC6: Frontend 2FA Setup Flow
- [ ] 2FA settings page
- [ ] Display QR code
- [ ] Manual key display
- [ ] Verification code input
- [ ] Recovery codes download/display
- [ ] Enable/disable toggle

### AC7: Login Flow with 2FA
- [ ] After password, show 2FA code input
- [ ] "Use recovery code" option
- [ ] "Remember this device" checkbox (30 days)

---

## 📝 Technical Notes

### 2FA Controller
```csharp
[ApiController]
[Route("api/users/me/2fa")]
[Authorize]
public class TwoFactorAuthController : ControllerBase
{
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly ILogger<TwoFactorAuthController> _logger;
    
    [HttpPost("enable")]
    [ProducesResponseType(typeof(Enable2FAResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<Enable2FAResponse>> Enable2FA()
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        var user = await _userManager.FindByIdAsync(userId);
        
        if (user == null)
            return NotFound();
        
        if (user.TwoFactorEnabled)
            return BadRequest(new { message = "2FA already enabled" });
        
        // Generate authenticator key
        var unformattedKey = await _userManager.GetAuthenticatorKeyAsync(user);
        
        if (string.IsNullOrEmpty(unformattedKey))
        {
            await _userManager.ResetAuthenticatorKeyAsync(user);
            unformattedKey = await _userManager.GetAuthenticatorKeyAsync(user);
        }
        
        // Format key for display
        var formattedKey = FormatKey(unformattedKey);
        
        // Generate QR code
        var qrCodeUrl = $"otpauth://totp/QuranApps:{user.Email}?secret={unformattedKey}&issuer=QuranAppsDirectory";
        var qrCodeBase64 = GenerateQRCode(qrCodeUrl);
        
        return Ok(new Enable2FAResponse
        {
            ManualEntryKey = formattedKey,
            QRCodeBase64 = qrCodeBase64
        });
    }
    
    [HttpPost("verify")]
    [ProducesResponseType(typeof(Verify2FAResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<Verify2FAResponse>> Verify2FA([FromBody] Verify2FADto dto)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        var user = await _userManager.FindByIdAsync(userId);
        
        if (user == null)
            return NotFound();
        
        // Verify the TOTP code
        var isValid = await _userManager.VerifyTwoFactorTokenAsync(
            user,
            _userManager.Options.Tokens.AuthenticatorTokenProvider,
            dto.Code);
        
        if (!isValid)
            return BadRequest(new { message = "Invalid verification code" });
        
        // Enable 2FA
        await _userManager.SetTwoFactorEnabledAsync(user, true);
        
        // Generate recovery codes
        var recoveryCodes = await _userManager.GenerateNewTwoFactorRecoveryCodesAsync(user, 10);
        
        _logger.LogInformation("User {UserId} enabled 2FA", user.Id);
        
        return Ok(new Verify2FAResponse
        {
            RecoveryCodes = recoveryCodes.ToList(),
            Message = "2FA enabled successfully. Save these recovery codes in a safe place."
        });
    }
    
    [HttpPost("disable")]
    public async Task<IActionResult> Disable2FA([FromBody] Disable2FADto dto)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        var user = await _userManager.FindByIdAsync(userId);
        
        if (user == null)
            return NotFound();
        
        // Verify password
        var passwordValid = await _userManager.CheckPasswordAsync(user, dto.Password);
        if (!passwordValid)
            return Unauthorized(new { message = "Invalid password" });
        
        // Verify current TOTP code
        var codeValid = await _userManager.VerifyTwoFactorTokenAsync(
            user,
            _userManager.Options.Tokens.AuthenticatorTokenProvider,
            dto.Code);
        
        if (!codeValid)
            return BadRequest(new { message = "Invalid verification code" });
        
        // Disable 2FA
        await _userManager.SetTwoFactorEnabledAsync(user, false);
        await _userManager.ResetAuthenticatorKeyAsync(user);
        
        _logger.LogWarning("User {UserId} disabled 2FA", user.Id);
        
        return Ok(new { message = "2FA disabled successfully" });
    }
    
    [HttpPost("regenerate-codes")]
    [ProducesResponseType(typeof(RegenerateCodesResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<RegenerateCodesResponse>> RegenerateRecoveryCodes()
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        var user = await _userManager.FindByIdAsync(userId);
        
        if (user == null)
            return NotFound();
        
        if (!user.TwoFactorEnabled)
            return BadRequest(new { message = "2FA not enabled" });
        
        var recoveryCodes = await _userManager.GenerateNewTwoFactorRecoveryCodesAsync(user, 10);
        
        return Ok(new RegenerateCodesResponse
        {
            RecoveryCodes = recoveryCodes.ToList()
        });
    }
    
    private string FormatKey(string unformattedKey)
    {
        var result = new StringBuilder();
        int currentPosition = 0;
        while (currentPosition + 4 < unformattedKey.Length)
        {
            result.Append(unformattedKey.AsSpan(currentPosition, 4)).Append(' ');
            currentPosition += 4;
        }
        if (currentPosition < unformattedKey.Length)
        {
            result.Append(unformattedKey.AsSpan(currentPosition));
        }
        
        return result.ToString().ToLowerInvariant();
    }
    
    private string GenerateQRCode(string url)
    {
        using var qrGenerator = new QRCodeGenerator();
        var qrCodeData = qrGenerator.CreateQrCode(url, QRCodeGenerator.ECCLevel.Q);
        using var qrCode = new PngByteQRCode(qrCodeData);
        var qrCodeImage = qrCode.GetGraphic(20);
        
        return Convert.ToBase64String(qrCodeImage);
    }
}
```

### Modified Auth Controller (Login with 2FA)
```csharp
[HttpPost("login")]
public async Task<ActionResult<AuthResponse>> Login([FromBody] LoginDto dto)
{
    var user = await _userManager.FindByEmailAsync(dto.Email);
    
    if (user == null)
        return Unauthorized(new { message = "Invalid credentials" });
    
    var result = await _signInManager.CheckPasswordSignInAsync(
        user, dto.Password, lockoutOnFailure: true);
    
    if (!result.Succeeded)
        return Unauthorized(new { message = "Invalid credentials" });
    
    // Check if 2FA is enabled
    if (user.TwoFactorEnabled)
    {
        // Generate a temporary session token
        var sessionToken = Guid.NewGuid().ToString();
        
        // Store session temporarily (use distributed cache)
        await _cache.SetStringAsync(
            $"2fa_session_{sessionToken}",
            user.Id.ToString(),
            new DistributedCacheEntryOptions
            {
                AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(5)
            });
        
        return Ok(new
        {
            requires2FA = true,
            sessionToken
        });
    }
    
    // No 2FA, proceed with normal login
    var authResponse = await _tokenService.GenerateTokenAsync(user);
    return Ok(authResponse);
}

[HttpPost("verify-2fa")]
public async Task<ActionResult<AuthResponse>> Verify2FA([FromBody] Verify2FALoginDto dto)
{
    // Retrieve user ID from session token
    var userIdStr = await _cache.GetStringAsync($"2fa_session_{dto.SessionToken}");
    
    if (string.IsNullOrEmpty(userIdStr))
        return Unauthorized(new { message = "Invalid or expired session" });
    
    var user = await _userManager.FindByIdAsync(userIdStr);
    
    if (user == null)
        return NotFound();
    
    bool isValid = false;
    
    // Try TOTP code first
    if (!string.IsNullOrEmpty(dto.Code))
    {
        isValid = await _userManager.VerifyTwoFactorTokenAsync(
            user,
            _userManager.Options.Tokens.AuthenticatorTokenProvider,
            dto.Code);
    }
    
    // If TOTP failed, try recovery code
    if (!isValid && !string.IsNullOrEmpty(dto.RecoveryCode))
    {
        isValid = (await _userManager.RedeemTwoFactorRecoveryCodeAsync(user, dto.RecoveryCode))
            .Succeeded;
    }
    
    if (!isValid)
        return Unauthorized(new { message = "Invalid code" });
    
    // Remove session token
    await _cache.RemoveAsync($"2fa_session_{dto.SessionToken}");
    
    // Update last login
    user.LastLoginAt = DateTime.UtcNow;
    await _userManager.UpdateAsync(user);
    
    // Generate JWT
    var authResponse = await _tokenService.GenerateTokenAsync(user);
    
    return Ok(authResponse);
}
```

### NuGet Packages
```xml
<PackageReference Include="QRCoder" Version="1.4.3" />
```

---

## 🔗 Dependencies
- US8.2: JWT Auth Endpoints
- US8.4: User Profile Management

---

## 📊 Definition of Done
- [ ] 2FA enable/disable endpoints working
- [ ] QR code generation working
- [ ] TOTP verification working
- [ ] Recovery codes generated and validated
- [ ] Login flow with 2FA complete
- [ ] Frontend 2FA setup UI complete
- [ ] Security tested
- [ ] Documentation complete

---

**Created:** October 6, 2025  
**Owner:** Abubakr Abduraghman, a.abduraghman@itqan.dev  
**Epic:** [Epic 8: User Accounts & Personalization](../epics/epic-8-user-accounts-personalization.md)
