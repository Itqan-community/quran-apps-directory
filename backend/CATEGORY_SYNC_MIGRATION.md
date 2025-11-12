# Category Sync Migration

## Overview

This document describes the data migration created to sync app categories from the frontend source of truth (`src/app/services/applicationsData.ts`) to the backend database.

## Problem

All apps in the database were incorrectly assigned to the "Islamic" category (which has an empty slug) instead of being properly categorized into specific categories like "mushaf", "audio", "tafsir", "kids", etc.

This caused category filtering to fail in the frontend - clicking on category buttons would not filter the apps list.

## Solution

Created a Django data migration (`0003_sync_app_categories_from_frontend.py`) that:

1. **Extracts category mappings** from the frontend TypeScript file
2. **Updates all apps** with their correct category assignments
3. **Assigns default category** (mushaf) to any unmapped apps
4. **Provides reverse migration** to revert changes if needed

## Files Modified

### New Files
- `backend/apps/migrations/0003_sync_app_categories_from_frontend.py` - Data migration
- `backend/extract_categories.py` - Helper script to extract categories from frontend (temporary)

### Modified Files
- `backend/config/settings/base.py` - Added `cache-control` to CORS headers
- `backend/config/settings/development.py` - Already existed
- `backend/docker-compose.yml` - Fixed DJANGO_SETTINGS_MODULE
- `backend/.env` - Fixed DJANGO_SETTINGS_MODULE
- `backend/dev-start.sh` - Created new local dev startup script

## Migration Details

### Migration File
`apps/migrations/0003_sync_app_categories_from_frontend.py`

### Category Mappings (43 apps)

```python
APP_CATEGORIES_MAP = {
    'Wahy': ['mushaf', 'tafsir', 'translations', 'riwayat', 'audio'],
    'Ayah': ['mushaf', 'tafsir', 'translations'],
    'Tarteel': ['recite', 'memorize', 'translations', 'tafsir'],
    'Adnan The Quran Teacher': ['kids', 'memorize'],
    'School Mushaf': ['memorize', 'mushaf', 'kids'],
    'School Mushaf - Sign Language': ['accessibility', 'kids', 'memorize', 'mushaf'],
    'Tangheem Al Quran': ['tajweed'],
    'Kaedat Alnoor': ['tajweed'],
    'Wiqaya': ['tajweed', 'mushaf'],
    # ... 34 more apps
}
```

### Results

- **44 apps updated** with correct categories
- **0 apps not found** (100% success rate)
- **Categories validated**:
  - Kids: 5 apps
  - Tajweed: 3 apps
  - Mushaf: 24 apps
  - Audio: 2 apps
  - Memorize: 11 apps
  - Tafsir: 19 apps
  - Translations: 14 apps
  - Recite: 7 apps
  - Riwayat: 6 apps
  - Tools: 10 apps
  - Accessibility: 3 apps

## Deployment

### Local Development

```bash
# Activate virtual environment
source venv/bin/activate

# Run migrations
python3 manage.py migrate apps

# Migration output:
# ✅ Sync completed! Updated: 44, Not found: 0
```

### Production (Railway)

The migration will run automatically during deployment when `railway_start.py` executes:

```bash
python django_manage.py migrate
```

No manual intervention required - the migration is included in the standard migrate command.

## Testing

### API Endpoint Tests

```bash
# Test category filtering
curl http://localhost:8000/api/apps/?category=kids
# Returns: 5 apps

curl http://localhost:8000/api/apps/?category=tajweed
# Returns: 3 apps

curl http://localhost:8000/api/apps/?category=mushaf
# Returns: 24 apps
```

### Frontend Tests

1. Navigate to `http://localhost:4200/en`
2. Click on category buttons (Audio, Kids, Tajweed, etc.)
3. Verify apps list filters correctly for each category
4. Verify "All" button shows all apps

## Rollback

If needed, rollback the migration:

```bash
python3 manage.py migrate apps 0002
```

This will:
- Revert all apps to the "Islamic" category
- Restore the pre-migration state

## Maintenance

### Adding New Apps

When adding new apps to the frontend:

1. Add app data to `src/app/services/applicationsData.ts`
2. Include `categories` array with appropriate category slugs
3. Create a new data migration OR update the load script
4. Run migrations on production

### Future Improvements

Consider creating a management command that:
- Automatically syncs categories from frontend on demand
- Validates category slugs before assignment
- Reports any mismatches between frontend and backend

## Notes

- The migration uses **case-insensitive exact match** on `name_en` field
- If an app name doesn't match, it gets assigned to default "mushaf" category
- Category objects are looked up by `slug` field
- The migration is **idempotent** - can be run multiple times safely

## Author

Created: 2025-11-12
Purpose: Fix category filtering in frontend
Migration: `0003_sync_app_categories_from_frontend`
