# Django Backend API Architecture Supplement
# Quran Apps Directory - Backend Implementation Guide

**Document Version:** 2.0  
**Date:** October 2025  
**Architect:** ITQAN Architecture Team  
**Owner:** Abubakr Abduraghman, a.abduraghman@itqan.dev  
**Status:** Technical Implementation Guide

---

## 🎯 Purpose

This document supplements the main architecture document with Django backend API implementation details, code examples, and best practices, including Django Admin integration.

---

## 📦 Technology Stack (Django)

### Core Stack
```
- Framework: Django 5.2 (latest LTS)
- Language: Python 3.12+
- ORM: Django ORM
- Database Driver: psycopg2-binary (PostgreSQL)
- API Framework: Django REST Framework (DRF)
- Admin Interface: Django Admin (built-in)
- Authentication: Django Auth + JWT (djangorestframework-simplejwt)
- Caching: Django Redis cache
- Task Queue: Celery (optional, for background tasks)
- API Documentation: drf-spectacular (OpenAPI/drf-spectacular)
- Testing: Django Test Framework + pytest
- Environment: Poetry (dependency management)
```

### Key Python Packages (requirements.txt)
```txt
# Core Django
Django==5.2.*
djangorestframework==3.15.*
psycopg2-binary==2.9.*

# Authentication & Security
djangorestframework-simplejwt==5.3.*
django-cors-headers==4.4.*

# API Documentation
drf-spectacular==0.27.*

# Caching & Performance
django-redis==5.4.*
Pillow==10.4.*  # Image handling

# Development & Testing
pytest==8.3.*
pytest-django==4.8.*
factory-boy==3.3.*  # Test data generation

# Optional: Background Tasks
celery==5.4.*
redis==5.0.*

# Environment & Deployment
python-decouple==3.8.*  # Environment variables
gunicorn==22.0.*       # WSGI server
whitenoise==6.7.*      # Static files in production
```

---

## 🏗️ Project Structure

```
quran_apps_directory/
├── quran_apps/                    # Main Django project
│   ├── __init__.py
│   ├── settings.py               # Django settings
│   ├── urls.py                   # Main URL configuration
│   ├── wsgi.py                   # WSGI application
│   └── asgi.py                   # ASGI application
│
├── apps/                         # Django apps (modular components)
│   ├── apps/                     # Apps management
│   │   ├── __init__.py
│   │   ├── admin.py             # Django Admin configuration
│   │   ├── models.py            # Django models
│   │   ├── views.py             # API views (DRF)
│   │   ├── serializers.py       # DRF serializers
│   │   ├── urls.py              # App URLs
│   │   ├── tests.py             # Unit tests
│   │   └── migrations/          # Database migrations
│   │
│   ├── users/                    # User management
│   │   ├── __init__.py
│   │   ├── admin.py
│   │   ├── models.py
│   │   ├── views.py
│   │   ├── serializers.py
│   │   ├── urls.py
│   │   ├── tests.py
│   │   └── migrations/
│   │
│   ├── categories/               # Categories management
│   │   ├── __init__.py
│   │   ├── admin.py
│   │   ├── models.py
│   │   ├── views.py
│   │   ├── serializers.py
│   │   ├── urls.py
│   │   ├── tests.py
│   │   └── migrations/
│   │
│   ├── developers/               # Developer profiles
│   │   ├── __init__.py
│   │   ├── admin.py
│   │   ├── models.py
│   │   ├── views.py
│   │   ├── serializers.py
│   │   ├── urls.py
│   │   ├── tests.py
│   │   └── migrations/
│   │
│   └── reviews/                  # Reviews and ratings
│       ├── __init__.py
│       ├── admin.py
│       ├── models.py
│       ├── views.py
│       ├── serializers.py
│       ├── urls.py
│       ├── tests.py
│       └── migrations/
│
├── core/                         # Shared/core functionality
│   ├── __init__.py
│   ├── models.py                 # Base models, mixins
│   ├── serializers.py            # Base serializers
│   ├── permissions.py            # Custom permissions
│   ├── pagination.py             # Custom pagination
│   ├── filters.py                # Custom filters
│   └── utils.py                  # Utility functions
│
├── config/                       # Configuration files
│   ├── __init__.py
│   ├── settings/
│   │   ├── __init__.py
│   │   ├── base.py               # Base settings
│   │   ├── local.py              # Local development
│   │   ├── staging.py            # Staging environment
│   │   └── production.py         # Production settings
│   └── urls.py
│
├── static/                       # Static files
├── media/                        # User uploaded files
├── templates/                    # Django templates (for admin)
├── docs/                         # API documentation
├── requirements/                 # Dependencies
│   ├── base.txt
│   ├── local.txt
│   ├── staging.txt
│   └── production.txt
├── manage.py                     # Django management script
├── pytest.ini                    # pytest configuration
├── docker-compose.yml            # Docker services
├── Dockerfile                    # Docker image
└── .env.example                  # Environment variables template
```

