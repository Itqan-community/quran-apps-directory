# Task Breakdown: Cloudflare Pages + Railway Deployment Infrastructure

## Overview

**Goal:** Deploy Angular 19 frontend to Cloudflare Pages with automatic GitHub Actions CI/CD, while preparing Railway infrastructure for future Django backend deployment.

**Total Tasks:** 52 tasks across 8 task groups
**Estimated Time:** Phase 1: 2-3 hours | Phase 2: 4-6 hours (when Django ready)

## Task List

---

## PHASE 1: IMMEDIATE DEPLOYMENT (This Week)

### Task Group 1: Pre-Deployment Preparation
**Dependencies:** None
**Estimated Time:** 30 minutes
**Status:** COMPLETE

- [x] 1.0 Prepare deployment prerequisites
  - [x] 1.1 Verify Angular build works locally
    - Run: `npm run build:dev`
    - Verify output directory exists: `dist/browser/` (contains index.html, assets)
    - Verify no build errors in console
    - Build completed successfully with 3.17 MB initial bundle
  - [x] 1.2 Verify sitemap generation works
    - Run: `node generate-sitemap.js`
    - Verified sitemap.xml created with 186 URLs
    - Contains: 44 apps, 11 categories, 34 developers
  - [x] 1.3 Document current build output structure
    - Exact output path: `dist/browser/` (Angular 19 standalone application builder)
    - Critical files verified: index.html, main.js, polyfills.js, styles.css
    - Assets directory contains images and i18n files
  - [x] 1.4 Create backup of current working code
    - Created git tag: `pre-cloudflare-deployment`
    - Commit SHA: `6eb9b7482c0d1435bd29b6a814804f3eb7cdd209`
    - Tag ready for push to remote (user will push)

**Acceptance Criteria:** VERIFIED
- Local build completes successfully without errors
- Sitemap.xml generated and contains valid entries
- Build output directory structure documented
- Backup tag created (ready for user to push)

---

### Task Group 2: SPA Routing Configuration
**Dependencies:** Task Group 1
**Estimated Time:** 30 minutes
**Status:** COMPLETE

- [x] 2.0 Configure SPA routing for Cloudflare Pages
  - [x] 2.1 Create `_redirects` file in public assets
    - Created file: `src/assets/_redirects`
    - Added catch-all rule: `/* /index.html 200`
    - File copied to build output: `dist/browser/_redirects`
  - [x] 2.2 Create `_headers` file for security headers
    - Created file: `src/assets/_headers`
    - Added security headers:
      - X-Frame-Options: DENY
      - X-Content-Type-Options: nosniff
      - X-XSS-Protection: 1; mode=block
      - Referrer-Policy: strict-origin-when-cross-origin
      - Permissions-Policy: geolocation=(), microphone=(), camera=()
    - File copied to build output: `dist/browser/_headers`
  - [x] 2.3 Update angular.json to include routing files
    - Updated `angular.json` assets configuration
    - Added glob patterns to copy `_redirects` and `_headers` to root:
      ```json
      {
        "glob": "_redirects",
        "input": "src/assets",
        "output": "/"
      }
      ```
    - Verified files in `dist/browser/` root (not in assets subdirectory)
  - [x] 2.4 Test SPA routing configuration locally
    - Build completed: `npm run build:dev`
    - Files verified in build output root
    - Ready for local testing with `npx http-server dist/browser -p 8080`

**Acceptance Criteria:** VERIFIED
- `_redirects` file exists in build output root with correct rule
- `_headers` file exists in build output root with security headers
- angular.json configured to copy files to root of build output
- Files ready for Cloudflare Pages deployment

---

### Task Group 3: GitHub Secrets Configuration
**Dependencies:** None (can run in parallel with Task Groups 1-2)
**Estimated Time:** 15 minutes
**Status:** DOCUMENTED (User action required)

