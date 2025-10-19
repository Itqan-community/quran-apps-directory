# US1.4: Define Data Models

**Epic:** Epic 1 - Database Architecture Foundation  
**Sprint:** Week 1, Day 3-4  
**Story Points:** 5  
**Priority:** P1 (Critical)  
**Assigned To:** Backend Developer  
**Status:** Not Started

---

## 📋 User Story

**As a** Backend Developer
**I want to** create comprehensive Python Django models, serializers, and validators
**So that** we have type-safe data models with proper validation and serialization between database entities and API responses

---

## 🎯 Acceptance Criteria

### AC1: Django Model Classes Created
- [ ] All Django model classes implemented:
  - `App` model (main application entity)
  - `Category` model
  - `Developer` model
  - `Feature` model
  - `Screenshot` model
  - `AppCategory` model (junction table)
  - `AppFeature` model (junction table)
- [ ] Primary keys defined as UUID for all models
- [ ] Relationships configured (ForeignKey, ManyToMany, OneToOneField)
- [ ] Required vs optional fields marked with `null=True, blank=True`

### AC2: Django REST Serializers
- [ ] Request serializers created for API inputs:
  ```python
  class CreateAppSerializer(serializers.ModelSerializer):
      category_ids = serializers.PrimaryKeyRelatedField(
          queryset=Category.objects.all(),
          many=True,
          write_only=True,
          source='categories'
      )
      class Meta:
          model = App
          fields = ['name_ar', 'name_en', 'short_description_ar',
                   'short_description_en', 'developer_id', 'category_ids']
  ```
- [ ] Response serializers created for API outputs with nested relationships
- [ ] Separate serializers for list vs detail views
- [ ] Bilingual support in all serializers (_ar, _en suffixes)

### AC3: Django Model Validators
- [ ] Validators created for all models:
  ```python
  from django.core.validators import MinValueValidator, MaxValueValidator, URLValidator

  class App(models.Model):
      name_ar = models.CharField(max_length=200, validators=[MinLengthValidator(1)])
      name_en = models.CharField(max_length=200, validators=[MinLengthValidator(1)])
      developer = models.ForeignKey(Developer, on_delete=models.SET_NULL, null=True)
      categories = models.ManyToManyField(Category, blank=True)
      apps_avg_rating = models.DecimalField(
          max_digits=3, decimal_places=2,
          validators=[MinValueValidator(0), MaxValueValidator(5)]
      )
  ```
- [ ] Validation rules cover:
  - Required fields
  - String length limits
  - Format validation (URLs, emails)
  - Business rules (e.g., max 5 categories per app)
- [ ] Custom error messages defined (Arabic + English)

### AC4: Django Serializer Relationships
- [ ] Serializer mappings configured for Model ↔ Serializer:
  ```python
  class AppSerializer(serializers.ModelSerializer):
      developer = DeveloperSerializer(read_only=True)
      categories = CategorySerializer(many=True, read_only=True)

      class Meta:
          model = App
          fields = ['id', 'name_ar', 'name_en', 'developer', 'categories', 'apps_avg_rating']
  ```
- [ ] Complex mappings handled (nested objects, collections)
- [ ] Read-only fields configured where needed (e.g., id, created_at)

### AC5: Database Constraints Defined
- [ ] String length constraints specified:
  - Short text: 200 chars
  - Description: 5000 chars
  - URLs: 500 chars
- [ ] Index requirements documented:
  - `Apps.NameEn` (for search)
  - `Apps.NameAr` (for Arabic search)
  - `Apps.DeveloperId` (foreign key)
  - `Categories.NameEn` (for filtering)
- [ ] Unique constraints identified:
  - App names (within same developer)
  - Developer emails
- [ ] Check constraints defined (e.g., rating between 0-5)

### AC6: Django Choices (Enums) Created
- [ ] Choice enumerations defined for fixed values:
  ```python
  from django.db import models

  class AppStatus(models.TextChoices):
      DRAFT = 'draft', 'Draft'
      UNDER_REVIEW = 'under_review', 'Under Review'
      PUBLISHED = 'published', 'Published'
      ARCHIVED = 'archived', 'Archived'

  class PlatformType(models.TextChoices):
      ANDROID = 'android', 'Android'
      IOS = 'ios', 'iOS'
      WEB = 'web', 'Web'
      DESKTOP = 'desktop', 'Desktop'

  class App(models.Model):
      status = models.CharField(max_length=20, choices=AppStatus.choices)
  ```

### AC7: Model Documentation
- [ ] Python docstrings added to all classes/fields
- [ ] Usage examples provided in docstrings
- [ ] Entity relationship diagram updated
- [ ] Data dictionary document created

---

## 📝 Technical Notes

