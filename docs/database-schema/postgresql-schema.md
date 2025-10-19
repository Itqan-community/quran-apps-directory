# PostgreSQL Database Schema - Quran Apps Directory

## Overview
Comprehensive relational database schema for the Quran Apps Directory platform, supporting core features and future scalability.

**Technology Stack:**
- Database: PostgreSQL 15+
- ORM: Django ORM
- Migrations: Django Migrations
- Driver: psycopg2-binary

---

## Entity Relationship Diagram (ERD)

```
┌─────────────────────────────────────────────────────────────┐
│                     CORE ENTITIES                           │
└─────────────────────────────────────────────────────────────┘

┌──────────────┐         ┌──────────────┐         ┌──────────────┐
│   Category   │         │     App      │         │  Developer   │
├──────────────┤         ├──────────────┤         ├──────────────┤
│ id (PK)      │◄────────│ developer_id │         │ id (PK)      │
│ slug         │         │ category_ids │◄────────│ name_en      │
│ name_en      │         │ (M:N rel)    │         │ name_ar      │
│ name_ar      │         └──────────────┘         │ website      │
│ description  │                │                 │ logo_url     │
│ icon_url     │                │                 │ created_at   │
└──────────────┘                │                 └──────────────┘
                                │
                        ┌───────▼───────┐
                        │  App Features  │
                        ├────────────────┤
                        │ id (PK)        │
                        │ app_id (FK)    │
                        │ name_en        │
                        │ name_ar        │
                        └────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                     USER & AUTH ENTITIES                    │
└─────────────────────────────────────────────────────────────┘

┌──────────────────┐        ┌──────────────────┐
│   User           │        │  OAuth Provider  │
├──────────────────┤        ├──────────────────┤
│ id (PK)          │◄───────│ user_id (FK)     │
│ email            │        │ provider         │
│ password_hash    │        │ provider_user_id │
│ name             │        │ created_at       │
│ avatar_url       │        └──────────────────┘
│ bio              │
│ email_verified   │        ┌──────────────────┐
│ language_pref    │        │  User 2FA        │
│ theme_pref       │        ├──────────────────┤
│ created_at       │◄───────│ user_id (FK)     │
│ updated_at       │        │ secret           │
│ last_login_at    │        │ backup_codes     │
│ is_active        │        │ enabled_at       │
└──────────────────┘        └──────────────────┘

┌─────────────────────────────────────────────────────────────┐
│               USER ENGAGEMENT ENTITIES                      │
└─────────────────────────────────────────────────────────────┘

┌──────────────────┐      ┌──────────────────┐
│    Favorite      │      │   Collection     │
├──────────────────┤      ├──────────────────┤
│ user_id (PK,FK)  │      │ id (PK)          │
│ app_id (PK,FK)   │      │ user_id (FK)     │
│ created_at       │      │ name             │
└──────────────────┘      │ description      │
                          │ is_public        │
                          │ share_token      │
        ┌─────────────────│ created_at       │
        │                 │ updated_at       │
        │                 └──────────────────┘
        │                         │
        │                 ┌───────▼─────────┐
        │                 │ CollectionApp   │
        │                 ├─────────────────┤
        │                 │ collection_id   │
        └────────────────→│ (PK,FK)         │
                          │ app_id (PK,FK)  │
                          │ sort_order      │
                          │ note            │
                          └─────────────────┘

┌──────────────────┐      ┌──────────────────┐
│    Review        │      │   ReviewHelper   │
├──────────────────┤      ├──────────────────┤
│ id (PK)          │      │ review_id (PK,FK)│
│ app_id (FK)      │      │ user_id (PK,FK)  │
│ user_id (FK)     │      │ is_helpful       │
│ rating           │      │ created_at       │
│ title            │      └──────────────────┘
│ content          │
│ status           │      ┌──────────────────┐
│ created_at       │      │  ReviewFlag      │
│ moderated_at     │      ├──────────────────┤
│ moderator_id (FK)│      │ review_id (PK,FK)│
│ helpful_count    │      │ user_id (PK,FK)  │
│ not_helpful_count│      │ reason           │
└──────────────────┘      │ created_at       │
                          └──────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                 ANALYTICS & TRACKING ENTITIES               │
└─────────────────────────────────────────────────────────────┘

┌──────────────────┐      ┌──────────────────┐
│   ShareEvent     │      │ UserActivity     │
├──────────────────┤      ├──────────────────┤
│ id (PK)          │      │ id (PK)          │
│ app_id (FK)      │      │ user_id (FK)     │
│ platform         │      │ activity_type    │
│ user_id (FK)     │      │ app_id (FK)      │
│ timestamp        │      │ timestamp        │
│ ip_address       │      └──────────────────┘
└──────────────────┘

┌──────────────────────────┐
│   Screenshot             │
├──────────────────────────┤
│ id (PK)                  │
│ app_id (FK)              │
│ url                      │
│ language (en/ar)         │
│ sort_order               │
│ created_at               │
└──────────────────────────┘
```