---

## 💾 Django Models Implementation

### Django Settings Configuration

```python
# config/settings/base.py
import os
from pathlib import Path
from decouple import config

BASE_DIR = Path(__file__).resolve().parent.parent.parent

SECRET_KEY = config('SECRET_KEY')
DEBUG = config('DEBUG', default=False, cast=bool)
ALLOWED_HOSTS = config('ALLOWED_HOSTS', default='localhost').split(',')

# Database
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': config('DB_NAME'),
        'USER': config('DB_USER'),
        'PASSWORD': config('DB_PASSWORD'),
        'HOST': config('DB_HOST', default='localhost'),
        'PORT': config('DB_PORT', default='5432'),
    }
}

# Installed Apps
INSTALLED_APPS = [
    'django.contrib.admin',          # Django Admin
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',

    # Third-party apps
    'rest_framework',                # DRF for API
    'rest_framework_simplejwt',      # JWT authentication
    'corsheaders',                   # CORS headers
    'drf_spectacular',              # API documentation

    # Project apps
    'core',
    'apps.apps.AppsConfig',
    'users',
    'categories',
    'developers',
    'reviews',
]

# REST Framework
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticatedOrReadOnly',
    ],
    'DEFAULT_PAGINATION_CLASS': 'core.pagination.StandardResultsSetPagination',
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
}
```

### Core Models (Base Classes)

```python
# core/models.py
from django.db import models
from django.utils import timezone
from django.contrib.auth.models import AbstractUser

class BaseModel(models.Model):
    """Base model with common fields"""
    created_at = models.DateTimeField(default=timezone.now, editable=False)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True

class PublishedModel(BaseModel):
    """Model with publishing functionality"""
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('published', 'Published'),
        ('archived', 'Archived'),
    ]

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='published'
    )
    published_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        abstract = True

    def publish(self):
        self.status = 'published'
        self.published_at = timezone.now()
        self.save()

class User(AbstractUser):
    """Custom user model"""
    ROLE_CHOICES = [
        ('user', 'User'),
        ('developer', 'Developer'),
        ('admin', 'Admin'),
    ]

    role = models.CharField(
        max_length=20,
        choices=ROLE_CHOICES,
        default='user'
    )

    class Meta:
        db_table = 'users'
```

### App Model Example

```python
# apps/models.py
from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils.text import slugify
from core.models import PublishedModel

class App(PublishedModel):
    """Quran application model"""
    name_ar = models.CharField(max_length=255, verbose_name="Arabic Name")
    name_en = models.CharField(max_length=255, verbose_name="English Name")

    short_description_ar = models.TextField(verbose_name="Arabic Short Description")
    short_description_en = models.TextField(verbose_name="English Short Description")

    description_ar = models.TextField(verbose_name="Arabic Description")
    description_en = models.TextField(verbose_name="English Description")

    slug = models.SlugField(unique=True, max_length=255)

    sort_order = models.PositiveIntegerField(null=True, blank=True)

    avg_rating = models.DecimalField(
        max_digits=3,
        decimal_places=2,
        default=0.00,
        validators=[MinValueValidator(0), MaxValueValidator(5)]
    )
    review_count = models.PositiveIntegerField(default=0)
    view_count = models.PositiveIntegerField(default=0)

    # Media fields
    application_icon = models.URLField(blank=True, null=True)
    main_image_ar = models.URLField(blank=True, null=True)
    main_image_en = models.URLField(blank=True, null=True)

    # Store links
    google_play_link = models.URLField(blank=True, null=True)
    app_store_link = models.URLField(blank=True, null=True)
    app_gallery_link = models.URLField(blank=True, null=True)

    # Relationships
    developer = models.ForeignKey(
        'developers.Developer',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='apps'
    )
    categories = models.ManyToManyField(
        'categories.Category',
        related_name='apps',
        blank=True
    )

    class Meta:
        db_table = 'apps'
        ordering = ['-avg_rating', 'name_en']
        indexes = [
            models.Index(fields=['slug']),
            models.Index(fields=['avg_rating']),
            models.Index(fields=['status']),
            models.Index(fields=['developer']),
        ]

    def __str__(self):
        return self.name_en

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name_en)
        super().save(*args, **kwargs)

    @property
    def rating_display(self):
        return f"{self.avg_rating:.1f}"
```

