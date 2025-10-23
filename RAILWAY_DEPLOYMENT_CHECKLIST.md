# Railway Deployment Checklist

Complete this checklist to ensure your Quran Apps Directory is properly deployed on Railway with three separate services across production, staging, and development environments.

## Pre-Deployment Setup

- [ ] Have a Railway account (https://railway.app)
- [ ] GitHub repository is connected to Railway
- [ ] Railway CLI installed: `npm install -g @railway/cli`
- [ ] All three deployment files created:
  - [ ] `/railway.json` (service configuration)
  - [ ] `/backend/Procfile.prod` (Procfile)
  - [ ] `/backend/railway-entrypoint.sh` (deployment script)
  - [ ] `/backend/config/settings/production.py` (Django settings)
  - [ ] `/RAILWAY_DEPLOYMENT.md` (deployment guide)
  - [ ] `/RAILWAY_VARIABLES.md` (environment variables guide)
  - [ ] `/.env.railway.example` (example environment file)

## Production Environment Setup (main branch)

### 1. Create Services

- [ ] **PostgreSQL Database Service**
  - [ ] Created via Railway Dashboard
  - [ ] Database name: `quran_apps_db`
  - [ ] Username: `postgres`
  - [ ] Password: securely generated and saved

- [ ] **Backend Service (Django)**
  - [ ] Created with root directory: `backend/`
  - [ ] Dockerfile: `backend/Dockerfile`
  - [ ] Build target: `production`
  - [ ] Port: 8000

- [ ] **Frontend Service (Angular)**
  - [ ] Created with Node.js
  - [ ] Build command: `npm install && npm run build:prod`
  - [ ] Start command: `npx serve -s dist/demo/browser -l 3000`
  - [ ] Port: 3000

### 2. Configure Environment Variables (Backend Service)

**Core Configuration:**
- [ ] `ENVIRONMENT=production`
- [ ] `DJANGO_SETTINGS_MODULE=config.settings.production`
- [ ] `DEBUG=False`
- [ ] `SECRET_KEY=<generated-secret>`

**Database Configuration:**
- [ ] `DB_ENGINE=django.db.backends.postgresql`
- [ ] `DB_NAME=quran_apps_db`
- [ ] `DB_USER=postgres`
- [ ] `DB_PASSWORD=<postgres-password>`
- [ ] `DB_HOST=quran-postgres`
- [ ] `DB_PORT=5432`
- [ ] `DB_SSLMODE=prefer`

**Security Configuration:**
- [ ] `ALLOWED_HOSTS=quran-apps.itqan.dev,www.quran-apps.itqan.dev`
- [ ] `CORS_ALLOWED_ORIGINS=https://quran-apps.itqan.dev,https://www.quran-apps.itqan.dev`
- [ ] `SECURE_SSL_REDIRECT=True`
- [ ] `SESSION_COOKIE_SECURE=True`
- [ ] `CSRF_COOKIE_SECURE=True`
- [ ] `SECURE_HSTS_SECONDS=31536000`

**Email Configuration (if using):**
- [ ] `EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend`
- [ ] `EMAIL_HOST=<your-email-host>`
- [ ] `EMAIL_PORT=<port>`
- [ ] `EMAIL_HOST_USER=<username>`
- [ ] `EMAIL_HOST_PASSWORD=<password>`
- [ ] `DEFAULT_FROM_EMAIL=noreply@quran-apps.itqan.dev`

**Monitoring (Optional):**
- [ ] `SENTRY_DSN=<sentry-dsn>` (if using error tracking)
- [ ] `LOG_LEVEL=INFO`

### 3. Configure Environment Variables (Frontend Service)

- [ ] `NODE_ENV=production`
- [ ] `NG_APP_API_BASE_URL=https://quran-apps.itqan.dev/api`
- [ ] `NG_APP_SITE_DOMAIN=https://quran-apps.itqan.dev`
- [ ] `NG_APP_ENABLE_DARK_MODE=true`
- [ ] `NG_APP_ENABLE_ANALYTICS=false`
- [ ] `NG_APP_FORCE_HTTPS=true`
- [ ] `NG_APP_CONTACT_EMAIL=connect@itqan.dev`

### 4. Configure Environment Variables (Database Service)

- [ ] `POSTGRES_DB=quran_apps_db`
- [ ] `POSTGRES_USER=postgres`
- [ ] `POSTGRES_PASSWORD=<secure-password>`
- [ ] `POSTGRES_INITDB_ARGS=--encoding=UTF8 --locale=C`

### 5. Configure Networking & Routing

- [ ] Domain configured: `quran-apps.itqan.dev` → Frontend Service
- [ ] Route `/api/*` → Backend Service
- [ ] Route `/*` → Frontend Service
- [ ] SSL certificate auto-provisioned (Railway auto-enables)

### 6. Deploy & Test Production

- [ ] Push code to `main` branch: `git push origin main`
- [ ] Railway auto-deploys (watch logs in Dashboard)
- [ ] Migrations run successfully: `railway exec python manage.py migrate`
- [ ] Static files collected: verify `/staticfiles/` exists
- [ ] Frontend loads: `curl https://quran-apps.itqan.dev/`
- [ ] API responds: `curl https://quran-apps.itqan.dev/api/categories/`
- [ ] Database connects: `railway exec psql -U postgres -d quran_apps_db -c "SELECT COUNT(*) FROM apps_app;"`
- [ ] No errors in logs: `railway logs | grep ERROR` (should return nothing)
- [ ] Health checks pass: all 3 services show green status

## Staging Environment Setup (staging branch)

- [ ] Repeat steps 1-6 above with:
  - [ ] Domain: `staging.quran-apps.itqan.dev`
  - [ ] Branch: `staging`
  - [ ] Database: `quran_apps_staging_db` (separate from production)
  - [ ] SECRET_KEY: different from production
  - [ ] `DEBUG=False` (still secure)
  - [ ] `LOG_LEVEL=DEBUG` (for testing)

- [ ] Verify staging deployment works end-to-end
- [ ] Test with staging data before promoting to production

## Development Environment Setup (develop branch)

- [ ] Repeat steps 1-6 above with:
  - [ ] Domain: `dev.quran-apps.itqan.dev`
  - [ ] Branch: `develop`
  - [ ] Database: `quran_apps_dev_db` (separate from production/staging)
  - [ ] `DEBUG=True` (for development)
  - [ ] `DJANGO_SETTINGS_MODULE=config.settings.development`
  - [ ] `LOG_LEVEL=DEBUG`
  - [ ] Relaxed CORS: `https://dev.quran-apps.itqan.dev,http://localhost:4200`

- [ ] Verify development deployment works end-to-end

## Post-Deployment Verification

### Frontend Tests

- [ ] [ **Production** ] Page loads at `https://quran-apps.itqan.dev/`
- [ ] [ **Production** ] Dark mode toggle works
- [ ] [ **Production** ] Language selector works (en/ar)
- [ ] [ **Production** ] Categories display with icons
- [ ] [ **Production** ] App list loads and renders
- [ ] [ **Production** ] Search functionality works
- [ ] [ **Production** ] No console errors (DevTools → Console)
- [ ] [ **Production** ] No CORS errors in DevTools → Network

- [ ] [ **Staging** ] Repeat all frontend tests
- [ ] [ **Development** ] Repeat all frontend tests

### Backend Tests

- [ ] [ **Production** ] API responds at `/api/categories/`
- [ ] [ **Production** ] API responds at `/api/apps/`
- [ ] [ **Production** ] Database connection is healthy
- [ ] [ **Production** ] Static files serve from `/static/`
- [ ] [ **Production** ] No 500 errors in logs
- [ ] [ **Production** ] Gunicorn running with 4 workers

- [ ] [ **Staging** ] Repeat all backend tests
- [ ] [ **Development** ] Repeat all backend tests

### Database Tests

- [ ] [ **Production** ] Database contains migrated schema
- [ ] [ **Production** ] Tables: `apps_app`, `categories_category`, etc.
- [ ] [ **Production** ] Data persists after service restart
- [ ] [ **Production** ] Backups are scheduled (Railway Dashboard)

- [ ] [ **Staging** ] Separate database from production
- [ ] [ **Development** ] Separate database from production/staging

### Security Tests

- [ ] [ **Production** ] HTTPS enforced (all requests redirect to https)
- [ ] [ **Production** ] No hardcoded secrets in code
- [ ] [ **Production** ] `DEBUG=False` in all logs
- [ ] [ **Production** ] CORS only allows whitelisted origins
- [ ] [ **Production** ] HSTS header set (security: strict-transport-security)

- [ ] [ **Staging** ] HTTPS enforced
- [ ] [ **Development** ] Dev settings allow localhost

### Performance Tests

- [ ] [ **Production** ] Lighthouse score ≥ 70 (mobile), ≥ 85 (desktop)
- [ ] [ **Production** ] First Contentful Paint < 2.5s
- [ ] [ **Production** ] Largest Contentful Paint < 4s
- [ ] [ **Production** ] Static files gzip compressed
- [ ] [ **Production** ] Images lazy-loaded

- [ ] [ **Staging** ] Performance acceptable for staging
- [ ] [ **Development** ] Can accept slower performance

## Monitoring & Maintenance

### Monitoring Setup

- [ ] [ **Production** ] Sentry configured for error tracking (optional)
- [ ] [ **Production** ] Railway Logs monitored for errors
- [ ] [ **Production** ] Database backups scheduled daily
- [ ] [ **Staging** ] Basic monitoring configured
- [ ] [ **Development** ] Logs accessible for debugging

### Maintenance Tasks

- [ ] [ ] Database backups tested (can restore from Railway backup)
- [ ] [ ] Log rotation configured (Railway handles automatically)
- [ ] [ ] Unused environment variables removed
- [ ] [ ] Secrets never committed to git
- [ ] [ ] `.env` files added to `.gitignore`

## Continuous Deployment Setup

### GitHub to Railway Connection

- [ ] [ ] Repository connected to Railway
- [ ] [ ] Auto-deploy enabled for:
  - [ ] `main` branch → Production
  - [ ] `staging` branch → Staging
  - [ ] `develop` branch → Development
- [ ] [ ] Push triggers automatic deployment
- [ ] [ ] Deployment status visible in Railway Dashboard

### Branch Protection Rules (Optional but Recommended)

- [ ] [ ] `main` branch requires pull request reviews before merge
- [ ] [ ] `main` branch requires status checks to pass before merge
- [ ] [ ] `staging` branch requires testing before merge to main
- [ ] [ ] `develop` branch is free for experimentation

## Rollback Procedure

If deployment fails:

- [ ] [ ] View logs: Railway Dashboard → Services → [Service] → Logs
- [ ] [ ] Find error message and root cause
- [ ] [ ] Fix in code and push new commit
- [ ] [ ] Railway auto-redeploys
- [ ] [ ] Or manually rollback via Dashboard → Select Previous Deployment → Rollback

If database is corrupted:

- [ ] [ ] Railway Dashboard → Database → Backups → Restore
- [ ] [ ] Select backup timestamp
- [ ] [ ] Confirm restore
- [ ] [ ] Re-run migrations if needed

## Documentation

- [ ] [ ] Team members have read `RAILWAY_DEPLOYMENT.md`
- [ ] [ ] Environment variables documented in `RAILWAY_VARIABLES.md`
- [ ] [ ] Secrets are properly managed (not in git)
- [ ] [ ] Deployment process documented in team wiki/README
- [ ] [ ] Runbook created for common issues

## Final Handoff

- [ ] [ ] All three services deployed and healthy
- [ ] [ ] Team trained on Railway dashboard navigation
- [ ] [ ] Monitoring/alerting configured
- [ ] [ ] Backups tested and verified
- [ ] [ ] Documentation reviewed and approved
- [ ] [ ] Go-live approved by stakeholders

---

## Troubleshooting Quick Links

| Issue | Solution |
|-------|----------|
| Database connection failed | See RAILWAY_DEPLOYMENT.md → Troubleshooting → Database Connection Error |
| CORS errors in frontend | See RAILWAY_DEPLOYMENT.md → Troubleshooting → Frontend API CORS Errors |
| Static files 404 | See RAILWAY_DEPLOYMENT.md → Troubleshooting → Static Files Not Loading |
| Memory issues | See RAILWAY_DEPLOYMENT.md → Troubleshooting → Memory Issues |
| Logs not showing | Run `railway logs --tail` or check Dashboard |

---

**Deployment Date:** _________________

**Deployed By:** _________________

**Sign-off:** _________________

---

**Last Updated:** October 23, 2024
