# US2.5: Implement Basic Authentication and Security Middleware

**Epic:** Epic 2 - Backend Infrastructure Setup  
**Sprint:** Week 1, Day 5  
**Story Points:** 5  
**Priority:** P1  
**Assigned To:** Backend Developer  
**Status:** Not Started

---

## 📋 User Story

**As a** Backend Developer  
**I want to** implement JWT authentication and security middleware  
**So that** the API is protected from unauthorized access and common security vulnerabilities

---

## 🎯 Acceptance Criteria

### AC1: JWT Authentication Setup
- [ ] JWT Bearer authentication configured:
  ```csharp
  builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
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
                  Encoding.UTF8.GetBytes(builder.Configuration["Jwt:SecretKey"]!))
          };
      });
  ```
- [ ] JWT token generation service created
- [ ] Token expiration set (15 minutes for access, 7 days for refresh)

### AC2: Rate Limiting
- [ ] AspNetCoreRateLimit 5.0.0 installed and configured
- [ ] Rate limits defined:
  - Anonymous: 100 requests/hour
  - Authenticated: 1000 requests/hour
- [ ] Rate limit headers added to responses

### AC3: Global Exception Handler
- [ ] Exception handling middleware implemented
- [ ] Consistent error responses returned
- [ ] Sensitive information hidden in production
- [ ] Errors logged with Serilog

### AC4: Security Headers
- [ ] HTTPS enforcement (HSTS)
- [ ] X-Content-Type-Options: nosniff
- [ ] X-Frame-Options: DENY
- [ ] X-XSS-Protection: 1; mode=block
- [ ] Content-Security-Policy configured

### AC5: Input Validation
- [ ] FluentValidation integrated
- [ ] Model state validation automatic
- [ ] Custom validators for business rules
- [ ] Validation error responses standardized

### AC6: CORS Security
- [ ] CORS policy restricts to known origins only
- [ ] Credentials allowed only for trusted origins
- [ ] Preflight cache configured

---

## 📝 Technical Notes

### JWT Service
```csharp
public interface IJwtService
{
    string GenerateAccessToken(Guid userId, string email, List<string> roles);
    string GenerateRefreshToken();
    ClaimsPrincipal? ValidateToken(string token);
}

public class JwtService : IJwtService
{
    public string GenerateAccessToken(Guid userId, string email, List<string> roles)
    {
        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, userId.ToString()),
            new(ClaimTypes.Email, email),
            new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
        };
        
        claims.AddRange(roles.Select(role => new Claim(ClaimTypes.Role, role)));
        
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_configuration["Jwt:SecretKey"]!));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        
        var token = new JwtSecurityToken(
            issuer: _configuration["Jwt:Issuer"],
            audience: _configuration["Jwt:Audience"],
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(15),
            signingCredentials: creds);
        
        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
```

### Exception Handler Middleware
```csharp
public class GlobalExceptionHandlerMiddleware
{
    public async Task InvokeAsync(HttpContext context, RequestDelegate next)
    {
        try
        {
            await next(context);
        }
        catch (Exception ex)
        {
            await HandleExceptionAsync(context, ex);
        }
    }
    
    private static async Task HandleExceptionAsync(HttpContext context, Exception exception)
    {
        context.Response.ContentType = "application/json";
        
        var response = exception switch
        {
            NotFoundException => (StatusCodes.Status404NotFound, "Resource not found"),
            ValidationException => (StatusCodes.Status400BadRequest, "Validation failed"),
            UnauthorizedException => (StatusCodes.Status401Unauthorized, "Unauthorized"),
            _ => (StatusCodes.Status500InternalServerError, "Internal server error")
        };
        
        context.Response.StatusCode = response.Item1;
        
        await context.Response.WriteAsJsonAsync(new
        {
            error = new
            {
                message = response.Item2,
                details = exception.Message,
                traceId = Activity.Current?.Id ?? context.TraceIdentifier
            }
        });
    }
}
```

---

## 🔗 Dependencies
- US2.3: Create ASP.NET Core API

---

## 📊 Definition of Done
- [ ] JWT authentication working
- [ ] Rate limiting functional
- [ ] Exception handling tested
- [ ] Security headers verified
- [ ] All middleware tested
- [ ] Security audit passed

---

**Created:** October 6, 2025  
**Owner:** Abubakr Abduraghman, a.abduraghman@itqan.dev  
**Epic:** [Epic 2: Backend Infrastructure Setup](../epics/epic-2-backend-infrastructure-setup.md)

