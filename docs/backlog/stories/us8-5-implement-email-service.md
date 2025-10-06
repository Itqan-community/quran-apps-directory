# US8.5: Implement Email Service Integration

**Epic:** Epic 8 - User Accounts & Personalization  
**Sprint:** Week 7, Day 4  
**Story Points:** 3  
**Priority:** P1  
**Assigned To:** Backend Developer  
**Status:** Not Started

---

## 📋 User Story

**As a** System  
**I want** to send transactional emails to users  
**So that** they receive verification links, password resets, and important notifications

---

## 🎯 Acceptance Criteria

### AC1: Email Service Provider Setup
- [ ] Service provider selected (SendGrid recommended)
- [ ] API key configured
- [ ] Sender email verified (noreply@quran-apps.itqan.dev)
- [ ] Email templates created

### AC2: Email Templates
- [ ] Welcome email (registration)
- [ ] Email verification
- [ ] Password reset
- [ ] Password change confirmation
- [ ] Account deletion confirmation
- [ ] Bilingual templates (Arabic/English)

### AC3: IEmailService Interface
- [ ] `SendEmailVerificationAsync(email, token)`
- [ ] `SendPasswordResetAsync(email, resetUrl)`
- [ ] `SendWelcomeEmailAsync(email, fullName)`
- [ ] `SendPasswordChangeConfirmationAsync(email)`
- [ ] `SendAccountDeletionConfirmationAsync(email)`

### AC4: Email Queue System
- [ ] Background job processing (Hangfire)
- [ ] Retry logic (3 attempts)
- [ ] Failed email logging
- [ ] Rate limiting (avoid spam)

### AC5: Email Logging
- [ ] Track sent emails
- [ ] Log failures with error details
- [ ] Email delivery status tracking
- [ ] Admin dashboard for email metrics

### AC6: Template Rendering
- [ ] HTML email templates with inline CSS
- [ ] Responsive design (mobile-friendly)
- [ ] Plain text fallback
- [ ] Variable substitution ({{fullName}}, {{url}})

### AC7: Testing
- [ ] Email preview in development
- [ ] Test mode (log instead of send)
- [ ] Integration tests with real provider

---

## 📝 Technical Notes

### Email Service Interface
```csharp
public interface IEmailService
{
    Task SendEmailVerificationAsync(string email, string verificationUrl);
    Task SendPasswordResetAsync(string email, string resetUrl);
    Task SendWelcomeEmailAsync(string email, string fullName);
    Task SendPasswordChangeConfirmationAsync(string email);
    Task SendAccountDeletionConfirmationAsync(string email);
}
```

### SendGrid Implementation
```csharp
public class SendGridEmailService : IEmailService
{
    private readonly ISendGridClient _sendGridClient;
    private readonly IConfiguration _configuration;
    private readonly ILogger<SendGridEmailService> _logger;
    private readonly string _fromEmail;
    private readonly string _fromName;
    
    public SendGridEmailService(
        ISendGridClient sendGridClient,
        IConfiguration configuration,
        ILogger<SendGridEmailService> logger)
    {
        _sendGridClient = sendGridClient;
        _configuration = configuration;
        _logger = logger;
        _fromEmail = configuration["SendGrid:FromEmail"];
        _fromName = configuration["SendGrid:FromName"];
    }
    
    public async Task SendEmailVerificationAsync(string email, string verificationUrl)
    {
        var subject = "Verify Your Email - Quran Apps Directory";
        var htmlContent = await RenderTemplateAsync("email-verification", new
        {
            VerificationUrl = verificationUrl
        });
        
        await SendEmailAsync(email, subject, htmlContent);
    }
    
    public async Task SendPasswordResetAsync(string email, string resetUrl)
    {
        var subject = "Reset Your Password - Quran Apps Directory";
        var htmlContent = await RenderTemplateAsync("password-reset", new
        {
            ResetUrl = resetUrl,
            ExpiryMinutes = 60
        });
        
        await SendEmailAsync(email, subject, htmlContent);
    }
    
    public async Task SendWelcomeEmailAsync(string email, string fullName)
    {
        var subject = "Welcome to Quran Apps Directory!";
        var htmlContent = await RenderTemplateAsync("welcome", new
        {
            FullName = fullName,
            AppUrl = _configuration["Frontend:BaseUrl"]
        });
        
        await SendEmailAsync(email, subject, htmlContent);
    }
    
    private async Task SendEmailAsync(string to, string subject, string htmlContent)
    {
        try
        {
            var msg = new SendGridMessage
            {
                From = new EmailAddress(_fromEmail, _fromName),
                Subject = subject,
                HtmlContent = htmlContent,
                PlainTextContent = StripHtml(htmlContent)
            };
            
            msg.AddTo(new EmailAddress(to));
            
            // Track email opens (optional)
            msg.SetClickTracking(true, true);
            msg.SetOpenTracking(true);
            
            var response = await _sendGridClient.SendEmailAsync(msg);
            
            if (!response.IsSuccessStatusCode)
            {
                var body = await response.Body.ReadAsStringAsync();
                _logger.LogError("SendGrid error: {StatusCode} - {Body}", 
                    response.StatusCode, body);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send email to {Email}", to);
            throw;
        }
    }
    
    private async Task<string> RenderTemplateAsync(string templateName, object model)
    {
        // Load template file
        var templatePath = Path.Combine("EmailTemplates", $"{templateName}.html");
        var template = await File.ReadAllTextAsync(templatePath);
        
        // Simple variable substitution (or use a templating engine like Razor)
        var rendered = template;
        foreach (var prop in model.GetType().GetProperties())
        {
            var placeholder = $"{{{{{prop.Name}}}}}";
            var value = prop.GetValue(model)?.ToString() ?? "";
            rendered = rendered.Replace(placeholder, value);
        }
        
        return rendered;
    }
    
    private string StripHtml(string html)
    {
        return Regex.Replace(html, "<.*?>", string.Empty);
    }
}
```

