# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Quran Apps Directory** is a comprehensive bilingual (Arabic/English) directory of Islamic applications. The frontend is built with Angular 19, featuring SEO optimization, dark mode, accessibility compliance, and performance optimizations.

**Tech Stack:**
- **Frontend:** Angular 19 with TypeScript 5.5
- **Backend:** Django 5.2 with Django REST Framework (planned Phase 2)
- **Styling:** SCSS with BEM methodology
- **i18n:** ngx-translate with bilingual support (en/ar)
- **UI Library:** ng-zorro-antd (Ant Design for Angular)
- **Database:** PostgreSQL 15+ with Django ORM
- **API Documentation:** 40+ REST endpoints with drf-spectacular

## Development Commands

### Local Development

```bash
# Start development server
npm run dev                    # Default: http://localhost:4200

# Build for specific environments
npm run build                  # Development build
npm run build:staging          # Staging build + compression
npm run build:prod             # Production build + compression
npm run build:dev              # Development build (alternative)

# Utility commands
npm run generate-sitemap       # Generate sitemap.xml
npm run sitemap                # Alias for generate-sitemap
```

### Testing & Analysis

```bash
# Testing (if configured)
npm run test                   # Run unit tests
npm run e2e                    # Run end-to-end tests
npm run test:coverage          # Generate coverage report

# Performance analysis
npm run analyze                # Analyze bundle with webpack-bundle-analyzer
npm run lighthouse             # Run Lighthouse audit (local)
npm run lighthouse:prod        # Run Lighthouse audit (production)
npm run performance:test       # Full production audit
```

### Deployment Variants

```bash
# Serve with specific configurations
npm run serve:dev              # Development server config
npm run serve:staging          # Staging server config
npm run serve:prod             # Production server config

# Deploy variants
npm run deploy                 # Build and deploy (dev)
npm run deploy:staging         # Deploy to staging
npm run deploy:prod            # Deploy to production
```

## Project Architecture

### High-Level Structure

```
src/
├── app/
│   ├── pages/                    # Page-level components (routed)
│   │   ├── app-list/            # Main directory listing
│   │   ├── app-detail/          # Individual app detail pages
│   │   ├── developer/           # Developer profiles
│   │   ├── category/            # Category pages
│   │   └── [other pages]/       # Additional page components
│   ├── components/              # Reusable UI components
│   │   ├── theme-toggle/        # Dark mode switcher
│   │   ├── language-selector/   # Language switcher (i18n)
│   │   └── [other components]/  # Shared components
│   ├── services/                # Business logic & data management
│   │   ├── app.service.ts       # App data management (from applicationsData.ts)
│   │   ├── theme.service.ts     # Dark mode state management
│   │   ├── seo.service.ts       # Meta tags, structured data
│   │   ├── language.service.ts  # i18n management
│   │   └── [other services]/    # Additional services
│   ├── pipes/                   # Custom pipes
│   ├── directives/              # Custom directives
│   └── app.module.ts            # Root module configuration
├── assets/
│   ├── i18n/                    # Translation files (en.json, ar.json)
│   ├── images/                  # Images and icons
│   └── [other assets]/
├── environments/                # Environment configs (dev/staging/prod)
├── themes.scss                  # Global theme definitions
└── styles.scss                  # Global styles
```

### Key Architectural Patterns

**1. Data Source:** `src/app/services/applicationsData.ts`
- Contains 100+ hardcoded app entries with bilingual data
- Future: Will be replaced with Django REST API endpoints
- Current: Exported as constant for in-memory usage

**2. Dark Mode Implementation**
- ThemeService manages state (light/dark/auto)
- CSS custom properties define all theme colors
- Persistent storage remembers user preference
- System preference detection on first visit

**3. Internationalization (i18n)**
- ngx-translate library with dual language files
- Translation keys in `assets/i18n/en.json` and `assets/i18n/ar.json`
- Language preference persisted in localStorage
- RTL/LTR layout toggled with language change

