# CLAUDE.md

## Git Policy

**NEVER auto-commit, stage, or perform any git actions unless the user explicitly requests it.** The user will review and handle git operations manually.

**Commit Message Format** (ONLY when explicitly asked to commit):
```
{Short Title} - {Short task description}
```

**Feature Branch Creation Format** (ONLY when explicitly asked to create a feature branch):
```
feat/{Short Title}
```

- Never include "Co-authored-by" or any Claude/AI attribution in commits

---

## 0. Prompt Enhancement Protocol
**MANDATORY: Before starting ANY task**, enhance the user's prompt through this process:
You will act like my pm. gather requirements and understand scope before starting any task i give you. start by asking questions with simple a, b, c options. thereafter you will act like a architect to devise the best solution. thereafter you will act like a senior develop to implement code that is KISS, DRY & SOLID. 
When given your instruction, follow this workflow for each task:

  Phase 1: PM → Gather requirements through simple a/b/c questions until scope is clear

  Phase 2: Architect → Design the solution with clear boundaries and interfaces

  Phase 3: Developer → Implement clean code (KISS, DRY, SOLID)
  

Use the built in Claude ask user questions tool "AskUserQuestion" to ask one question at a time with options to enhance the prompt:
When starting each phase, ensure you have a clear understanding of the task at hand and the expected outcome. This includes reviewing the context gathered in Phase 1, understanding the requirements from Phase 2, and implementing the solution in Phase 3..
Start with outputing: "Starting Phase #: {Persona} {with emoticon})"
---
## 0.1. Context Gathering

Identify and document:
- **Affected files/modules** - Which code will be touched
- **Dependencies** - What integrations and imports are involved
- **Git state** - Current branch, uncommitted changes, recent relevant commits
- **Tests** - Related test files and current coverage
- **Documentation** - Relevant docs that may need updates
- **Related tickets/issues** - If mentioned or discoverable

## 0.2. Requirements Clarification

Define explicitly:
- **Acceptance criteria** - Measurable outcomes that define "done"
- **Edge cases** - Error scenarios and boundary conditions to handle
- **Scope boundaries** - What is explicitly IN and OUT of scope
- **Assumptions** - Any assumptions being made

## 0.3. Confirmation Loop

Present the enhanced prompt back to the user:

```
📋 **Enhanced Prompt**

**Task:** [clear, specific description of what will be done]

**Context:**
- Files: [list of affected files/modules]
- Branch: [current git branch]
- Dependencies: [relevant integrations]

**Acceptance Criteria:**
- [ ] [criterion 1]
- [ ] [criterion 2]

**Out of Scope:**
- [explicitly excluded item]

**Assumptions:**
- [assumption 1]

---
Proceed with this understanding?
```

**⚠️ Do NOT proceed until the user confirms.**

---

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Quran Apps Directory - A bilingual (Arabic/English) Angular 20 application for discovering Islamic applications. Uses standalone components architecture with lazy loading.

## Build & Development Commands

```bash
# Development
npm start                    # Start dev server at localhost:4200
npm run serve:staging        # Serve with staging config
npm run serve:prod           # Serve with production config

# Building (each runs sitemap generation first)
npm run build                # Development build
npm run build:develop        # Develop environment + compression
npm run build:staging        # Staging + compression
npm run build:prod           # Production + compression

# Utilities
npm run generate-sitemap     # Regenerate sitemap.xml
npm run analyze              # Bundle analysis (requires stats.json)
npm run lighthouse           # Local Lighthouse audit
npm run lighthouse:prod      # Production Lighthouse audit
```

## Architecture

### Tech Stack
- **Angular 20** with standalone components (no NgModules)
- **ng-zorro-antd** for UI components
- **@ngx-translate** for i18n (Arabic/English with RTL support)
- **Sentry** for error tracking
- **RxJS BehaviorSubjects** for state management

### Project Structure
```
src/app/
├── components/       # Reusable UI (optimized-image, theme-toggle)
├── directives/       # Custom directives
├── interceptors/     # HTTP interceptors (cache, error, timeout)
├── pages/            # Route components (lazy loaded)
├── pipes/            # Custom pipes (nl2br, optimized-image, safe-html)
└── services/         # Business logic (15 services)
```

### Routing Pattern
All routes follow `/:lang/:page` pattern with language prefix (en/ar):
- `/:lang` - Home (all apps)
- `/:lang/:category` - Category listing (must be LAST among specific routes)
- `/:lang/app/:id` - App detail
- `/:lang/developer/:developer` - Developer profile
- `/:lang/submit-app` - App submission form
- `/:lang/track-submission` - Track submission status

**Important**: Specific routes must be defined BEFORE the generic `/:lang/:category` route in `app.routes.ts`.

### Service Architecture
- **ApiService** - REST API client with BehaviorSubject state management
- **ThemeService** - Dark/light/auto theme with Angular Signals
- **LanguageService** - URL-based language detection, RTL/LTR handling
- **SeoService** - Schema.org structured data, dynamic meta tags
- **SubmissionService** - App submission and tracking