### Django Admin Configuration

```python
# apps/admin.py
from django.contrib import admin
from django.utils.html import format_html
from .models import App

@admin.register(App)
class AppAdmin(admin.ModelAdmin):
    list_display = [
        'name_en', 'name_ar', 'developer', 'avg_rating',
        'review_count', 'status', 'published_at'
    ]
    list_filter = ['status', 'categories', 'developer', 'avg_rating']
    search_fields = ['name_en', 'name_ar', 'slug']
    readonly_fields = ['avg_rating', 'review_count', 'view_count', 'created_at', 'updated_at']
    ordering = ['-avg_rating', 'name_en']

    fieldsets = (
        ('Basic Information', {
            'fields': ('name_en', 'name_ar', 'slug', 'status')
        }),
        ('Descriptions', {
            'fields': ('short_description_en', 'short_description_ar',
                      'description_en', 'description_ar'),
            'classes': ('collapse',)
        }),
        ('Media', {
            'fields': ('application_icon', 'main_image_en', 'main_image_ar'),
            'classes': ('collapse',)
        }),
        ('Store Links', {
            'fields': ('google_play_link', 'app_store_link', 'app_gallery_link'),
            'classes': ('collapse',)
        }),
        ('Relationships', {
            'fields': ('developer', 'categories')
        }),
        ('Statistics', {
            'fields': ('avg_rating', 'review_count', 'view_count', 'sort_order'),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at', 'published_at'),
            'classes': ('collapse',)
        }),
    )

    def get_queryset(self, request):
        return super().get_queryset(request).select_related('developer')
```

---

## 🔌 Django REST Framework API Implementation

### DRF Serializers

```python
# apps/serializers.py
from rest_framework import serializers
from django.utils.text import slugify
from .models import App

class CategorySerializer(serializers.Serializer):
    """Category serializer for app responses"""
    id = serializers.UUIDField()
    name_en = serializers.CharField()
    name_ar = serializers.CharField()
    slug = serializers.CharField()

class DeveloperSerializer(serializers.Serializer):
    """Developer serializer for app responses"""
    id = serializers.UUIDField()
    name_en = serializers.CharField()
    name_ar = serializers.CharField()
    slug = serializers.CharField()

class ScreenshotSerializer(serializers.Serializer):
    """Screenshot serializer"""
    id = serializers.UUIDField()
    url = serializers.URLField()
    language = serializers.CharField()

class AppListSerializer(serializers.ModelSerializer):
    """Serializer for app list views"""
    developer = DeveloperSerializer(read_only=True)
    categories = CategorySerializer(many=True, read_only=True)
    rating_display = serializers.ReadOnlyField()

    class Meta:
        model = App
        fields = [
            'id', 'name_en', 'name_ar', 'slug',
            'short_description_en', 'short_description_ar',
            'avg_rating', 'rating_display', 'review_count',
            'application_icon', 'developer', 'categories',
            'created_at', 'status'
        ]

class AppDetailSerializer(serializers.ModelSerializer):
    """Serializer for app detail views"""
    developer = DeveloperSerializer(read_only=True)
    categories = CategorySerializer(many=True, read_only=True)
    screenshots = ScreenshotSerializer(many=True, read_only=True)
    rating_display = serializers.ReadOnlyField()

    class Meta:
        model = App
        fields = [
            'id', 'name_en', 'name_ar', 'slug',
            'short_description_en', 'short_description_ar',
            'description_en', 'description_ar',
            'avg_rating', 'rating_display', 'review_count', 'view_count',
            'application_icon', 'main_image_en', 'main_image_ar',
            'google_play_link', 'app_store_link', 'app_gallery_link',
            'developer', 'categories', 'screenshots',
            'created_at', 'updated_at', 'published_at', 'status'
        ]

class AppCreateUpdateSerializer(serializers.ModelSerializer):
    """Serializer for creating/updating apps"""
    slug = serializers.CharField(read_only=True)

    class Meta:
        model = App
        fields = [
            'name_en', 'name_ar', 'slug',
            'short_description_en', 'short_description_ar',
            'description_en', 'description_ar',
            'application_icon', 'main_image_en', 'main_image_ar',
            'google_play_link', 'app_store_link', 'app_gallery_link',
            'developer', 'categories', 'status', 'sort_order'
        ]

    def create(self, validated_data):
        validated_data['slug'] = slugify(validated_data['name_en'])
        return super().create(validated_data)

    def update(self, instance, validated_data):
        if 'name_en' in validated_data:
            validated_data['slug'] = slugify(validated_data['name_en'])
        return super().update(instance, validated_data)
```