---

## Table Definitions

### 1. CORE ENTITIES

#### `categories`
```sql
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(100) UNIQUE NOT NULL,
    name_en VARCHAR(255) NOT NULL,
    name_ar VARCHAR(255) NOT NULL,
    description_en TEXT,
    description_ar TEXT,
    icon_url VARCHAR(500),
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT valid_slug CHECK (slug ~ '^[a-z0-9_-]+$')
);

CREATE INDEX idx_categories_slug ON categories(slug);
CREATE INDEX idx_categories_sort_order ON categories(sort_order);
```

**Purpose:** Store app categories (Mushaf, Tafsir, Translations, etc.)
**Sample Data:** 11 categories from current system

---

#### `developers`
```sql
CREATE TABLE developers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name_en VARCHAR(255) NOT NULL,
    name_ar VARCHAR(255) NOT NULL,
    website VARCHAR(500),
    logo_url VARCHAR(500),
    description_en TEXT,
    description_ar TEXT,
    contact_email VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT unique_developer_name UNIQUE (name_en, name_ar)
);

CREATE INDEX idx_developers_name_en ON developers(name_en);
CREATE INDEX idx_developers_created_at ON developers(created_at);
```

**Purpose:** Store developer information
**Relationships:** One-to-Many with Apps

---

#### `apps`
```sql
CREATE TABLE apps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    developer_id UUID REFERENCES developers(id) ON DELETE SET NULL,

    -- Identification
    name_en VARCHAR(255) NOT NULL,
    name_ar VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,

    -- Content
    short_description_en VARCHAR(500),
    short_description_ar VARCHAR(500),
    description_en TEXT,
    description_ar TEXT,

    -- Media
    main_image_en VARCHAR(500),
    main_image_ar VARCHAR(500),
    app_icon VARCHAR(500),

    -- Status & Ratings
    status VARCHAR(50) DEFAULT 'draft',
    apps_avg_rating DECIMAL(3,2) DEFAULT 0,
    total_reviews INTEGER DEFAULT 0,

    -- Store Links
    google_play_link VARCHAR(500),
    app_store_link VARCHAR(500),
    app_gallery_link VARCHAR(500),

    -- Metadata
    sort_order INTEGER DEFAULT 0,
    is_featured BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT valid_slug CHECK (slug ~ '^[a-z0-9_-]+$'),
    CONSTRAINT valid_rating CHECK (apps_avg_rating >= 0 AND apps_avg_rating <= 5),
    CONSTRAINT valid_status CHECK (status IN ('draft', 'published', 'archived', 'done'))
);

CREATE INDEX idx_apps_slug ON apps(slug);
CREATE INDEX idx_apps_developer_id ON apps(developer_id);
CREATE INDEX idx_apps_apps_avg_rating ON apps(apps_avg_rating DESC);
CREATE INDEX idx_apps_is_featured ON apps(is_featured);
CREATE INDEX idx_apps_status ON apps(status);
CREATE INDEX idx_apps_created_at ON apps(created_at DESC);
```

