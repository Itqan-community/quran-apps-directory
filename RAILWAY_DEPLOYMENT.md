# Railway Deployment Guide - Quran Apps Directory

This guide covers deploying the Quran Apps Directory on Railway with three separate services: Frontend (Angular), Backend (Django), and Database (PostgreSQL).

## Overview

The project is deployed across three Railway environments:

- **Production** (`main` branch): https://quran-apps.itqan.dev
- **Staging** (`staging` branch): https://staging.quran-apps.itqan.dev
- **Development** (`develop` branch): https://dev.quran-apps.itqan.dev

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Railway Project                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────────┐  ┌──────────────────┐  ┌─────────┐    │
│  │ Frontend Service │  │ Backend Service  │  │ Database│    │
│  │                  │  │                  │  │         │    │
│  │ • Angular 19     │  │ • Django 5.2     │  │ PostSQL │    │
│  │ • Node.js Build  │  │ • Python 3.9     │  │ 15      │    │
│  │ • Port 3000      │  │ • Gunicorn       │  │ Port    │    │
│  │                  │  │ • Port 8000      │  │ 5432    │    │
│  └──────────────────┘  └──────────────────┘  └─────────┘    │
│         │                      │                    │       │
│         └──────────────────────┼────────────────────┘       │
│                                │                            │
│                           API Routes                        │
│                     /api/* → Backend                        │
│                     /* → Frontend                           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Prerequisites

1. Railway account (https://railway.app)
2. GitHub repository connected to Railway
3. Docker CLI (for local testing)
4. Railway CLI: `npm install -g @railway/cli`

## Step 1: Connect Repository to Railway

```bash
# Login to Railway CLI
railway login

# Link project
railway init

# Or connect via Dashboard:
# Dashboard → New Project → GitHub → Select quran-apps-directory repo
```

## Step 2: Create Services

### 2a. PostgreSQL Database

**Via CLI:**
```bash
railway service add postgres
```

**Via Dashboard:**
- Railway Dashboard → Services → Add Service → PostgreSQL 15

**Configuration:**
- Database Name: `quran_apps_db`
- Username: `postgres`
- Password: Auto-generated (copy and save)

### 2b. Backend (Django API)

**Via Dashboard:**
1. Add Service → GitHub Repository
2. Select Branch: `main` (for production)
3. Root Directory: `backend`
4. Environment Variables (see Step 3)

**Build:**
- Dockerfile: `backend/Dockerfile`
- Target: `production`

### 2c. Frontend (Angular)

**Via Dashboard:**
1. Add Service → GitHub Repository
2. Select Branch: `main` (for production)
3. Root Directory: `.` (project root)
4. Build Command: `npm install && npm run build:prod`
5. Start Command: `npx serve -s dist/browser -l 3000`

## Step 3: Environment Variables

### Backend Environment Variables

Set these in Railway Dashboard → Services → Backend → Variables:

```
# Django Configuration
DEBUG=False
DJANGO_SETTINGS_MODULE=config.settings.production
SECRET_KEY=<generate-with-command-below>
ALLOWED_HOSTS=quran-apps.itqan.dev,www.quran-apps.itqan.dev
ENVIRONMENT=production

# Database (Auto-linked from PostgreSQL service)
DB_ENGINE=django.db.backends.postgresql
DB_NAME=quran_apps_db
DB_USER=postgres
DB_PASSWORD=<postgres-password>
DB_HOST=<postgres-service-name>
DB_PORT=5432
DB_SSLMODE=prefer

# CORS & Security
CORS_ALLOWED_ORIGINS=https://quran-apps.itqan.dev,https://www.quran-apps.itqan.dev
SECURE_SSL_REDIRECT=True
SESSION_COOKIE_SECURE=True
CSRF_COOKIE_SECURE=True
SECURE_HSTS_SECONDS=31536000

# Email (Optional - configure for production)
EMAIL_BACKEND=django.core.mail.backends.console.EmailBackend
# Or use SendGrid, AWS SES, etc.

# Error Tracking (Optional - Sentry)
# SENTRY_DSN=https://xxxx@xxxx.ingest.sentry.io/xxxxxx
```

**Generate SECRET_KEY:**
```bash
python -c 'from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())'
```

### Frontend Environment Variables

Set in Railway Dashboard → Services → Frontend → Variables:

```
NODE_ENV=production
NG_APP_API_BASE_URL=https://quran-apps.itqan.dev/api
NG_APP_SITE_DOMAIN=https://quran-apps.itqan.dev
NG_APP_ENABLE_DARK_MODE=true
NG_APP_ENABLE_ANALYTICS=false
NG_APP_FORCE_HTTPS=true
```

### Database Environment Variables

Usually auto-configured by Railway, but if manual:

```
POSTGRES_DB=quran_apps_db
POSTGRES_USER=postgres
POSTGRES_PASSWORD=<strong-password>
```

## Step 4: Configure Routes

Railway automatically routes based on service type. To manually configure:

**Dashboard → Settings → Domains:**

1. Add Domain: `quran-apps.itqan.dev`
2. Route `/api/*` → Backend Service
3. Route `/*` → Frontend Service

Or edit `railway.json`:

```json
"routes": [
  {
    "path": "/api/*",
    "service": "quran-backend-api",
    "rewrite": "/api/$1"
  },
  {
    "path": "/*",
    "service": "quran-frontend"
  }
]
```

## Step 5: Run Database Migrations

**Option A: Via Railway Exec**

```bash
railway service <backend-service-name>
railway exec python manage.py migrate
```

**Option B: Post-Deploy Hook (Preferred)**

Add to `backend/Procfile.prod`:

```
release: python manage.py migrate --noinput && python manage.py collectstatic --noinput
web: gunicorn config.wsgi:application
```

Configure in Railway Dashboard → Backend Service → Deploy → Post-Deploy Hook:

```bash
python manage.py migrate --noinput
python manage.py collectstatic --noinput
```

## Step 6: Deploy

### Automatic Deployment (Recommended)

Railway watches GitHub and auto-deploys on push:

```bash
# Push to main branch
git push origin main

# Railway automatically:
# 1. Detects changes
# 2. Builds Docker image
# 3. Runs migrations (if Procfile configured)
# 4. Deploys services
# 5. Runs health checks
```

### Manual Deployment

```bash
railway deploy --branch main
```

## Step 7: Verification

### Check Deployment Status

```bash
# View logs
railway logs

# Check services
railway status

# View environment
railway variables list
```

### Test Frontend

```bash
curl https://quran-apps.itqan.dev/
# Should return HTML content
```

### Test Backend API

```bash
curl https://quran-apps.itqan.dev/api/categories/
# Should return JSON list of categories
```

### Test Database Connection

```bash
railway service postgres
railway exec psql -U postgres -d quran_apps_db -c "SELECT COUNT(*) FROM apps_app;"
```

### Check Health

Railway provides health checks. View in Dashboard:

- Frontend: `GET /` (status 200)
- Backend: `GET /api/categories/` (status 200)
- Database: `psql` connection test

## Troubleshooting

### Backend Service Not Starting

**Problem:** `ERROR: Module not found`

**Solution:**
1. Verify `requirements.txt` in backend root
2. Check `DJANGO_SETTINGS_MODULE=config.settings.production`
3. View logs: `railway logs`

### Database Connection Error

**Problem:** `psycopg2.OperationalError: could not translate host name`

**Solution:**
1. Use Railway's internal DNS: `<service-name>.railway.internal` (not public IP)
2. Or use Railway's exposed DATABASE_URL variable
3. Verify DB_HOST matches service name

### Frontend API CORS Errors

**Problem:** `Access to XMLHttpRequest blocked by CORS`

**Solution:**
1. Update `CORS_ALLOWED_ORIGINS` in backend
2. Must include `https://` prefix and domain only (no path)
3. Redeploy backend: `git push origin main`

### Static Files Not Loading

**Problem:** 404 on `/static/` paths

**Solution:**
1. Ensure `WHITENOISE_MIDDLEWARE` in production settings
2. Run collectstatic: `railway exec python manage.py collectstatic --noinput`
3. Check `STATIC_ROOT` points to `staticfiles/` directory

### Memory Issues

**Problem:** Service killed due to memory limit

**Solution:**
1. Railway free tier: 512MB RAM per service
2. Reduce worker count in gunicorn (currently 4)
3. Upgrade to paid plan for more resources

## Environment-Specific Configuration

### Production (main branch)

```bash
ENVIRONMENT=production
DEBUG=False
ALLOWED_HOSTS=quran-apps.itqan.dev,www.quran-apps.itqan.dev
SECURE_SSL_REDIRECT=True
```

### Staging (staging branch)

```bash
ENVIRONMENT=staging
DEBUG=False
ALLOWED_HOSTS=staging.quran-apps.itqan.dev
SECURE_SSL_REDIRECT=True
```

### Development (develop branch)

```bash
ENVIRONMENT=development
DEBUG=True
ALLOWED_HOSTS=dev.quran-apps.itqan.dev,localhost
SECURE_SSL_REDIRECT=False
```

## Database Backups

Railway automatically backs up PostgreSQL daily. To restore:

**Dashboard → Database Service → Backups → Restore**

Or via CLI:
```bash
railway exec pg_dump -U postgres quran_apps_db > backup.sql
```

## Performance Tips

1. **Enable Compression:**
   - Frontend: `ng build --prod` (already configured)
   - Backend: `WHITENOISE_COMPRESS=True` (set in production.py)

2. **Optimize Images:**
   - Use `next-gen` formats (WebP)
   - Lazy load images in components

3. **Database Indexing:**
   - Already configured in migrations
   - Monitor slow queries: `django-debug-toolbar` in staging

4. **Caching:**
   - Add Redis service for production (optional)
   - Configure Django cache backend

5. **CDN:**
   - Consider Cloudflare for static assets
   - Set aggressive cache headers

## Monitoring & Logs

```bash
# Real-time logs
railway logs --tail

# Filtered logs
railway logs --service backend
railway logs --service frontend
railway logs --service postgres

# Export logs
railway logs --output json > logs.json
```

## Cleanup & Destruction

```bash
# Remove Railway project
railway destroy

# Remove Railway CLI
npm uninstall -g @railway/cli
```

## Additional Resources

- [Railway Documentation](https://docs.railway.app)
- [Django Deployment Guide](https://docs.djangoproject.com/en/4.2/howto/deployment/)
- [Angular Production Build](https://angular.io/guide/deployment)
- [PostgreSQL on Railway](https://docs.railway.app/guides/databases)

## Support & Issues

For issues with deployment:

1. Check Railway Logs: Dashboard → Services → Logs
2. Review `.env` variables
3. Test locally with Docker
4. Contact Railway Support: https://railway.app/support

---

**Last Updated:** October 23, 2024
**Framework:** Angular 19 + Django 5.2 + PostgreSQL 15
**Platform:** Railway.app
