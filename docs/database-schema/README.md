# Database Schema Documentation

## Overview

Complete PostgreSQL database schema design for the Quran Apps Directory platform, supporting all planned features and scalable to 10x current data volume.

**Status:** ✅ **Complete and Ready for Implementation**

---

## Documents in This Folder

### 1. [postgresql-schema.md](postgresql-schema.md) 📊
**Comprehensive database schema with complete SQL definitions**

Contains:
- ✅ Entity Relationship Diagram (ERD)
- ✅ Complete table definitions for all entities
- ✅ Indexes and constraints
- ✅ Materialized views for analytics
- ✅ Query optimization strategy
- ✅ Data migration strategy
- ✅ Security considerations
- ✅ Performance targets

**Use this when:**
- Implementing database migrations
- Understanding table relationships
- Optimizing queries
- Planning backups and disaster recovery

---

### 2. [django-models.py](django-models.py) 🐍
**Django ORM models ready for implementation**

Contains:
- ✅ All models with full field definitions
- ✅ Model relationships (ForeignKey, ManyToMany, OneToOne)
- ✅ Meta classes with ordering and indexing
- ✅ Model methods and properties
- ✅ Validation constraints
- ✅ Docstrings for each model
- ✅ Django best practices implemented

**Use this when:**
- Creating Django models
- Setting up Django migrations
- Implementing model logic
- Creating serializers for DRF

**How to use:**
1. Copy contents to `apps/models.py` (or split by app)
2. Update app-specific imports
3. Run `python manage.py makemigrations`
4. Run `python manage.py migrate`

---

### 3. [schema-design-rationale.md](schema-design-rationale.md) 💡
**Design decisions, trade-offs, and rationale**

Contains:
- ✅ Design principles (Normalization, Scalability, Performance)
- ✅ Entity-by-entity design decisions
- ✅ Denormalization rationale (e.g., apps_avg_rating)
- ✅ Query optimization examples
- ✅ Scalability limits and constraints
- ✅ Security implementation details
- ✅ Future enhancement opportunities

**Use this when:**
- Understanding WHY design decisions were made
- Making trade-off decisions
- Planning schema extensions
- Preparing for architectural reviews
- Documenting technical decisions

---

### 4. [EPIC-STORY-ALIGNMENT-REVIEW.md](EPIC-STORY-ALIGNMENT-REVIEW.md) ⚠️
**Critical alignment review of epics vs stories**

**IMPORTANT:** Read this first if you're planning implementation.

Contains:
- ❌ **CRITICAL:** Framework mismatch issues (Django vs Django)
- ✅ Story-by-story alignment review
- ✅ Recommended fixes with specific action items
- ✅ Updated story templates for Django
- ✅ Technology stack confirmation
- ✅ Risk mitigation strategies
- ✅ Communication templates

**Issues Found:**
1. **Epic 2 & 8:** Stories mention Django Core, but epics specify Django
2. **17 stories need updates** before implementation
3. **Estimated alignment effort:** 4-6 hours

**Action Items (Priority Order):**
1. Confirm Django 5.2 as official framework
2. Update Epic 2 related stories (US2.2-2.5)
3. Update Epic 8 related stories (US8.1-8.9)
4. Brief team on framework choice
5. Start implementation

---

## Quick Start Guide

### For Database Architects/DBAs
1. **Review:** [postgresql-schema.md](postgresql-schema.md) - Full schema overview
2. **Implement:**
   - Create PostgreSQL database
   - Run migrations
   - Configure indexes
   - Set up backup/recovery

### For Backend Developers
1. **Read:** [EPIC-STORY-ALIGNMENT-REVIEW.md](EPIC-STORY-ALIGNMENT-REVIEW.md) - Understand framework
2. **Review:** [django-models.py](django-models.py) - Model definitions
3. **Understand:** [schema-design-rationale.md](schema-design-rationale.md) - Why it's designed this way
4. **Implement:**
   ```bash
   # Create Django project
   django-admin startproject quran_apps_api
   cd quran_apps_api

   # Copy models
   cp django-models.py apps/models.py

   # Create migrations
   python manage.py makemigrations
   python manage.py migrate

   # Create DRF serializers
   # ... based on models
   ```

