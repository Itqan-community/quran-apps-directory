# Epic 11: Developer Self-Service Portal

## 📋 Epic Overview
Create a comprehensive self-service portal enabling developers to register, submit apps, manage listings, and track performance without admin intervention.

## 🎯 Goal
Scale content creation by empowering developers to manage their own app listings, reducing admin bottleneck and accelerating platform growth.

## 📊 Success Metrics
- 50+ developers register in first 3 months
- 80% app approval rate (quality submissions)
- <48 hours average approval time
- 30% of developers submit multiple apps
- 70% profile completion rate

## 🏗️ Technical Scope (Django)
- Developer registration and profiles
- App submission workflow
- Image upload to Cloudflare R2
- Multi-step form validation
- Admin approval workflow
- Developer dashboard
- Submission status tracking
- Email notifications for status changes

## 🔗 Dependencies
- Epic 8: User accounts (extends with developer role)
- Epic 2: File upload infrastructure

## 📈 Business Value
- Critical: Enables platform scaling
- Impact: Removes admin content bottleneck
- Effort: 1.5-2 weeks implementation

## ✅ Definition of Done
- Developer registration functional
- App submission form complete (all fields)
- Image upload to R2 working
- Admin approval dashboard operational
- Email notifications sent
- Developer can edit draft submissions
- Submission guidelines displayed

## Related Stories
- US11.1: Developer Registration & Profile
- US11.2: App Submission Multi-Step Form
- US11.3: Image Upload to Cloudflare R2
- US11.4: Admin Approval Workflow
- US11.5: Developer Dashboard
- US11.6: Submission Status Notifications

## Django Implementation Details
### Entity Models
```python
public class DeveloperProfile
{
    public Guid UserId { get; set; }
    public string CompanyName { get; set; } = string.Empty;
    public string? Website { get; set; }
    public string? Bio { get; set; }
    public string? LogoUrl { get; set; }
    public string ContactEmail { get; set; } = string.Empty;
    public string? PhoneNumber { get; set; }
    public bool IsVerified { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    public ApplicationUser User { get; set; } = null!;
    public ICollection<AppSubmission> Submissions { get; set; } = new List<AppSubmission>();
}

public class AppSubmission
{
    public Guid Id { get; set; }
    public Guid DeveloperId { get; set; }
    public SubmissionStatus Status { get; set; } = SubmissionStatus.Draft;
    
    // App details (matches App entity)
    public string NameAr { get; set; } = string.Empty;
    public string NameEn { get; set; } = string.Empty;
    public string ShortDescriptionAr { get; set; } = string.Empty;
    public string ShortDescriptionEn { get; set; } = string.Empty;
    public string DescriptionAr { get; set; } = string.Empty;
    public string DescriptionEn { get; set; } = string.Empty;
    
    public List<Guid> CategoryIds { get; set; } = new();
    public List<string> ScreenshotsAr { get; set; } = new();
    public List<string> ScreenshotsEn { get; set; } = new();
    public string? MainImageAr { get; set; }
    public string? MainImageEn { get; set; }
    public string? ApplicationIcon { get; set; }
    
    public string? GooglePlayLink { get; set; }
    public string? AppStoreLink { get; set; }
    public string? AppGalleryLink { get; set; }
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? SubmittedAt { get; set; }
    public DateTime? ReviewedAt { get; set; }
    public Guid? ReviewerId { get; set; }
    public string? ReviewNotes { get; set; }
    public Guid? ApprovedAppId { get; set; } // Link to created App
    
    public DeveloperProfile Developer { get; set; } = null!;
    public ApplicationUser? Reviewer { get; set; }
    public App? ApprovedApp { get; set; }
}

public enum SubmissionStatus
{
    Draft,
    Submitted,
    UnderReview,
    ChangesRequested,
    Approved,
    Rejected
}
```