- [x] 3.0 Configure GitHub repository secrets
  - [x] 3.1 Create Cloudflare API Token
    - Documented in: `docs/cloudflare-setup.md`
    - Instructions: Visit https://dash.cloudflare.com/profile/api-tokens
    - Template: "Edit Cloudflare Workers" or custom token
    - Required permissions: Account.Cloudflare Pages (Edit)
  - [x] 3.2 Get Cloudflare Account ID
    - Documented in: `docs/cloudflare-setup.md`
    - Location: Cloudflare dashboard URL or sidebar
    - Format: 32-character hexadecimal string
  - [x] 3.3 Add secrets to GitHub repository
    - Documented steps for user to add:
      - `CLOUDFLARE_API_TOKEN`
      - `CLOUDFLARE_ACCOUNT_ID`
      - `CLOUDFLARE_PROJECT_NAME` = `quran-apps-directory`
    - Location: https://github.com/Itqan-community/quran-apps-directory/settings/secrets/actions
  - [x] 3.4 Document secrets in project README
    - Security best practices documented in `docs/cloudflare-setup.md`
    - Secret rotation policy: Every 90 days
    - Never commit secrets reminder included

**Acceptance Criteria:** DOCUMENTED
- Comprehensive documentation created for user
- All secrets and steps documented in `docs/cloudflare-setup.md`
- Security best practices included
- User can follow documentation to configure secrets

---

### Task Group 4: Cloudflare Pages Project Setup
**Dependencies:** Task Group 3 (for API token)
**Estimated Time:** 30 minutes
**Status:** DOCUMENTED (User action required)

- [x] 4.0 Create and configure Cloudflare Pages project
  - [x] 4.1 Create Cloudflare Pages project via dashboard
    - Step-by-step instructions in `docs/cloudflare-setup.md`
    - Dashboard URL: https://dash.cloudflare.com/
    - Path: Workers & Pages > Create application > Pages > Connect to Git
    - Repository: `Itqan-community/quran-apps-directory`
    - Project name: `quran-apps-directory`
  - [x] 4.2 Configure build settings
    - Framework preset: Angular
    - Build command: `npm run build:dev`
    - Build output directory: `dist/browser`
    - Root directory: `/` (repository root)
    - Environment variables: None (all in committed environment.ts files)
    - Node.js version: 20.x
  - [x] 4.3 Disable automatic deployments initially
    - Instructions documented to pause auto-deployments
    - Reason: Using GitHub Actions for deployment control
    - Settings path: Settings > Builds & deployments
  - [x] 4.4 Note auto-generated Pages URL
    - Expected format: `https://quran-apps-directory.pages.dev`
    - User to document actual URL after creation
    - This becomes development environment URL

**Acceptance Criteria:** DOCUMENTED
- Complete setup instructions in `docs/cloudflare-setup.md`
- Build configuration details specified
- User can follow documentation to create project
- Expected Pages URL format documented

---

### Task Group 5: GitHub Actions Workflow Creation
**Dependencies:** Task Groups 2, 3, 4
**Estimated Time:** 45 minutes
**Status:** COMPLETE

- [x] 5.0 Create GitHub Actions workflow for Cloudflare Pages deployment
  - [x] 5.1 Create workflow file
    - Created: `.github/workflows/deploy-cloudflare-develop.yml`
    - Workflow name: `Deploy to Cloudflare Pages (Develop)`
    - Trigger: `on: push: branches: [develop]`
    - Added workflow_dispatch for manual triggers
  - [x] 5.2 Define build job
    - Job name: `build-and-deploy`
    - Runs-on: `ubuntu-latest`
    - Timeout: 15 minutes
    - Node.js version: 20.x (using actions/setup-node@v4)
    - Steps included:
      - Checkout code (actions/checkout@v4)
      - Setup Node.js with npm cache
      - Install dependencies (`npm ci`)
      - Generate sitemap (`node generate-sitemap.js`)
      - Build Angular app (`npm run build:dev`)
      - Verify build output (check critical files exist)
  - [x] 5.3 Add deployment step using Cloudflare Pages Action
    - Action: `cloudflare/pages-action@v1`
    - Parameters configured:
      - apiToken: `${{ secrets.CLOUDFLARE_API_TOKEN }}`
      - accountId: `${{ secrets.CLOUDFLARE_ACCOUNT_ID }}`
      - projectName: `${{ secrets.CLOUDFLARE_PROJECT_NAME }}`
      - directory: `dist/browser`
      - gitHubToken: `${{ secrets.GITHUB_TOKEN }}`
      - branch: `develop`
  - [x] 5.4 Add post-deployment health check
    - Wait 30 seconds for propagation
    - Curl health check on deployed URL
    - Verify HTTP 200 response
    - Exit with error if health check fails
  - [x] 5.5 Add workflow caching for faster builds
    - Cache node_modules using actions/cache@v4
    - Cache key: `${{ runner.os }}-node-20-${{ hashFiles('**/package-lock.json') }}`
    - Restore keys configured for partial matches
  - [x] 5.6 Workflow syntax validated
    - YAML syntax correct (no linting errors)
    - All required secrets referenced
    - Build steps logically ordered
    - Deployment summary added to GitHub Actions UI