**Purpose:** Store app information
**Relationships:** Many-to-One with Developers, Many-to-Many with Categories

---

#### `app_categories`
```sql
CREATE TABLE app_categories (
    app_id UUID NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    sort_order INTEGER DEFAULT 0,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (app_id, category_id)
);

CREATE INDEX idx_app_categories_category_id ON app_categories(category_id);
CREATE INDEX idx_app_categories_sort_order ON app_categories(sort_order);
```

**Purpose:** Junction table for Many-to-Many relationship between Apps and Categories

---

#### `app_features`
```sql
CREATE TABLE app_features (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    app_id UUID NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
    name_en VARCHAR(255) NOT NULL,
    name_ar VARCHAR(255) NOT NULL,
    description_en TEXT,
    description_ar TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT unique_feature_per_app UNIQUE (app_id, name_en)
);

CREATE INDEX idx_app_features_app_id ON app_features(app_id);
CREATE INDEX idx_app_features_sort_order ON app_features(sort_order);
```

**Purpose:** Store app features (extracted from description)
**Example:** "Word-by-word translation", "Offline mode", "64+ reciters"

---

#### `screenshots`
```sql
CREATE TABLE screenshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    app_id UUID NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
    url VARCHAR(500) NOT NULL,
    language VARCHAR(5) NOT NULL, -- 'en' or 'ar'
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT valid_language CHECK (language IN ('en', 'ar'))
);

CREATE INDEX idx_screenshots_app_id ON screenshots(app_id);
CREATE INDEX idx_screenshots_language ON screenshots(language);
CREATE INDEX idx_screenshots_sort_order ON screenshots(sort_order);
```

**Purpose:** Store app screenshots

---

### 2. USER & AUTHENTICATION ENTITIES

#### `users` (Django's built-in User model extended)
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Authentication
    email VARCHAR(254) UNIQUE NOT NULL,
    password_hash VARCHAR(255),

    -- Profile
    username VARCHAR(150) UNIQUE,
    first_name VARCHAR(150),
    last_name VARCHAR(150),
    avatar_url VARCHAR(500),
    bio TEXT,

    -- Preferences
    language_preference VARCHAR(5) DEFAULT 'en',
    theme_preference VARCHAR(10) DEFAULT 'auto', -- 'light', 'dark', 'auto'

    -- Status & Verification
    email_verified BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login_at TIMESTAMP,

    CONSTRAINT valid_language_pref CHECK (language_preference IN ('en', 'ar')),
    CONSTRAINT valid_theme_pref CHECK (theme_preference IN ('light', 'dark', 'auto'))
);

CREATE UNIQUE INDEX idx_users_email ON users(LOWER(email));
CREATE UNIQUE INDEX idx_users_username ON users(username) WHERE username IS NOT NULL;
CREATE INDEX idx_users_is_active ON users(is_active);
CREATE INDEX idx_users_created_at ON users(created_at DESC);
```

**Purpose:** Store user account information
**Extensions:** Groups, Permissions managed by Django's built-in system

---

#### `oauth_providers`
```sql
CREATE TABLE oauth_providers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL, -- 'google', 'apple', 'facebook', 'twitter'
    provider_user_id VARCHAR(255) NOT NULL,
    email VARCHAR(254),
    name VARCHAR(255),
    access_token_encrypted VARCHAR(1000),
    refresh_token_encrypted VARCHAR(1000),
    token_expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT valid_provider CHECK (provider IN ('google', 'apple', 'facebook', 'twitter')),
    CONSTRAINT unique_oauth_account UNIQUE (provider, provider_user_id)
);