### Email Template Example (email-verification.html)
```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
            border-radius: 10px 10px 0 0;
        }
        .content {
            background: #f9f9f9;
            padding: 30px;
            border-radius: 0 0 10px 10px;
        }
        .button {
            display: inline-block;
            padding: 15px 30px;
            background: #667eea;
            color: white;
            text-decoration: none;
            border-radius: 5px;
            margin: 20px 0;
        }
        .footer {
            text-align: center;
            margin-top: 30px;
            color: #666;
            font-size: 12px;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🕌 Quran Apps Directory</h1>
    </div>
    <div class="content">
        <h2>Verify Your Email Address</h2>
        <p>Thank you for registering with Quran Apps Directory!</p>
        <p>Please click the button below to verify your email address:</p>
        <p style="text-align: center;">
            <a href="{{VerificationUrl}}" class="button">Verify Email</a>
        </p>
        <p>Or copy and paste this link into your browser:</p>
        <p style="word-break: break-all; color: #667eea;">{{VerificationUrl}}</p>
        <p>This link will expire in 24 hours.</p>
        <p>If you didn't create an account, please ignore this email.</p>
    </div>
    <div class="footer">
        <p>&copy; 2025 Quran Apps Directory. All rights reserved.</p>
        <p>itqan.dev</p>
    </div>
</body>
</html>
```

### Hangfire Background Jobs
```csharp
public class EmailBackgroundJobs
{
    private readonly IEmailService _emailService;
    
    [AutomaticRetry(Attempts = 3, DelaysInSeconds = new[] { 60, 300, 600 })]
    public async Task SendEmailVerification(string email, string verificationUrl)
    {
        await _emailService.SendEmailVerificationAsync(email, verificationUrl);
    }
    
    [AutomaticRetry(Attempts = 3)]
    public async Task SendPasswordReset(string email, string resetUrl)
    {
        await _emailService.SendPasswordResetAsync(email, resetUrl);
    }
}

// Usage in AuthController
BackgroundJob.Enqueue<EmailBackgroundJobs>(
    jobs => jobs.SendEmailVerification(user.Email, callbackUrl));
```

### Configuration (appsettings.json)
```json
{
  "SendGrid": {
    "ApiKey": "SG.your-sendgrid-api-key",
    "FromEmail": "noreply@quran-apps.itqan.dev",
    "FromName": "Quran Apps Directory"
  },
  "Frontend": {
    "BaseUrl": "https://quran-apps.itqan.dev"
  }
}
```

### Service Registration (Program.cs)
```csharp
builder.Services.AddSingleton<ISendGridClient>(sp =>
    new SendGridClient(builder.Configuration["SendGrid:ApiKey"]));

builder.Services.AddScoped<IEmailService, SendGridEmailService>();

// Hangfire for background jobs
builder.Services.AddHangfire(config =>
    config.UsePostgreSqlStorage(builder.Configuration.GetConnectionString("DefaultConnection")));

builder.Services.AddHangfireServer();
```

### NuGet Packages
```xml
<PackageReference Include="SendGrid" Version="9.29.1" />
<PackageReference Include="Hangfire.AspNetCore" Version="1.8.6" />
<PackageReference Include="Hangfire.PostgreSql" Version="1.20.0" />
```

---

## 🔗 Dependencies
- US8.2: JWT Auth Endpoints (for verification flows)
- SendGrid account or equivalent email service

---

## 📊 Definition of Done
- [ ] Email service provider configured
- [ ] All email templates created (bilingual)
- [ ] IEmailService implemented
- [ ] Background job processing working
- [ ] Email logging in place
- [ ] Retry logic tested
- [ ] Email delivery tracking
- [ ] Test mode for development

---

**Created:** October 6, 2025  
**Owner:** Abubakr Abduraghman, a.abduraghman@itqan.dev  
**Epic:** [Epic 8: User Accounts & Personalization](../epics/epic-8-user-accounts-personalization.md)
