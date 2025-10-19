# Database Schema Design Rationale

## Overview
This document explains the design decisions, trade-offs, and rationale behind the PostgreSQL schema for the Quran Apps Directory.

---

## Design Principles

### 1. **Normalization (3NF)**
- **Goal:** Minimize data redundancy and maintain referential integrity
- **Implementation:** Separate tables for entities with their own lifecycle (Users, Apps, Developers, Categories)
- **Benefit:** Single source of truth, easy updates, reduced storage

### 2. **Scalability**
- **Goal:** Support 10x current data growth
- **Implementation:**
  - Composite indexes on frequently queried column combinations
  - Partitioning strategy for time-series tables (share_events, user_activities)
  - JSONB for flexible metadata storage
- **Targets:** <100ms for typical queries at 100K apps scale

### 3. **Performance**
- **Goal:** Sub-100ms response times for common queries
- **Implementation:**
  - Strategic indexes on foreign keys and filter columns
  - Materialized views for aggregations
  - Denormalization of rating counts (apps_avg_rating) for O(1) access
- **Tradeoff:** Storage cost vs. query speed (acceptable for this use case)

### 4. **Security**
- **Goal:** Protect user privacy and data integrity
- **Implementation:**
  - Row-level security via user_id in engagement tables
  - Encryption at application level for sensitive data (OAuth tokens, 2FA secrets)
  - Audit trail through created_at/updated_at fields
- **Limitation:** Encryption keys managed in application, not at DB level

### 5. **Flexibility**
- **Goal:** Support future feature development without schema changes
- **Implementation:**
  - JSONB columns for metadata (user_activities, notifications)
  - Extensible choice fields with CHECK constraints
  - Abstract base models for common patterns
- **Example:** UserActivity.metadata stores activity-specific data (search query, filter applied, etc.)

---

## Entity Design Decisions

### Core Entities (Apps, Developers, Categories)

#### Why Separate Developer Table?
- **Decision:** Separate `developers` table instead of denormalized developer info in `apps`
- **Rationale:**
  - Developers appear in multiple contexts (developer profiles, app listings, reviews)
  - Future support for developer dashboards and accounts
  - Normalization reduces update anomalies if developer info changes
- **Tradeoff:** Additional JOIN for app listings (mitigated by efficient indexing)

#### Why Many-to-Many Categories?
- **Decision:** `app_categories` junction table instead of array field
- **Rationale:**
  - Apps can have multiple categories (e.g., "Mushaf" + "Tafsir" + "Audio")
  - Categories used independently for filtering and navigation
  - PostgreSQL arrays would limit advanced queries
- **Benefit:** Supports complex filtering queries like "apps in mushaf AND tafsir"

#### Bilingual Fields Strategy
- **Decision:** Separate `_en` and `_ar` fields instead of i18n table
- **Rationale:**
  - Only 2 languages currently, unlikely to exceed 5
  - Simpler queries without additional JOINs
  - Performance boost for common bilingual displays
- **Alternative Considered:** Translation table (too complex for current scale)
- **Migration Path:** Extensible if we need 10+ languages

### User & Authentication

#### Extended Django User Model
- **Decision:** Extend AbstractUser with additional fields
- **Rationale:**
  - Leverage Django's built-in authentication, permissions, groups
  - Reduce custom auth code and security risks
  - JWT tokens can be added via middleware without schema changes
- **Benefits:**
  - /admin interface works automatically
  - Rate limiting, audit logging built-in
  - OAuth can use Django's authentication backend

#### Separate OAuth & 2FA Tables
- **Decision:** OneToOne relationships instead of jsonb fields
- **Rationale:**
  - OAuth is optional per user (may or may not exist)
  - 2FA is optional feature
  - Type safety: explicit NULL checks vs. parsing JSON
- **Benefit:** Cleaner queries, automatic migration validation

#### Why Email Verification Flag?
- **Decision:** `email_verified` boolean instead of status enum
- **Rationale:**
  - Simple binary state (verified/unverified)
  - No middle states needed
  - Fast filtering for "unverified users" queries

### User Engagement

#### Composite Primary Keys for Favorites
- **Decision:** `(user_id, app_id)` as composite primary key
- **Rationale:**
  - Natural key: a user can only favorite an app once
  - O(1) existence checks: `SELECT 1 FROM favorites WHERE user_id=? AND app_id=?`
  - No surrogate ID needed (waste of space)

#### Collections as Owned Aggregates
- **Decision:** Collections with collections_apps junction table
- **Rationale:**
  - Users "own" collections (user_id in collection)
  - Collections can be shared (share_token for public access)
  - Explicit sort_order for custom ordering
  - Optional note field per item (use for personalization)

#### Review Moderation Fields
- **Decision:** `status` enum + `moderator_id` + `moderation_reason`
- **Rationale:**
  - Clear workflow: pending → approved/rejected/flagged
  - Audit trail: who moderated, when, why
  - Supports appeals process (could reopen rejected reviews)