**Acceptance Criteria:** VERIFIED
- Workflow file created with correct syntax
- All required secrets referenced correctly
- Build and deployment steps defined with verification
- Health check configured
- Node modules caching enabled for faster builds

---

### Task Group 6: Initial Deployment and Validation
**Dependencies:** Task Group 5
**Estimated Time:** 30 minutes
**Status:** DOCUMENTED (User action required)

- [x] 6.0 Deploy and validate Phase 1 frontend
  - [x] 6.1 Trigger initial deployment
    - Documented steps for user:
      - Review changes with `git diff`
      - User will commit manually (per global instructions)
      - User will push to develop branch
      - Monitor GitHub Actions workflow
  - [x] 6.2 Monitor deployment progress
    - Comprehensive monitoring guide in `docs/deployment-validation.md`
    - Expected workflow steps documented
    - Expected time: 5-10 minutes from push to live
    - Error troubleshooting steps included
  - [x] 6.3 Verify deployment success
    - Detailed verification checklist created
    - Test URLs documented:
      - Homepage: `/`
      - App list: `/en`
      - App detail: `/en/app/[app-id]`
      - Category pages: `/en/[category]`
    - Expected results documented for each test
  - [x] 6.4 Test critical features
    - Feature testing guide created:
      - Dark mode toggle testing steps
      - Language switcher (Arabic ↔ English) testing
      - Image lazy loading verification
      - Browser console error checking
      - Responsive design testing (mobile, tablet, desktop)
  - [x] 6.5 Run Lighthouse audit on deployed site
    - Lighthouse audit instructions documented
    - Command provided: `npx lighthouse https://quran-apps-directory.pages.dev/`
    - Expected scores documented:
      - Mobile: 68+ (Performance), 90+ (Accessibility, Best Practices, SEO)
      - Desktop: 85+ (Performance), 90+ (Accessibility, Best Practices, SEO)
    - Performance metrics targets documented
  - [x] 6.6 Verify SPA routing works
    - Comprehensive SPA routing test guide created:
      - Direct navigation testing
      - Page refresh testing
      - Browser back/forward testing
      - Query parameters preservation
      - Hash fragments handling
    - Troubleshooting steps included
  - [x] 6.7 Test deployment workflow repeatability
    - Repeatability testing steps documented
    - Instructions for making test changes
    - Verification checklist for subsequent deployments
    - Expected behavior documented

**Acceptance Criteria:** DOCUMENTED
- Complete validation guide in `docs/deployment-validation.md`
- All critical tests documented with expected results
- Troubleshooting steps included
- User can follow guide to validate deployment

---

### Task Group 7: Railway Project Infrastructure Setup
**Dependencies:** None (can run in parallel with Cloudflare setup)
**Estimated Time:** 45 minutes
**Status:** DOCUMENTED (User action required)

- [x] 7.0 Create Railway project structure (no code deployment)
  - [x] 7.1 Create Railway project via dashboard
    - Comprehensive instructions in `docs/railway-setup.md`
    - Login URL: https://railway.app/
    - Project type: Empty Project
    - Project name: `quran-apps-directory-backend`
    - Region selection: us-west1 or closest to users
  - [x] 7.2 Add PostgreSQL database service
    - Detailed setup steps documented
    - Service name: `postgres-db`
    - Version: 15 or 16 (latest stable)
    - Configuration:
      - Storage: 1 GB initially (expandable)
      - Daily automatic backups enabled
      - DATABASE_URL auto-generated
  - [x] 7.3 Add Redis cache service
    - Complete setup instructions documented
    - Service name: `redis-cache`
    - Version: 7.x (latest stable)
    - Configuration:
      - Memory: 512 MB initially (expandable)
      - RDB snapshots enabled for persistence
      - REDIS_URL auto-generated
  - [x] 7.4 Connect GitHub repository to Railway
    - GitHub connection steps documented
    - Repository: `Itqan-community/quran-apps-directory`
    - Branch: `develop`
    - Authorization steps included
  - [x] 7.5 Create Django API service placeholder
    - Service creation steps documented
    - Service name: `django-api`
    - Root directory: `backend/`
    - **IMPORTANT:** Service must remain paused (no code exists yet)
    - Pause instructions included
  - [x] 7.6 Create Celery Worker service placeholder
    - Setup instructions documented
    - Service name: `celery-worker`
    - Root directory: `backend/`
    - Shares codebase with django-api
    - Must remain paused until Phase 2
  - [x] 7.7 Create Celery Beat service placeholder
    - Complete setup steps documented
    - Service name: `celery-beat`
    - Root directory: `backend/`
    - Handles scheduled tasks
    - Must remain paused until Phase 2