CREATE INDEX idx_oauth_providers_user_id ON oauth_providers(user_id);
CREATE INDEX idx_oauth_providers_provider ON oauth_providers(provider);
```

**Purpose:** Store OAuth integration data
**Security:** Tokens encrypted at application level

---

#### `user_2fa`
```sql
CREATE TABLE user_2fa (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- TOTP Secret
    secret_encrypted VARCHAR(500) NOT NULL,
    backup_codes_encrypted TEXT, -- JSON array of backup codes

    -- Status
    enabled_at TIMESTAMP,
    disabled_at TIMESTAMP,

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_user_2fa_user_id ON user_2fa(user_id);
CREATE INDEX idx_user_2fa_enabled_at ON user_2fa(enabled_at) WHERE enabled_at IS NOT NULL;
```

**Purpose:** Store Two-Factor Authentication (TOTP) data
**Security:** Secrets encrypted with application key

---

### 3. USER ENGAGEMENT ENTITIES

#### `favorites`
```sql
CREATE TABLE favorites (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    app_id UUID NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (user_id, app_id)
);

CREATE INDEX idx_favorites_app_id ON favorites(app_id);
CREATE INDEX idx_favorites_created_at ON favorites(created_at DESC);
```

**Purpose:** Store user favorite apps
**Performance:** Composite primary key for O(1) lookups

---

#### `collections`
```sql
CREATE TABLE collections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Content
    name VARCHAR(255) NOT NULL,
    description TEXT,

    -- Sharing
    is_public BOOLEAN DEFAULT FALSE,
    share_token VARCHAR(50) UNIQUE, -- For public sharing

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_collections_user_id ON collections(user_id);
CREATE INDEX idx_collections_is_public ON collections(is_public);
CREATE INDEX idx_collections_share_token ON collections(share_token) WHERE share_token IS NOT NULL;
CREATE INDEX idx_collections_created_at ON collections(created_at DESC);
```

**Purpose:** Store user-created collections of apps
**Security:** share_token for public collection access control

---

#### `collection_apps`
```sql
CREATE TABLE collection_apps (
    collection_id UUID NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
    app_id UUID NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
    sort_order INTEGER DEFAULT 0,
    note TEXT,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (collection_id, app_id)
);

CREATE INDEX idx_collection_apps_app_id ON collection_apps(app_id);
CREATE INDEX idx_collection_apps_sort_order ON collection_apps(sort_order);
```

**Purpose:** Junction table for Collections and Apps

---

#### `reviews`
```sql
CREATE TABLE reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    app_id UUID NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Content
    rating INTEGER NOT NULL, -- 1-5
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,

    -- Moderation
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'flagged'
    moderated_at TIMESTAMP,
    moderator_id UUID REFERENCES users(id) ON DELETE SET NULL,
    moderation_reason TEXT,

    -- Helpfulness
    helpful_count INTEGER DEFAULT 0,
    not_helpful_count INTEGER DEFAULT 0,

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT valid_rating CHECK (rating >= 1 AND rating <= 5),
    CONSTRAINT valid_status CHECK (status IN ('pending', 'approved', 'rejected', 'flagged')),
    CONSTRAINT unique_user_app_review UNIQUE (user_id, app_id)
);

CREATE INDEX idx_reviews_app_id ON reviews(app_id);
CREATE INDEX idx_reviews_user_id ON reviews(user_id);
CREATE INDEX idx_reviews_status ON reviews(status);
CREATE INDEX idx_reviews_rating ON reviews(rating DESC);
CREATE INDEX idx_reviews_helpful_count ON reviews(helpful_count DESC);
CREATE INDEX idx_reviews_created_at ON reviews(created_at DESC);
```

**Purpose:** Store user reviews and ratings
**Constraints:** One review per user per app

---

#### `review_helpfulness`
```sql
CREATE TABLE review_helpfulness (
    review_id UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    is_helpful BOOLEAN NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (review_id, user_id),
    CONSTRAINT unique_helpfulness_vote UNIQUE (review_id, user_id)
);

CREATE INDEX idx_review_helpfulness_is_helpful ON review_helpfulness(is_helpful);
```

**Purpose:** Track helpful/not helpful votes on reviews

---

#### `review_flags`
```sql
CREATE TABLE review_flags (
    review_id UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reason VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (review_id, user_id),
    CONSTRAINT valid_reason CHECK (reason IN ('spam', 'inappropriate', 'off_topic', 'other'))
);