**4. SEO Architecture**
- SeoService handles meta tags and structured data
- Schema.org markup for SoftwareApplication, Organization, etc.
- Dynamic sitemap generation (run `npm run generate-sitemap`)
- Proper canonical tags and hreflang support

**5. Performance Optimizations**
- Lazy-loaded images with loading attribute
- Code splitting at route level (lazy loaded modules)
- Service worker for offline support
- Gzip/Brotli compression (staging/prod)
- Tree-shaking enabled in production builds

## Backend Architecture (Phase 2 - Django)

**NOTE:** Backend is planned for Phase 2. Current frontend uses static data.

### Django Structure (Documented, Not Yet Implemented)

```
backend/
├── quran_apps/              # Django project
│   ├── settings.py          # Configuration
│   ├── urls.py              # URL routing
│   └── wsgi.py              # WSGI application
├── apps/                    # Django applications
│   ├── apps/                # Application listings
│   ├── users/               # User management (django-allauth)
│   ├── reviews/             # Reviews & ratings
│   ├── categories/          # Category management
│   └── [other apps]/        # Additional Django apps
├── manage.py                # Django CLI
└── requirements.txt         # Python dependencies
```

### Key Technologies (Phase 2)
- **ORM:** Django ORM with PostgreSQL
- **Authentication:** django-allauth + djangorestframework-simplejwt (JWT)
- **API:** Django REST Framework with drf-spectacular (OpenAPI)
- **Background Tasks:** Celery for async operations
- **2FA:** django-otp for TOTP
- **Email:** SendGrid integration with Celery tasks
- **Database:** PostgreSQL 15+ with 27 normalized tables

## Frontend-Specific Guidelines

### Adding New Pages

1. Create folder in `src/app/pages/[page-name]/`
2. Generate component: `ng generate component pages/[page-name]`
3. Add route in `app.module.ts` or routing module
4. Add translation keys to `assets/i18n/en.json` and `assets/i18n/ar.json`
5. Implement SEO metadata via SeoService

### Adding Components

1. Create in `src/app/components/[component-name]/`
2. Make components self-contained and reusable
3. Support both light/dark themes via ThemeService
4. Use SCSS with BEM methodology
5. Add ARIA labels for accessibility

### Adding Services

1. Place in `src/app/services/[service-name].service.ts`
2. Use dependency injection throughout
3. Handle errors gracefully with logging
4. Return Observables (RxJS) for async operations
5. Document public methods with JSDoc

### Styling Conventions

- **CSS Architecture:** BEM (Block Element Modifier)
- **Colors:** Defined in `themes.scss` using CSS custom properties
- **Breakpoints:** Mobile-first responsive design
- **Animations:** Smooth transitions, consider performance
- **Accessibility:** Sufficient color contrast, focus states

### Bilingual Support

- All text must support both English and Arabic
- Use `{{ 'key' | translate }}` in templates
- RTL layouts handled automatically
- Test with Arabic text for overflow issues
- Date formatting must respect locale

### Dark Mode Support

- Use CSS custom properties defined in `themes.scss`
- Never hardcode colors directly in components
- Test all components in both light and dark modes
- Consider readability and contrast ratios

## Git Workflow

