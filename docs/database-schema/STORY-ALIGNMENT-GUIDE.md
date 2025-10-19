# Story Alignment Guide - Remaining 9 Stories (US8.1-8.9)

**Status:** 5 of 17 stories completed (29%)
**Remaining:** 9 stories (all in Epic 8 - User Accounts & Personalization)
**Estimated Time:** 2-3 hours for manual updates

---

## Quick Reference: Find & Replace Patterns

### Global Replacements

| Find | Replace | Pattern |
|------|---------|---------|
| `Django Core Identity` | `django-allauth` | Framework change |
| `Django` | `Django` | Framework reference |
| `Django User Model<ApplicationUser>` | Django User model methods | Auth management |
| `IdentityResult` | Django validation results | Result types |
| `Django` | `Python` | Tech stack |
| `C#` | `Python` | Language |
| `pip` | `pip` | Package manager |
| `.csproj` | `requirements.txt` | Dependencies |
| `appsettings.json` | `settings.py` | Configuration |
| `[HttpPost]` | `@action(methods=['post'])` | Decorators |
| `[Authorize]` | `@permission_classes([IsAuthenticated])` | Auth decorators |
| `Django ORM` | `Django ORM` | ORM |
| `DbContext` | `Django Models` | Data context |

---

## Story-by-Story Update Guide

### US8.1: Implement django-allauth Authentication

**Current Title:** "Implement Django Core Identity"
**New Title:** "Implement django-allauth Authentication"

**Key Changes:**
1. Replace "Django Core Identity" with "django-allauth" throughout
2. Update AC1-AC5 to reference Django models instead of Identity entities
3. Replace Python code examples with Python/Django code
4. Change pip packages to pip packages
5. Update configuration from appsettings.json to settings.py

**Dependencies to Mention:**
```
django-allauth==0.59.0
djangorestframework-simplejwt==5.3.0
```

**Key Acceptance Criteria Updates:**
- AC1: Custom User model extending Django AbstractUser
- AC2: django-allauth password policies
- AC3: Database tables created via Django migrations
- AC4: Predefined roles via Django's Groups
- AC5: Django ORM configuration
- AC6: django-allauth services registration

---

### US8.2: Implement JWT Authentication Endpoints

**Current Title:** "Implement JWT Authentication Endpoints"
**New Title:** "Implement JWT Authentication Endpoints (Django)"

