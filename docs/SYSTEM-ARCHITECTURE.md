# System Architecture Overview

## Backend Architecture Stack

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (Angular 19)                    │
│        Hosted: Netlify (quran-apps.itqan.dev)              │
└────────────────────┬────────────────────────────────────────┘
                     │ HTTPS REST API
                     │ /api/v1/
                     │
┌────────────────────▼────────────────────────────────────────┐
│              API GATEWAY / LOAD BALANCER                     │
│         (Cloud Provider: Railway / Digital Ocean)            │
└────────────────────┬────────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────────┐
│         DJANGO REST FRAMEWORK API SERVER(s)                 │
│  • Django 5.2                                               │
│  • Django REST Framework (DRF)                              │
│  • drf-spectacular (OpenAPI 3.0 docs)                       │
│  • django-allauth (OAuth integration)                       │
│  • djangorestframework-simplejwt (JWT auth)                 │
│  • gunicorn (WSGI server)                                   │
│  • Celery (async tasks - optional)                          │
└────────────────────┬────────────────────────────────────────┘
                     │
    ┌────────────────┼────────────────┐
    │                │                │
    │                │                │
    ▼                ▼                ▼
┌─────────────┐ ┌──────────────┐ ┌──────────────┐
│ PostgreSQL  │ │ Redis Cache  │ │ File Storage │
│ (Primary)   │ │ (Optional)   │ │ Cloudflare R2│
│ 15+         │ │ Session mgmt │ │ Images/files │
└─────────────┘ └──────────────┘ └──────────────┘
```

---

## Data Layer Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                    PRESENTATION LAYER                         │
│            Django REST Framework Serializers                  │
│         (Validation, Transformation, Response Format)         │
└────────────────────┬─────────────────────────────────────────┘
                     │
┌────────────────────▼─────────────────────────────────────────┐
│                   BUSINESS LOGIC LAYER                        │
│              Django Services / ViewSets                       │
│         (Reviews, Collections, Favorites, Auth, etc.)        │
└────────────────────┬─────────────────────────────────────────┘
                     │
┌────────────────────▼─────────────────────────────────────────┐
│                   DATA ACCESS LAYER                           │
│                  Django ORM QuerySets                         │
│           (Models, Managers, Relationships)                  │
└────────────────────┬─────────────────────────────────────────┘
                     │
┌────────────────────▼─────────────────────────────────────────┐
│                 PERSISTENCE LAYER                             │
│               PostgreSQL Database                             │
│  (27 tables, 50+ indexes, relationships, constraints)        │
└──────────────────────────────────────────────────────────────┘
```

---

## Core Entities & Relationships

