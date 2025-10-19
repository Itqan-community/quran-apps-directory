# Quran Apps Directory - Architecture Overview

## Tech Stack

**Backend:**
- Django 5.2 + Django REST Framework (DRF)
- PostgreSQL 15+ (primary database)
- Redis (caching, optional)
- gunicorn (WSGI server)

**Frontend:**
- Angular 19 (already exists)
- Hosted on Netlify (quran-apps.itqan.dev)

**Deployment:**
- Railway/Digital Ocean (staging/production)
- Docker containers
- HTTPS/SSL enabled

---

## Core API Structure

### Public Endpoints (No Auth Required)
```
GET    /api/v1/apps              # List all apps
GET    /api/v1/apps/{id}         # Get app details
GET    /api/v1/apps/{id}/reviews # Get app reviews
GET    /api/v1/categories        # List categories
GET    /api/v1/developers        # List developers
GET    /api/v1/health            # Health check
```

### Authentication Endpoints
```
POST   /api/v1/auth/register     # Register new user
POST   /api/v1/auth/login        # Login
POST   /api/v1/auth/oauth/{provider}  # OAuth (Google, Apple)
POST   /api/v1/auth/logout       # Logout
```

### User Endpoints (Auth Required)
```
GET    /api/v1/users/me          # Get user profile
PUT    /api/v1/users/me          # Update profile
GET    /api/v1/favorites         # Get user favorites
POST   /api/v1/favorites/{id}    # Add to favorites
```

---

## Database Schema

### Core Tables
- **apps** - Application listings
- **categories** - App categories
- **developers** - Developer information
- **users** - User accounts
- **reviews** - App reviews and ratings
- **favorites** - User favorites
- **oauth_providers** - OAuth account linking

### Key Relationships
- Developer has many Apps (1:N)
- App belongs to one Category (N:1)
- User has many Reviews (1:N)
- User has many Favorites (1:N)
- App has many Reviews (1:N)

---

## Authentication Flow

1. **Registration**: Email + password → verification email → account created
2. **OAuth**: Google/Apple → automatic account creation/login
3. **JWT**: Token-based authentication for API calls
4. **2FA**: Optional TOTP support for enhanced security

---

## Development Setup

### Prerequisites
- Python 3.11+
- PostgreSQL 15+
- Redis (optional)
- Docker (for deployment)

### Quick Start
```bash
# Clone and setup
git clone <repository>
cd quran-apps-directory

# Setup environment
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Setup database
python manage.py migrate
python manage.py createsuperuser

# Run server
python manage.py runserver
```

---

## Performance Considerations

### Fast Queries (< 50ms)
- Browse by category
- Search by name
- Get user favorites
- Check if favorited

### Optimizations Needed
- Popular apps with stats
- User dashboard (collections + favorites)
- Full-text search across all fields

### Caching Strategy
- Popular apps: 1 hour TTL
- Category lists: 24 hour TTL
- User favorites: 1 hour TTL

---

## Security Layers

1. **Network**: HTTPS/TLS, WAF, rate limiting
2. **Application**: Input validation, SQL injection prevention, XSS prevention
3. **Authentication**: Password hashing, email verification, 2FA support
4. **Authorization**: Role-based access, resource ownership checks
5. **Data**: At-rest encryption, audit logs
6. **Privacy**: GDPR compliance, data export/deletion

---

## Deployment Architecture

### Development
- Local Django dev server
- PostgreSQL local instance
- Hot reload enabled

### Staging
- Railway/Digital Ocean
- PostgreSQL 15 (managed)
- HTTPS enabled
- Environment variables via secrets

### Production
- Load balanced Django instances
- PostgreSQL primary + read replica
- Redis cache cluster
- CDN for static files
- SSL/TLS certificates

---

## Scalability Roadmap

### Phase 1: MVP (Current)
- Single Django instance
- PostgreSQL primary only
- Scale: 10K-100K users

### Phase 2: Growth (Next Quarter)
- Load balanced Django (2-3 instances)
- PostgreSQL + read replica
- Redis cache
- Scale: 100K-1M users

### Phase 3: Scale (Year 2)
- Multi-region deployment
- Database sharding
- Distributed cache
- Scale: 1M-10M users

---

## Technology Decisions

| Component | Choice | Why |
|-----------|--------|-----|
| Backend | Django 5.2 | Batteries-included, secure defaults |
| API | DRF | Standard, well-documented |
| Database | PostgreSQL 15+ | Robust, JSONB support |
| Auth | django-allauth + JWT | OAuth + custom auth |
| Deployment | Railway/DO | Simple, affordable ($5-15/mo) |
| Cache | Redis | Standard, well-supported |
| Files | Cloudflare R2 | S3-compatible, affordable |

---

**Status:** Ready for Implementation
**Next:** Create user stories and development backlog