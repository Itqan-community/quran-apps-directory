# Spec Requirements: Cloudflare Pages + Railway Deployment Configuration

## Initial Description

Create deployment configurations for Option A architecture (Cloudflare Pages for Frontend + Railway for Backend). The goal is to deploy the Angular 19 frontend immediately to Cloudflare Pages, while setting up Railway infrastructure for future Django backend deployment (Phase 2).

**Phase 1 (Immediate):** Deploy frontend-only to Cloudflare Pages with automatic deployments from GitHub.

**Phase 2 (Future):** Deploy Django backend to Railway with PostgreSQL, Redis, and Celery workers when backend is ready.

## Requirements Discussion

### First Round Questions

**Q1:** I assume you want to prioritize deploying the Phase 1 frontend immediately (this week), and set up Railway project structure now even though Django backend won't be deployed until Phase 2. Is that correct, or should we wait on Railway setup?

**Answer:** IMMEDIATE priority - Deploy Phase 1 frontend to Cloudflare Pages this week. Set up Railway project structure NOW (even though Django backend not ready yet) so it's ready when Phase 2 begins.

**Q2:** For custom domains, I'm thinking you want to use the documented domains (quran-apps.itqan.dev, staging.quran-apps.itqan.dev, dev.quran-apps.itqan.dev). Should we configure these immediately or start with Cloudflare auto-generated `*.pages.dev` URLs first?

**Answer:** Start with Cloudflare auto-generated `*.pages.dev` URLs (e.g., dev.quran-apps.pages.dev). User will point live site to Cloudflare only after confirming everything works correctly.

**Q3:** For branch deployment strategy, I assume you want automatic deployments for all three environments (develop → development, staging → staging, main → production). Should we also enable preview deployments for pull requests?

**Answer:** Start with ONLY `develop` branch deployment initially. Use GitHub Actions to push frontend to Cloudflare and backend to Railway. No preview deployments for PRs initially (keep it simple).

**Q4:** I'm assuming the current environment variable values in `environment.*.ts` files are safe to commit (no secrets). Should sensitive configuration like API keys be managed via GitHub Secrets for deployment workflows?

**Answer:** Current config values in `environment.*.ts` are safe (committed to repo). Sensitive info goes into GitHub Secrets (not Cloudflare Pages env vars directly).

**Q5:** For Railway backend setup, I'm thinking we should create the project structure now with placeholder services (Django API, PostgreSQL, Redis, Celery worker, Celery beat) even though Django code doesn't exist yet. Should we do this or wait until Django backend is ready?

**Answer:** Create Railway project structure NOW (even though Django backend not ready yet). Set up all 5 services: Django API, PostgreSQL 15+, Redis, Celery worker, Celery beat.

**Q6:** For build commands, I see your package.json has `build:dev`, `build:staging`, and `build:prod`. Should we configure different build commands per environment in Cloudflare Pages, or use a single build command with environment detection?

**Answer:** YES - Use different build commands per environment:
- Production: `npm run build:prod`
- Staging: `npm run build:staging`
- Development: `npm run build:dev`

**Q7:** When you integrate the backend API (Phase 2), should I document CORS configuration for Django to allow Cloudflare Pages origins, or will you handle that separately?

**Answer:** Handle CORS configuration yourself during actual backend deployment (not documenting for Django developers). User will configure it when deploying backend.

**Q8:** I notice your environment files have Google Analytics tracking ID placeholders. Should we configure GA4 tracking via environment variables in GitHub Actions, or is it already hardcoded?

**Answer:** Already in the code (no env var needed). Google Analytics configuration is committed in environment files.

**Q9:** For database migrations in Railway, should they run automatically on deployment (via Procfile/start command), or should we create a manual migration job?

**Answer:** Railway should run Django migrations automatically on deployment. Configure this in start command/Procfile.

**Q10:** Should we set up cost monitoring/billing alerts for Railway and Cloudflare Pages now, or handle that post-deployment?

