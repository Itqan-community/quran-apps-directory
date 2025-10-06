# US8.4: Create User Profile Management

**Epic:** Epic 8 - User Accounts & Personalization  
**Sprint:** Week 7, Day 3-4  
**Story Points:** 5  
**Priority:** P1  
**Assigned To:** Full Stack Developer  
**Status:** Not Started

---

## 📋 User Story

**As a** User  
**I want** to view and edit my profile information  
**So that** I can keep my account details up-to-date and personalize my experience

---

## 🎯 Acceptance Criteria

### AC1: Get Current User Profile (Backend)
- [ ] GET /api/users/me endpoint
- [ ] Requires authentication
- [ ] Returns complete user profile
- [ ] Includes linked OAuth providers

### AC2: Update Profile (Backend)
- [ ] PUT /api/users/me endpoint
- [ ] Update: FullName, PreferredLanguage, ProfilePictureUrl
- [ ] Email changes require re-verification
- [ ] Validation on all fields

### AC3: Change Password
- [ ] POST /api/users/me/change-password
- [ ] Requires current password
- [ ] Validates new password strength
- [ ] Sends confirmation email

### AC4: Upload Profile Picture
- [ ] POST /api/users/me/profile-picture
- [ ] Accepts image upload (max 5MB)
- [ ] Supported formats: JPG, PNG, WebP
- [ ] Resize to 300x300
- [ ] Upload to Cloudflare R2
- [ ] Returns new image URL

### AC5: Delete Account
- [ ] POST /api/users/me/delete-account
- [ ] Requires password confirmation
- [ ] Soft delete (mark as deleted)
- [ ] Anonymize personal data (GDPR)
- [ ] Send confirmation email

### AC6: Profile Page (Frontend)
- [ ] Profile view page at `/profile`
- [ ] Display all user info
- [ ] Edit mode toggle
- [ ] Form validation
- [ ] Success/error messages

### AC7: Settings Page
- [ ] Language preference selector
- [ ] Theme preference (light/dark)
- [ ] Email notification preferences
- [ ] Connected accounts (OAuth providers)

---

## 📝 Technical Notes

### Users Controller
```csharp
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class UsersController : ControllerBase
{
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly IStorageService _storageService;
    
    [HttpGet("me")]
    [ProducesResponseType(typeof(UserProfileDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<UserProfileDto>> GetCurrentUser()
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        var user = await _userManager.FindByIdAsync(userId);
        
        if (user == null)
            return NotFound();
        
        var logins = await _userManager.GetLoginsAsync(user);
        
        return Ok(new UserProfileDto
        {
            Id = user.Id,
            Email = user.Email,
            FullName = user.FullName,
            ProfilePictureUrl = user.ProfilePictureUrl,
            PreferredLanguage = user.PreferredLanguage,
            EmailVerified = user.EmailVerified,
            CreatedAt = user.CreatedAt,
            ConnectedProviders = logins.Select(l => l.LoginProvider).ToList()
        });
    }
    
    [HttpPut("me")]
    [ProducesResponseType(typeof(UserProfileDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<UserProfileDto>> UpdateProfile([FromBody] UpdateProfileDto dto)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        var user = await _userManager.FindByIdAsync(userId);
        
        if (user == null)
            return NotFound();
        
        // Update allowed fields
        user.FullName = dto.FullName;
        user.PreferredLanguage = dto.PreferredLanguage;
        user.UpdatedAt = DateTime.UtcNow;
        
        // Email change requires re-verification
        if (!string.IsNullOrEmpty(dto.Email) && dto.Email != user.Email)
        {
            var emailExists = await _userManager.FindByEmailAsync(dto.Email);
            if (emailExists != null)
                return BadRequest(new { message = "Email already in use" });
            
            user.Email = dto.Email;
            user.UserName = dto.Email;
            user.EmailVerified = false;
            
            // Send verification email
            var token = await _userManager.GenerateEmailConfirmationTokenAsync(user);
            await _emailService.SendEmailVerificationAsync(user.Email, token);
        }
        
        var result = await _userManager.UpdateAsync(user);
        
        if (!result.Succeeded)
            return BadRequest(result.Errors);
        
        return Ok(new UserProfileDto
        {
            Id = user.Id,
            Email = user.Email,
            FullName = user.FullName,
            ProfilePictureUrl = user.ProfilePictureUrl,
            PreferredLanguage = user.PreferredLanguage
        });
    }
    
    [HttpPost("me/change-password")]
    public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordDto dto)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        var user = await _userManager.FindByIdAsync(userId);
        
        if (user == null)
            return NotFound();
        
        var result = await _userManager.ChangePasswordAsync(
            user, dto.CurrentPassword, dto.NewPassword);
        
        if (!result.Succeeded)
            return BadRequest(result.Errors);
        
        // Send confirmation email
        await _emailService.SendPasswordChangeConfirmationAsync(user.Email);
        
        return Ok(new { message = "Password changed successfully" });
    }
    
    [HttpPost("me/profile-picture")]
    [RequestSizeLimit(5 * 1024 * 1024)] // 5MB
    public async Task<ActionResult<ProfilePictureResponse>> UploadProfilePicture(IFormFile file)
    {
        if (file == null || file.Length == 0)
            return BadRequest(new { message = "No file uploaded" });
        
        // Validate file type
        var allowedTypes = new[] { "image/jpeg", "image/png", "image/webp" };
        if (!allowedTypes.Contains(file.ContentType))
            return BadRequest(new { message = "Invalid file type" });
        
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        var user = await _userManager.FindByIdAsync(userId);
        
        if (user == null)
            return NotFound();
        
        // Resize image
        using var image = await Image.LoadAsync(file.OpenReadStream());
        image.Mutate(x => x.Resize(new ResizeOptions
        {
            Size = new Size(300, 300),
            Mode = ResizeMode.Crop
        }));
        
        // Upload to storage
        using var ms = new MemoryStream();
        await image.SaveAsJpegAsync(ms);
        ms.Position = 0;
        
        var fileName = $"profile-pictures/{userId}.jpg";
        var url = await _storageService.UploadAsync(fileName, ms, "image/jpeg");
        
        // Update user
        user.ProfilePictureUrl = url;
        user.UpdatedAt = DateTime.UtcNow;
        await _userManager.UpdateAsync(user);
        
        return Ok(new ProfilePictureResponse { Url = url });
    }
    
    [HttpPost("me/delete-account")]
    public async Task<IActionResult> DeleteAccount([FromBody] DeleteAccountDto dto)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        var user = await _userManager.FindByIdAsync(userId);
        
        if (user == null)
            return NotFound();
        
        // Verify password
        var passwordValid = await _userManager.CheckPasswordAsync(user, dto.Password);
        if (!passwordValid)
            return Unauthorized(new { message = "Invalid password" });
        
        // Soft delete and anonymize
        user.Email = $"deleted_{user.Id}@deleted.com";
        user.UserName = user.Email;
        user.FullName = "[Deleted User]";
        user.ProfilePictureUrl = null;
        user.EmailVerified = false;
        user.LockoutEnd = DateTimeOffset.MaxValue; // Lock account
        
        await _userManager.UpdateAsync(user);
        
        // Send confirmation
        await _emailService.SendAccountDeletionConfirmationAsync(dto.Password);
        
        return NoContent();
    }
}
```

