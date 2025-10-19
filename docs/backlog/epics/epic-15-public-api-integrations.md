# Epic 15: Public API & Integrations

## 📋 Epic Overview
Create a public API with authentication, documentation, and SDKs enabling third-party developers to integrate Quran Apps Directory data into their applications.

## 🎯 Goal
Expand the ecosystem by enabling third-party integrations, increasing platform reach and establishing the directory as the standard data source for Quran apps.

## 📊 Success Metrics
- 50+ API keys issued in first 6 months
- 10+ third-party integrations launched
- API uptime >99.9%
- Average response time <100ms
- Developer satisfaction score >8/10
- API documentation clarity >90%

## 🏗️ Technical Scope (Django)
- API key generation and management
- Rate limiting per API key
- Public API endpoints (read-only initially)
- Comprehensive API documentation (drf-spectacular)
- API usage analytics
- Webhook system for updates
- TypeScript/JavaScript SDK
- Developer portal for API management

## 🔗 Dependencies
- Epic 4: Core API infrastructure
- Epic 11: Developer portal (extend for API keys)

## 📈 Business Value
- High: Ecosystem expansion
- Impact: Increases platform authority
- Effort: 2-3 days for MVP

## ✅ Definition of Done
- API key system operational
- Rate limiting enforced
- Public API documented
- SDKs published (npm, pip)
- Developer portal shows API usage
- Webhooks functional
- Example integrations created

## Related Stories
- US15.1: API Key Management System
- US15.2: Public API Endpoints
- US15.3: API Documentation Portal
- US15.4: TypeScript/JavaScript SDK
- US15.5: Webhook System

## Django Implementation Details
### Entity Models
```python
public class ApiKey
{
    public Guid Id { get; set; }
    public string Key { get; set; } = string.Empty; // Generated key
    public string Name { get; set; } = string.Empty; // Descriptive name
    public Guid DeveloperId { get; set; }
    public bool IsActive { get; set; } = true;
    public int RateLimitPerHour { get; set; } = 1000;
    public int RateLimitPerDay { get; set; } = 10000;
    public List<string> AllowedOrigins { get; set; } = new();
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? LastUsedAt { get; set; }
    public DateTime? ExpiresAt { get; set; }
    
    public DeveloperProfile Developer { get; set; } = null!;
    public ICollection<ApiUsage> ApiUsages { get; set; } = new List<ApiUsage>();
}

public class ApiUsage
{
    public Guid Id { get; set; }
    public Guid ApiKeyId { get; set; }
    public string Endpoint { get; set; } = string.Empty;
    public string Method { get; set; } = string.Empty;
    public int StatusCode { get; set; }
    public int ResponseTimeMs { get; set; }
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
    
    public ApiKey ApiKey { get; set; } = null!;
}

public class Webhook
{
    public Guid Id { get; set; }
    public Guid DeveloperId { get; set; }
    public string Url { get; set; } = string.Empty;
    public List<WebhookEvent> Events { get; set; } = new(); // ["app.created", "app.updated"]
    public string? Secret { get; set; } // For signature verification
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? LastTriggeredAt { get; set; }
    
    public DeveloperProfile Developer { get; set; } = null!;
}

public enum WebhookEvent
{
    AppCreated,
    AppUpdated,
    AppDeleted,
    ReviewCreated
}
```