```
CORE DOMAIN (Apps, Categories, Developers)
══════════════════════════════════════════

    ┌─────────────────┐
    │   DEVELOPER     │
    ├─────────────────┤
    │ id (PK)         │
    │ name_en, name_ar│
    │ website         │
    │ logo_url        │
    │ contact_email   │
    └────────┬────────┘
             │
    ┌────────┴─────────────────────┐
    │   1:N Relationship            │
    │   (Developer → Apps)          │
    ▼                               ▼
┌──────────────┐          ┌──────────────────┐
│    APP       │          │   CATEGORY       │
├──────────────┤          ├──────────────────┤
│ id (PK)      │          │ id (PK)          │
│ name_en      │◄─────────│ name_en          │
│ name_ar      │ M:N      │ name_ar          │
│ developer_id │ via      │ slug             │
│ description  │ junction │ icon_url         │
│ app_icon     │ table    │ sort_order       │
│ main_image   │          │                  │
│ status       │          └──────────────────┘
│ rating       │
│ created_at   │
└──────────────┘
       │
       │
       └─ Screenshots (1:N)
       │  url, language (en/ar), sort_order
       │
       └─ Features (1:N)
          name_en, name_ar


USER ENGAGEMENT DOMAIN (Reviews, Collections, Favorites)
═══════════════════════════════════════════════════════

    ┌─────────────┐
    │   USER      │
    ├─────────────┤
    │ id (PK)     │
    │ email       │
    │ password    │
    │ name        │
    │ avatar_url  │
    │ language    │
    │ theme       │
    └────┬────┬───┴────┬─────────┘
         │    │        │         │
    ┌────┘    │        │         └────────────────┐
    │         │        │                          │
    ▼         ▼        ▼                          ▼
┌──────┐ ┌────────┐ ┌──────────┐         ┌──────────────┐
│REVIEWS│ │COLLECT │ │ FAVORITES│         │ OAUTH        │
├──────┤ │ IONS   │ ├──────────┤         │ PROVIDERS    │
│ app_ │ ├────────┤ │ user_id  │         ├──────────────┤
│ id   │ │ name   │ │ (PK,FK)  │         │ provider     │
│user_ │ │collect │ │ app_id   │         │ (google,     │
│ id   │ │ ion_id │ │ (PK,FK)  │         │  apple, etc) │
│rating│ │share_  │ │ created_ │         │              │
│ title│ │token   │ │ at       │         └──────────────┘
│ ...  │ │        │ └──────────┘
└──────┘ └────┬───┘
              │
              └─ Collection_Apps (M:N)
                 (collection_id, app_id, sort_order)
                        │
                        └─ Links to App


ANALYTICS DOMAIN (Tracking, Events, Metrics)
═════════════════════════════════════════════

    ┌──────────────────────────────────────┐
    │     USER ACTIVITY TRACKING           │
    ├──────────────────────────────────────┤
    │ • View app                           │
    │ • Favorite app                       │
    │ • Post review                        │
    │ • Create collection                  │
    │ • Search query                       │
    │ • Share event                        │
    └──────────────────┬───────────────────┘
                       │
    ┌──────────────────┴────────────────┐
    │                                   │
    ▼                                   ▼
┌────────────────┐          ┌────────────────────┐
│ SHARE_EVENTS   │          │ APP_VIEW_ANALYTICS │
├────────────────┤          ├────────────────────┤
│ app_id (FK)    │          │ app_id (FK)        │
│ platform       │          │ view_date          │
│ (whatsapp,     │          │ view_count         │
│  twitter, fb)  │          │ unique_viewers     │
│ user_id (FK)   │          │ avg_session_dur    │
│ timestamp      │          │                    │
└────────────────┘          └────────────────────┘

    Aggregated daily from USER_ACTIVITIES
```

---

## API Endpoint Structure