#### Separate Helpfulness Tracking
- **Decision:** `review_helpfulness` junction table
- **Rationale:**
  - Multiple users vote on same review
  - Track individual votes for analytics (e.g., "50% found helpful")
  - Prevents double-voting (unique constraint)
  - Supports vote changes (user can change mind)

### Analytics & Tracking

#### ShareEvent Granularity
- **Decision:** One row per share (not aggregated)
- **Rationale:**
  - Enables detailed analytics (platform breakdown, temporal patterns)
  - Aggregation is cheap at query time
  - Supports partitioning for old data
- **Aggregation:** Materialized views for common metrics

#### UserActivity Flexibility
- **Decision:** JSONB metadata field instead of specific columns
- **Rationale:**
  - Activity types vary (search queries, filter applied, app viewed, etc.)
  - Adding new activity types doesn't require migration
  - Flexible data storage for analytics
- **Examples:**
  ```json
  // search activity
  {"query": "tajweed", "category": "tajweed", "results_count": 5}

  // collection_create activity
  {"collection_id": "...", "name": "My Favorites"}
  ```

#### Daily Aggregated Analytics
- **Decision:** Separate `app_view_analytics` table (not just user_activities)
- **Rationale:**
  - user_activities table becomes huge (millions of rows)
  - Daily aggregation enables reporting queries at O(1)
  - Retention policies: keep granular data 30 days, aggregate forever
- **Tradeoff:** Cron job to aggregate daily (automated)

### Notifications & Communication