### API Key Middleware
```python
public class ApiKeyAuthenticationMiddleware
{
    
    public async Task InvokeAsync(HttpContext context, ApplicationDbContext dbContext)
    {
        // Only apply to public API routes
        if (!context.Request.Path.StartsWithSegments("/api/public"))
        {
            await _next(context);
            return;
        }
        
        if (!context.Request.Headers.TryGetValue("X-API-Key", out var apiKeyHeader))
        {
            context.Response.StatusCode = 401;
            await context.Response.WriteAsJsonAsync(new { error = "API key required" });
            return;
        }
        
        var apiKey = await dbContext.ApiKeys
            .Include(k => k.Developer)
            .FirstOrDefaultAsync(k => k.Key == apiKeyHeader && k.IsActive);
        
        if (apiKey == null || (apiKey.ExpiresAt.HasValue && apiKey.ExpiresAt < DateTime.UtcNow))
        {
            context.Response.StatusCode = 401;
            await context.Response.WriteAsJsonAsync(new { error = "Invalid or expired API key" });
            return;
        }
        
        // Check rate limiting
        var hourlyUsage = await dbContext.ApiUsages
            .CountAsync(u => u.ApiKeyId == apiKey.Id && 
                            u.Timestamp > DateTime.UtcNow.AddHours(-1));
        
        if (hourlyUsage >= apiKey.RateLimitPerHour)
        {
            context.Response.StatusCode = 429;
            await context.Response.WriteAsJsonAsync(new { error = "Rate limit exceeded" });
            return;
        }
        
        // Add API key to context for logging
        context.Items["ApiKey"] = apiKey;
        
        // Track last used
        apiKey.LastUsedAt = DateTime.UtcNow;
        await dbContext.SaveChangesAsync();
        
        await _next(context);
    }
}

// Register in Program.cs
app.UseMiddleware<ApiKeyAuthenticationMiddleware>();
```

### Public API ViewSet
```python
[ApiViewSet]
public class PublicApiViewSet : ViewSetBase
{
    
    public async Task<Response<PaginatedResponse<AppResponse>>> GetApps(
    {
        var apps = await _appsService.GetAppsAsync(request);
        return Ok(apps);
    }
    
    public async Task<Response<AppResponse>> GetApp(Guid id)
    {
        var app = await _appsService.GetAppByIdAsync(id);
        return app == null ? NotFound() : Ok(app);
    }
    
    public async Task<Response<List<CategoryResponse>>> GetCategories()
    {
        var categories = await _appsService.GetCategoriesAsync();
        return Ok(categories);
    }
    
    public async Task<Response<PaginatedResponse<DeveloperResponse>>> GetDevelopers(
    {
        var developers = await _appsService.GetDevelopersAsync(page, pageSize);
        return Ok(developers);
    }
}
```

### API Key Management ViewSet
```python
[ApiViewSet]
public class ApiKeysViewSet : ViewSetBase
{
    
    public async Task<Response<List<ApiKeyResponse>>> GetMyApiKeys()
    {
        var developerId = GetUserId();
        var keys = await _apiKeyService.GetDeveloperApiKeysAsync(developerId);
        return Ok(keys);
    }
    
    {
        var developerId = GetUserId();
        var apiKey = await _apiKeyService.CreateApiKeyAsync(developerId, request);
        return CreatedAtAction(nameof(GetApiKey), new { id = apiKey.Id }, apiKey);
    }
    
    public async Task<Response<ApiKeyResponse>> GetApiKey(Guid id)
    {
        var developerId = GetUserId();
        var apiKey = await _apiKeyService.GetApiKeyAsync(id, developerId);
        return apiKey == null ? NotFound() : Ok(apiKey);
    }
    
    public async Task<IResponse> RevokeApiKey(Guid id)
    {
        var developerId = GetUserId();
        await _apiKeyService.RevokeApiKeyAsync(id, developerId);
        return NoContent();
    }
    
    public async Task<Response<ApiUsageStats>> GetApiKeyUsage(
        Guid id,
    {
        var developerId = GetUserId();
        var usage = await _apiKeyService.GetApiKeyUsageAsync(
            id,
            developerId,
            startDate ?? DateTime.UtcNow.AddDays(-30),
            endDate ?? DateTime.UtcNow
        );
        return Ok(usage);
    }
}
```