### Complete Django Model Example
```python
from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator, URLValidator

class App(models.Model):
    """Represents a Quran application in the directory"""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # Bilingual Names
    name_ar = models.CharField(
        max_length=200,
        help_text="Arabic name of the application"
    )
    name_en = models.CharField(
        max_length=200,
        help_text="English name of the application"
    )

    # Short Descriptions (for list views)
    short_description_ar = models.CharField(
        max_length=500,
        null=True,
        blank=True,
        help_text="Arabic short description"
    )
    short_description_en = models.CharField(
        max_length=500,
        null=True,
        blank=True,
        help_text="English short description"
    )

    # Full Descriptions (for detail views)
    description_ar = models.TextField(
        max_length=5000,
        null=True,
        blank=True,
        help_text="Arabic full description"
    )
    description_en = models.TextField(
        max_length=5000,
        null=True,
        blank=True,
        help_text="English full description"
    )

    # Foreign Key
    developer = models.ForeignKey(
        'Developer',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        help_text="Developer/Company that created this app"
    )

    # Rating & Reviews
    apps_avg_rating = models.DecimalField(
        max_digits=3,
        decimal_places=2,
        default=0,
        validators=[MinValueValidator(0), MaxValueValidator(5)],
        help_text="Average user rating (0.0 to 5.0)"
    )
    app_total_reviews = models.IntegerField(
        default=0,
        help_text="Total number of reviews"
    )

    # Store Links
    google_play_link = models.URLField(
        max_length=500,
        null=True,
        blank=True,
        help_text="Google Play Store link"
    )
    app_store_link = models.URLField(
        max_length=500,
        null=True,
        blank=True,
        help_text="Apple App Store link"
    )
    app_gallery_link = models.URLField(
        max_length=500,
        null=True,
        blank=True,
        help_text="Huawei App Gallery link"
    )

    # Images
    application_icon = models.URLField(
        max_length=500,
        null=True,
        blank=True,
        help_text="Application icon URL (CDN)"
    )
    main_image_ar = models.URLField(
        max_length=500,
        null=True,
        blank=True,
        help_text="Main promotional image (Arabic)"
    )
    main_image_en = models.URLField(
        max_length=500,
        null=True,
        blank=True,
        help_text="Main promotional image (English)"
    )

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # Relationships
    categories = models.ManyToManyField(
        'Category',
        through='AppCategory',
        related_name='apps',
        blank=True,
        help_text="Categories this app belongs to"
    )

    class Meta:
        db_table = 'apps'
        ordering = ['-apps_avg_rating', 'name_en']
        indexes = [
            models.Index(fields=['slug']),
            models.Index(fields=['developer_id']),
        ]

    def __str__(self):
        return self.name_en
```

### Django REST Serializer Pattern
```python
from rest_framework import serializers

# Request Serializer
class CreateAppSerializer(serializers.ModelSerializer):
    category_ids = serializers.PrimaryKeyRelatedField(
        queryset=Category.objects.all(),
        many=True,
        write_only=True,
        source='categories'
    )

    class Meta:
        model = App
        fields = ['name_ar', 'name_en', 'short_description_ar',
                 'short_description_en', 'description_ar', 'description_en',
                 'developer_id', 'category_ids', 'google_play_link', 'app_store_link']

# Response Serializer
class DeveloperSerializer(serializers.ModelSerializer):
    class Meta:
        model = Developer
        fields = ['id', 'name_ar', 'name_en', 'website', 'logo_url']

class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ['id', 'name_ar', 'name_en', 'icon']

class AppSerializer(serializers.ModelSerializer):
    developer = DeveloperSerializer(read_only=True)
    categories = CategorySerializer(many=True, read_only=True)

    class Meta:
        model = App
        fields = ['id', 'name_ar', 'name_en', 'short_description_ar',
                 'short_description_en', 'developer', 'categories',
                 'apps_avg_rating', 'app_total_reviews', 'google_play_link',
                 'app_store_link', 'application_icon', 'created_at']
```

---

## 🔗 Dependencies
- US1.2: Design Complete Relational Schema (must be complete)

---

## 🚫 Blockers
- Final database schema must be approved

---

## 📊 Definition of Done
- [ ] All entity classes created and reviewed
- [ ] All DTOs created (Request + Response)
- [ ] FluentValidation validators implemented
- [ ] AutoMapper profiles configured
- [ ] XML documentation complete
- [ ] Code review passed
- [ ] Unit tests for validators created

---

## 📚 Resources
- [Django Models Documentation](https://docs.djangoproject.com/en/stable/topics/db/models/)
- [Django REST Framework Serializers](https://www.django-rest-framework.org/api-guide/serializers/)
- [Django Validators](https://docs.djangoproject.com/en/stable/ref/validators/)
- [Django ORM Relationships](https://docs.djangoproject.com/en/stable/topics/db/models/#relationships)

---

**Created:** October 6, 2025  
**Owner:** Abubakr Abduraghman, a.abduraghman@itqan.dev  
**Epic:** [Epic 1: Database Architecture Foundation](../epics/epic-1-database-architecture-foundation.md)