#### Bilingual Notifications
- **Decision:** `title_en`, `title_ar`, `message_en`, `message_ar` fields
- **Rationale:**
  - Pre-rendered text (no i18n computation)
  - Notifications should be immediately readable
  - Supports future notification scheduling (send at user's timezone)

#### Email Logs for Audit
- **Decision:** Persistent email_logs table (not just sent/failed events)
- **Rationale:**
  - Compliance: proof of delivery for sensitive emails (verification, password reset)
  - Troubleshooting: identify delivery issues
  - Analytics: email engagement metrics
- **Retention:** 90 days for privacy compliance

---

## Query Optimization Strategy

### Index Selection Rationale

| Index | Queries Enabled | Benefit |
|-------|---|---|
| `apps(developer_id)` | Apps by developer | Required for "developer profile" pages |
| `apps(apps_avg_rating DESC)` | Top-rated apps | No sorting needed, direct iteration |
| `app_categories(category_id, app_id)` | Apps in category | Fast filtering without full table scan |
| `reviews(app_id, status)` | Approved reviews for display | Composite index avoids second lookup |
| `share_events(app_id, timestamp DESC)` | Share analytics | Time-series queries for trending |
| `user_activities(user_id, activity_type)` | User timeline | Analytics by activity type |
| `favorites(user_id, app_id)` | Favorite checking | O(1) existence check |

### Query Performance Examples

#### Fast (< 50ms with indexes)
```sql
-- Browse apps by category
SELECT a.* FROM apps a
JOIN app_categories ac ON a.id = ac.app_id
WHERE ac.category_id = $1 AND a.status = 'published'
ORDER BY a.apps_avg_rating DESC
LIMIT 20;
-- Uses: app_categories(category_id, app_id) + apps(status, apps_avg_rating DESC)

-- Check if user favorited app
SELECT EXISTS(SELECT 1 FROM favorites WHERE user_id = $1 AND app_id = $2);
-- Uses: favorites(user_id, app_id) as composite PK

-- Get share count for app
SELECT COUNT(*) FROM share_events WHERE app_id = $1;
-- Uses: share_events(app_id)
```

#### Slow Without Indexes (Would Need Optimization)
```sql
-- Get all reviews for an app (without index)
SELECT r.* FROM reviews r
WHERE r.app_id = $1 AND r.status = 'approved'
ORDER BY r.helpful_count DESC;
-- Solution: Add composite index reviews(app_id, status)
```

---

## Denormalization Decisions

### apps_avg_rating (Denormalized)
- **Location:** Stored in `apps` table, calculated from `reviews`
- **Rationale:**
  - Rating displayed on every app listing (hundreds of rows)
  - Recalculating from reviews every time would be expensive
  - Apps table is relatively small (< 100K rows) - minimal storage impact
- **Update Strategy:** Trigger or application-level update on review approval
- **Fallback:** Periodic batch recalculation for consistency

### helpful_count / not_helpful_count (Denormalized)
- **Location:** Stored in `reviews` table
- **Rationale:**
  - Displayed next to review
  - Sorting by helpfulness requires this column
- **Update Strategy:** Automatic on review_helpfulness insert/delete
- **Alternative Considered:** Calculate on display (too slow for sorting)

### total_reviews (Denormalized)
- **Location:** Stored in `apps` table
- **Rationale:**
  - Quick stat for review section header
  - Used for sorting (most reviewed apps)
- **Update Strategy:** Automatic on review approval/rejection

---

## Migration & Data Load Strategy

### Phase 1: Schema Creation
```bash
# Create tables and indexes
python manage.py makemigrations
python manage.py migrate
```

### Phase 2: Data Migration (TypeScript → PostgreSQL)
```python
# Extract from applicationsData.ts
apps_data = json.load("applicationsData.ts")

# Transform
for app in apps_data:
    developer = Developer.objects.get_or_create(
        name_en=app["Developer_Name_En"],
        name_ar=app["Developer_Name_Ar"]
    )

    app_obj = App.objects.create(
        name_en=app["Name_En"],
        name_ar=app["Name_Ar"],
        developer=developer,
        apps_avg_rating=app.get("Apps_Avg_Rating", 0),
        # ... map all fields
    )

    # Many-to-many
    for category_slug in app["categories"]:
        category = Category.objects.get(slug=category_slug)
        app_obj.categories.add(category)

    # Screenshots
    for url in app.get("screenshots_en", []):
        Screenshot.objects.create(app=app_obj, url=url, language='en')
```

### Phase 3: Validation
- Row count verification
- Constraint validation
- Data integrity checks (no orphaned records)
- Performance testing

---

## Schema Extension Points

### Adding New Features

#### Feature: App Ratings (1-5 stars)
- ✅ Already supported by `Review` model
- Schema ready: `reviews.rating` (1-5)

#### Feature: Developer Accounts
- ✅ Foundation ready: `developers.contact_email`
- Extension needed: Link Developer to User for login
- Migration: `developers.user_id` foreign key to User

#### Feature: App Tagging System
- Extension: New `Tag` model + `app_tags` junction table
- No existing schema changes needed

#### Feature: Advanced Search (Elasticsearch)
- External integration, no schema changes
- User_activities.metadata stores search queries for training data

#### Feature: Recommendation Engine
- Can be added via separate `user_recommendations` table
- Or as computed views from user_activities

---

## Performance Characteristics

### Expected Query Performance

| Operation | Volume | Time | Queries/sec |
|---|---|---|---|
| Browse category | 10K apps | ~50ms | 20 |
| Search all apps | 10K apps | ~100ms | 10 |
| Load app detail + reviews | 10K reviews | ~150ms | 7 |
| User dashboard (favorites + collections) | 1K items | ~200ms | 5 |
| Submit review | 1 transaction | ~50ms | 20 |
| Track share event | 1 insert | ~10ms | 100 |
| Generate analytics report | Daily | ~500ms | 0.017 |

### Scalability Limits (Current Schema)

- **No issues up to:** 1M apps, 100M reviews, 1B share events
- **Partitioning needed at:** share_events > 10B (daily partition)
- **Read replicas recommended at:** > 1000 concurrent users
- **Sharding trigger:** > 50 concurrent write transactions/sec

---

## Backup & Disaster Recovery

### Backup Strategy
- Daily full backups to S3
- 30-day retention
- Point-in-time recovery enabled (WAL archiving)
- Hot standby replica in different region

### Recovery SLOs
- **RTO** (Recovery Time Objective): 1 hour
- **RPO** (Recovery Point Objective): 5 minutes
- **Automation:** Terraform provisioning, automated failover

---

## Security Implementation

### Authentication
- Django's built-in password hashing (PBKDF2 configurable)
- JWT tokens for API (Django REST Framework SimpleJWT)
- OAuth integration with major providers

### Authorization
- Django's built-in permissions system
- Row-level security via user_id checks
- Admin panel protection (staff_only)

### Encryption
- OAuth tokens encrypted at application level
- 2FA secrets encrypted at application level
- HTTPS-only API endpoints
- Database connections use SSL

### Audit Trail
- All user-generated content has created_at/updated_at
- User activities logged in user_activities table
- Email delivery tracked in email_logs
- Review moderation tracked in reviews.moderator_id

---

## Future Improvements

### Phase 2 Enhancements
1. **Read Replicas** for analytics queries
2. **Redis Caching** for frequently accessed data
3. **Full-Text Search** via PostgreSQL or Elasticsearch
4. **Time-Series Database** (InfluxDB) for analytics

### Phase 3 Optimizations
1. **Partitioning** share_events by date range
2. **Archival** of old user_activities (>1 year)
3. **Materialized Views** refresh automation
4. **Column-Family Store** for analytics (ClickHouse optional)

---

## Conclusion

This schema provides a solid foundation for:
- ✅ Current feature set (reviews, ratings, collections, sharing)
- ✅ 10x growth without schema changes
- ✅ Complex queries for analytics
- ✅ Strong data integrity and security
- ✅ Clear extension points for new features

The design balances normalization (data integrity) with denormalization (query performance) through strategic indexing and thoughtful column selection.