### HTTP Interceptor Chain
```
Request → TimeoutInterceptor → CacheInterceptor → ErrorInterceptor → Backend
```

## Environment Configuration

| Environment | API URL | Branch |
|-------------|---------|--------|
| Development | localhost:8000/api | local |
| Develop | dev.api.quran-apps.itqan.dev/api | develop |
| Staging | staging API | staging |
| Production | qad-backend-api-production.up.railway.app/api | main |

Environment files in `src/environments/`. Angular handles file replacement via `angular.json` fileReplacements.

## Key Patterns

### Standalone Components
All components use explicit imports:
```typescript
@Component({
  standalone: true,
  imports: [CommonModule, RouterModule, TranslateModule, NzGridModule],
  // ...
})
```

### Subscription Cleanup
Use `takeUntil(destroy$)` pattern with `DestroyRef` or `Subject`:
```typescript
private destroy$ = new Subject<void>();
ngOnDestroy() { this.destroy$.next(); this.destroy$.complete(); }
```

### Platform Checking
For browser-specific APIs:
```typescript
if (isPlatformBrowser(this.platformId)) {
  // browser-only code
}
```

### Translation Loading
Translations load via APP_INITIALIZER before app renders. Files at `src/assets/i18n/{lang}.json`.

## Backend API

Django REST backend with endpoints:
- `GET /api/apps/` - List apps (filters: search, category, platform, featured)
- `GET /api/apps/{id}/` - Single app by ID or slug
- `GET /api/categories/` - All categories
- `POST /api/submissions/` - Submit new app
- `GET /api/submissions/track/{trackingId}` - Track submission

## PWA & Caching

Service worker enabled in production (`ngsw-config.json`):
- App shell prefetched
- Translations: freshness strategy (1 day)
- Images from R2 CDN: performance strategy (7 days)

## Build Pipeline

1. `generate-sitemap.js` creates sitemap.xml
2. Angular build with environment config
3. `compress-assets.js` adds Gzip/Brotli (staging/prod only)

## Bundle Budgets

Configured in `angular.json`:
- Initial bundle: 1.5MB warning, 2.0MB error
- Component styles: 20KB warning, 40KB error

## Adding New Apps to Directory

Standard process for adding a new Islamic app:

### Step 1: Gather App Data
1. Get app store URLs (Google Play, App Store, AppGallery)
2. Use AutoFillService or crawl manually to extract:
   - App name (English + Arabic)
   - Descriptions (short + long, bilingual)
   - Developer info
   - Screenshots
   - App icon
   - Category suggestions

### Step 2: Upload Images to R2
```bash
# Download images locally first, then upload
cd /path/to/images
wrangler r2 object put quran-apps-directory/AppName/app_icon.png --file=app_icon.png
wrangler r2 object put quran-apps-directory/AppName/cover_photo_en.png --file=cover.png
# Upload all screenshots...
```

Images accessible at: `https://pub-e11717db663c469fb51c65995892b449.r2.dev/AppName/`

### Step 3: Create Data Migration
Create `backend/apps/migrations/00XX_add_<app_slug>_app.py`:

```python
from django.db import migrations
from decimal import Decimal

def add_app(apps, schema_editor):
    App = apps.get_model('apps', 'App')
    Developer = apps.get_model('developers', 'Developer')
    Category = apps.get_model('categories', 'Category')

    if App.objects.filter(slug='app-slug').exists():
        print("  App already exists, skipping")
        return

    developer, _ = Developer.objects.get_or_create(
        name_en='Developer Name',
        defaults={'name_ar': 'اسم المطور', 'website': 'https://...'}
    )

    app = App.objects.create(
        slug='app-slug',
        name_en='App Name',
        name_ar='اسم التطبيق',
        short_description_en='...',
        short_description_ar='...',
        description_en='...',
        description_ar='...',
        application_icon='https://pub-e11717db663c469fb51c65995892b449.r2.dev/AppName/app_icon.png',
        screenshots_en=[...],
        screenshots_ar=[...],
        google_play_link='...',
        app_store_link='...',
        avg_rating=Decimal('4.50'),
        status='published',
        platform='cross_platform',
        developer=developer,
    )

    categories = Category.objects.filter(slug__in=['mushaf', 'tafsir'])
    app.categories.set(categories)
    print(f"Created: {app.name_en}")

class Migration(migrations.Migration):
    dependencies = [('apps', 'previous_migration')]
    operations = [migrations.RunPython(add_app, migrations.RunPython.noop)]
```

### Step 4: Update Frontend & Sitemap
1. Add to `src/app/services/applicationsData.ts` (for reference/backup)
2. Run `npm run generate-sitemap` to update sitemap
3. Run `npm run build:staging` to verify build passes

### Step 5: Deploy
Push to staging/main - migration runs automatically on Railway.

### Available Categories
`mushaf`, `tafsir`, `recite`, `memorize`, `kids`, `translations`, `audio`, `riwayat`, `tools`, `accessibility`, `tajweed`