**Branch Structure:**
- `main` → Production (https://quran-apps.itqan.dev)
- `staging` → Staging (https://staging.quran-apps.itqan.dev)
- `develop` → Development (https://dev.quran-apps.itqan.dev)
- `feature/*` → Feature branches (create from `develop`)

**Commit Convention:**
- Prefix: `feat:`, `fix:`, `docs:`, `style:`, `refactor:`, `test:`, `chore:`
- Example: `feat: add dark mode toggle to navbar`

## Environment Configuration

### .env Setup

```bash
# Development (default)
NG_DEV_PORT=4200
NODE_ENV=development

# Features
NG_APP_ENABLE_DARK_MODE=true
NG_APP_ENABLE_ANALYTICS=false

# SEO
NG_APP_SITE_DOMAIN=https://quran-apps.itqan.dev
NG_APP_CONTACT_EMAIL=connect@itqan.dev
```

### Configuration Files

- `src/environments/environment.ts` - Development
- `src/environments/environment.staging.ts` - Staging
- `src/environments/environment.prod.ts` - Production
- `angular.json` - Angular build configuration

## Common Development Tasks

### Updating App Data (Current Phase)

1. Edit `src/app/services/applicationsData.ts`
2. Add bilingual app entries with required fields:
   - Arabic names/descriptions (`name_ar`, `description_ar`, etc.)
   - English names/descriptions (`name_en`, `description_en`, etc.)
   - Store links (Google Play, App Store, Huawei)
   - Ratings and metadata
3. Add images to `src/assets/images/`
4. Test bilingual rendering and SEO

### Running Performance Audits

```bash
# Local development audit
npm run lighthouse

# Production audit
npm run lighthouse:prod

# Full production performance test
npm run performance:test
```

### Sitemap Generation

```bash
# Manual generation
npm run generate-sitemap

# Automatic (runs before all builds)
npm run build
```

## Database Schema (Phase 2 Reference)

For backend development, reference the documented schema:
- **Location:** `/docs/database-schema/postgresql-schema.md`
- **Django Models:** `/docs/database-schema/django-models.py`
- **27 Tables:** Fully normalized 3NF design
- **50+ Indexes:** Performance optimized
- **Scales to:** 1M+ users, 10K+ applications

## Important Notes

### Current Limitations

- **Phase 1:** Frontend only with static data
- **No Backend API:** Using `applicationsData.ts` for data
- **No Authentication:** User accounts not yet implemented
- **No Admin Panel:** Content management manual via code

### Phase 2 Preparation

- All backend stories already aligned to Django 5.2
- Database schema fully documented
- API endpoints architectured (40+ endpoints)
- Ready for backend team to begin implementation
- No code changes needed to frontend until API ready

### Security Considerations

- **API Keys:** Never commit `.env` files
- **Sensitive Data:** Use environment variables only
- **CORS:** Configure properly for production
- **HTTPS:** Always use in production
- **Rate Limiting:** Implement for public APIs (Phase 2)

### Performance Targets

- **Mobile Lighthouse:** 70+ (currently 68)
- **Desktop Lighthouse:** 85+ (currently 85)
- **First Contentful Paint:** <2.5s
- **Largest Contentful Paint:** <4s
- **Cumulative Layout Shift:** <0.1

## Resources

- **Angular Docs:** https://angular.io/docs
- **ngx-translate:** https://github.com/ngx-translate/core
- **ng-zorro:** https://ng.ant.design/
- **TypeScript:** https://www.typescriptlang.org/docs
- **SCSS:** https://sass-lang.com/documentation
- **BEM Methodology:** http://getbem.com/
- **SEO Best Practices:** https://developers.google.com/search
- **Accessibility:** https://www.w3.org/WAI/WCAG21/quickref/

## Deployment

### Automatic Deployments

Deployments are triggered by branch merges:
- Push to `main` → Production deployment
- Push to `staging` → Staging deployment
- Push to `develop` → Development deployment

### Manual Build Process

```bash
# Production build
npm run build:prod

# Output: dist/demo/browser/ (ready to deploy)
# Includes: Minified code, compression, sitemap
```

### Deployment URLs

- **Production:** https://quran-apps.itqan.dev
- **Staging:** https://staging.quran-apps.itqan.dev
- **Development:** https://dev.quran-apps.itqan.dev

---

**Last Updated:** October 19, 2025
**Framework:** Angular 19 + TypeScript 5.5
**Phase:** 1 (Frontend Complete, Backend Pending)