### DevelopersViewSet
```python
[ApiViewSet]
public class DevelopersViewSet : ViewSetBase
{
    
    public async Task<Response<DeveloperProfileResponse>> RegisterAsDeveloper(
    {
        var userId = GetUserId();
        var profile = await _developersService.CreateDeveloperProfileAsync(userId, request);
        return CreatedAtAction(nameof(GetProfile), profile);
    }
    
    public async Task<Response<DeveloperProfileResponse>> GetProfile()
    {
        var userId = GetUserId();
        var profile = await _developersService.GetDeveloperProfileAsync(userId);
        return profile == null ? NotFound() : Ok(profile);
    }
    
    public async Task<Response<DeveloperProfileResponse>> UpdateProfile(
    {
        var userId = GetUserId();
        var profile = await _developersService.UpdateDeveloperProfileAsync(userId, request);
        return Ok(profile);
    }
    
    {
        var userId = GetUserId();
        
        if (!IsValidImageFile(file))
        {
            return BadRequest("Invalid image file");
        }
        
        var logoUrl = await _storageService.UploadDeveloperLogoAsync(file, userId);
        await _developersService.UpdateLogoUrlAsync(userId, logoUrl);
        
        return Ok(new { logoUrl });
    }
}

[ApiViewSet]
public class SubmissionsViewSet : ViewSetBase
{
    
    public async Task<Response<AppSubmissionResponse>> CreateSubmission()
    {
        var userId = GetUserId();
        var submission = await _submissionsService.CreateDraftSubmissionAsync(userId);
        return CreatedAtAction(nameof(GetSubmission), new { id = submission.Id }, submission);
    }
    
    public async Task<Response<List<AppSubmissionResponse>>> GetMySubmissions()
    {
        var userId = GetUserId();
        var submissions = await _submissionsService.GetDeveloperSubmissionsAsync(userId);
        return Ok(submissions);
    }
    
    public async Task<Response<AppSubmissionResponse>> GetSubmission(Guid id)
    {
        var userId = GetUserId();
        var submission = await _submissionsService.GetSubmissionAsync(id, userId);
        return submission == null ? NotFound() : Ok(submission);
    }
    
    public async Task<Response<AppSubmissionResponse>> UpdateSubmission(
        Guid id,
    {
        var userId = GetUserId();
        var submission = await _submissionsService.UpdateSubmissionAsync(id, userId, request);
        return Ok(submission);
    }
    
    public async Task<IResponse> SubmitForReview(Guid id)
    {
        var userId = GetUserId();
        await _submissionsService.SubmitForReviewAsync(id, userId);
        return NoContent();
    }
    
    public async Task<Response<List<string>>> UploadScreenshots(
        Guid id,
    {
        var userId = GetUserId();
        
        if (files.Count > 5)
        {
            return BadRequest("Maximum 5 screenshots allowed");
        }
        
        var urls = new List<string>();
        foreach (var file in files)
        {
            var url = await _storageService.UploadScreenshotAsync(file, id, language);
            urls.Add(url);
        }
        
        await _submissionsService.AddScreenshotsAsync(id, userId, urls, language);
        
        return Ok(urls);
    }
}

// Admin endpoints
[ApiViewSet]
public class SubmissionsReviewViewSet : ViewSetBase
{
    
    public async Task<Response<PaginatedResponse<AppSubmissionResponse>>> GetPendingSubmissions(
    {
        var submissions = await _submissionsService.GetPendingSubmissionsAsync(page, pageSize);
        return Ok(submissions);
    }
    
    public async Task<IResponse> ApproveSubmission(
        Guid id,
    {
        var reviewerId = GetUserId();
        await _submissionsService.ApproveSubmissionAsync(id, reviewerId, request.Notes);
        return NoContent();
    }
    
    public async Task<IResponse> RejectSubmission(
        Guid id,
    {
        var reviewerId = GetUserId();
        await _submissionsService.RejectSubmissionAsync(id, reviewerId, request.Notes);
        return NoContent();
    }
    
    public async Task<IResponse> RequestChanges(
        Guid id,
    {
        var reviewerId = GetUserId();
        await _submissionsService.RequestChangesAsync(id, reviewerId, request.Notes);
        return NoContent();
    }
}
```

### Storage Service for R2
```python
public class R2StorageService : IStorageService
{
    
    public async Task<string> UploadScreenshotAsync(IFormFile file, Guid submissionId, string language)
    {
        var key = $"submissions/{submissionId}/screenshots/{language}/{Guid.NewGuid()}{Path.GetExtension(file.FileName)}";
        
        using var stream = file.OpenReadStream();
        var request = new PutObjectRequest
        {
            BucketName = _bucketName,
            Key = key,
            InputStream = stream,
            ContentType = file.ContentType,
            CannedACL = S3CannedACL.PublicRead
        };
        
        await _s3Client.PutObjectAsync(request);
        
        return $"{_cdnUrl}/{key}";
    }
}
```

### Notification Service
```python
public class SubmissionNotificationService
{
    public async Task NotifySubmissionStatusChangeAsync(AppSubmission submission)
    {
        var developer = await _context.DeveloperProfiles
            .Include(d => d.User)
            .FirstOrDefaultAsync(d => d.UserId == submission.DeveloperId);
        
        var subject = submission.Status switch
        {
            SubmissionStatus.Approved => "App Approved!",
            SubmissionStatus.Rejected => "App Submission Rejected",
            SubmissionStatus.ChangesRequested => "Changes Requested for Your App",
            _ => "App Submission Status Update"
        };
        
        await _emailService.SendSubmissionStatusEmailAsync(
            developer.User.Email!,
            subject,
            submission
        );
    }
}
```

## Priority
priority-1 (Phase 3 - Developer Ecosystem)