### Frontend Profile Component
```typescript
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { UserService } from '../../services/user.service';
import { UserProfile } from '../../models';

@Component({
  selector: 'app-profile',
  standalone: true,
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss']
})
export class ProfileComponent implements OnInit {
  profileForm: FormGroup;
  user: UserProfile | null = null;
  isEditing = false;
  isLoading = false;
  
  constructor(
    private fb: FormBuilder,
    private userService: UserService
  ) {
    this.profileForm = this.fb.group({
      fullName: ['', [Validators.required, Validators.maxLength(200)]],
      email: ['', [Validators.required, Validators.email]],
      preferredLanguage: ['en', Validators.required]
    });
  }
  
  ngOnInit(): void {
    this.loadProfile();
  }
  
  loadProfile(): void {
    this.isLoading = true;
    this.userService.getCurrentUser().subscribe({
      next: (user) => {
        this.user = user;
        this.profileForm.patchValue({
          fullName: user.fullName,
          email: user.email,
          preferredLanguage: user.preferredLanguage
        });
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Failed to load profile', err);
        this.isLoading = false;
      }
    });
  }
  
  toggleEdit(): void {
    this.isEditing = !this.isEditing;
    if (!this.isEditing) {
      this.loadProfile(); // Reset changes
    }
  }
  
  onSubmit(): void {
    if (this.profileForm.invalid) return;
    
    this.isLoading = true;
    this.userService.updateProfile(this.profileForm.value).subscribe({
      next: (updated) => {
        this.user = updated;
        this.isEditing = false;
        this.isLoading = false;
        this.snackBar.open('Profile updated successfully', 'Close', { duration: 3000 });
      },
      error: (err) => {
        console.error('Failed to update profile', err);
        this.isLoading = false;
        this.snackBar.open('Failed to update profile', 'Close', { duration: 3000 });
      }
    });
  }
  
  onProfilePictureChange(event: any): void {
    const file = event.target.files[0];
    if (!file) return;
    
    this.userService.uploadProfilePicture(file).subscribe({
      next: (response) => {
        if (this.user) {
          this.user.profilePictureUrl = response.url;
        }
        this.snackBar.open('Profile picture updated', 'Close', { duration: 3000 });
      },
      error: (err) => {
        console.error('Failed to upload picture', err);
        this.snackBar.open('Failed to upload picture', 'Close', { duration: 3000 });
      }
    });
  }
}
```

### User Service
```typescript
@Injectable({ providedIn: 'root' })
export class UserService {
  constructor(private api: ApiService) {}
  
  getCurrentUser(): Observable<UserProfile> {
    return this.api.get<UserProfile>('users/me');
  }
  
  updateProfile(data: UpdateProfileDto): Observable<UserProfile> {
    return this.api.put<UserProfile>('users/me', data);
  }
  
  changePassword(data: ChangePasswordDto): Observable<void> {
    return this.api.post<void>('users/me/change-password', data);
  }
  
  uploadProfilePicture(file: File): Observable<{ url: string }> {
    const formData = new FormData();
    formData.append('file', file);
    
    return this.http.post<{ url: string }>(
      `${environment.apiUrl}/users/me/profile-picture`,
      formData
    );
  }
  
  deleteAccount(password: string): Observable<void> {
    return this.api.post<void>('users/me/delete-account', { password });
  }
}
```

---

## 🔗 Dependencies
- US8.2: JWT Auth Endpoints
- Cloudflare R2 or similar storage service

---

## 📊 Definition of Done
- [ ] All profile endpoints implemented
- [ ] Profile picture upload working
- [ ] Frontend profile page complete
- [ ] Form validation working
- [ ] Image resize/optimization working
- [ ] Account deletion (GDPR compliant)
- [ ] Unit tests pass
- [ ] E2E tests pass

---

**Created:** October 6, 2025  
**Owner:** Abubakr Abduraghman, a.abduraghman@itqan.dev  
**Epic:** [Epic 8: User Accounts & Personalization](../epics/epic-8-user-accounts-personalization.md)
