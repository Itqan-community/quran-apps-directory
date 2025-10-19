# US2.5: Implement Django JWT Authentication & Security Middleware

**Epic:** Epic 2 - Backend Infrastructure Setup
**Sprint:** Week 1, Day 5
**Story Points:** 5
**Priority:** P1
**Assigned To:** Backend Developer
**Status:** Not Started

---

## 📋 User Story

**As a** Backend Developer
**I want to** implement JWT authentication and security middleware in Django
**So that** the API is protected from unauthorized access and common security vulnerabilities

---

## 🎯 Acceptance Criteria

### AC1: djangorestframework-simplejwt Configured
- [ ] djangorestframework-simplejwt installed in requirements.txt
- [ ] JWT authentication configured in settings.py:
  ```python
  INSTALLED_APPS = [
      ...
      'rest_framework_simplejwt',
  ]

  REST_FRAMEWORK = {
      'DEFAULT_AUTHENTICATION_CLASSES': (
          'rest_framework_simplejwt.authentication.JWTAuthentication',
      ),
  }
  ```
- [ ] Token generation endpoints at `/api/token/` and `/api/token/refresh/`
- [ ] Token expiration set (15 minutes for access, 7 days for refresh)
- [ ] Refresh token rotation implemented

### AC2: Rate Limiting & Throttling
- [ ] DRF throttling configured:
  - Anonymous: 100 requests/hour
  - Authenticated: 1000 requests/hour
- [ ] Throttle classes applied to ViewSets
- [ ] Rate limit headers added to responses

### AC3: Exception Handler Middleware
- [ ] Custom exception handler middleware implemented
- [ ] Consistent error responses returned (JSON format)
- [ ] Sensitive information hidden in production
- [ ] Errors logged with Django logging

### AC4: Security Headers Middleware
- [ ] django-csp (Content Security Policy) installed
- [ ] HTTPS enforcement via settings (SECURE_SSL_REDIRECT)
- [ ] X-Content-Type-Options: nosniff
- [ ] X-Frame-Options: DENY
- [ ] X-XSS-Protection configured

### AC5: Input Validation & Serializers
- [ ] DRF serializer validation integrated
- [ ] Custom validators implemented for business rules
- [ ] Validation error responses standardized
- [ ] Request data sanitization applied

### AC6: CORS Security
- [ ] django-cors-headers configured
- [ ] CORS_ALLOWED_ORIGINS restricted to trusted domains
- [ ] Credentials allowed only for trusted origins
- [ ] PREFLIGHT_CACHE_TIME configured

---

## 📝 Technical Notes

### JWT Configuration in settings.py
```python
from datetime import timedelta

# Simple JWT Configuration
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=15),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'UPDATE_LAST_LOGIN': False,
    'ALGORITHM': 'HS256',
    'SIGNING_KEY': SECRET_KEY,
    'VERIFYING_KEY': None,
    'AUTH_HEADER_TYPES': ('Bearer',),
    'AUTH_HEADER_NAME': 'HTTP_AUTHORIZATION',
    'USER_ID_FIELD': 'id',
    'USER_ID_CLAIM': 'user_id',
}
```

### JWT URLs Configuration
```python
# urls.py
from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

urlpatterns = [
    # JWT endpoints
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
]
```

### Protected ViewSet Example
```python
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.throttling import UserRateThrottle

class AppViewSet(viewsets.ModelViewSet):
    queryset = App.objects.all()
    serializer_class = AppSerializer

    # Public endpoints (no auth required)
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)

    # Protected endpoint (auth required)
    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def favorite(self, request, pk=None):
        app = self.get_object()
        # ... favorite logic
        return Response({'status': 'favorited'})
```

### Security Middleware Configuration
```python
# settings.py

# Security headers
SECURE_SSL_REDIRECT = not DEBUG  # Force HTTPS in production
SESSION_COOKIE_SECURE = not DEBUG
CSRF_COOKIE_SECURE = not DEBUG
SECURE_HSTS_SECONDS = 31536000 if not DEBUG else 0
SECURE_HSTS_INCLUDE_SUBDOMAINS = not DEBUG
SECURE_HSTS_PRELOAD = not DEBUG

# Content Security Policy
CSP_DEFAULT_SRC = ("'self'",)
CSP_SCRIPT_SRC = ("'self'", "cdn.example.com")
CSP_STYLE_SRC = ("'self'", "'unsafe-inline'")

# Additional security headers
X_FRAME_OPTIONS = 'DENY'
SECURE_CONTENT_SECURITY_POLICY = {
    'default-src': ("'self'",),
}
```

### Exception Handler Middleware
```python
# middleware.py
from django.http import JsonResponse
import logging

logger = logging.getLogger(__name__)

class GlobalExceptionMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        try:
            response = self.get_response(request)
            return response
        except Exception as e:
            logger.error(f"Unhandled exception: {str(e)}", exc_info=True)

            return JsonResponse({
                'error': {
                    'message': 'Internal server error',
                    'code': 'INTERNAL_SERVER_ERROR'
                }
            }, status=500)

# Add to MIDDLEWARE in settings.py
MIDDLEWARE = [
    ...
    'apps.middleware.GlobalExceptionMiddleware',
]
```

---

## 🔗 Dependencies
- US2.3: Create Django REST Framework API
- US2.2: Django ORM configured

---

## 📊 Definition of Done
- [ ] djangorestframework-simplejwt installed
- [ ] JWT token endpoints working (`/api/token/`, `/api/token/refresh/`)
- [ ] Access/refresh token generation verified
- [ ] Token expiration working correctly
- [ ] DRF throttling/rate limiting functional
- [ ] Exception handler middleware tested
- [ ] Security headers verified in responses
- [ ] CORS security configured
- [ ] Input validation tested
- [ ] Security audit passed
- [ ] Documentation updated

---

**Created:** October 6, 2025
**Owner:** Abubakr Abduraghman, a.abduraghman@itqan.dev
**Updated:** October 19, 2025 (Django alignment)
**Epic:** [Epic 2: Backend Infrastructure Setup](../epics/epic-2-backend-infrastructure-setup.md)

