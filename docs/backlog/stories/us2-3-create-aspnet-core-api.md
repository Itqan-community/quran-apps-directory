# US2.3: Create Django REST Framework API Server

**Epic:** Epic 2 - Backend Infrastructure Setup
**Sprint:** Week 1, Day 3-4
**Story Points:** 8
**Priority:** P1
**Assigned To:** Backend Lead
**Status:** Not Started

---

## 📋 User Story

**As a** Backend Lead
**I want to** scaffold and configure a Django REST Framework API project
**So that** we have a production-ready API server with OpenAPI docs, middleware, and proper project structure

---

## 🎯 Acceptance Criteria

### AC1: Django Project Structure Created
- [ ] Django project structure organized:
  ```
  quran_apps_api/
  ├── quran_apps_api/        # Project settings
  │   ├── __init__.py
  │   ├── settings.py        # Django configuration
  │   ├── urls.py            # Root URL routing
  │   ├── asgi.py            # ASGI config
  │   └── wsgi.py            # WSGI config
  ├── apps/                  # Main app
  ├── users/                 # Users app
  ├── reviews/               # Reviews app
  ├── manage.py              # Django CLI
  ├── requirements.txt       # Python dependencies
  ├── .env                   # Environment variables
  └── .gitignore
  ```
- [ ] Django apps created (apps, users, reviews)
- [ ] Apps registered in INSTALLED_APPS

### AC2: Django REST Framework Configured
- [ ] DRF installed and configured in settings.py:
  ```python
  INSTALLED_APPS = [
      ...
      'rest_framework',
      'drf_spectacular',  # OpenAPI/drf-spectacular
      'corsheaders',      # CORS support
      ...
  ]
  ```
- [ ] REST_FRAMEWORK settings configured
- [ ] Pagination, filtering, throttling configured

### AC3: drf-spectacular/OpenAPI Setup
- [ ] drf-spectacular installed and configured
- [ ] OpenAPI schema at `/api/schema/`
- [ ] drf-spectacular UI at `/api/schema/swagger-ui/`
- [ ] ReDoc at `/api/schema/redoc/`
- [ ] API documentation auto-generated from docstrings

### AC4: CORS Configuration
- [ ] django-cors-headers installed and configured
- [ ] CORS policy defined for frontend origins:
  - Development: `http://localhost:4200`
  - Staging: `https://staging.quran-apps.itqan.dev`
  - Production: `https://quran-apps.itqan.dev`
- [ ] Credentials allowed for trusted origins

### AC5: Logging Configuration
- [ ] Structlog or Django logging configured
- [ ] Request logging middleware added
- [ ] Log levels configured per environment
- [ ] Logs output to console and file (development)

### AC6: Health Checks
- [ ] Health check endpoint at `/health/`
- [ ] Database health check included
- [ ] Returns 200 when healthy, 503 when degraded

### AC7: Development Environment
- [ ] Django development server runs: `python manage.py runserver`
- [ ] Auto-reload configured
- [ ] Debug mode enabled in development
- [ ] Server accessible at `http://localhost:8000`

---

## 📝 Technical Notes

### requirements.txt
```
Django==5.2.0
djangorestframework==3.14.0
drf-spectacular==0.26.5
django-cors-headers==4.3.0
django-allauth==0.59.0
djangorestframework-simplejwt==5.3.0
psycopg2-binary==2.9.0
python-decouple==3.8
gunicorn==21.2.0
```

### Django settings.py Configuration
```python
from pathlib import Path
import os
from decouple import config

BASE_DIR = Path(__file__).resolve().parent.parent

# DRF Configuration
REST_FRAMEWORK = {
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 20,
    'DEFAULT_FILTER_BACKENDS': [
        'django_filters.rest_framework.DjangoFilterBackend',
        'rest_framework.filters.SearchFilter',
        'rest_framework.filters.OrderingFilter',
    ],
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle'
    ],
    'DEFAULT_THROTTLE_RATES': {
        'anon': '100/hour',
        'user': '1000/hour'
    }
}

# CORS Configuration
CORS_ALLOWED_ORIGINS = [
    'http://localhost:4200',
    'https://staging.quran-apps.itqan.dev',
    'https://quran-apps.itqan.dev',
]

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'rest_framework',
    'drf_spectacular',
    'corsheaders',
    'apps.apps.AppsConfig',
    'users.apps.UsersConfig',
    'reviews.apps.ReviewsConfig',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
]
```

### urls.py Configuration
```python
from django.contrib import admin
from django.urls import path, include
from drf_spectacular.views import SpectacularAPIView, Spectaculardrf-spectacularView, SpectacularRedocView

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/v1/apps/', include('apps.urls')),
    path('api/v1/users/', include('users.urls')),
    path('api/v1/reviews/', include('reviews.urls')),
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/schema/swagger-ui/', Spectaculardrf-spectacularView.as_view(url_name='schema')),
    path('api/schema/redoc/', SpectacularRedocView.as_view(url_name='schema')),
    path('health/', lambda r: JsonResponse({'status': 'ok'})),
]
```

---

## 🔗 Dependencies
- US2.1: Database Server Setup
- US2.2: Implement Django ORM

---

## 📊 Definition of Done
- [ ] Django REST Framework configured
- [ ] drf-spectacular/OpenAPI working
- [ ] drf-spectacular UI accessible at `/api/schema/swagger-ui/`
- [ ] ReDoc accessible at `/api/schema/redoc/`
- [ ] CORS properly configured
- [ ] Health check endpoint working
- [ ] Logging configured
- [ ] All middleware tested
- [ ] Code review passed
- [ ] Development server runs successfully

---

**Created:** October 6, 2025
**Owner:** Abubakr Abduraghman, a.abduraghman@itqan.dev
**Updated:** October 19, 2025 (Django alignment)
**Epic:** [Epic 2: Backend Infrastructure Setup](../epics/epic-2-backend-infrastructure-setup.md)

