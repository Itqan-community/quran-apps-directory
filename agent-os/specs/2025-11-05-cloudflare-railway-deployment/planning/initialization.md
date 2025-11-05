# Spec Initialization: Cloudflare Pages + Railway Deployment

## Feature Description

Create deployment configurations for Option A architecture (Cloudflare Pages for Frontend + Railway for Backend):

### 1. Cloudflare Pages Setup (Phase 1 - Immediate)

**Project Configuration:**
- Project name: "Quran Apps Directory Frontend"
- Dashboard URL: https://dash.cloudflare.com/71be39fa76ea6261ea925d02b6ee15e6/workers-and-pages
- Deploy Angular 19 frontend from GitHub repository

**Build Settings:**
- Build command: `npm run build:prod`
- Build output directory: `dist/browser`
- Node.js version: 18+
- Environment-specific builds support (dev, staging, prod)

**Domain Configuration:**
- Production: quran-apps.itqan.dev (main branch)
- Staging: staging.quran-apps.itqan.dev (staging branch)
- Development: dev.quran-apps.itqan.dev (develop branch)

**Features to Configure:**
- Automatic deployments on git push
- Preview deployments for pull requests
- SPA routing (all routes serve index.html)
- HTTPS with automatic certificate management
- Environment variables for Angular builds

### 2. Railway Setup (Phase 2 - Planned for Backend)

**Project Configuration:**
- Project name: "Quran Apps Directory Backend"
- Dashboard URL: https://railway.com/dashboard
- Deploy Django 5.2 backend when ready (Phase 2)

**Services to Configure:**
- Django API service (Python 3.10+)
- PostgreSQL 15+ database with persistent storage
- Redis for Celery message broker
- Celery worker service (background tasks)
- Celery beat service (scheduled jobs)

**Integration Requirements:**
- GitHub automatic deployments (develop, staging, main branches)
- Environment variables and secrets management
- Private networking between services
- Database backups configuration
- Vertical scaling settings (RAM/CPU)

### 3. Integration Configuration

**Frontend Updates:**
- Update Angular environment files with Railway API URLs:
  - `environment.prod.ts` → Railway production API URL
  - `environment.staging.ts` → Railway staging API URL
  - `environment.ts` → Railway development API URL

**Backend Configuration (Phase 2):**
- Configure CORS in Django to allow Cloudflare Pages origins
- Set up allowed hosts for Railway domains
- Configure database connection pooling
- Set up Redis connection for Celery

**CI/CD Setup:**
- GitHub Actions workflow for automated testing
- Automated deployments on branch merges
- Build status notifications
- Database migration automation

## Current Project State

**Phase 1 Status:**
- Angular 19 frontend: COMPLETE (100+ apps with static data)
- Dark mode: COMPLETE
- Bilingual support (Arabic/English): COMPLETE
- SEO optimization: COMPLETE (186+ URLs in sitemap)
- Performance: 68+ mobile / 85+ desktop Lighthouse scores

**Phase 2 Status:**
- Django backend: PLANNED (not yet implemented)
- Database schema: DOCUMENTED (27 tables, 50+ indexes)
- API endpoints: ARCHITECTURED (40+ endpoints documented)
- Authentication: DESIGNED (django-allauth + JWT)

**Current Hosting:**
- Unknown/undefined (migrating to new setup)
- No existing deployment infrastructure

**Git Branch Structure:**
- `main` → Production environment
- `staging` → Staging environment
- `develop` → Development environment
- `feature/*` → Feature branches

**Available Tools:**
- Railway CLI: Authenticated and ready
- Wrangler (Cloudflare CLI): Authenticated and ready
- GitHub repository: Connected with CI/CD capability

## Deployment Goals

### Phase 1 Goals (Immediate - Frontend Only)
1. Deploy Angular frontend to Cloudflare Pages
2. Configure custom domains for all three environments
3. Set up automatic deployments from GitHub
4. Achieve global CDN performance (sub-100ms asset delivery)
5. Maintain current Lighthouse scores (68+ mobile / 85+ desktop)
6. Zero cost operation (Cloudflare Pages free tier)

### Phase 2 Goals (Future - When Backend Ready)
1. Deploy Django backend to Railway
2. Set up PostgreSQL database with migrations
3. Configure Redis and Celery workers
4. Integrate frontend with backend API
5. Configure CORS for cross-origin requests
6. Set up monitoring and logging
7. Target cost: $10-20/month for MVP, $30-60/month for production

### Overall Goals
- Support 3 environments: production, staging, development
- Cost-effective solution starting at $0/month (Phase 1)
- Global CDN performance for frontend users worldwide
- Scalable backend infrastructure for 1M+ users
- Automated deployments with minimal manual intervention
- Clear separation of frontend/backend scaling concerns

## Success Criteria

**Phase 1 Success:**
- Frontend accessible at quran-apps.itqan.dev (and staging/dev subdomains)
- Automatic deployments working on git push
- Lighthouse scores maintained or improved
- Sub-100ms asset delivery globally
- Zero deployment costs

**Phase 2 Success:**
- Backend API accessible and integrated with frontend
- Database migrations applied successfully
- Celery workers processing background tasks
- API response times <500ms for 95th percentile
- Costs within $30-60/month budget for production
- Monitoring and logging operational

**Integration Success:**
- Frontend successfully making API calls to Railway backend
- CORS configured correctly (no cross-origin errors)
- All three environments working independently
- Automated deployments for both frontend and backend
- Database backups running automatically

## Timeline Expectations

**Phase 1 (Frontend Deployment):**
- Estimated time: 1-2 hours
- Can be completed immediately

**Phase 2 (Backend Deployment):**
- Estimated time: 4-8 hours
- Will be completed when Django backend is ready

**Migration from Railway All-in-One (if chosen):**
- Estimated time: 2-3 hours
- Minimal disruption to users