```
┌────────────────────────────────────────────────────────────────┐
│                    API ROUTES (/api/v1/)                       │
└────────────────────────────────────────────────────────────────┘

APPS (Public, No Auth Required)
├── GET    /apps                    # List all apps (paginated, filterable)
├── GET    /apps?category=mushaf    # Filter by category
├── GET    /apps?search=tajweed     # Full-text search
├── GET    /apps/{id}               # Get app detail
├── GET    /apps/{id}/reviews       # Get app reviews (paginated)
├── GET    /apps/{id}/share-count   # Get share metrics
└── GET    /apps/popular            # Popular apps (cached view)

CATEGORIES (Public, No Auth)
├── GET    /categories              # List categories
├── GET    /categories/{id}         # Get category detail
└── GET    /categories/{id}/apps    # Apps in category

DEVELOPERS (Public, No Auth)
├── GET    /developers              # List developers
├── GET    /developers/{id}         # Get developer profile
└── GET    /developers/{id}/apps    # Developer's apps

AUTHENTICATION (Public, No Auth Required)
├── POST   /auth/register           # Register new user
├── POST   /auth/login              # Login (email/password)
├── POST   /auth/oauth/{provider}   # OAuth flow (Google, Apple, etc.)
├── POST   /auth/verify-email       # Verify email token
├── POST   /auth/forgot-password    # Initiate password reset
├── POST   /auth/reset-password     # Complete password reset
├── POST   /auth/refresh            # Refresh JWT token
└── POST   /auth/logout             # Logout (invalidate token)

USER PROFILE (Authenticated)
├── GET    /users/me                # Get current user profile
├── PUT    /users/me                # Update profile
├── POST   /users/me/avatar         # Upload avatar
├── GET    /users/me/preferences    # Get user preferences
├── PUT    /users/me/preferences    # Update preferences (language, theme)
├── POST   /users/me/2fa/enable     # Enable 2FA
├── POST   /users/me/2fa/disable    # Disable 2FA
├── POST   /users/me/2fa/verify     # Verify 2FA code
├── DELETE /users/me                # Delete account (GDPR)
└── POST   /users/me/export-data    # Export user data (GDPR)

FAVORITES (Authenticated)
├── GET    /favorites               # Get user's favorites
├── POST   /favorites/{app_id}      # Add to favorites
├── DELETE /favorites/{app_id}      # Remove from favorites
└── GET    /favorites/{app_id}      # Check if favorited

COLLECTIONS (Authenticated)
├── GET    /collections             # List user's collections
├── POST   /collections             # Create collection
├── GET    /collections/{id}        # Get collection detail
├── PUT    /collections/{id}        # Update collection
├── DELETE /collections/{id}        # Delete collection
├── POST   /collections/{id}/apps   # Add app to collection
├── DELETE /collections/{id}/apps/{app_id}  # Remove app
├── GET    /collections/{id}/export # Export collection (JSON/CSV)
├── PUT    /collections/{id}/share  # Toggle public sharing
├── GET    /collections/shared/{token}     # View shared collection (public)
└── POST   /collections/{id}/duplicate     # Duplicate collection

REVIEWS (Authenticated for Write)
├── GET    /reviews/app/{app_id}    # Get reviews for app (public)
├── GET    /reviews/{id}            # Get review detail
├── POST   /reviews                 # Submit review (authenticated)
├── PUT    /reviews/{id}            # Update own review
├── DELETE /reviews/{id}            # Delete own review
├── POST   /reviews/{id}/helpful    # Mark as helpful
├── POST   /reviews/{id}/flag       # Flag review for moderation
├── GET    /reviews/{id}/stats      # Review statistics (helpful counts)
└── PUT    /reviews/{id}/moderate   # Moderate review (Admin only)

ANALYTICS (Public)
├── GET    /analytics/apps/{id}/shares     # Share metrics
├── GET    /analytics/apps/trending       # Trending apps
└── GET    /analytics/categories/stats    # Category statistics

ADMIN (Admin Only, Authenticated)
├── GET    /admin/reviews/pending         # Reviews awaiting moderation
├── PUT    /admin/reviews/{id}/approve    # Approve review
├── PUT    /admin/reviews/{id}/reject     # Reject review
├── GET    /admin/users                   # User management
├── PUT    /admin/users/{id}/role         # Change user role
├── GET    /admin/apps                    # App management
├── POST   /admin/apps                    # Create app (manual entry)
├── PUT    /admin/apps/{id}               # Update app
├── DELETE /admin/apps/{id}               # Delete app
├── GET    /admin/analytics               # Admin analytics dashboard
└── GET    /admin/reports                 # Generate reports

HEALTH & MONITORING
├── GET    /health                  # Health check (no auth)
├── GET    /health/ready            # Readiness probe
├── GET    /health/live             # Liveness probe
├── GET    /docs                    # OpenAPI docs (drf-spectacular UI)
└── GET    /docs/openapi.json       # OpenAPI schema JSON
```

---

## Authentication Flow

```
REGISTRATION FLOW
═════════════════

1. User submits /auth/register
   ├─ Email, Password
   └─ Send verification email

2. Backend validates & hashes password
   ├─ Check email unique
   ├─ Create User record
   ├─ Send verification email
   └─ Return 201 with status: unverified

3. User clicks email link
   ├─ Verifies token
   ├─ Update user: email_verified = true
   └─ Redirect to /login

4. User can now login


OAUTH FLOW (Google/Apple/Facebook)
═══════════════════════════════════

1. Frontend redirects to /auth/oauth/{provider}

2. User signs in with provider
   ├─ Provider returns access_token
   └─ Redirect to backend callback

3. Backend validates token & user info
   ├─ Check if user exists
   ├─ If exists: login user
   ├─ If new: create user with provider info
   └─ Create OAuthProvider record

4. Generate JWT & refresh token
   ├─ Return tokens in response
   └─ Frontend stores in localStorage/secure cookie

5. Frontend redirects to authenticated area


JWT AUTHENTICATION
═══════════════════

1. User stores JWT token from /auth/login
   └─ { "access_token": "...", "refresh_token": "..." }

2. Frontend includes in API requests
   └─ Authorization: Bearer {access_token}

3. Backend validates token
   ├─ Check signature
   ├─ Check expiry (15 min)
   ├─ Extract user claims
   └─ Allow request

4. When token expires
   ├─ Frontend calls /auth/refresh
   ├─ Backend validates refresh_token
   ├─ Generate new access_token
   └─ Continue with new token


2FA FLOW (TOTP)
═══════════════

1. User enables 2FA: POST /users/me/2fa/enable
   ├─ Backend generates secret
   ├─ Return QR code & backup codes
   └─ User scans with authenticator app

2. Subsequent login: POST /auth/login
   ├─ Verify email/password
   ├─ Request: TOTP code
   └─ User enters code from authenticator

3. Backend validates TOTP
   ├─ Accept if valid
   ├─ Issue JWT token
   └─ Login complete
```