### DRF Views and ViewSets

```python
# apps/views.py
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticatedOrReadOnly
from django_filters.rest_framework import DjangoFilterBackend
from django.core.cache import cache
from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_page
from django.db.models import Q, Prefetch

from core.permissions import IsAdminOrDeveloper, IsAdmin
from core.pagination import StandardResultsSetPagination
from .models import App
from .serializers import (
    AppListSerializer, AppDetailSerializer,
    AppCreateUpdateSerializer
)
from .filters import AppFilter

class AppViewSet(viewsets.ModelViewSet):
    """ViewSet for Quran applications"""
    queryset = App.objects.select_related('developer').prefetch_related(
        'categories', 'screenshots'
    ).filter(status='published')
    permission_classes = [IsAuthenticatedOrReadOnly]
    pagination_class = StandardResultsSetPagination
    filter_backends = [DjangoFilterBackend]
    filterset_class = AppFilter

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return AppCreateUpdateSerializer
        elif self.action == 'retrieve':
            return AppDetailSerializer
        return AppListSerializer

    def get_permissions(self):
        if self.action in ['create', 'destroy']:
            return [IsAdmin()]
        elif self.action in ['update', 'partial_update']:
            return [IsAdminOrDeveloper()]
        return super().get_permissions()

    def get_queryset(self):
        queryset = super().get_queryset()

        # Allow admins to see all apps including drafts
        if self.request.user.is_staff or self.request.user.role == 'admin':
            queryset = App.objects.select_related('developer').prefetch_related(
                'categories', 'screenshots'
            )

        # Apply search
        search = self.request.query_params.get('search', '')
        if search:
            queryset = queryset.filter(
                Q(name_en__icontains=search) |
                Q(name_ar__icontains=search) |
                Q(description_en__icontains=search) |
                Q(description_ar__icontains=search)
            )

        return queryset

    @method_decorator(cache_page(60 * 5))  # Cache for 5 minutes
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)

    def retrieve(self, request, *args, **kwargs):
        # Increment view count
        instance = self.get_object()
        instance.view_count += 1
        instance.save(update_fields=['view_count'])

        # Cache individual app details
        cache_key = f'app:{instance.id}'
        cached_data = cache.get(cache_key)
        if cached_data:
            return Response(cached_data)

        response = super().retrieve(request, *args, **kwargs)
        cache.set(cache_key, response.data, 60 * 5)  # Cache for 5 minutes
        return response

    @action(detail=True, methods=['get'])
    def by_slug(self, request, pk=None):
        """Get app by slug"""
        try:
            app = self.get_queryset().get(slug=pk)
            serializer = self.get_serializer(app)
            return Response(serializer.data)
        except App.DoesNotExist:
            return Response(
                {'error': 'App not found'},
                status=status.HTTP_404_NOT_FOUND
            )

    def perform_create(self, serializer):
        # Clear cache when creating new app
        cache.delete_pattern('app:*')
        serializer.save()

    def perform_update(self, serializer):
        # Clear cache when updating app
        instance = serializer.instance
        cache.delete(f'app:{instance.id}')
        cache.delete(f'app:slug:{instance.slug}')
        cache.delete_pattern('app:*')
        serializer.save()

    def perform_destroy(self, instance):
        # Clear cache when deleting app
        cache.delete(f'app:{instance.id}')
        cache.delete(f'app:slug:{instance.slug}')
        cache.delete_pattern('app:*')
        instance.delete()
```

