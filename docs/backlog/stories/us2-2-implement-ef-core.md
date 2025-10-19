# US2.2: Implement Django ORM with PostgreSQL

**Epic:** Epic 2 - Backend Infrastructure Setup
**Sprint:** Week 1, Day 2-3
**Story Points:** 5
**Priority:** P1 (Critical)
**Assigned To:** Backend Developer
**Status:** Not Started

---

## 📋 User Story

**As a** Backend Developer
**I want to** configure Django ORM with PostgreSQL
**So that** we have a reliable ORM for database operations with migrations, QuerySets, and type safety

---

## 🎯 Acceptance Criteria

### AC1: Django & psycopg2 Installation
- [ ] Required packages installed in `requirements.txt`:
  ```
  Django==5.2.0
  psycopg2-binary==2.9.0
  python-decouple==3.8
  ```
- [ ] Virtual environment configured
- [ ] Packages installed: `pip install -r requirements.txt`

### AC2: Django Project & Apps Created
- [ ] Django project created: `django-admin startproject quran_apps_api`
- [ ] Django apps created:
  ```bash
  python manage.py startapp apps
  python manage.py startapp users
  python manage.py startapp reviews
  ```
- [ ] Apps registered in `settings.py` INSTALLED_APPS

### AC3: Database Configuration in settings.py
- [ ] PostgreSQL configured as database backend:
  ```python
  DATABASES = {
      'default': {
          'ENGINE': 'django.db.backends.postgresql',
          'NAME': 'quran_apps_directory',
          'USER': 'postgres',
          'PASSWORD': 'password',
          'HOST': 'localhost',
          'PORT': '5432',
          'CONN_MAX_AGE': 600,  # Connection pooling
      }
  }
  ```
- [ ] Database credentials stored in `.env` file (not in code)

### AC4: Django Models Created
- [ ] All models from django-models.py implemented
- [ ] Models use Django ORM conventions (ForeignKey, ManyToMany)
- [ ] Meta classes configured with db_table, ordering, indexes
- [ ] Model methods implemented (save(), __str__(), custom properties)

### AC5: Migrations Created & Applied
- [ ] Initial migration created:
  ```bash
  python manage.py makemigrations
  ```
- [ ] Migration reviewed in `migrations/` folder
- [ ] Migration applied to dev database:
  ```bash
  python manage.py migrate
  ```
- [ ] Database schema verified in pgAdmin/psql

### AC6: Connection Pooling Optimized
- [ ] Connection pooling configured in settings.py
- [ ] CONN_MAX_AGE set to 600 seconds
- [ ] django-db-pool installed (optional for advanced pooling)
- [ ] Performance tested under load (100+ concurrent requests)

### AC7: Development Experience Optimized
- [ ] Django admin interface working (`python manage.py createsuperuser`)
- [ ] Query logging configured for development
- [ ] Database shell accessible: `python manage.py dbshell`
- [ ] Model introspection available

---

## 📝 Technical Notes

### Example Django Model (from django-models.py)
```python
from django.db import models
import uuid

class App(models.Model):
    """Quran Applications"""
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('published', 'Published'),
        ('archived', 'Archived'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name_en = models.CharField(max_length=255, db_index=True)
    name_ar = models.CharField(max_length=255, db_index=True)
    slug = models.SlugField(max_length=255, unique=True, db_index=True)
    developer = models.ForeignKey(
        'Developer',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='apps'
    )
    categories = models.ManyToManyField(
        'Category',
        related_name='apps',
        through='AppCategory'
    )
    apps_avg_rating = models.DecimalField(
        max_digits=3,
        decimal_places=2,
        default=0
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'apps'
        ordering = ['-apps_avg_rating', 'name_en']
        indexes = [
            models.Index(fields=['slug']),
            models.Index(fields=['developer_id']),
            models.Index(fields=['-apps_avg_rating']),
        ]

    def __str__(self):
        return f"{self.name_en} / {self.name_ar}"
```

### Django Migration Commands
```bash
# Create initial migration
python manage.py makemigrations

# View pending migrations
python manage.py showmigrations

# Apply migrations
python manage.py migrate

# Create migration with specific app
python manage.py makemigrations apps

# Create empty migration
python manage.py makemigrations --empty apps --name migration_name

# Migrate to specific version
python manage.py migrate apps 0001

# Rollback all migrations
python manage.py migrate apps zero

# View migration SQL
python manage.py sqlmigrate apps 0001
```

### Settings.py Configuration
```python
# Database
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.getenv('DB_NAME', 'quran_apps_directory'),
        'USER': os.getenv('DB_USER', 'postgres'),
        'PASSWORD': os.getenv('DB_PASSWORD'),
        'HOST': os.getenv('DB_HOST', 'localhost'),
        'PORT': os.getenv('DB_PORT', '5432'),
        'CONN_MAX_AGE': 600,  # Connection pooling (in seconds)
        'OPTIONS': {
            'connect_timeout': 10,
        }
    }
}

# Django ORM settings
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'
```

---

## 🔗 Dependencies
- US2.1: Database Server Setup (must be complete)
- US1.2: Database Schema Design (reference for models)

---

## 🚫 Blockers
- PostgreSQL database server must be accessible
- Python 3.11+ must be installed

---

## 📊 Definition of Done
- [ ] Django project created and configured
- [ ] Django apps created (apps, users, reviews, etc.)
- [ ] PostgreSQL database configured in settings.py
- [ ] All Django models implemented from django-models.py
- [ ] Initial migrations created and applied
- [ ] Database schema verified
- [ ] Connection pooling tested (100+ concurrent requests)
- [ ] Django admin interface working
- [ ] Code review passed
- [ ] Documentation updated

---

## 📚 Resources
- [Django Documentation](https://docs.djangoproject.com/)
- [Django ORM](https://docs.djangoproject.com/en/5.2/topics/db/models/)
- [Django Migrations](https://docs.djangoproject.com/en/5.2/topics/migrations/)
- [psycopg2 Documentation](https://www.psycopg.org/psycopg3/basic/index.html)

---

**Created:** October 6, 2025  
**Owner:** Abubakr Abduraghman, a.abduraghman@itqan.dev  
**Epic:** [Epic 2: Backend Infrastructure Setup](../epics/epic-2-backend-infrastructure-setup.md)