---

## Deployment Architecture

```
DEVELOPMENT
═════════

Local Machine:
├─ Django dev server (localhost:8000)
├─ PostgreSQL local instance
├─ SQLite for testing
└─ Hot reload enabled


STAGING
═══════

Railway/Digital Ocean:
├─ Django with gunicorn
├─ PostgreSQL 15 (managed service)
├─ Redis cache (optional)
├─ HTTPS/SSL enabled
├─ Environment variables via secrets
└─ Daily backups


PRODUCTION
══════════

Multi-region:
├─ Primary: Railway/Digital Ocean
│  ├─ Django API (load balanced)
│  ├─ PostgreSQL primary
│  ├─ Redis cache cluster
│  └─ Cloudflare R2 for media
│
├─ Backup: Hot standby
│  ├─ PostgreSQL replica
│  └─ Automatic failover
│
└─ Global:
   ├─ CDN for static files
   ├─ SSL/TLS certificates
   ├─ WAF (Web Application Firewall)
   └─ DDoS protection
```

---

## Query Patterns & Performance

```
FAST PATTERNS (< 50ms with indexes)
═══════════════════════════════════

✓ Browse by category
  SELECT * FROM apps WHERE category_id = ? ORDER BY rating DESC

✓ Search by name
  SELECT * FROM apps WHERE name_en LIKE ? OR name_ar LIKE ?
  (Add full-text index: GIN on tsvector)

✓ Get user favorites
  SELECT * FROM apps WHERE id IN (
    SELECT app_id FROM favorites WHERE user_id = ?
  )

✓ Check if favorited (single app)
  SELECT EXISTS(SELECT 1 FROM favorites WHERE user_id = ? AND app_id = ?)

✓ Get app reviews (paginated)
  SELECT * FROM reviews WHERE app_id = ? AND status='approved'
  ORDER BY helpful_count DESC LIMIT 10 OFFSET 0

✓ Get share count
  SELECT COUNT(*) FROM share_events WHERE app_id = ?


MEDIUM QUERIES (< 200ms)
════════════════════════

~ Popular apps with stats
  SELECT a.*, COUNT(f.id) as fav_count, COUNT(r.id) as review_count
  FROM apps a
  LEFT JOIN favorites f ON a.id = f.app_id
  LEFT JOIN reviews r ON a.id = r.app_id AND r.status='approved'
  GROUP BY a.id
  ORDER BY review_count DESC

~ User dashboard (collections + favorites)
  SELECT c.*, COUNT(ca.id) as app_count
  FROM collections c
  LEFT JOIN collection_apps ca ON c.id = ca.collection_id
  WHERE c.user_id = ?
  GROUP BY c.id

~ App detail (with related data)
  SELECT a.*, d.*, COUNT(r.id) as review_count, AVG(r.rating) as avg_rating
  FROM apps a
  LEFT JOIN developers d ON a.developer_id = d.id
  LEFT JOIN reviews r ON a.id = r.app_id AND r.status='approved'
  GROUP BY a.id, d.id


SLOW QUERIES (Needs optimization)
══════════════════════════════════

✗ Search across all tables without index
✗ Aggregations without materialized views
✗ Large range queries without partition
✗ N+1 queries in ORM (always use select_related/prefetch_related)


OPTIMIZATION STRATEGIES
═══════════════════════

1. Indexes
   - B-tree on foreign keys
   - B-tree on sort columns
   - GIN on full-text search columns

2. Denormalization
   - apps.apps_avg_rating (from reviews)
   - apps.total_reviews (from reviews)
   - reviews.helpful_count (from helpfulness)

3. Caching
   - Popular apps (Redis, 1 hour TTL)
   - Category lists (Redis, 24 hour TTL)
   - User favorites (Redis, 1 hour TTL)

4. Materialized Views
   - popular_apps_view (refresh daily)
   - user_statistics_view (refresh hourly)

5. Read Replicas (at scale)
   - Analytics queries go to replica
   - Write queries go to primary
   - Replication lag: ~100ms
```

---

## Monitoring & Observability