### Custom Filters

```python
# apps/filters.py
import django_filters
from .models import App

class AppFilter(django_filters.FilterSet):
    """Custom filters for apps"""
    category = django_filters.CharFilter(
        field_name='categories__slug',
        lookup_expr='iexact'
    )
    developer = django_filters.UUIDFilter(
        field_name='developer_id'
    )
    rating_min = django_filters.NumberFilter(
        field_name='avg_rating',
        lookup_expr='gte'
    )
    rating_max = django_filters.NumberFilter(
        field_name='avg_rating',
        lookup_expr='lte'
    )
    status = django_filters.ChoiceFilter(
        choices=App.STATUS_CHOICES
    )

    class Meta:
        model = App
        fields = ['category', 'developer', 'rating_min', 'rating_max', 'status']
```

---

## 🔐 Django JWT Authentication Implementation

### JWT Settings Configuration

```python
# config/settings/base.py
from datetime import timedelta

# JWT Settings
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticatedOrReadOnly',
    ],
    'DEFAULT_PAGINATION_CLASS': 'core.pagination.StandardResultsSetPagination',
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
}

# Simple JWT Configuration
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=15),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'UPDATE_LAST_LOGIN': True,

    'ALGORITHM': 'HS256',
    'SIGNING_KEY': SECRET_KEY,
    'VERIFYING_KEY': None,
    'AUDIENCE': None,
    'ISSUER': None,

    'AUTH_HEADER_TYPES': ('Bearer',),
    'AUTH_HEADER_NAME': 'HTTP_AUTHORIZATION',
    'USER_ID_FIELD': 'id',
    'USER_ID_CLAIM': 'user_id',

    'AUTH_TOKEN_CLASSES': ('rest_framework_simplejwt.tokens.AccessToken',),
    'TOKEN_TYPE_CLAIM': 'token_type',

    'JTI_CLAIM': 'jti',
}
```

### Custom User Manager

```python
# core/managers.py
from django.contrib.auth.models import BaseDjango User Model
from django.utils import timezone

class Django User Model(BaseDjango User Model):
    """Custom user manager"""

    def _create_user(self, email, password, **extra_fields):
        if not email:
            raise ValueError('The Email must be set')
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save()
        return user

    def create_user(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', False)
        extra_fields.setdefault('is_superuser', False)
        return self._create_user(email, password, **extra_fields)

    def create_superuser(self, email, password, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('role', 'admin')

        if extra_fields.get('is_staff') is not True:
            raise ValueError('Superuser must have is_staff=True.')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Superuser must have is_superuser=True.')

        return self._create_user(email, password, **extra_fields)
```

### Authentication Views

```python
# users/views.py
from rest_framework import status, generics
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from django.utils.translation import gettext_lazy as _

from .serializers import (
    LoginSerializer, RegisterSerializer,
    TokenRefreshSerializer, UserSerializer
)

class LoginView(generics.GenericAPIView):
    """User login view"""
    permission_classes = [AllowAny]
    serializer_class = LoginSerializer

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data['email']
        password = serializer.validated_data['password']

        user = authenticate(email=email, password=password)

        if user is None:
            return Response(
                {'error': _('Invalid credentials')},
                status=status.HTTP_401_UNAUTHORIZED
            )

        if not user.is_active:
            return Response(
                {'error': _('User account is disabled')},
                status=status.HTTP_401_UNAUTHORIZED
            )

        refresh = RefreshToken.for_user(user)
        user_serializer = UserSerializer(user)

        return Response({
            'user': user_serializer.data,
            'tokens': {
                'refresh': str(refresh),
                'access': str(refresh.access_token),
            }
        })

class RegisterView(generics.GenericAPIView):
    """User registration view"""
    permission_classes = [AllowAny]
    serializer_class = RegisterSerializer

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = serializer.save()

        refresh = RefreshToken.for_user(user)
        user_serializer = UserSerializer(user)

        return Response({
            'user': user_serializer.data,
            'tokens': {
                'refresh': str(refresh),
                'access': str(refresh.access_token),
            }
        }, status=status.HTTP_201_CREATED)

class TokenRefreshView(generics.GenericAPIView):
    """Token refresh view"""
    permission_classes = [AllowAny]
    serializer_class = TokenRefreshSerializer

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        return Response(serializer.validated_data, status=status.HTTP_200_OK)
```

