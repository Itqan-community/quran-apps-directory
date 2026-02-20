# CLAUDE.md

This file provides guidance to Claude Code when working with the Quran Apps Directory codebase.

## 1. Git Policy

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

## 2. Workflow Protocol (Opt-in)

When given a task, **ask the user first** whether they want the full PM/Architect/Developer workflow or want to skip straight to implementation.

If the user opts in, follow this phased approach:

**Phase 1: PM** - Gather requirements through simple a/b/c questions until scope is clear
**Phase 2: Architect** - Design the solution with clear boundaries and interfaces
**Phase 3: Developer** - Implement clean code (KISS, DRY, SOLID)

Use `AskUserQuestion` to ask one question at a time with options. Start each phase with: `"Starting Phase #: {Persona}"`

### 2.1. Context Gathering (Phase 1)

Identify and document:
- **Affected files/modules** - Which code will be touched
- **Dependencies** - What integrations and imports are involved
- **Git state** - Current branch, uncommitted changes, recent relevant commits
- **Tests** - Related test files and current coverage
- **Documentation** - Relevant docs that may need updates
- **Related tickets/issues** - If mentioned or discoverable

### 2.2. Requirements Clarification (Phase 1)

Define explicitly:
- **Acceptance criteria** - Measurable outcomes that define "done"
- **Edge cases** - Error scenarios and boundary conditions to handle
- **Scope boundaries** - What is explicitly IN and OUT of scope
- **Assumptions** - Any assumptions being made

### 2.3. Confirmation Loop

Present the enhanced prompt back to the user:

```
**Enhanced Prompt**

**Task:** [clear, specific description]

**Context:**
- Files: [affected files/modules]
- Branch: [current git branch]
- Dependencies: [relevant integrations]

**Acceptance Criteria:**
- [ ] [criterion 1]
- [ ] [criterion 2]

**Out of Scope:**
- [explicitly excluded item]

**Assumptions:**
- [assumption 1]

Proceed with this understanding?
```

**Do NOT proceed until the user confirms.**

---

## 3. Tooling

### Serena MCP - Code Intelligence
**Always use Serena MCP tools when available** for code navigation and understanding:
- Use Serena for exploring codebase structure, finding symbol definitions, references, and call hierarchies
- Prefer Serena over manual file searching for understanding code relationships
- Use Serena's semantic code analysis before making changes to understand impact

### Beads - Issue & Task Tracking
**Always use Beads (`bd` commands) when available** for tracking work:
- **Before starting work**: Check `bd ready` for unblocked tasks, or create a new issue with `bd create`
- **During work**: Track progress by updating issues with `bd update`
- **Multi-session work**: Always use Beads for tasks that span sessions - it persists across conversation compaction
- **Dependencies**: Use `bd dep` to link related issues and track blockers
- **Closing**: Use `bd close` when work is complete

### Context7 - Angular Documentation
Use Context7 MCP for up-to-date Angular documentation:
- **Library ID**: `/websites/v20_angular_dev` (Angular 20 official docs, 9,390 code examples)
- **Alternative**: `/angular/angular` for framework source-level docs
- Query Context7 before implementing Angular patterns you're unsure about
- Use for checking Angular 20-specific APIs, signals, standalone components, SSR, etc.

### Tooling Workflow
1. Check `bd ready` or `bd list` for existing tasks
2. Use Serena to understand affected code before making changes
3. Query Context7 for Angular patterns when needed
4. Create/update Beads issues to track progress
5. Close issues when done

---

## 4. Project Overview

Quran Apps Directory - A bilingual (Arabic/English) Angular 20 application for discovering Islamic applications. Uses standalone components architecture with lazy loading. Features a seasonal Ramadan mode that changes the home page experience when enabled.

---

## 5. Build & Development Commands

```bash
# Development
npm start                    # Start dev server at localhost:4200 (alias: npm run dev)
npm run serve:dev            # Serve with development config
npm run serve:staging        # Serve with staging config
npm run serve:prod           # Serve with production config

# Building (each runs sitemap generation first)
npm run build                # Default build
npm run build:dev            # Development build (no compression)
npm run build:develop        # Develop environment + compression
npm run build:staging        # Staging + compression
npm run build:prod           # Production + compression

# Deployment
npm run deploy               # Build and copy to dist
npm run deploy:staging       # Staging build
npm run deploy:prod          # Production build

# Utilities
npm run generate-sitemap     # Regenerate sitemap.xml (alias: npm run sitemap)
npm run analyze              # Bundle analysis (requires stats.json)
npm run lighthouse           # Local Lighthouse audit
npm run lighthouse:prod      # Production Lighthouse audit
npm run performance:test     # Production build + Lighthouse JSON report
```

---