### For Project Managers
1. **Read:** [EPIC-STORY-ALIGNMENT-REVIEW.md](EPIC-STORY-ALIGNMENT-REVIEW.md) - Issues and timeline
2. **Action:** Confirm framework decision (Django 5.2)
3. **Timeline:** Allocate 4-6 hours for story alignment
4. **Risk:** Implement alignment before Sprint 1

### For Product Managers
1. **Review:** [postgresql-schema.md](postgresql-schema.md) ERD - Understand data model
2. **Check:** Feature coverage in [schema-design-rationale.md](schema-design-rationale.md)
3. **Plan:** Future enhancements (Phase 2 section)

---

## Key Statistics

| Metric | Value |
|--------|-------|
| Total Tables | 27 |
| Core Entities | 7 |
| User-Related Entities | 9 |
| Engagement Entities | 9 |
| Analytics Tables | 3 |
| Materialized Views | 2 |
| Indexes | 50+ |
| Unique Constraints | 12 |
| Foreign Keys | 20+ |

---

## Feature Coverage

### ✅ Implemented in Schema

**Core Features:**
- [x] App directory with bilingual content (name_en, name_ar)
- [x] Category management and filtering
- [x] Developer profiles
- [x] App features and specifications

**User Engagement:**
- [x] User accounts and authentication
- [x] User reviews and ratings (1-5 stars)
- [x] Helpful/not helpful voting on reviews
- [x] Review moderation system
- [x] Favorites system
- [x] Custom collections

**Social Features:**
- [x] Social media share tracking (WhatsApp, Twitter, Facebook, etc.)
- [x] Share event analytics
- [x] Collection sharing via public token

**User Features:**
- [x] OAuth provider integration (Google, Apple, Facebook, Twitter)
- [x] Two-factor authentication (TOTP)
- [x] Email verification
- [x] User activity tracking
- [x] User preferences (language, theme)

**Analytics:**
- [x] Share event tracking
- [x] User activity logging
- [x] Daily view analytics per app
- [x] Rating aggregation
- [x] Review helpfulness metrics

**Admin/Moderation:**
- [x] Review moderation workflow
- [x] Admin roles and permissions
- [x] Email notification logs
- [x] Audit trail

### 🔮 Ready for Future Features

**Phase 2/3 Extensions:**
- Developer account linking (add user_id to Developer)
- App feature tagging system (new Tag + app_tags tables)
- Advanced search with Elasticsearch (data exported from user_activities)
- Recommendation engine (user_recommendations table)
- Seasonal/trending reports (materialized view)
- Admin analytics dashboard (views from analytics tables)

---

## Data Volume Estimates

### Current Scale
- ~100 apps
- 11 categories
- ~40 developers

### Target (10x Growth)
- 1,000 apps
- 20 categories
- 200 developers

### Long-term (100x Scale)
- 10,000 apps
- 50 categories
- 500 developers
- 100K users
- 1M reviews
- 10M share events

**Schema supports all scales without changes** ✅

---

## Query Performance Examples

### Fast Queries (< 50ms)

```sql
-- Browse apps by category
SELECT a.* FROM apps a
JOIN app_categories ac ON a.id = ac.app_id
WHERE ac.category_id = $1 AND a.status = 'published'
ORDER BY a.apps_avg_rating DESC LIMIT 20;

-- Check if user favorited app
SELECT EXISTS(SELECT 1 FROM favorites WHERE user_id = $1 AND app_id = $2);

-- Get reviews for app with pagination
SELECT r.* FROM reviews r
WHERE r.app_id = $1 AND r.status = 'approved'
ORDER BY r.helpful_count DESC LIMIT 10;
```

### Aggregation Queries (< 200ms)

```sql
-- App statistics
SELECT
    a.id, a.name_en,
    COUNT(DISTINCT f.user_id) as favorite_count,
    COUNT(DISTINCT r.id) as review_count,
    COUNT(DISTINCT se.id) as recent_shares
FROM apps a
LEFT JOIN favorites f ON a.id = f.app_id
LEFT JOIN reviews r ON a.id = r.app_id AND r.status = 'approved'
LEFT JOIN share_events se ON a.id = se.app_id
    AND se.timestamp > NOW() - INTERVAL '30 days'
GROUP BY a.id
ORDER BY a.apps_avg_rating DESC;
```

---

## Deployment Checklist