### Authentication Serializers

```python
# users/serializers.py
from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.utils.translation import gettext_lazy as _

User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    """User serializer"""
    class Meta:
        model = User
        fields = [
            'id', 'email', 'first_name', 'last_name',
            'role', 'is_active', 'date_joined'
        ]
        read_only_fields = ['id', 'is_active', 'date_joined']

class LoginSerializer(serializers.Serializer):
    """Login serializer"""
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

class RegisterSerializer(serializers.ModelSerializer):
    """Registration serializer"""
    password = serializers.CharField(
        write_only=True,
        required=True,
        validators=[validate_password]
    )
    password_confirm = serializers.CharField(write_only=True, required=True)

    class Meta:
        model = User
        fields = [
            'email', 'first_name', 'last_name',
            'password', 'password_confirm', 'role'
        ]

    def validate(self, attrs):
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError(
                {'password_confirm': _("Passwords don't match")}
            )
        return attrs

    def create(self, validated_data):
        validated_data.pop('password_confirm')
        user = User.objects.create_user(**validated_data)
        return user

class TokenRefreshSerializer(serializers.Serializer):
    """Token refresh serializer"""
    refresh = serializers.CharField()

    def validate(self, attrs):
        from rest_framework_simplejwt.tokens import RefreshToken
        refresh_token = attrs['refresh']

        try:
            refresh = RefreshToken(refresh_token)
            attrs['access'] = str(refresh.access_token)
        except Exception:
            raise serializers.ValidationError(
                {'refresh': _('Invalid refresh token')}
            )

        return attrs
```

---

## 🚀 Django Deployment Configuration

### Railway Deployment

**railway.json:**
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "pip install -r requirements/production.txt"
  },
  "deploy": {
    "startCommand": "python manage.py migrate && gunicorn config.wsgi:application --bind 0.0.0.0:$PORT",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10,
    "healthcheckPath": "/api/health/"
  }
}
```

**Dockerfile:**
```dockerfile
FROM python:3.12-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV DJANGO_SETTINGS_MODULE=config.settings.production

# Set work directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements/ requirements/
RUN pip install --upgrade pip
RUN pip install -r requirements/production.txt

# Copy project
COPY . .

# Collect static files
RUN python manage.py collectstatic --noinput

# Create non-root user
RUN useradd --create-home --shell /bin/bash app \
    && chown -R app:app /app
USER app

# Expose port
EXPOSE 8000

# Run the application
CMD ["gunicorn", "config.wsgi:application", "--bind", "0.0.0.0:8000"]
```

### Digital Ocean App Platform

**app.yaml:**
```yaml
name: quran-apps-api
region: nyc
services:
  - name: api
    github:
      repo: your-org/quran-apps-directory
      branch: main
      deploy_on_push: true
    build_command: pip install -r requirements/production.txt
    run_command: python manage.py migrate && gunicorn config.wsgi:application --bind 0.0.0.0:$PORT
    environment_slug: python
    http_port: 8000
    instance_count: 1
    instance_size_slug: basic-xs
    routes:
      - path: /
    envs:
      - key: DJANGO_SETTINGS_MODULE
        value: config.settings.production
      - key: SECRET_KEY
        type: SECRET
      - key: DATABASE_URL
        type: SECRET
      - key: REDIS_URL
        type: SECRET
    health_check:
      http_path: /api/health/
databases:
  - name: quran-apps-db
    engine: PG
    version: "15"
    size: basic