CREATE INDEX idx_review_flags_review_id ON review_flags(review_id);
CREATE INDEX idx_review_flags_reason ON review_flags(reason);
```

**Purpose:** Track flagged reviews for moderation

---

### 4. ANALYTICS & TRACKING ENTITIES

#### `share_events`
```sql
CREATE TABLE share_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    app_id UUID NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
    platform VARCHAR(50) NOT NULL, -- 'whatsapp', 'twitter', 'facebook', 'telegram', 'email', etc.
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    ip_address INET,
    user_agent TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_share_events_app_id ON share_events(app_id);
CREATE INDEX idx_share_events_platform ON share_events(platform);
CREATE INDEX idx_share_events_user_id ON share_events(user_id);
CREATE INDEX idx_share_events_timestamp ON share_events(timestamp DESC);
```

**Purpose:** Track social media share events
**Analytics:** Used for viral coefficient calculation

---

#### `user_activities`
```sql
CREATE TABLE user_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    activity_type VARCHAR(50) NOT NULL, -- 'view', 'favorite', 'review', 'share', 'collection_create', etc.
    app_id UUID REFERENCES apps(id) ON DELETE SET NULL,
    metadata JSONB, -- Flexible storage for activity-specific data
    ip_address INET,
    user_agent TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_user_activities_user_id ON user_activities(user_id);
CREATE INDEX idx_user_activities_activity_type ON user_activities(activity_type);
CREATE INDEX idx_user_activities_app_id ON user_activities(app_id);
CREATE INDEX idx_user_activities_timestamp ON user_activities(timestamp DESC);
```

**Purpose:** Track user engagement metrics
**Flexibility:** JSONB for extensible activity data

---

#### `app_view_analytics`
```sql
CREATE TABLE app_view_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    app_id UUID NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
    view_date DATE NOT NULL,
    view_count INTEGER DEFAULT 0,
    unique_viewers INTEGER DEFAULT 0,
    average_session_duration INTEGER, -- seconds

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT unique_daily_analytics UNIQUE (app_id, view_date)
);

CREATE INDEX idx_app_view_analytics_app_id ON app_view_analytics(app_id);
CREATE INDEX idx_app_view_analytics_view_date ON app_view_analytics(view_date DESC);
```

**Purpose:** Aggregated daily view analytics per app

---

### 5. NOTIFICATION & COMMUNICATION ENTITIES

#### `notifications`
```sql
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Content
    notification_type VARCHAR(50) NOT NULL, -- 'review_approved', 'new_review', 'collection_shared', etc.
    title_en VARCHAR(255) NOT NULL,
    title_ar VARCHAR(255) NOT NULL,
    message_en TEXT,
    message_ar TEXT,

    -- Related objects
    app_id UUID REFERENCES apps(id) ON DELETE SET NULL,
    related_user_id UUID REFERENCES users(id) ON DELETE SET NULL,

    -- Status
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP,

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT valid_notification_type CHECK (notification_type IN (
        'review_approved', 'review_rejected', 'new_review',
        'collection_shared', 'app_mentioned', 'system_alert'
    ))
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
```

**Purpose:** Store in-app notifications

---

#### `email_logs`
```sql
CREATE TABLE email_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    email_address VARCHAR(254) NOT NULL,
    email_type VARCHAR(50) NOT NULL, -- 'verification', 'password_reset', 'review_approved', etc.
    subject VARCHAR(255),
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'sent', 'failed', 'bounced'
    error_message TEXT,
    sent_at TIMESTAMP,
    opened_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_email_logs_user_id ON email_logs(user_id);