### API Key Service
```python
public class ApiKeyService : IApiKeyService
{
    public async Task<ApiKeyResponse> CreateApiKeyAsync(Guid developerId, CreateApiKeyRequest request)
    {
        var key = GenerateApiKey();
        
        var apiKey = new ApiKey
        {
            Key = key,
            Name = request.Name,
            DeveloperId = developerId,
            RateLimitPerHour = request.RateLimitPerHour ?? 1000,
            RateLimitPerDay = request.RateLimitPerDay ?? 10000,
            AllowedOrigins = request.AllowedOrigins ?? new List<string>(),
            ExpiresAt = request.ExpiresInDays.HasValue 
                ? DateTime.UtcNow.AddDays(request.ExpiresInDays.Value) 
                : null
        };
        
        _context.ApiKeys.Add(apiKey);
        await _context.SaveChangesAsync();
        
        return new ApiKeyResponse
        {
            Id = apiKey.Id,
            Key = apiKey.Key, // Only return key on creation
            Name = apiKey.Name,
            RateLimitPerHour = apiKey.RateLimitPerHour,
            CreatedAt = apiKey.CreatedAt,
            ExpiresAt = apiKey.ExpiresAt
        };
    }
    
    private string GenerateApiKey()
    {
        var bytes = new byte[32];
        using var rng = RandomNumberGenerator.Create();
        rng.GetBytes(bytes);
        return $"qad_{Convert.ToBase64String(bytes).Replace("/", "_").Replace("+", "-")}";
    }
}
```

### Webhook System
```python
public class WebhookService : IWebhookService
{
    
    public async Task TriggerWebhookAsync(WebhookEvent eventType, object payload)
    {
        var webhooks = await _context.Webhooks
            .Where(w => w.IsActive && w.Events.Contains(eventType))
            .ToListAsync();
        
        foreach (var webhook in webhooks)
        {
            _ = Task.Run(async () =>
            {
                try
                {
                    var jsonPayload = JsonSerializer.Serialize(new
                    {
                        eventType = eventType.ToString(),
                        timestamp = DateTime.UtcNow,
                        data = payload
                    });
                    
                    var content = new StringContent(jsonPayload, Encoding.UTF8, "application/json");
                    
                    // Add signature if secret is configured
                    if (!string.IsNullOrEmpty(webhook.Secret))
                    {
                        var signature = GenerateSignature(jsonPayload, webhook.Secret);
                        _httpClient.DefaultRequestHeaders.Add("X-Webhook-Signature", signature);
                    }
                    
                    var response = await _httpClient.PostAsync(webhook.Url, content);
                    
                    webhook.LastTriggeredAt = DateTime.UtcNow;
                    await _context.SaveChangesAsync();
                    
                    if (!response.IsSuccessStatusCode)
                    {
                        // Log webhook failure
                    }
                }
                catch (Exception ex)
                {
                    // Log webhook error
                }
            });
        }
    }
    
    private string GenerateSignature(string payload, string secret)
    {
        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(secret));
        var hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(payload));
        return Convert.ToBase64String(hash);
    }
}
```

### TypeScript SDK
```typescript
// quran-apps-sdk/src/index.ts
export class QuranAppsClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  
  constructor(apiKey: string, baseUrl: string = 'https://api.quran-apps.itqan.dev') {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }
  
  async getApps(params?: GetAppsParams): Promise<PaginatedResponse<App>> {
    const query = new URLSearchParams(params as any).toString();
    const response = await fetch(`${this.baseUrl}/api/public/v1/apps?${query}`, {
      headers: { 'X-API-Key': this.apiKey }
    });
    
    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }
    
    return response.json();
  }
  
  async getApp(id: string): Promise<App> {
    const response = await fetch(`${this.baseUrl}/api/public/v1/apps/${id}`, {
      headers: { 'X-API-Key': this.apiKey }
    });
    
    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }
    
    return response.json();
  }
  
  async getCategories(): Promise<Category[]> {
    const response = await fetch(`${this.baseUrl}/api/public/v1/categories`, {
      headers: { 'X-API-Key': this.apiKey }
    });
    
    return response.json();
  }
}

// Usage example
const client = new QuranAppsClient('qad_your_api_key_here');
const apps = await client.getApps({ page: 1, pageSize: 10 });
```

## Priority
priority-2 (Phase 4 - Innovation)