## 6. Architecture

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
├── directives/       # Custom directives (optimized-image)
├── guards/           # Route guards (ramadan-redirect)
├── interceptors/     # HTTP interceptors (cache, error, timeout)
├── pages/            # Route components (10 pages, all lazy loaded)
├── pipes/            # Custom pipes (nl2br, optimized-image, safe-html)
└── services/         # Business logic & utilities (15 services + data/loaders)
```

### Routing

All routes follow `/:lang/:page` pattern with language prefix (`en`/`ar`). Routes are defined in `app.routes.ts`.

**Important**: Specific routes must be defined BEFORE the generic `/:lang/:category` route to prevent incorrect matching.

| Route | Component | Notes |
|-------|-----------|-------|
| `/:lang` | AppListComponent or RamadanComponent | Home - switches based on `RAMADAN_MODE` flag |
| `/:lang/app/:id` | AppDetailComponent | App detail page |
| `/:lang/apps` | AppListComponent | Full apps listing |
| `/:lang/developer/:developer` | DeveloperComponent | Developer profile |
| `/:lang/submit-app` | SubmitAppComponent | App submission form |
| `/:lang/track-submission` | TrackSubmissionComponent | Track submission status |
| `/:lang/request` | RequestFormComponent | Request form |
| `/:lang/about-us` | AboutUsComponent | About page |
| `/:lang/contact-us` | ContactUsComponent | Contact page |
| `/:lang/search-comparison` | SearchComparisonComponent | Search comparison (hides chrome) |
| `/:lang/ramadan` | RamadanComponent | Dedicated Ramadan page (hides footer) |
| `/:lang/:category` | AppListComponent | **Must be LAST** - generic category listing |
| `**` | Redirect to `/ar` | Fallback |

### Ramadan Mode

The `RAMADAN_MODE` flag in `src/app/guards/ramadan-redirect.guard.ts` controls seasonal behavior:
- **When enabled**: Home route (`/:lang`) loads `RamadanComponent` with footer and language toggle hidden
- **When disabled**: Home route loads standard `AppListComponent`
- The dedicated `/:lang/ramadan` route is always available regardless of the flag

### Service Architecture

Core services:
- **ApiService** - REST API client with BehaviorSubject state management
- **AppService** - Application data management
- **ThemeService** - Dark/light/auto theme with Angular Signals
- **LanguageService** - URL-based language detection, RTL/LTR handling
- **SeoService** - Schema.org structured data, dynamic meta tags
- **SubmissionService** - App submission and tracking

Performance optimization services:
- **LcpMonitorService** - Largest Contentful Paint tracking
- **DeferredAnalyticsService** - Lazy analytics loading
- **CriticalResourcePreloaderService** - Prioritize essential asset loading
- **Http2OptimizationService** - HTTP/2 feature leveraging
- **PerformanceService** - General performance utilities
- **AppImagePreloaderService** - Image preloading
- **ImageOptimizationService** - Image delivery optimization

Other utilities:
- **NavbarScrollService** - Scroll-aware navbar behavior
- **ScriptLoaderService** - Dynamic script loading

Data files in `services/`: `applicationsData.ts` (reference data), `translate-server-loader.ts` (SSR translation loader)

### HTTP Interceptor Chain
```
Request → TimeoutInterceptor → CacheInterceptor → ErrorInterceptor → Backend
```

---

## 7. Key Patterns

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
Translations load via `APP_INITIALIZER` before app renders. Files at `src/assets/i18n/{lang}.json`.

---

## 8. Backend API

Django REST backend with endpoints:
- `GET /api/apps/` - List apps (filters: search, category, platform, featured)
- `GET /api/apps/{id}/` - Single app by ID or slug
- `GET /api/categories/` - All categories
- `POST /api/submissions/` - Submit new app
- `GET /api/submissions/track/{trackingId}` - Track submission

---

## 9. Environment Configuration

| Environment | API URL | Branch |
|-------------|---------|--------|
| Development | localhost:8000/api | local |
| Develop | dev.api.quran-apps.itqan.dev/api | develop |
| Staging | staging API | staging |
| Production | qad-backend-api-production.up.railway.app/api | main |

Environment files in `src/environments/`. Angular handles file replacement via `angular.json` fileReplacements.

---

## 10. PWA & Caching

Service worker enabled in production (`ngsw-config.json`):
- App shell prefetched
- Translations: freshness strategy (1 day)
- Images from R2 CDN: performance strategy (7 days)

---

## 11. Build Pipeline & Bundle Budgets

### Build Pipeline
1. `generate-sitemap.js` creates sitemap.xml
2. Angular build with environment config
3. `compress-assets.js` adds Gzip/Brotli (staging/prod only)

### Bundle Budgets
Configured in `angular.json`:
- Initial bundle: 1.5MB warning, 2.0MB error
- Component styles: 20KB warning, 40KB error

---

## 12. Adding New Apps to Directory

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