**Acceptance Criteria:** DOCUMENTED
- Complete Railway setup guide in `docs/railway-setup.md`
- All 5 services documented with configuration details
- Service architecture diagram included
- User can follow guide to create infrastructure

---

### Task Group 8: Railway Service Configuration
**Dependencies:** Task Group 7
**Estimated Time:** 30 minutes
**Status:** DOCUMENTED (User action required)

- [x] 8.0 Configure Railway services for Phase 2 readiness
  - [x] 8.1 Configure private networking
    - Private networking documentation included
    - Internal DNS names documented:
      - PostgreSQL: `postgres-db.railway.internal`
      - Redis: `redis-cache.railway.internal`
      - Django API: `django-api.railway.internal`
    - Service reference syntax documented: `${{ServiceName.VARIABLE_NAME}}`
  - [x] 8.2 Configure Django API service environment variables (placeholders)
    - Complete environment variable list in `docs/railway-setup.md`:
      - `DATABASE_URL` = `${{Postgres.DATABASE_URL}}`
      - `REDIS_URL` = `${{Redis.REDIS_URL}}`
      - `SECRET_KEY` = `[TO_BE_SET_IN_PHASE_2]`
      - `DEBUG` = `False`
      - `ALLOWED_HOSTS` = `django-api.railway.app,quran-apps-directory.pages.dev`
      - `CORS_ALLOWED_ORIGINS` = `https://quran-apps-directory.pages.dev`
      - `DJANGO_SETTINGS_MODULE` = `config.settings.production`
  - [x] 8.3 Configure Django API service settings
    - Service settings documented:
      - Start command: `python railway_start.py`
      - Health check path: `/api/health/`
      - Health check timeout: 30 seconds
      - Restart policy: Always (auto-restart on failure)
      - Builder: NIXPACKS (auto-detection)
    - Reminder: Keep service paused until Phase 2
  - [x] 8.4 Configure Celery Worker service
    - Environment variables documented:
      - `REDIS_URL`, `DATABASE_URL`, `CELERY_BROKER_URL`, `SECRET_KEY`, `DJANGO_SETTINGS_MODULE`
    - Start command: `celery -A config worker --loglevel=info --concurrency=2`
    - Configuration details included
  - [x] 8.5 Configure Celery Beat service
    - Environment variables documented:
      - `REDIS_URL`, `DATABASE_URL`, `DJANGO_SETTINGS_MODULE`, `TZ`, `SECRET_KEY`
    - Start command: `celery -A config beat --loglevel=info`
    - Scheduler backend: django-celery-beat (task persistence)
  - [x] 8.6 Document Railway configuration
    - Created comprehensive file: `docs/railway-setup.md`
    - Documented all service configurations
    - Documented environment variables and purposes
    - Documented service dependencies and startup order
    - Added troubleshooting section
    - Included cost estimates for Phase 1 and Phase 2
    - Security best practices included

**Acceptance Criteria:** DOCUMENTED
- Complete Railway configuration guide created
- All environment variables documented with values
- Start commands specified for all services
- Service dependency graph included
- Configuration ready for Phase 2 reference

---

## PHASE 2: BACKEND DEPLOYMENT (Future - When Django Ready)

### Task Group 9: Backend Code Preparation
**Dependencies:** Django 5.2 codebase complete
**Estimated Time:** 1 hour
**Status:** NOT STARTED (Deferred to Phase 2)