**Answer:** No billing alerts setup now. Handle monitoring after initial deployment is working.

**Q11:** For SSL/HTTPS, should we rely on Cloudflare Pages and Railway's automatic HTTPS with auto-renewing certificates, or do you have custom SSL requirements?

**Answer:** Rely on Cloudflare Pages and Railway's automatic HTTPS with auto-renewing certs. No custom SSL requirements.

**Q12:** What should we explicitly exclude from this deployment configuration? For example: Docker containerization, complex CI/CD pipelines beyond basic GitHub Actions, monitoring/logging setup beyond platform defaults, database backup strategies, or staging/main branch deployments?

**Answer:** Exclusions (implied from answers):
- Start simple, no Docker initially
- No complex CI/CD - just basic GitHub Actions for `develop` branch
- Start with develop branch only, add staging/main later
- No custom monitoring beyond platform defaults initially
- No billing alerts or cost optimization initially
- Focus on getting develop branch deployed and working first

### Existing Code to Reference

**Similar Features Identified:**
No similar deployment configurations exist in the codebase. This is a new infrastructure setup from scratch.

**Existing Configuration Files:**
- `src/environments/environment.ts` - Development environment config (localhost:4200)
- `src/environments/environment.staging.ts` - Staging environment config (staging.quran-apps.itqan.dev)
- `src/environments/environment.prod.ts` - Production environment config (dev.quran-apps.itqan.dev)
- `package.json` - Build scripts: `build:dev`, `build:staging`, `build:prod`

**Note:** The environment files currently reference placeholder API URLs that will need to be updated with actual Railway backend URLs in Phase 2.

### Follow-up Questions

No follow-up questions needed. All requirements are clear and comprehensive.

## Visual Assets

### Files Provided:
No visual assets provided.

### Visual Insights:
Not applicable - this is an infrastructure configuration spec, not a UI feature.

## Requirements Summary

### Functional Requirements

**Phase 1 - Immediate (Frontend Deployment to Cloudflare Pages):**
1. Deploy Angular 19 frontend to Cloudflare Pages from GitHub repository
2. Configure automatic deployment from `develop` branch only (not staging/main yet)
3. Use Cloudflare auto-generated subdomain (e.g., `quran-apps-directory.pages.dev`)
4. Build command: `npm run build:dev` for develop branch
5. Build output directory: `dist/demo/browser` (Angular 19 output path)
6. Set up GitHub Actions workflow to trigger Cloudflare Pages deployment
7. No preview deployments for pull requests initially
8. HTTPS automatic via Cloudflare with auto-renewing certificates

**Phase 2 - Future (Backend Deployment to Railway):**
1. Create Railway project: "Quran Apps Directory Backend"
2. Set up 5 services in Railway:
   - **Django API Service:** Python 3.10+, Django 5.2 application
   - **PostgreSQL Database:** Version 15+, persistent storage, daily backups
   - **Redis Service:** Celery message broker and caching
   - **Celery Worker:** Background task processing
   - **Celery Beat:** Scheduled job execution
3. Configure automatic deployments from GitHub (develop branch initially)
4. Set up private networking between all Railway services
5. Configure environment variables via Railway dashboard (DATABASE_URL, REDIS_URL, SECRET_KEY, etc.)
6. Run Django migrations automatically on deployment (via start command)
7. Configure CORS in Django to allow Cloudflare Pages origin
8. Update Angular environment files with Railway API URLs after backend deployed

**GitHub Actions Configuration:**
1. Create workflow for `develop` branch deployments
2. Store sensitive values in GitHub Secrets (not Cloudflare Pages env vars)
3. Trigger Cloudflare Pages deployment on push to `develop`
4. Trigger Railway deployment on push to `develop` (when backend ready)
5. Run build with appropriate environment-specific command

**Future Expansion (Not in Initial Scope):**
- Add `staging` and `main` branch deployments later
- Enable pull request preview deployments
- Configure custom domains (quran-apps.itqan.dev, staging.quran-apps.itqan.dev, dev.quran-apps.itqan.dev)
- Set up monitoring and logging beyond platform defaults
- Configure billing alerts and cost optimization
- Add database backup strategies

