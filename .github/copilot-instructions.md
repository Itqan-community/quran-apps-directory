# Copilot Instructions for Quran Apps Directory

## Project Overview
- **Purpose:** Directory of Islamic applications, focused on Quran reading, memorization, translation, tafsir, and recitation.
- **Stack:** Angular (frontend, in `src/app/`), Node.js scripts, PostgreSQL (see `docs/database-schema/`).
- **Key Features:** Precision ratings, SEO (Schema.org, sitemap), multi-language, performance optimizations.

## Architecture & Patterns
- **Angular Structure:**
  - Components, services, and modules are organized under `src/app/`.
  - Services (e.g., `language.service.ts`, `theme.service.ts`, `performance.service.ts`) encapsulate cross-cutting logic (i18n, theming, analytics, caching, etc.).
  - Heavy use of dependency injection and modularization.
  - UI uses [ng-zorro-antd](https://ng.ant.design/) and `@ngx-translate/core` for i18n.
- **Backend/Data:**
  - Database schema and rationale in `docs/database-schema/` (see `postgresql-schema.md`, `django-models.py`).
  - Data flows: API integration is abstracted in Angular services; backend is not included in this repo but schema is provided for reference.
- **SEO & Performance:**
  - Custom scripts for sitemap and asset compression (`generate-sitemap.js`, `compress-assets.js`).
  - SEO via meta tags, Schema.org, and sitemap.xml.
  - Performance services: lazy loading, cache optimization, HTTP/2, LCP monitoring.

## Developer Workflows
- **Install:** `npm install`
- **Dev Server:** `npm run dev` or `npm start`
- **Build:**
  - `npm run build` (dev)
  - `npm run build:staging` (staging)
  - `npm run build:prod` (production)
- **Sitemap:** `npm run generate-sitemap` or `npm run sitemap`
- **Environment:**
  - Set `NG_DEV_PORT`, `NODE_ENV`, `NG_APP_SITE_DOMAIN`, etc. in environment files or shell.
- **No backend code in this repo**; see `docs/database-schema/` for backend schema and rationale.

## Conventions & Integration
- **Component/Service Naming:** Use descriptive, feature-based names (e.g., `ThemeToggleComponent`, `PerformanceService`).
- **i18n:** Use `@ngx-translate/core` for all user-facing text.
- **UI:** Use ng-zorro-antd components for consistency.
- **Performance:** Use provided services for caching, analytics, and resource loading.
- **SEO:** Always update sitemap and meta tags for new pages/components.

## References
- `README.md` (project intro, scripts)
- `src/app/` (main Angular code)
- `docs/database-schema/` (data model, rationale)
- `generate-sitemap.js`, `compress-assets.js` (custom scripts)

---
For questions about architecture or workflow, see `docs/` or ask maintainers.