```

### Environment Variables Template (.env.example)

```bash
# Django Configuration
SECRET_KEY=your-secret-key-here
DEBUG=False
DJANGO_SETTINGS_MODULE=config.settings.production

# Database
DB_NAME=quran_apps
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_HOST=localhost
DB_PORT=5432

# Redis (for caching and sessions)
REDIS_URL=redis://localhost:6379/1

# Email (optional)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-app-password

# CORS
CORS_ALLOWED_ORIGINS=https://quran-apps.itqan.dev,https://www.quran-apps.itqan.dev

# File Storage (optional - for cloud storage)
AWS_ACCESS_KEY_ID=your-aws-key
AWS_SECRET_ACCESS_KEY=your-aws-secret
AWS_STORAGE_BUCKET_NAME=your-bucket-name
AWS_S3_REGION_NAME=us-east-1
```

---

## 📋 Django Performance Optimizations

### Caching Strategy

```python
# config/settings/base.py - Redis Cache Configuration
CACHES = {
    'default': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': config('REDIS_URL', default='redis://127.0.0.1:6379/1'),
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
            'CONNECTION_POOL_KWARGS': {
                'max_connections': 20,
                'decode_responses': True,
            }
        }
    }
}

# API-level caching
CACHE_MIDDLEWARE_ALIAS = 'default'
CACHE_MIDDLEWARE_SECONDS = 300  # 5 minutes
CACHE_MIDDLEWARE_KEY_PREFIX = 'quran_apps'
```

### Database Query Optimization

```python
# Use select_related for ForeignKey relationships
apps = App.objects.select_related('developer').filter(status='published')

# Use prefetch_related for ManyToMany and reverse ForeignKey
apps = App.objects.prefetch_related('categories', 'screenshots').all()

# Use only() to select specific fields
apps = App.objects.only('id', 'name_en', 'slug', 'avg_rating').filter(status='published')

# Use defer() to exclude heavy fields
apps = App.objects.defer('description_en', 'description_ar').filter(status='published')

# Database indexes in models
class App(PublishedModel):
    name_en = models.CharField(max_length=255, db_index=True)
    avg_rating = models.DecimalField(db_index=True)
    status = models.CharField(db_index=True)

    class Meta:
        indexes = [
            models.Index(fields=['avg_rating', 'status']),
            models.Index(fields=['created_at', 'status']),
        ]
```

### QuerySet Optimization Examples

```python
# Optimized app list query
def get_apps_list(self):
    return App.objects.select_related('developer').prefetch_related(
        'categories'
    ).only(
        'id', 'name_en', 'name_ar', 'slug', 'short_description_en',
        'short_description_ar', 'avg_rating', 'review_count',
        'application_icon', 'status', 'created_at'
    ).filter(status='published')

# Optimized app detail query
def get_app_detail(self, app_id):
    return App.objects.select_related('developer').prefetch_related(
        'categories', 'screenshots'
    ).get(id=app_id, status='published')
```

### View-Level Caching

```python
# apps/views.py
from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_page
from django.core.cache import cache

class AppViewSet(viewsets.ModelViewSet):
    @method_decorator(cache_page(60 * 5))  # Cache for 5 minutes
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)

    def retrieve(self, request, *args, **kwargs):
        # Custom caching logic
        app = self.get_object()
        cache_key = f'app_detail:{app.id}'

        # Try to get from cache
        cached_data = cache.get(cache_key)
        if cached_data:
            return Response(cached_data)

        # Generate response
        response = super().retrieve(request, *args, **kwargs)

        # Cache the response data
        cache.set(cache_key, response.data, 60 * 5)  # 5 minutes

        return response
```

---

**This supplement provides Django backend API implementation details with Django Admin integration to complement the main architecture document.**

**Next Steps:**
1. Initialize Django project: `django-admin startproject config .`
2. Create Django apps: `python manage.py startapp apps`
3. Install Python packages: `pip install -r requirements/base.txt`
4. Create models and run migrations: `python manage.py makemigrations && python manage.py migrate`
5. Configure Django Admin interface
6. Implement DRF views and serializers
7. Setup JWT authentication

**Document Owner:** Abubakr Abduraghman, a.abduraghman@itqan.dev  
**Status:** Ready for Implementation