CREATE INDEX idx_email_logs_email_address ON email_logs(email_address);
CREATE INDEX idx_email_logs_status ON email_logs(status);
CREATE INDEX idx_email_logs_created_at ON email_logs(created_at DESC);
```

**Purpose:** Track email delivery and engagement

---

## Materialized Views & Queries

### Popular Apps (cached)
```sql
CREATE MATERIALIZED VIEW popular_apps_view AS
SELECT
    a.id,
    a.name_en,
    a.name_ar,
    a.apps_avg_rating,
    a.total_reviews,
    COUNT(f.user_id) as favorite_count,
    COUNT(DISTINCT r.id) as review_count,
    COUNT(DISTINCT se.id) as share_count
FROM apps a
LEFT JOIN favorites f ON a.id = f.app_id
LEFT JOIN reviews r ON a.id = r.app_id AND r.status = 'approved'
LEFT JOIN share_events se ON a.id = se.app_id
    AND se.timestamp > NOW() - INTERVAL '30 days'
WHERE a.status = 'published'
GROUP BY a.id
ORDER BY a.apps_avg_rating DESC, review_count DESC;

CREATE INDEX idx_popular_apps_rating ON popular_apps_view(apps_avg_rating DESC);
```

### User Statistics View
```sql
CREATE MATERIALIZED VIEW user_statistics_view AS
SELECT
    u.id,
    COUNT(DISTINCT f.app_id) as favorite_count,
    COUNT(DISTINCT c.id) as collection_count,
    COUNT(DISTINCT r.id) as review_count,
    MAX(ua.timestamp) as last_activity_at
FROM users u
LEFT JOIN favorites f ON u.id = f.user_id
LEFT JOIN collections c ON u.id = c.user_id
LEFT JOIN reviews r ON u.id = r.user_id AND r.status = 'approved'
LEFT JOIN user_activities ua ON u.id = ua.user_id
GROUP BY u.id;
```

---

## Indexing Strategy

### Query Performance Optimization

| Query Pattern | Index | Benefit |
|---|---|---|
| Browse apps by category | `app_categories(category_id, app_id)` | Fast category filtering |
| Search by developer | `apps(developer_id)` | Quick developer lookups |
| Filter by rating | `apps(apps_avg_rating DESC)` | Sorted results without sorting |
| User favorites | `favorites(user_id, app_id)` | O(1) favorite check |
| Review moderation | `reviews(status, created_at DESC)` | Efficient queue viewing |
| Share analytics | `share_events(app_id, timestamp DESC)` | Time-series queries |
| User preferences | `users(id, language_preference)` | Localization queries |

---

## Data Migration Strategy

### From TypeScript to PostgreSQL

1. **Extract Data** from `applicationsData.ts`
2. **Transform:**
   - Split multilingual fields (Name_Ar, Name_En → name_ar, name_en)
   - Extract developers into separate table
   - Create category junction records
3. **Load** into PostgreSQL
4. **Validate** data integrity and constraints

---

## Security Considerations

1. **Encryption:**
   - OAuth tokens encrypted at application level
   - 2FA secrets encrypted using application key
   - PII fields use encryption as needed

2. **Access Control:**
   - Row-level security for user data
   - Collection sharing via share_token
   - Developer notification privacy

3. **Audit Trail:**
   - created_at/updated_at on all tables
   - User activity logging
   - Email delivery tracking

4. **Data Retention:**
   - Activity logs archived after 1 year
   - Soft deletes for collections (optional)
   - Email logs retained for 90 days

---

## Performance Targets

- **App List Query:** <50ms (1000 apps)
- **Search Query:** <100ms
- **Review Aggregation:** <200ms (10K+ reviews)
- **User Analytics:** <500ms

---

## Backup & Recovery

- Daily backups to S3
- Point-in-time recovery enabled
- Replication to hot standby
- WAL archiving for disaster recovery

---

## Future Enhancements

1. **Partitioning:** Share events by date range
2. **Read Replicas:** For analytics queries
3. **Caching Layer:** Redis for hot data
4. **Search Index:** Elasticsearch for advanced search
5. **Time-Series:** Separate analytics database (InfluxDB)

---

## Schema Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-01-01 | Initial schema design |
| 1.1 | TBD | Audit tables added |
| 1.2 | TBD | Performance optimizations |

