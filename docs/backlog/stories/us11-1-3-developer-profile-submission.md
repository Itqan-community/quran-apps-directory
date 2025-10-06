# US11.1-11.3: Developer Profile & App Submission System

**Epic:** Epic 11 - Developer Self-Service Portal  
**Sprint:** Week 11, Day 1-3  
**Story Points:** 18 (combined)  
**Priority:** P1  
**Assigned To:** Full Stack Team  
**Status:** Not Started

---

## 📋 Combined User Stories

### US11.1: Create Developer Profile System
**As a** Developer, **I want** to register and create a developer profile **So that** I can submit and manage my apps

### US11.2: Implement App Submission Workflow
**As a** Developer, **I want** to submit apps through a guided workflow **So that** my apps can be listed on the platform

### US11.3: Add Image Upload to Cloudflare R2
**As a** Developer, **I want** to upload app images **So that** my app listing is visually appealing

---

## 🎯 Combined Acceptance Criteria

### Developer Profile (AC1-AC6)
- [ ] DeveloperProfile entity with company info, website, logo
- [ ] POST /api/developers/register endpoint
- [ ] Developer role assigned on registration
- [ ] Profile update endpoint
- [ ] Logo upload to Cloudflare R2
- [ ] Verification status (pending, verified)

### App Submission (AC7-AC14)
- [ ] AppSubmission entity (status: draft, submitted, approved, rejected)
- [ ] POST /api/developers/submissions/apps (create draft)
- [ ] PUT /api/developers/submissions/apps/{id} (update)
- [ ] POST /api/developers/submissions/apps/{id}/submit (submit for review)
- [ ] Multi-step form validation
- [ ] Required fields: name, description, category, platform links
- [ ] Optional fields: screenshots, videos
- [ ] Draft auto-save

### Image Upload (AC15-AC20)
- [ ] Cloudflare R2 integration
- [ ] POST /api/developers/upload-image endpoint
- [ ] Image validation (format, size max 5MB)
- [ ] Image optimization (resize, compress)
- [ ] Multiple image upload (screenshots)
- [ ] CDN URL returned

---

## 📝 Technical Implementation

### Developer Profile Entities
```csharp
public class DeveloperProfile
{
    public Guid Id { get; set; }
    
    [Required]
    public Guid UserId { get; set; }
    
    [Required]
    [MaxLength(200)]
    public string CompanyName { get; set; }
    
    [MaxLength(500)]
    public string Website { get; set; }
    
    [MaxLength(1000)]
    public string Bio { get; set; }
    
    public string LogoUrl { get; set; }
    
    [EmailAddress]
    public string ContactEmail { get; set; }
    
    public string PhoneNumber { get; set; }
    
    public bool IsVerified { get; set; }
    public DateTime? VerifiedAt { get; set; }
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
    
    // Navigation
    public ApplicationUser User { get; set; }
    public ICollection<AppSubmission> AppSubmissions { get; set; }
}

public class AppSubmission
{
    public Guid Id { get; set; }
    
    [Required]
    public Guid DeveloperProfileId { get; set; }
    
    [Required]
    [MaxLength(200)]
    public string NameAr { get; set; }
    
    [Required]
    [MaxLength(200)]
    public string NameEn { get; set; }
    
    [Required]
    [MaxLength(500)]
    public string ShortDescriptionAr { get; set; }
    
    [Required]
    [MaxLength(500)]
    public string ShortDescriptionEn { get; set; }
    
    [Required]
    public string DescriptionAr { get; set; }
    
    [Required]
    public string DescriptionEn { get; set; }
    
    public string ApplicationIconUrl { get; set; }
    
    [Column(TypeName = "jsonb")]
    public string ScreenshotsArJson { get; set; }
    
    [Column(TypeName = "jsonb")]
    public string ScreenshotsEnJson { get; set; }
    
    [Column(TypeName = "jsonb")]
    public string CategoriesJson { get; set; }
    
    public string GooglePlayLink { get; set; }
    public string AppStoreLink { get; set; }
    public string AppGalleryLink { get; set; }
    
    [Required]
    [MaxLength(50)]
    public string Status { get; set; } // Draft, Submitted, Approved, Rejected
    
    [MaxLength(1000)]
    public string RejectionReason { get; set; }
    
    public Guid? ReviewedBy { get; set; }
    public DateTime? ReviewedAt { get; set; }
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? SubmittedAt { get; set; }
    
    // Navigation
    public DeveloperProfile DeveloperProfile { get; set; }
    public ApplicationUser Reviewer { get; set; }
}

public static class SubmissionStatus
{
    public const string Draft = "draft";
    public const string Submitted = "submitted";
    public const string UnderReview = "under_review";
    public const string Approved = "approved";
    public const string Rejected = "rejected";
}
```