**Key Changes:**
1. Replace Auth ViewSet (C#) with DRF ViewSet (Python)
2. Update endpoint paths to Django conventions
3. Replace `Django User Model` with Django User model
4. Update token generation to use `djangorestframework-simplejwt`
5. Replace Python async patterns with Python async/await

**Key Code Pattern Changes:**
- C#: `[HttpPost("register")]` → Python: `@action(detail=False, methods=['post'])`
- C#: `Django User Model.CreateAsync()` → Python: `User.objects.create_user()`
- C#: `_tokenService.GenerateTokenAsync()` → Python: `TokenObtainPairView.post()`

---

### US8.3: Implement OAuth 2.0 Providers

**Current Title:** "Implement OAuth 2.0 Providers (Google, Apple, Facebook)"
**New Title:** "Implement OAuth 2.0 Providers (Google, Apple, Facebook) with django-allauth"

**Key Changes:**
1. Replace OAuth controller with django-allauth adapters
2. django-allauth has built-in OAuth support - simplifies implementation
3. Update configuration from Python to Django settings.py
4. Replace HttpClient calls with Django's requests

**Benefits of django-allauth:**
- Built-in OAuth support (no custom service classes needed)
- Pre-configured Google, Apple, Facebook adapters
- Automatic user creation and account linking
- Email handling built-in

**Dependencies:**
```
django-allauth==0.59.0
```

---

### US8.4: Create User Profile Management

**Current Title:** "Create User Profile Management"
**New Title:** "Create User Profile Management (Django + DRF)"

**Key Changes:**
1. Replace Python UsersViewSet with DRF ViewSet
2. Update to use Django User model methods
3. Replace file upload to Cloudflare R2 with django-storages
4. Update Angular component references to Django API endpoints
5. Replace Python image processing (Image.Load) with Pillow

**Dependencies:**
```
Pillow==10.0.0
django-storages==1.14.2
boto3==1.26.0  # For R2
```

---

### US8.5: Implement Email Service

**Current Title:** "Implement Email Service"
**New Title:** "Implement Email Service (Django + SendGrid)"

**Key Changes:**
1. Replace Python SendGrid implementation with Django SendGrid integration
2. Update email templates storage
3. Replace async Python patterns with Django Celery tasks
4. Update configuration from appsettings.json to settings.py

**Dependencies:**
```
sendgrid==6.10.0
django-celery-beat==2.5.0
celery==5.3.0
```

---

### US8.6: Add Two-Factor Authentication

**Current Title:** "Add Two-Factor Authentication"
**New Title:** "Add Two-Factor Authentication (TOTP with django-otp)"

**Key Changes:**
1. Replace Django 2FA implementation with django-otp
2. Update TOTP generation to use django-otp
3. Replace backup code generation logic
4. Update frontend integration points

**Dependencies:**
```
django-otp==1.1.3
qrcode==7.4.2
```

---

### US8.7: Build User Activity Tracking

**Current Title:** "Build User Activity Tracking"
**New Title:** "Build User Activity Tracking (Django Signals + Celery)"

**Key Changes:**
1. Replace Python activity logging service with Django signals
2. Use Celery for async activity logging
3. Update database calls to Django ORM
4. Replace Python datetime patterns with Python datetime

**Django Patterns:**
- Use `post_save` signals for automatic logging
- Use Celery tasks for background processing

---

### US8.8: Implement Notification System

**Current Title:** "Implement Notification System"
**New Title:** "Implement Notification System (Django + Celery + SendGrid)"

**Key Changes:**
1. Replace Python notification service with Django service
2. Use Celery for async email delivery
3. Update in-app notifications with Django models
4. Replace email template rendering

**Key Components:**
- Notification model in Django
- EmailLog model for tracking
- Celery tasks for async delivery

---

### US8.9: Create Privacy & GDPR Compliance

**Current Title:** "Create Privacy & GDPR Compliance"
**New Title:** "Create Privacy & GDPR Compliance (Django Privacy Toolkit)"

**Key Changes:**
1. Replace Python GDPR implementation with Django privacy libraries
2. Update data export format (JSON/CSV via Django)
3. Replace account deletion logic with Django ORM
4. Update data retention policies

**Dependencies:**
```
django-privacy-toolkit==1.0.0
```

---

## Implementation Checklist

For each remaining story (US8.1-8.9):

- [ ] Update title (Django → Django)
- [ ] Update user story description
- [ ] Update all acceptance criteria (AC1-AC7)
- [ ] Replace Python code examples with Python code
- [ ] Update technical configuration sections
- [ ] Replace pip packages with pip packages
- [ ] Update dependency links (point to Django docs)
- [ ] Update definition of done (Django patterns)
- [ ] Add "Updated: October 19, 2025 (Django alignment)" note
- [ ] Update resources section with Django/DRF links

---

## Recommended Approach

### Option 1: Rapid Batch Updates (Recommended)
1. Use find-and-replace for consistent patterns
2. Manually review each story after batch updates
3. Test understanding of changes

**Time:** ~1-2 hours

### Option 2: Manual Individual Updates
1. Read each story carefully
2. Rewrite with full Django context
3. Ensure all examples are correct

**Time:** ~3-4 hours

### Option 3: Hybrid Approach
1. Use batch replacements for titles and basic content
2. Manually review and enhance technical sections
3. Ensure code examples are accurate

**Time:** ~2-3 hours

---

## Key Django Libraries to Reference

| Function | Library | Documentation |
|----------|---------|---|
| Authentication | django-allauth | https://django-allauth.readthedocs.io/ |
| JWT Tokens | djangorestframework-simplejwt | https://django-rest-framework-simplejwt.readthedocs.io/ |
| Email | django-anymail or sendgrid | https://anymail.readthedocs.io/ |
| 2FA | django-otp | https://django-otp.readthedocs.io/ |
| Background Tasks | Celery | https://docs.celeryproject.org/ |
| File Storage | django-storages | https://django-storages.readthedocs.io/ |
| Images | Pillow | https://pillow.readthedocs.io/ |
| Data Export | django-data-exports | - |
| Signals | Django built-in | https://docs.djangoproject.com/en/5.2/topics/signals/ |

---

## Common Code Pattern Conversions

### Pattern 1: Authentication Check

**Django:**
```python
[Authorize]
public async Task<Response<UserDto>> GetUser()
{
    var userId = User.FindFirst(JWT claims.NameIdentifier)?.Value;
    var user = await _userManager.FindByIdAsync(userId);
    return Ok(user);
}
```

**Django:**
```python
@action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
def get_user(self, request):
    user = request.user
    return Response(UserSerializer(user).data)
```

### Pattern 2: Create Record

**Django:**
```python
var user = new ApplicationUser { Email = dto.Email };
var result = await _userManager.CreateAsync(user, dto.Password);
```

**Django:**
```python
user = User.objects.create_user(email=data['email'], password=data['password'])
```

### Pattern 3: Async Task

**Django:**
```python
await _emailService.SendEmailAsync(email, subject, body);
```

**Django:**
```python
send_email.delay(email, subject, body)  # Celery task
```

---

## Validation Points

After updating each story, verify:

- ✅ All Python code replaced with Python code
- ✅ All pip packages replaced with pip packages
- ✅ All Django references updated to Django
- ✅ All URLs use Django routing conventions (`/api/v1/...`)
- ✅ All permission decorators use DRF patterns
- ✅ Dependencies section mentions Django packages
- ✅ Resources links point to Django documentation
- ✅ Definition of done uses Django terminology
- ✅ Timestamps updated to October 19, 2025
- ✅ Epic reference still points to correct epic

---

## Timeline Estimate

| Task | Time | Cumulative |
|------|------|-----------|
| Complete 5 stories (done) | 1.5 hrs | 1.5 hrs |
| Update US8.1-8.3 (critical auth) | 1.5 hrs | 3 hrs |
| Update US8.4-8.6 (core features) | 1 hr | 4 hrs |
| Update US8.7-8.9 (supporting) | 1 hr | 5 hrs |
| Review & validation | 0.5 hrs | 5.5 hrs |
| **TOTAL** | - | **~5.5 hours** |

---

## Success Criteria

All 17 stories are successfully aligned when:

1. ✅ All titles changed from Django to Django
2. ✅ All code examples use Python/DRF
3. ✅ All technical notes reference Django patterns
4. ✅ All dependencies use pip packages
5. ✅ All acceptance criteria use Django terminology
6. ✅ All resources link to correct documentation
7. ✅ All timestamps updated to October 19, 2025
8. ✅ Team briefed on Django choice

---

## Next Steps

1. **Immediate:** Update US8.1-8.3 (core auth - critical path)
2. **Short term:** Update US8.4-8.6 (core features)
3. **Complete:** Update US8.7-8.9 (supporting features)
4. **Final:** Team review and approval

**Recommendation:** Start with the hybrid approach:
- Use find-and-replace for consistent pattern changes
- Manually verify/enhance critical auth stories (US8.1-8.3)
- Standard updates for remaining stories