### Reusability Opportunities

**Railway CLI and Wrangler:**
- User has Railway CLI authenticated and ready
- User has Wrangler (Cloudflare CLI) authenticated and ready
- Both can be used for manual deployments if GitHub Actions fails

**Existing Build Commands:**
- `npm run build:dev` - Development build (already defined in package.json)
- `npm run build:staging` - Staging build with compression (already defined)
- `npm run build:prod` - Production build with compression (already defined)
- `npm run generate-sitemap` - Sitemap generation (already defined, runs pre-build)

**Environment Files Pattern:**
- Follow existing pattern in `src/environments/` for configuration
- All three environment files already exist and are structured consistently
- Railway API URLs will follow same pattern as placeholder URLs

### Scope Boundaries

**In Scope:**

**Phase 1 (Immediate):**
- Cloudflare Pages project creation and configuration
- GitHub repository connection to Cloudflare Pages
- Automatic deployment from `develop` branch
- GitHub Actions workflow for Cloudflare Pages deployment
- Build configuration (`npm run build:dev`)
- SPA routing configuration (all routes serve index.html)
- Auto-generated `*.pages.dev` subdomain
- Automatic HTTPS certificate management
- Basic deployment documentation

**Railway Project Setup (Immediate):**
- Railway project creation: "Quran Apps Directory Backend"
- Service structure definition (5 services: Django, PostgreSQL, Redis, Celery worker, Celery beat)
- Private networking configuration between services
- Environment variables placeholder setup
- GitHub repository connection
- Basic Railway configuration files (railway.toml, Procfile)

**Phase 2 (Future - When Django Backend Ready):**
- Django backend deployment to Railway
- Database migrations automation
- Celery workers configuration
- Redis connection setup
- CORS configuration for Cloudflare Pages origin
- Angular environment files update with Railway API URLs
- Integration testing between frontend and backend

**Out of Scope:**

**Not in Initial Implementation:**
- `staging` and `main` branch deployments (add later)
- Pull request preview deployments (add later)
- Custom domain configuration (use `*.pages.dev` initially)
- Database backup automation (Railway provides daily backups by default)
- Advanced monitoring and logging (use platform defaults)
- Billing alerts and cost optimization
- Horizontal scaling configuration
- Multi-region deployment
- Load balancer configuration
- Custom SSL certificates
- Email service (SendGrid) integration
- Error tracking (Sentry) integration
- Performance monitoring beyond Lighthouse
- API rate limiting (Phase 2 backend concern)
- CDN cache invalidation strategies (Cloudflare handles automatically)