### Developers Controller
```csharp
[ApiController]
[Route("api/developers")]
[Authorize(Roles = "Developer")]
public class DevelopersController : ControllerBase
{
    private readonly IDeveloperService _developerService;
    private readonly IStorageService _storageService;
    
    [HttpPost("register")]
    [AllowAnonymous]
    [Authorize] // Only authenticated users
    public async Task<ActionResult<DeveloperProfileDto>> RegisterDeveloper(
        [FromBody] RegisterDeveloperDto dto)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        
        var profile = await _developerService.RegisterDeveloperAsync(
            Guid.Parse(userId), dto);
        
        return CreatedAtAction(nameof(GetProfile), profile);
    }
    
    [HttpGet("profile")]
    public async Task<ActionResult<DeveloperProfileDto>> GetProfile()
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        
        var profile = await _developerService.GetDeveloperProfileAsync(
            Guid.Parse(userId));
        
        if (profile == null)
            return NotFound();
        
        return Ok(profile);
    }
    
    [HttpPut("profile")]
    public async Task<ActionResult<DeveloperProfileDto>> UpdateProfile(
        [FromBody] UpdateDeveloperProfileDto dto)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        
        var profile = await _developerService.UpdateDeveloperProfileAsync(
            Guid.Parse(userId), dto);
        
        return Ok(profile);
    }
    
    [HttpPost("upload-image")]
    [RequestSizeLimit(5 * 1024 * 1024)] // 5MB
    public async Task<ActionResult<ImageUploadResponse>> UploadImage(
        IFormFile file,
        [FromQuery] string type = "screenshot") // logo, icon, screenshot
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        
        // Validate
        if (!IsValidImageType(file.ContentType))
            return BadRequest(new { message = "Invalid image type" });
        
        // Resize based on type
        var (width, height) = type switch
        {
            "icon" => (512, 512),
            "logo" => (300, 300),
            "screenshot" => (1080, 1920),
            _ => (1200, 630)
        };
        
        using var image = await Image.LoadAsync(file.OpenReadStream());
        image.Mutate(x => x.Resize(new ResizeOptions
        {
            Size = new Size(width, height),
            Mode = ResizeMode.Max
        }));
        
        using var ms = new MemoryStream();
        await image.SaveAsWebpAsync(ms, new WebpEncoder { Quality = 85 });
        ms.Position = 0;
        
        // Upload to Cloudflare R2
        var fileName = $"developers/{userId}/{type}s/{Guid.NewGuid()}.webp";
        var url = await _storageService.UploadAsync(fileName, ms, "image/webp");
        
        return Ok(new ImageUploadResponse { Url = url });
    }
}
```

### App Submissions Controller
```csharp
[ApiController]
[Route("api/developers/submissions/apps")]
[Authorize(Roles = "Developer")]
public class AppSubmissionsController : ControllerBase
{
    [HttpPost]
    public async Task<ActionResult<AppSubmissionDto>> CreateDraft(
        [FromBody] CreateAppSubmissionDto dto)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        
        var submission = await _submissionService.CreateDraftAsync(
            Guid.Parse(userId), dto);
        
        return CreatedAtAction(nameof(GetSubmission), 
            new { id = submission.Id }, submission);
    }
    
    [HttpGet("{id:guid}")]
    public async Task<ActionResult<AppSubmissionDto>> GetSubmission(Guid id)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        
        var submission = await _submissionService.GetSubmissionAsync(
            id, Guid.Parse(userId));
        
        if (submission == null)
            return NotFound();
        
        return Ok(submission);
    }
    
    [HttpPut("{id:guid}")]
    public async Task<ActionResult<AppSubmissionDto>> UpdateSubmission(
        Guid id,
        [FromBody] UpdateAppSubmissionDto dto)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        
        var submission = await _submissionService.UpdateSubmissionAsync(
            id, Guid.Parse(userId), dto);
        
        if (submission == null)
            return NotFound();
        
        return Ok(submission);
    }
    
    [HttpPost("{id:guid}/submit")]
    public async Task<IActionResult> SubmitForReview(Guid id)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        
        await _submissionService.SubmitForReviewAsync(id, Guid.Parse(userId));
        
        return Ok(new { message = "Submitted for review" });
    }
    
    [HttpGet]
    public async Task<ActionResult<List<AppSubmissionSummaryDto>>> GetMySubmissions()
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        
        var submissions = await _submissionService.GetDeveloperSubmissionsAsync(
            Guid.Parse(userId));
        
        return Ok(submissions);
    }
}
```

