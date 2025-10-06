# US15.1-15.5: Complete Public API & Integrations System

**Epic:** Epic 15 - Public API & Integrations  
**Sprint:** Week 15, Day 1-4  
**Story Points:** 20 (combined)  
**Priority:** P2  
**Assigned To:** Backend + DevRel Team  
**Status:** Not Started

---

## 📋 Combined User Stories

Complete public API system including API key management, rate limiting, public endpoints, documentation portal, and SDK development.

---

## 🎯 Combined Acceptance Criteria

### API Key Management (AC1-AC6)
- [ ] ApiKey entity (Key, UserId, Name, CreatedAt, LastUsed, IsActive)
- [ ] POST /api/developers/api-keys (create)
- [ ] GET /api/developers/api-keys (list own keys)
- [ ] DELETE /api/developers/api-keys/{id} (revoke)
- [ ] API key hashing (don't store plain text)
- [ ] Key regeneration feature

### Rate Limiting System (AC7-AC12)
- [ ] AspNetCoreRateLimit integration
- [ ] Tiered rate limits (Free: 100/hr, Pro: 1000/hr, Enterprise: 10000/hr)
- [ ] Rate limit headers in responses (X-RateLimit-Limit, X-RateLimit-Remaining)
- [ ] HTTP 429 when exceeded
- [ ] Redis-based rate limiting (distributed)
- [ ] Admin endpoint to adjust limits

### Public API Endpoints (AC13-AC18)
- [ ] GET /api/public/v1/apps (list apps, read-only)
- [ ] GET /api/public/v1/apps/{id} (app details)
- [ ] GET /api/public/v1/apps/search (search apps)
- [ ] GET /api/public/v1/categories (list categories)
- [ ] GET /api/public/v1/developers/{id} (developer profile)
- [ ] All endpoints require API key

### API Documentation Portal (AC19-AC24)
- [ ] Swagger/OpenAPI spec for public API
- [ ] Developer portal at /developers/docs
- [ ] Interactive API explorer
- [ ] Authentication guide
- [ ] Code examples (cURL, JavaScript, Python)
- [ ] Changelog and versioning info

### SDK Development (AC25-AC30)
- [ ] TypeScript/JavaScript SDK
- [ ] Auto-generated from OpenAPI spec
- [ ] npm package published
- [ ] Python SDK (optional)
- [ ] SDK examples and documentation
- [ ] SDK versioning strategy

---

## 📝 Technical Implementation

### API Key Entity
```csharp
public class ApiKey
{
    public Guid Id { get; set; }
    
    [Required]
    public Guid UserId { get; set; }
    
    [Required]
    [MaxLength(100)]
    public string Name { get; set; }
    
    [Required]
    public string KeyHash { get; set; } // Store hashed, never plain text
    
    [MaxLength(10)]
    public string KeyPrefix { get; set; } // First 8 chars for identification
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? LastUsedAt { get; set; }
    
    public bool IsActive { get; set; } = true;
    
    [MaxLength(50)]
    public string Tier { get; set; } = "Free"; // Free, Pro, Enterprise
    
    // Navigation
    public ApplicationUser User { get; set; }
    public ICollection<ApiUsageLog> UsageLogs { get; set; }
}

public class ApiUsageLog
{
    public Guid Id { get; set; }
    public Guid ApiKeyId { get; set; }
    public string Endpoint { get; set; }
    public string Method { get; set; }
    public int StatusCode { get; set; }
    public DateTime Timestamp { get; set; }
    
    // Navigation
    public ApiKey ApiKey { get; set; }
}
```

### API Key Management Controller
```csharp
[ApiController]
[Route("api/developers/api-keys")]
[Authorize(Roles = "Developer")]
public class ApiKeysController : ControllerBase
{
    private readonly IApiKeyService _apiKeyService;
    
    [HttpPost]
    [ProducesResponseType(typeof(CreateApiKeyResponse), StatusCodes.Status201Created)]
    public async Task<ActionResult<CreateApiKeyResponse>> CreateApiKey(
        [FromBody] CreateApiKeyDto dto)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        
        // Generate API key
        var apiKey = GenerateApiKey();
        var keyHash = HashApiKey(apiKey);
        var keyPrefix = apiKey.Substring(0, 8);
        
        var apiKeyEntity = new ApiKey
        {
            Id = Guid.NewGuid(),
            UserId = Guid.Parse(userId),
            Name = dto.Name,
            KeyHash = keyHash,
            KeyPrefix = keyPrefix,
            Tier = "Free",
            CreatedAt = DateTime.UtcNow,
            IsActive = true
        };
        
        await _context.ApiKeys.AddAsync(apiKeyEntity);
        await _context.SaveChangesAsync();
        
        // Return plain key ONLY this once
        return CreatedAtAction(nameof(GetApiKeys), new CreateApiKeyResponse
        {
            Id = apiKeyEntity.Id,
            Name = apiKeyEntity.Name,
            Key = apiKey, // Only time this is shown
            KeyPrefix = keyPrefix,
            CreatedAt = apiKeyEntity.CreatedAt,
            Message = "Save this key securely. You won't see it again!"
        });
    }
    
    [HttpGet]
    public async Task<ActionResult<List<ApiKeyDto>>> GetApiKeys()
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        
        var keys = await _context.ApiKeys
            .Where(k => k.UserId == Guid.Parse(userId))
            .Select(k => new ApiKeyDto
            {
                Id = k.Id,
                Name = k.Name,
                KeyPrefix = k.KeyPrefix,
                IsActive = k.IsActive,
                CreatedAt = k.CreatedAt,
                LastUsedAt = k.LastUsedAt,
                Tier = k.Tier
            })
            .ToListAsync();
        
        return Ok(keys);
    }
    
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> RevokeApiKey(Guid id)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        
        var apiKey = await _context.ApiKeys
            .FirstOrDefaultAsync(k => k.Id == id && k.UserId == Guid.Parse(userId));
        
        if (apiKey == null)
            return NotFound();
        
        apiKey.IsActive = false;
        await _context.SaveChangesAsync();
        
        return NoContent();
    }
    
    private string GenerateApiKey()
    {
        const string prefix = "qad_"; // Quran Apps Directory
        var randomBytes = new byte[32];
        using (var rng = RandomNumberGenerator.Create())
        {
            rng.GetBytes(randomBytes);
        }
        return prefix + Convert.ToBase64String(randomBytes).Replace("+", "").Replace("/", "");
    }
    
    private string HashApiKey(string apiKey)
    {
        using var sha256 = SHA256.Create();
        var bytes = Encoding.UTF8.GetBytes(apiKey);
        var hash = sha256.ComputeHash(bytes);
        return Convert.ToBase64String(hash);
    }
}
```

### API Key Authentication Middleware
```csharp
public class ApiKeyAuthenticationMiddleware
{
    private readonly RequestDelegate _next;
    
    public async Task InvokeAsync(
        HttpContext context,
        ApplicationDbContext dbContext)
    {
        // Only check API key for /api/public/* routes
        if (!context.Request.Path.StartsWithSegments("/api/public"))
        {
            await _next(context);
            return;
        }
        
        if (!context.Request.Headers.TryGetValue("X-API-Key", out var apiKeyHeader))
        {
            context.Response.StatusCode = 401;
            await context.Response.WriteAsJsonAsync(new { error = "API Key missing" });
            return;
        }
        
        var apiKey = apiKeyHeader.ToString();
        var keyHash = HashApiKey(apiKey);
        
        var apiKeyEntity = await dbContext.ApiKeys
            .FirstOrDefaultAsync(k => k.KeyHash == keyHash && k.IsActive);
        
        if (apiKeyEntity == null)
        {
            context.Response.StatusCode = 401;
            await context.Response.WriteAsJsonAsync(new { error = "Invalid API Key" });
            return;
        }
        
        // Update last used
        apiKeyEntity.LastUsedAt = DateTime.UtcNow;
        await dbContext.SaveChangesAsync();
        
        // Set user context
        context.Items["ApiKeyId"] = apiKeyEntity.Id;
        context.Items["UserId"] = apiKeyEntity.UserId;
        
        await _next(context);
    }
    
    private string HashApiKey(string apiKey)
    {
        using var sha256 = SHA256.Create();
        var bytes = Encoding.UTF8.GetBytes(apiKey);
        var hash = sha256.ComputeHash(bytes);
        return Convert.ToBase64String(hash);
    }
}
```

### Rate Limiting Configuration
```csharp
// appsettings.json
{
  "IpRateLimiting": {
    "EnableEndpointRateLimiting": true,
    "StackBlockedRequests": false,
    "RealIpHeader": "X-Real-IP",
    "ClientIdHeader": "X-API-Key",
    "HttpStatusCode": 429,
    "GeneralRules": [
      {
        "Endpoint": "GET:/api/public/*",
        "Period": "1h",
        "Limit": 100
      }
    ]
  }
}

// Program.cs
builder.Services.AddMemoryCache();
builder.Services.Configure<IpRateLimitOptions>(
    builder.Configuration.GetSection("IpRateLimiting"));
builder.Services.AddSingleton<IIpPolicyStore, MemoryCacheIpPolicyStore>();
builder.Services.AddSingleton<IRateLimitCounterStore, MemoryCacheRateLimitCounterStore>();
builder.Services.AddSingleton<IRateLimitConfiguration, RateLimitConfiguration>();
builder.Services.AddSingleton<IProcessingStrategy, AsyncKeyLockProcessingStrategy>();

app.UseIpRateLimiting();
```

### Public API Controller
```csharp
[ApiController]
[Route("api/public/v1")]
[ApiVersion("1.0")]
public class PublicApiController : ControllerBase
{
    [HttpGet("apps")]
    [ProducesResponseType(typeof(PagedResult<PublicAppDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<PagedResult<PublicAppDto>>> GetApps(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        if (pageSize > 100) pageSize = 100;
        
        var apps = await _appsService.GetPublicAppsAsync(page, pageSize);
        
        // Add rate limit headers
        AddRateLimitHeaders();
        
        return Ok(apps);
    }
    
    [HttpGet("apps/{id:guid}")]
    [ProducesResponseType(typeof(PublicAppDetailDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<PublicAppDetailDto>> GetApp(Guid id)
    {
        var app = await _appsService.GetPublicAppByIdAsync(id);
        
        if (app == null)
            return NotFound();
        
        AddRateLimitHeaders();
        
        return Ok(app);
    }
    
    [HttpGet("apps/search")]
    public async Task<ActionResult<SearchResult<PublicAppDto>>> SearchApps(
        [FromQuery] string q,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        var results = await _searchService.SearchPublicAppsAsync(q, page, pageSize);
        
        AddRateLimitHeaders();
        
        return Ok(results);
    }
    
    private void AddRateLimitHeaders()
    {
        var apiKeyId = (Guid)HttpContext.Items["ApiKeyId"];
        var remaining = GetRemainingRequests(apiKeyId);
        
        Response.Headers.Add("X-RateLimit-Limit", "100");
        Response.Headers.Add("X-RateLimit-Remaining", remaining.ToString());
        Response.Headers.Add("X-RateLimit-Reset", GetResetTime().ToString());
    }
}
```

### TypeScript SDK
```typescript
// quran-apps-sdk.ts
export class QuranAppsClient {
  private baseUrl: string;
  private apiKey: string;
  
  constructor(apiKey: string, baseUrl = 'https://api.quran-apps.itqan.dev') {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }
  
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'X-API-Key': this.apiKey,
        'Content-Type': 'application/json',
        ...options.headers
      }
    });
    
    if (!response.ok) {
      if (response.status === 429) {
        throw new Error('Rate limit exceeded');
      }
      throw new Error(`API Error: ${response.statusText}`);
    }
    
    return response.json();
  }
  
  async getApps(page = 1, pageSize = 20): Promise<PagedResult<App>> {
    return this.request<PagedResult<App>>(
      `/api/public/v1/apps?page=${page}&pageSize=${pageSize}`
    );
  }
  
  async getApp(id: string): Promise<App> {
    return this.request<App>(`/api/public/v1/apps/${id}`);
  }
  
  async searchApps(query: string, page = 1, pageSize = 20): Promise<SearchResult<App>> {
    return this.request<SearchResult<App>>(
      `/api/public/v1/apps/search?q=${encodeURIComponent(query)}&page=${page}&pageSize=${pageSize}`
    );
  }
}

// Usage example
const client = new QuranAppsClient('qad_your_api_key_here');

const apps = await client.getApps(1, 10);
console.log(apps);
```

### Developer Documentation Portal
```typescript
@Component({
  selector: 'app-api-docs',
  template: `
    <div class="docs-portal">
      <h1>API Documentation</h1>
      
      <mat-tab-group>
        <mat-tab label="Getting Started">
          <div class="doc-content">
            <h2>Getting Started</h2>
            <p>Get an API key from your <a routerLink="/developer/api-keys">developer dashboard</a>.</p>
            
            <h3>Authentication</h3>
            <pre><code>curl -H "X-API-Key: your_api_key_here" https://api.quran-apps.itqan.dev/api/public/v1/apps</code></pre>
          </div>
        </mat-tab>
        
        <mat-tab label="API Reference">
          <swagger-ui [url]="swaggerUrl"></swagger-ui>
        </mat-tab>
        
        <mat-tab label="Code Examples">
          <mat-accordion>
            <mat-expansion-panel>
              <mat-expansion-panel-header>JavaScript</mat-expansion-panel-header>
              <pre><code>{{ jsExample }}</code></pre>
            </mat-expansion-panel>
            
            <mat-expansion-panel>
              <mat-expansion-panel-header>Python</mat-expansion-panel-header>
              <pre><code>{{ pythonExample }}</code></pre>
            </mat-expansion-panel>
          </mat-accordion>
        </mat-tab>
        
        <mat-tab label="Rate Limits">
          <div class="doc-content">
            <h2>Rate Limits</h2>
            <table>
              <tr>
                <th>Tier</th>
                <th>Requests per hour</th>
              </tr>
              <tr>
                <td>Free</td>
                <td>100</td>
              </tr>
              <tr>
                <td>Pro</td>
                <td>1,000</td>
              </tr>
              <tr>
                <td>Enterprise</td>
                <td>10,000</td>
              </tr>
            </table>
          </div>
        </mat-tab>
      </mat-tab-group>
    </div>
  `
})
export class ApiDocsComponent {
  swaggerUrl = 'https://api.quran-apps.itqan.dev/swagger/v1/swagger.json';
  
  jsExample = `
const QuranApps = require('quran-apps-sdk');
const client = new QuranApps.Client('your_api_key');

const apps = await client.getApps();
console.log(apps);
  `;
  
  pythonExample = `
import quran_apps

client = quran_apps.Client('your_api_key')
apps = client.get_apps()
print(apps)
  `;
}
```

---

## 🔗 Dependencies
- US11.1: Developer profiles
- AspNetCoreRateLimit package
- Swagger/OpenAPI setup

---

## 📊 Definition of Done
- [ ] API key management complete
- [ ] Rate limiting working (tiered)
- [ ] Public API endpoints functional
- [ ] API key authentication middleware working
- [ ] Documentation portal complete
- [ ] TypeScript SDK published to npm
- [ ] Code examples in docs
- [ ] Swagger/OpenAPI spec generated
- [ ] Unit tests for API endpoints
- [ ] Integration tests pass

---

**Created:** October 6, 2025  
**Owner:** Abubakr Abduraghman, a.abduraghman@itqan.dev  
**Epic:** [Epic 15: Public API & Integrations](../epics/epic-15-public-api-integrations.md)