- [ ] PostgreSQL 15+ installed and running
- [ ] Database created: `quran_apps_directory`
- [ ] User created with appropriate privileges
- [ ] Connection pooling configured (max_connections ≥ 100)
- [ ] Daily backups scheduled
- [ ] WAL archiving configured
- [ ] Hot standby replica setup
- [ ] Monitoring/alerting in place
- [ ] Django migrations created
- [ ] Models imported successfully
- [ ] Serializers created for API
- [ ] Unit tests passing
- [ ] Performance benchmarks met (<50ms typical query)

---

## Common Implementations

### Create a New App
1. Add entry to `apps` table
2. Add relationships to `app_categories` table
3. Add screenshots to `screenshots` table
4. Return `GET /api/v1/apps/{id}`

### Submit a Review
1. Create `reviews` entry (status: pending)
2. Run moderation (spam detection)
3. If approved: update `app.apps_avg_rating`
4. Send notification to developer
5. Return `201 CREATED /api/v1/reviews/{id}`

### Track Social Share
1. Insert `share_events` entry
2. Optional: attribute to user if authenticated
3. Daily cron aggregates to `app_view_analytics`
4. Return share count for app

### User Favorites Workflow
1. Create `favorites` entry
2. Query `SELECT COUNT(*) FROM favorites WHERE user_id = ?`
3. Display count on app listing

### Create Collection
1. Create `collections` entry with user_id
2. Optionally: set share_token for public sharing
3. Add apps via `collection_apps` junction table
4. Return collection with nested apps

---

## Migration Timeline

### Phase 1: Foundation (Week 1)
- Set up PostgreSQL
- Create all tables and indexes
- Verify constraints and relationships
- Load initial data from applicationsData.ts

### Phase 2: API Layer (Week 2-3)
- Create Django models (using provided models.py)
- Create DRF serializers
- Implement endpoints
- Add authentication

### Phase 3: Frontend Integration (Week 4)
- Connect Angular frontend to API
- Test end-to-end flows
- Performance optimization

### Phase 4: Scale & Optimize (Week 5+)
- Add caching (Redis)
- Optimize slow queries
- Implement full-text search
- Scale read replicas

---

## Support & Documentation

### For Questions About:

**Schema Design:**
→ Read [schema-design-rationale.md](schema-design-rationale.md)

**Specific Tables:**
→ See [postgresql-schema.md](postgresql-schema.md) table definitions

**Django Implementation:**
→ Check [django-models.py](django-models.py) with docstrings

**Epic-Story Alignment:**
→ Review [EPIC-STORY-ALIGNMENT-REVIEW.md](EPIC-STORY-ALIGNMENT-REVIEW.md)

**API Endpoints (from schema):**
→ Derive from models + DRF conventions

---

## Version History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | Oct 19, 2025 | Architecture Team | Initial schema design complete |
| - | TBD | - | Django models refinement |
| - | TBD | - | Performance optimizations |
| - | TBD | - | Analytics views added |

---

## Next Steps

1. ✅ **Confirm Framework**: Django 5.2 + DRF (per EPIC-STORY-ALIGNMENT-REVIEW.md)
2. ✅ **Align Stories**: Update 17 stories to Django (4-6 hour effort)
3. ✅ **Setup Environment**: Install Django + dependencies
4. ✅ **Create Models**: Use django-models.py as template
5. ✅ **Run Migrations**: `python manage.py migrate`
6. ✅ **Implement Serializers**: Based on models
7. ✅ **Create Endpoints**: REST API with DRF
8. ✅ **Connect Frontend**: Angular to API
9. ✅ **Performance Testing**: Verify <50ms queries
10. ✅ **Deploy**: To staging/production

---

## Contact & Questions

**Schema Questions:**
- Review [schema-design-rationale.md](schema-design-rationale.md) for design reasoning
- Check [postgresql-schema.md](postgresql-schema.md) for details

**Implementation Questions:**
- See [django-models.py](django-models.py) code comments
- Check [EPIC-STORY-ALIGNMENT-REVIEW.md](EPIC-STORY-ALIGNMENT-REVIEW.md) for tech stack

**Project Timeline:**
- See [EPIC-STORY-ALIGNMENT-REVIEW.md](EPIC-STORY-ALIGNMENT-REVIEW.md) "Recommended Next Steps"

---

**Last Updated:** October 19, 2025
**Status:** ✅ Ready for Implementation
**Framework:** Django 5.2 + Django REST Framework
**Database:** PostgreSQL 15+
**ORM:** Django ORM