### Cloudflare R2 Storage Service
```csharp
public interface IStorageService
{
    Task<string> UploadAsync(string fileName, Stream content, string contentType);
    Task DeleteAsync(string fileName);
    Task<string> GetSignedUrlAsync(string fileName, int expiryMinutes = 60);
}

public class CloudflareR2StorageService : IStorageService
{
    private readonly AmazonS3Client _s3Client;
    private readonly string _bucketName;
    private readonly string _publicUrl;
    
    public CloudflareR2StorageService(IConfiguration configuration)
    {
        var config = new AmazonS3Config
        {
            ServiceURL = configuration["CloudflareR2:AccountEndpoint"],
            SignatureVersion = "v4",
            ForcePathStyle = true
        };
        
        _s3Client = new AmazonS3Client(
            configuration["CloudflareR2:AccessKeyId"],
            configuration["CloudflareR2:SecretAccessKey"],
            config);
        
        _bucketName = configuration["CloudflareR2:BucketName"];
        _publicUrl = configuration["CloudflareR2:PublicUrl"];
    }
    
    public async Task<string> UploadAsync(
        string fileName,
        Stream content,
        string contentType)
    {
        var request = new PutObjectRequest
        {
            BucketName = _bucketName,
            Key = fileName,
            InputStream = content,
            ContentType = contentType,
            CannedACL = S3CannedACL.PublicRead
        };
        
        await _s3Client.PutObjectAsync(request);
        
        return $"{_publicUrl}/{fileName}";
    }
    
    public async Task DeleteAsync(string fileName)
    {
        var request = new DeleteObjectRequest
        {
            BucketName = _bucketName,
            Key = fileName
        };
        
        await _s3Client.DeleteObjectAsync(request);
    }
}
```

### Frontend - Multi-Step App Submission Form
```typescript
@Component({
  selector: 'app-submit-app',
  template: `
    <mat-stepper [linear]="true" #stepper>
      <!-- Step 1: Basic Info -->
      <mat-step [stepControl]="basicInfoForm">
        <form [formGroup]="basicInfoForm">
          <ng-template matStepLabel>Basic Information</ng-template>
          
          <mat-form-field>
            <input matInput placeholder="App Name (English)" 
                   formControlName="nameEn" required>
          </mat-form-field>
          
          <mat-form-field>
            <input matInput placeholder="App Name (Arabic)" 
                   formControlName="nameAr" required>
          </mat-form-field>
          
          <!-- More fields... -->
          
          <button mat-button matStepperNext>Next</button>
        </form>
      </mat-step>
      
      <!-- Step 2: Images -->
      <mat-step [stepControl]="imagesForm">
        <form [formGroup]="imagesForm">
          <ng-template matStepLabel>Images</ng-template>
          
          <app-image-uploader
            label="App Icon"
            (uploaded)="onIconUploaded($event)">
          </app-image-uploader>
          
          <app-image-uploader
            label="Screenshots"
            [multiple]="true"
            (uploaded)="onScreenshotsUploaded($event)">
          </app-image-uploader>
          
          <button mat-button matStepperPrevious>Back</button>
          <button mat-button matStepperNext>Next</button>
        </form>
      </mat-step>
      
      <!-- Step 3: Platform Links -->
      <!-- Step 4: Review & Submit -->
    </mat-stepper>
  `
})
export class SubmitAppComponent {
  basicInfoForm: FormGroup;
  imagesForm: FormGroup;
  
  constructor(
    private fb: FormBuilder,
    private submissionService: AppSubmissionService
  ) {
    this.basicInfoForm = this.fb.group({
      nameEn: ['', Validators.required],
      nameAr: ['', Validators.required],
      // ... more fields
    });
  }
  
  onIconUploaded(url: string): void {
    this.imagesForm.patchValue({ iconUrl: url });
  }
  
  submitApp(): void {
    const submission = {
      ...this.basicInfoForm.value,
      ...this.imagesForm.value,
      // ... other forms
    };
    
    this.submissionService.submitApp(submission).subscribe({
      next: () => {
        this.snackBar.open('App submitted for review!', 'Close');
        this.router.navigate(['/developer/submissions']);
      }
    });
  }
}
```

---

## 🔗 Dependencies
- US8.1: User authentication
- Cloudflare R2 account setup
- SixLabors.ImageSharp for image processing

---

## 📊 Definition of Done
- [ ] Developer profile system complete
- [ ] App submission workflow implemented
- [ ] Multi-step form UI working
- [ ] Image upload to Cloudflare R2 functional
- [ ] Image optimization working
- [ ] Draft auto-save implemented
- [ ] Validation on all steps
- [ ] Unit tests pass
- [ ] Integration tests pass

---

**Created:** October 6, 2025  
**Owner:** Abubakr Abduraghman, a.abduraghman@itqan.dev  
**Epic:** [Epic 11: Developer Self-Service Portal](../epics/epic-11-developer-self-service-portal.md)