**Explicitly Excluded:**
- Docker containerization (use Railway's Nixpacks auto-detection)
- Complex CI/CD pipelines (keep GitHub Actions simple)
- Infrastructure as Code (Terraform, Pulumi) - use platform dashboards
- Kubernetes deployment
- Microservices architecture (monolithic Django is sufficient)
- GraphQL API (REST API via Django REST Framework)
- Serverless functions (not needed, using traditional backend)

### Technical Considerations

**Frontend (Cloudflare Pages):**
- Angular 19 with TypeScript 5.5
- Build output: `dist/demo/browser` (Angular standalone build path)
- SPA routing requirement: Configure `_redirects` or `_headers` for catch-all routing
- Build time: Approximately 3-5 minutes per deployment
- Bundle size: Currently optimized with code splitting and lazy loading
- Lighthouse scores to maintain: 68+ mobile / 85+ desktop
- No environment variables needed in Cloudflare Pages (all config in committed environment files)

**Backend (Railway - Phase 2):**
- Django 5.2 with Python 3.10+
- PostgreSQL 15+ with Django ORM migrations
- Redis for Celery message broker (not caching layer yet)
- Celery workers for background tasks (email sending, data processing)
- Celery beat for scheduled jobs (daily reports, cleanup tasks)
- Start command should include migration execution: `python manage.py migrate && gunicorn config.wsgi:application`
- Environment variables required:
  - `DATABASE_URL` (auto-provided by Railway PostgreSQL service)
  - `REDIS_URL` (auto-provided by Railway Redis service)
  - `SECRET_KEY` (Django secret key, store in GitHub Secrets)
  - `DEBUG` (set to False in production)
  - `ALLOWED_HOSTS` (Railway domain + Cloudflare Pages origin)
  - `CORS_ALLOWED_ORIGINS` (Cloudflare Pages URL)
  - `SENDGRID_API_KEY` (Phase 2 when email needed)
  - `DJANGO_SETTINGS_MODULE` (e.g., `config.settings.production`)

**Integration Points:**
- CORS configuration in Django to allow Cloudflare Pages origin
- API base URLs in Angular environment files must match Railway deployment URLs
- Private networking between Railway services (PostgreSQL, Redis, Django API)
- Django REST Framework API endpoints (40+ documented endpoints in Phase 2)

**Git Branch Strategy:**
- `develop` branch → Development environment (immediate deployment)
- `staging` branch → Staging environment (future expansion)
- `main` branch → Production environment (future expansion)
- `feature/*` branches → No automatic deployment (PR-based workflow)

**Build Commands per Environment:**
- Development: `npm run build:dev` → outputs to `dist/demo/browser`
- Staging: `npm run build:staging` → includes compression, outputs to `dist/demo/browser`
- Production: `npm run build:prod` → full optimization, compression, sitemap generation

**Railway Service Dependencies:**
- Django API depends on: PostgreSQL (DATABASE_URL), Redis (REDIS_URL)
- Celery Worker depends on: Redis (CELERY_BROKER_URL), Django API (shared codebase)
- Celery Beat depends on: Redis, Django API
- PostgreSQL and Redis have no dependencies (base services)

**Performance Expectations:**
- Frontend (Cloudflare Pages): Sub-100ms global asset delivery
- Backend (Railway): 200-500ms API response time (acceptable for read-heavy directory app)
- Database queries: Optimized with 50+ indexes (documented in postgresql-schema.md)

**Security Considerations:**
- All secrets in GitHub Secrets (never in code or Cloudflare Pages env vars)
- HTTPS enforced on both Cloudflare Pages and Railway
- CORS restricted to known origins only (Cloudflare Pages URL)
- Django DEBUG=False in staging/production
- PostgreSQL and Redis in Railway private network (not public)
- JWT token authentication for API (Phase 2)
- Rate limiting on API endpoints (Phase 2 Django middleware)

**Cost Estimates:**
- **Phase 1 (Frontend Only):** $0/month
  - Cloudflare Pages free tier: Unlimited bandwidth, 500 builds/month
- **Phase 2 (Backend MVP):** $10-20/month
  - Railway free tier: $5 credit/month (enough for light testing)
  - Railway Starter: Django API (1 GB RAM, ~$5-10/month)
  - PostgreSQL (1 GB storage, included in Railway credit)
  - Redis (512 MB RAM, included)
- **Phase 2 (Production Scale):** $30-60/month
  - Railway Pro: Django API (4 GB RAM, ~$20-30/month)
  - PostgreSQL (10 GB storage, ~$10/month)
  - Redis (1 GB RAM, ~$5/month)
  - Celery Worker (1 GB RAM, ~$5-10/month)
  - Celery Beat (512 MB RAM, ~$5/month)

**Deployment Workflow:**
1. Developer pushes code to `develop` branch
2. GitHub Actions workflow triggered
3. Frontend: Runs `npm run build:dev`, deploys to Cloudflare Pages
4. Backend (Phase 2): Runs tests, builds Docker image (or Nixpacks), deploys to Railway
5. Railway runs migrations automatically on deployment
6. Cloudflare Pages invalidates cache automatically
7. Both deployments complete in 5-10 minutes total

**Testing Strategy:**
- Run Angular build locally before pushing: `npm run build:dev`
- Verify build output directory exists: `dist/demo/browser`
- Test locally with serve: `npm run serve:dev`
- Verify GitHub Actions workflow syntax before committing
- Test Railway deployment with test branch first (optional)
- Verify CORS configuration with browser developer tools (Phase 2)

**Rollback Strategy:**
- Cloudflare Pages: Use deployment history to rollback to previous build (instant)
- Railway: Use deployment history to rollback to previous Docker image (1-2 minutes)
- Database migrations: Manual rollback if needed (Phase 2, use Django management command)

**Documentation Requirements:**
- README update with deployment instructions
- GitHub Actions workflow documentation
- Environment variables reference
- Railway service configuration documentation
- CORS configuration guide (Phase 2)
- Troubleshooting common deployment issues

**Success Criteria:**
- `develop` branch auto-deploys to Cloudflare Pages on push
- Angular frontend accessible at `quran-apps-directory.pages.dev` (or similar)
- All routes working correctly (SPA routing configured)
- Lighthouse scores maintained (68+ mobile / 85+ desktop)
- Build completes in under 10 minutes
- Railway project created with 5 services defined (ready for Phase 2)
- GitHub Secrets configured for sensitive values
- Documentation complete and accessible

## Configuration Files Needed

**Cloudflare Pages:**
1. `wrangler.toml` (optional, if using Wrangler CLI instead of dashboard)
2. `_redirects` file in Angular build output for SPA routing
3. GitHub Actions workflow file: `.github/workflows/deploy-cloudflare-pages.yml`

**Railway (Phase 2):**
1. `railway.toml` - Service definitions and build configuration
2. `Procfile` - Process definitions for Django API, Celery worker, Celery beat
3. `nixpacks.toml` (optional) - Build configuration if not using Dockerfile
4. `requirements.txt` - Python dependencies (Django backend)
5. GitHub Actions workflow file: `.github/workflows/deploy-railway.yml`

**GitHub Actions Workflows:**
1. `.github/workflows/deploy-develop.yml` - Workflow for `develop` branch (frontend + backend)
2. Secrets needed:
   - `CLOUDFLARE_API_TOKEN` - Cloudflare API token for Pages deployment
   - `CLOUDFLARE_ACCOUNT_ID` - Cloudflare account ID
   - `RAILWAY_TOKEN` - Railway API token (Phase 2)
   - `DJANGO_SECRET_KEY` - Django secret key (Phase 2)

**Angular Configuration:**
- `angular.json` - Already configured with build targets
- `package.json` - Already has build scripts defined
- `src/environments/environment.ts` - Already configured (development)
- `src/environments/environment.staging.ts` - Already configured (staging)
- `src/environments/environment.prod.ts` - Already configured (production)

## Implementation Notes

**Immediate Actions (This Week):**
1. Create Cloudflare Pages project "Quran Apps Directory Frontend"
2. Connect GitHub repository to Cloudflare Pages
3. Configure build settings:
   - Framework preset: Angular
   - Build command: `npm run build:dev`
   - Build output directory: `dist/demo/browser`
   - Root directory: `/` (default)
   - Branch: `develop`
4. Create GitHub Actions workflow for automatic deployment
5. Test deployment by pushing to `develop` branch
6. Verify SPA routing works (all routes serve index.html)
7. Verify Lighthouse scores maintained

**Railway Setup (This Week):**
1. Create Railway project "Quran Apps Directory Backend"
2. Add services (don't deploy yet, just configure):
   - PostgreSQL service (version 15+)
   - Redis service (latest stable)
   - Django API service (placeholder, connect GitHub repo)
   - Celery Worker service (placeholder)
   - Celery Beat service (placeholder)
3. Configure private networking between services
4. Add GitHub repository connection
5. Don't deploy backend yet (wait for Django code to be ready)

**Phase 2 Actions (When Django Backend Ready):**
1. Create Django project structure in repository
2. Add `railway.toml` with service configurations
3. Add `Procfile` with start commands
4. Configure environment variables in Railway dashboard
5. Update Angular environment files with Railway API URLs
6. Deploy backend to Railway
7. Test API endpoints manually with cURL/Postman
8. Configure CORS in Django to allow Cloudflare Pages origin
9. Test frontend-backend integration
10. Update GitHub Actions workflow to deploy backend

**Future Expansion (After Develop Branch Working):**
1. Add `staging` branch deployment to Cloudflare Pages and Railway
2. Add `main` branch deployment for production
3. Configure custom domains (requires DNS changes)
4. Enable pull request preview deployments
5. Add advanced monitoring and alerting
6. Set up billing alerts
7. Optimize costs based on actual usage
8. Add database backup strategies beyond Railway defaults

**Testing Checklist:**
- [ ] Angular build completes successfully (`npm run build:dev`)
- [ ] Build output directory contains index.html and assets
- [ ] Cloudflare Pages deployment succeeds
- [ ] Frontend accessible at generated `*.pages.dev` URL
- [ ] All routes work correctly (no 404s for Angular routes)
- [ ] Dark mode toggle works
- [ ] Language switcher works (Arabic/English)
- [ ] Images load correctly (lazy loading)
- [ ] Lighthouse scores meet targets (68+ mobile / 85+ desktop)
- [ ] Service worker disabled in dev (enabled in prod)
- [ ] Google Analytics disabled in dev (enabled in prod)
- [ ] Railway project created with correct services
- [ ] Railway services configured but not deployed yet

**Common Gotchas to Avoid:**
1. **SPA Routing:** Ensure `_redirects` file exists for Angular routing (all routes → /index.html)
2. **Build Output Path:** Verify `dist/demo/browser` matches Angular 19 output path (not `dist/browser`)
3. **Environment Files:** Don't accidentally deploy with wrong environment (use correct build command)
4. **CORS in Phase 2:** Remember to configure CORS before testing frontend-backend integration
5. **Database Migrations:** Ensure migrations run automatically on Railway deployment (add to start command)
6. **Railway Free Tier:** $5 credit exhausts quickly with multiple services (monitor usage)
7. **Cloudflare Pages Cache:** Remember cache invalidates automatically on deployment
8. **GitHub Secrets:** Never commit secrets to code or workflow files (use GitHub Secrets)
9. **Angular Service Worker:** Disabled in dev/staging, enabled in prod (check environment.*.ts)
10. **Railway Private Network:** Use internal URLs for service-to-service communication (not public URLs)

**Deployment Time Estimates:**
- Cloudflare Pages setup: 30-60 minutes (first time)
- GitHub Actions workflow creation: 30 minutes
- Railway project setup: 30-45 minutes
- Testing and verification: 30 minutes
- Documentation: 30 minutes
- **Total Phase 1:** 2-3 hours

**Risk Mitigation:**
- **Risk:** Build fails on Cloudflare Pages
  - **Mitigation:** Test build locally first, verify build output path
- **Risk:** SPA routing doesn't work (404s on refresh)
  - **Mitigation:** Configure `_redirects` file in build output
- **Risk:** Railway costs exceed budget
  - **Mitigation:** Start with free tier, monitor usage, upgrade only when needed
- **Risk:** GitHub Actions workflow fails
  - **Mitigation:** Test workflow syntax, use existing templates, monitor Actions logs
- **Risk:** CORS blocks API calls in Phase 2
  - **Mitigation:** Configure CORS early, test with browser developer tools

**Success Metrics:**
- Frontend deployed to Cloudflare Pages within 1 day
- `develop` branch auto-deploys on every push
- Build time under 10 minutes
- Zero deployment failures after initial setup
- Lighthouse scores maintained or improved
- Railway project ready for Phase 2 backend deployment
- Documentation complete and team onboarded
- Zero downtime during deployments (Cloudflare handles gracefully)
