# US4.4: Implement Global Error Handling & Logging

**Epic:** Epic 4 - API Development & Integration  
**Sprint:** Week 3, Day 3-4  
**Story Points:** 5  
**Priority:** P1  
**Assigned To:** Backend Developer  
**Status:** Not Started

---

## 📋 User Story

**As a** Backend Developer  
**I want** centralized error handling and structured logging  
**So that** all API errors are handled consistently, security is maintained, and debugging is efficient

---

## 🎯 Acceptance Criteria

### AC1: Global Exception Handler Middleware
- [ ] Custom exception handler middleware created
- [ ] Catches all unhandled exceptions
- [ ] Returns standardized error responses
- [ ] Logs exceptions with full context
- [ ] Hides internal errors from clients (security)

### AC2: Standardized Error Response Format
- [ ] Consistent error response structure:
```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "errors": {
    "nameEn": ["Required field"],
    "rating": ["Must be between 0 and 5"]
  },
  "timestamp": "2025-10-06T10:30:00Z",
  "traceId": "uuid"
}
```
- [ ] HTTP status codes follow REST standards
- [ ] User-friendly error messages

### AC3: Structured Logging with Serilog
- [ ] Serilog configured with multiple sinks:
  - Console (Development)
  - File (All environments)
  - Seq or Application Insights (Production)
- [ ] Log levels: Debug, Info, Warning, Error, Fatal
- [ ] Structured logs with correlation IDs
- [ ] Request/response logging

### AC4: Request/Response Logging
- [ ] Middleware logs all HTTP requests:
  - Method, Path, Query params
  - Headers (excluding sensitive data)
  - User ID (if authenticated)
  - Execution time
- [ ] Response status codes logged
- [ ] Slow query detection (> 1 second)

### AC5: Exception Types & Handling
- [ ] Custom exception types:
  - `NotFoundException` → HTTP 404
  - `ValidationException` → HTTP 400
  - `UnauthorizedException` → HTTP 401
  - `ForbiddenException` → HTTP 403
  - `ConflictException` → HTTP 409
- [ ] Generic exceptions → HTTP 500

### AC6: Security Considerations
- [ ] Stack traces hidden in production
- [ ] Sensitive data redacted from logs (passwords, tokens)
- [ ] Database connection strings not logged
- [ ] GDPR-compliant (no PII in logs)

### AC7: Performance Monitoring
- [ ] Request duration tracked
- [ ] Slow endpoints identified (> 500ms)
- [ ] Database query performance logged
- [ ] Metrics for error rates

---

## 📝 Technical Notes

### Exception Handler Middleware
```csharp
public class GlobalExceptionHandlerMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<GlobalExceptionHandlerMiddleware> _logger;
    
    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unhandled exception occurred");
            await HandleExceptionAsync(context, ex);
        }
    }
    
    private static Task HandleExceptionAsync(HttpContext context, Exception exception)
    {
        var (statusCode, message) = exception switch
        {
            NotFoundException notFound => (StatusCodes.Status404NotFound, notFound.Message),
            ValidationException validation => (StatusCodes.Status400BadRequest, "Validation failed"),
            UnauthorizedException => (StatusCodes.Status401Unauthorized, "Unauthorized"),
            ForbiddenException => (StatusCodes.Status403Forbidden, "Forbidden"),
            ConflictException conflict => (StatusCodes.Status409Conflict, conflict.Message),
            _ => (StatusCodes.Status500InternalServerError, "An internal error occurred")
        };
        
        var response = new ErrorResponse
        {
            StatusCode = statusCode,
            Message = message,
            Timestamp = DateTime.UtcNow,
            TraceId = Activity.Current?.Id ?? context.TraceIdentifier,
            Errors = exception is ValidationException valEx 
                ? valEx.Errors 
                : null
        };
        
        context.Response.ContentType = "application/json";
        context.Response.StatusCode = statusCode;
        
        return context.Response.WriteAsJsonAsync(response);
    }
}

// Register in Program.cs
app.UseMiddleware<GlobalExceptionHandlerMiddleware>();
```

### Serilog Configuration
```csharp
// Program.cs
Log.Logger = new LoggerConfiguration()
    .ReadFrom.Configuration(builder.Configuration)
    .Enrich.FromLogContext()
    .Enrich.WithMachineName()
    .Enrich.WithEnvironmentName()
    .Enrich.WithProperty("ApplicationName", "QuranAppsApi")
    .WriteTo.Console(
        outputTemplate: "[{Timestamp:HH:mm:ss} {Level:u3}] {Message:lj}{NewLine}{Exception}")
    .WriteTo.File(
        path: "logs/quran-apps-.log",
        rollingInterval: RollingInterval.Day,
        retainedFileCountLimit: 30,
        outputTemplate: "{Timestamp:yyyy-MM-dd HH:mm:ss.fff zzz} [{Level:u3}] {Message:lj}{NewLine}{Exception}")
    .WriteTo.Conditional(
        condition: _ => builder.Environment.IsProduction(),
        configureSink: config => config.Seq(
            serverUrl: builder.Configuration["Seq:ServerUrl"]))
    .CreateLogger();

builder.Host.UseSerilog();
```

### Request Logging Middleware
```csharp
public class RequestLoggingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<RequestLoggingMiddleware> _logger;
    
    public async Task InvokeAsync(HttpContext context)
    {
        var stopwatch = Stopwatch.StartNew();
        
        _logger.LogInformation(
            "HTTP {Method} {Path}{QueryString} started",
            context.Request.Method,
            context.Request.Path,
            context.Request.QueryString);
        
        try
        {
            await _next(context);
        }
        finally
        {
            stopwatch.Stop();
            
            var logLevel = stopwatch.ElapsedMilliseconds > 1000 
                ? LogLevel.Warning 
                : LogLevel.Information;
            
            _logger.Log(
                logLevel,
                "HTTP {Method} {Path} responded {StatusCode} in {ElapsedMs}ms",
                context.Request.Method,
                context.Request.Path,
                context.Response.StatusCode,
                stopwatch.ElapsedMilliseconds);
        }
    }
}
```

### Custom Exception Classes
```csharp
public class NotFoundException : Exception
{
    public NotFoundException(string message) : base(message) { }
    public NotFoundException(string entityName, object key)
        : base($"{entityName} with ID '{key}' was not found") { }
}

public class ValidationException : Exception
{
    public Dictionary<string, string[]> Errors { get; }
    
    public ValidationException(Dictionary<string, string[]> errors)
        : base("One or more validation errors occurred")
    {
        Errors = errors;
    }
}
```

---

## 🔗 Dependencies
- US2.5: Basic Middleware Setup

---

## 📊 Definition of Done
- [ ] Global exception handler implemented
- [ ] Serilog configured with multiple sinks
- [ ] Request/response logging working
- [ ] Custom exception types created
- [ ] Security considerations met (no sensitive data logged)
- [ ] Performance monitoring in place
- [ ] Unit tests for exception handling
- [ ] Documentation complete

---

**Created:** October 6, 2025  
**Owner:** Abubakr Abduraghman, a.abduraghman@itqan.dev  
**Epic:** [Epic 4: API Development](../epics/epic-4-api-development-integration.md)
