# Development Guide

## Getting Started

### Prerequisites
- Python 3.11+
- PostgreSQL 15+
- Git
- Docker (optional, for deployment)

### Quick Setup

```bash
# 1. Clone repository
git clone <repository-url>
cd quran-apps-directory

# 2. Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Setup environment variables
cp .env.example .env
# Edit .env with your settings

# 5. Setup database
python manage.py migrate

# 6. Create superuser
python manage.py createsuperuser

# 7. Run development server
python manage.py runserver
```

## Project Structure

```
backend/
├── manage.py
├── requirements.txt
├── .env
├── config/                 # Django settings
│   ├── settings/
│   ├── urls.py
│   └── wsgi.py
├── apps/                   # Django apps
│   ├── apps/               # Application management
│   ├── users/              # User management
│   ├── categories/         # Category management
│   └── reviews/            # Reviews system
├── static/                 # Static files
├── media/                  # User uploads
└── templates/              # Email templates
```

## Environment Variables

Create `.env` file:

```bash
# Django
SECRET_KEY=your-secret-key-here
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

# Database
DB_NAME=quran_apps_directory
DB_USER=quran_apps
DB_PASSWORD=your-password
DB_HOST=localhost
DB_PORT=5432

# Email (optional)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-app-password

# Cache (optional)
REDIS_URL=redis://localhost:6379/0
```

## Common Commands

```bash
# Development
python manage.py runserver        # Start dev server
python manage.py shell             # Django shell
python manage.py dbshell           # Database shell

# Database
python manage.py makemigrations     # Create migrations
python manage.py migrate           # Apply migrations
python manage.py showmigrations     # Show migration status

# Testing
python manage.py test              # Run tests
pytest                            # Run tests with pytest

# Static files
python manage.py collectstatic    # Collect static files

# Users
python manage.py createsuperuser   # Create admin user
python manage.py changepassword   # Change password
```

## API Development

### Creating New Endpoints

1. **Create Django App**
```bash
python manage.py startapp newfeature
```

2. **Add to INSTALLED_APPS** in `config/settings/base.py`

3. **Create Serializers** in `newfeature/serializers.py`
```python
from rest_framework import serializers
from .models import YourModel

class YourModelSerializer(serializers.ModelSerializer):
    class Meta:
        model = YourModel
        fields = ['id', 'name', 'created_at']
```

4. **Create Views** in `newfeature/views.py`
```python
from rest_framework import viewsets
from .models import YourModel
from .serializers import YourModelSerializer

class YourModelViewSet(viewsets.ModelViewSet):
    queryset = YourModel.objects.all()
    serializer_class = YourModelSerializer
```

5. **Create URLs** in `newfeature/urls.py`
```python
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import YourModelViewSet

router = DefaultRouter()
router.register(r'yourmodels', YourModelViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
```

6. **Include in main URLs** in `config/urls.py`
```python
path('api/v1/newfeature/', include('newfeature.urls')),
```

### API Response Format

```json
{
  "success": true,
  "data": [...],
  "message": "Success message",
  "pagination": {
    "page": 1,
    "total_pages": 10,
    "total_items": 200
  }
}
```

## Database Models

### Example Model

```python
# apps/apps/models.py
from django.db import models

class App(models.Model):
    name_en = models.CharField(max_length=200)
    name_ar = models.CharField(max_length=200)
    description = models.TextField()
    website_url = models.URLField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name_en
```

### Model Relationships

```python
class Category(models.Model):
    name = models.CharField(max_length=100)

class App(models.Model):
    name = models.CharField(max_length=200)
    category = models.ForeignKey(Category, on_delete=models.CASCADE)
    # One app belongs to one category

class Review(models.Model):
    app = models.ForeignKey(App, on_delete=models.CASCADE)
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    rating = models.IntegerField(choices=[(1, '1'), (5, '5')])
    # One app has many reviews, one user has many reviews
```

## Authentication

### JWT Login Flow

```python
# Login endpoint
POST /api/v1/auth/login/
{
  "email": "user@example.com",
  "password": "password123"
}

# Response
{
  "success": true,
  "data": {
    "access_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
    "refresh_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
    "user": {
      "id": 1,
      "email": "user@example.com"
    }
  }
}
```

### Protected Endpoints

```python
# Include JWT token in headers
Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...

# Or set in frontend
localStorage.setItem('token', response.data.access_token)
```

## Testing

### Running Tests

```bash
# Run all tests
python manage.py test

# Run specific app tests
python manage.py test apps

# Run with coverage
coverage run --source='.' manage.py test
coverage report
coverage html
```

### Writing Tests

```python
# tests/test_models.py
from django.test import TestCase
from apps.apps.models import App

class AppModelTest(TestCase):
    def test_app_creation(self):
        app = App.objects.create(
            name_en="Test App",
            description="Test description"
        )
        self.assertEqual(app.name_en, "Test App")
        self.assertTrue(app.created_at)
```

## Deployment

### Docker Setup

```dockerfile
# Dockerfile
FROM python:3.11

WORKDIR /app

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["gunicorn", "--bind", "0.0.0.0:8000", "config.wsgi:application"]
```

### Docker Compose

```yaml
# docker-compose.yml
version: '3.8'

services:
  web:
    build: .
    ports:
      - "8000:8000"
    environment:
      - DEBUG=False
      - DB_HOST=db
    depends_on:
      - db

  db:
    image: postgres:15
    environment:
      POSTGRES_DB: quran_apps_directory
      POSTGRES_USER: quran_apps
      POSTGRES_PASSWORD: password
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

## Common Issues

### Database Connection Errors
```bash
# Check PostgreSQL is running
pg_isready -h localhost -p 5432

# Check connection string
python manage.py dbshell
```

### Migration Issues
```bash
# Reset migrations (development only)
python manage.py migrate apps zero
python manage.py makemigrations apps
python manage.py migrate
```

### Static File Issues
```bash
# Collect static files
python manage.py collectstatic --noinput

# Check static file settings
STATIC_URL = '/static/'
STATIC_ROOT = 'staticfiles'
```

## Best Practices

### Code Style
- Use Black for formatting
- Follow PEP 8 guidelines
- Write meaningful commit messages
- Add docstrings to functions and classes

### Security
- Never commit secrets to git
- Use environment variables for sensitive data
- Validate all user input
- Use Django's built-in security features

### Performance
- Use `select_related()` and `prefetch_related()` for queries
- Cache frequently accessed data
- Use database indexes for frequently queried fields
- Monitor slow queries

---

**Next Steps:**
1. Review this guide
2. Set up development environment
3. Create user stories and backlog