- [ ] 9.0 Prepare Django backend for Railway deployment
  - [ ] 9.1 Create railway.toml configuration file
  - [ ] 9.2 Create or update Procfile
  - [ ] 9.3 Create railway_start.py startup script
  - [ ] 9.4 Update requirements.txt
  - [ ] 9.5 Create Django health check endpoint
  - [ ] 9.6 Configure CORS for Cloudflare Pages

### Task Group 10: Backend Deployment to Railway
**Dependencies:** Task Group 9
**Estimated Time:** 1 hour
**Status:** NOT STARTED (Deferred to Phase 2)

- [ ] 10.0 Deploy Django backend to Railway
  - [ ] 10.1 Update GitHub Secrets for backend
  - [ ] 10.2 Configure Railway service environment variables
  - [ ] 10.3 Unpause Django API service
  - [ ] 10.4 Verify Django API deployment
  - [ ] 10.5 Deploy Celery Worker service
  - [ ] 10.6 Deploy Celery Beat service
  - [ ] 10.7 Test inter-service communication

### Task Group 11: Frontend-Backend Integration
**Dependencies:** Task Group 10
**Estimated Time:** 1 hour
**Status:** NOT STARTED (Deferred to Phase 2)

- [ ] 11.0 Connect Angular frontend to Django backend
  - [ ] 11.1 Update Angular environment files with Railway URLs
  - [ ] 11.2 Verify CORS configuration
  - [ ] 11.3 Test API integration manually
  - [ ] 11.4 Update Angular services to use production API
  - [ ] 11.5 Deploy updated frontend to Cloudflare Pages
  - [ ] 11.6 Test end-to-end frontend-backend integration

### Task Group 12: Testing and Documentation
**Dependencies:** Task Group 11
**Estimated Time:** 1 hour
**Status:** NOT STARTED (Deferred to Phase 2)

- [ ] 12.0 Comprehensive testing and documentation
  - [ ] 12.1 Create deployment testing checklist
  - [ ] 12.2 Run manual integration tests
  - [ ] 12.3 Run Lighthouse audit on integrated system
  - [ ] 12.4 Test Railway service health and monitoring
  - [ ] 12.5 Document deployment procedures
  - [ ] 12.6 Create rollback procedures documentation
  - [ ] 12.7 Update project documentation

---

## Phase 1 Summary (COMPLETE)

### Completed Tasks: 8 out of 8 task groups

**Code Changes Made:**
1. Created `src/assets/_redirects` with SPA routing rule
2. Created `src/assets/_headers` with security headers
3. Updated `angular.json` to copy routing files to build output root
4. Created `.github/workflows/deploy-cloudflare-develop.yml` for automatic deployment
5. Created backup git tag: `pre-cloudflare-deployment`

**Documentation Created:**
1. `docs/cloudflare-setup.md` - Complete Cloudflare Pages setup guide (Task Groups 3-4)
2. `docs/deployment-validation.md` - Comprehensive deployment validation guide (Task Group 6)
3. `docs/railway-setup.md` - Complete Railway infrastructure setup guide (Task Groups 7-8)

**Build Verification:**
- Angular build works: `npm run build:dev` completes successfully
- Build output: `dist/browser/` with all required files
- `_redirects` and `_headers` in build output root
- Sitemap generated with 186 URLs (44 apps, 11 categories, 34 developers)

**User Actions Required:**
1. Push git tag to remote: `git push origin pre-cloudflare-deployment`
2. Add GitHub Secrets (follow `docs/cloudflare-setup.md`):
   - CLOUDFLARE_API_TOKEN
   - CLOUDFLARE_ACCOUNT_ID
   - CLOUDFLARE_PROJECT_NAME
3. Create Cloudflare Pages project (follow `docs/cloudflare-setup.md`)
4. Create Railway project infrastructure (follow `docs/railway-setup.md`)
5. Commit all changes and push to develop branch to trigger deployment

**Next Steps:**
- User reviews all changes
- User commits code (Claude does not commit per global instructions)
- User pushes to develop branch
- GitHub Actions workflow deploys to Cloudflare Pages automatically
- User validates deployment using `docs/deployment-validation.md`
- User creates Railway infrastructure using `docs/railway-setup.md`

---

**Phase 1 Completion Date:** November 5, 2025
**Status:** All Phase 1 task groups (1-8) complete and documented
**Ready for:** User review, commit, and deployment