```
METRICS TO TRACK
════════════════

Application:
├─ API Response Time (p50, p95, p99)
├─ Request Rate (requests/sec)
├─ Error Rate (4xx, 5xx)
├─ Active Users (concurrent)
└─ Cache Hit Ratio

Database:
├─ Query Execution Time
├─ Connection Pool Usage
├─ Slow Query Log
├─ Replication Lag
└─ Backup Status

Infrastructure:
├─ CPU Usage
├─ Memory Usage
├─ Disk I/O
├─ Network Bandwidth
└─ Uptime


ALERTS
══════

Critical (page on-call):
├─ Database connection failed
├─ Error rate > 5%
├─ API response time > 1s
└─ Disk space < 10%

Warning (log & email):
├─ Query time > 500ms
├─ Cache hit ratio < 60%
├─ Memory usage > 80%
└─ Replication lag > 10s
```

---

## Security Architecture

```
LAYERS OF SECURITY
═══════════════════

1. NETWORK LAYER
   ├─ HTTPS/TLS for all connections
   ├─ WAF (Web Application Firewall)
   ├─ Rate limiting (5 req/sec per IP)
   └─ CORS whitelisting

2. APPLICATION LAYER
   ├─ Input validation (Django validators)
   ├─ SQL injection prevention (ORM parameterized queries)
   ├─ XSS prevention (DRF serializer escaping)
   ├─ CSRF tokens (Django middleware)
   └─ JWT token validation

3. AUTHENTICATION LAYER
   ├─ Password hashing (PBKDF2)
   ├─ Email verification required
   ├─ OAuth 2.0 provider validation
   ├─ 2FA (TOTP) support
   └─ Refresh token rotation

4. AUTHORIZATION LAYER
   ├─ Role-based access (Admin, Developer, User)
   ├─ Resource ownership checks (user_id == request.user)
   ├─ Collection share token validation
   └─ Admin permission verification

5. DATA LAYER
   ├─ At-rest encryption (optional)
   ├─ TLS for replication
   ├─ Backups encrypted
   └─ Audit logs

6. PRIVACY LAYER
   ├─ GDPR compliance (data export, deletion)
   ├─ User activity anonymization (optional)
   ├─ Retention policies (logs purged after 90 days)
   └─ PII protection (email, password encrypted)
```

---

## Scalability Roadmap

```
PHASE 1: MVP (Current)
═══════════════════════
├─ Single Django instance
├─ PostgreSQL primary only
├─ Redis cache (optional)
└─ Scale: 10K-100K users


PHASE 2: Growth (Next Quarter)
═══════════════════════════════
├─ Load balanced Django instances (2-3)
├─ PostgreSQL primary + read replica
├─ Redis cluster for cache
├─ Elasticsearch for full-text search
└─ Scale: 100K-1M users


PHASE 3: Scale (Year 2)
═══════════════════════
├─ Multi-region Django deployment
├─ PostgreSQL sharding by region
├─ Distributed cache (Redis cluster)
├─ CDN for static assets
├─ Separate analytics database (ClickHouse)
└─ Scale: 1M-10M users


PHASE 4: Global (Year 3+)
══════════════════════════
├─ Multi-cloud deployment
├─ Global load balancing
├─ Database federation
├─ Kafka event streaming
├─ Machine learning pipeline
└─ Scale: 10M+ users
```

---

## Technology Decisions Summary

| Aspect | Choice | Rationale |
|--------|--------|-----------|
| **Backend Language** | Python 3.11+ | Rich ecosystem, ML/AI libraries |
| **Web Framework** | Django 5.2 | Batteries-included, secure defaults |
| **API Framework** | Django REST Framework | Standard, well-documented |
| **Database** | PostgreSQL 15+ | Robust, feature-rich, JSONB support |
| **ORM** | Django ORM | Built-in, migrations built-in |
| **Authentication** | django-allauth + JWT | OAuth + custom auth |
| **API Docs** | drf-spectacular | OpenAPI 3.0, auto-generated |
| **Deployment** | Railway/Digital Ocean | Simple, affordable ($5-15/mo) |
| **Cache** | Redis | Standard, well-supported |
| **File Storage** | Cloudflare R2 | S3-compatible, affordable |
| **Monitoring** | Sentry + DataDog | Error tracking + monitoring |

---

**Last Updated:** October 19, 2025
**Framework:** Django 5.2 + DRF
**Database:** PostgreSQL 15+
**Status:** ✅ Ready for Implementation