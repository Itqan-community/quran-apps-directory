# Railway Infrastructure Setup Guide

This guide provides comprehensive documentation for setting up Railway infrastructure for the Quran Apps Directory backend (Phase 2 preparation).

**NOTE:** This setup creates the infrastructure WITHOUT deploying code. Backend deployment happens in Phase 2 when Django code is ready.

---

## Overview

### Railway Architecture

```
Railway Project: quran-apps-directory-backend
├── PostgreSQL Database (postgres-db)
│   ├── Version: 15+
│   ├── Storage: 1 GB initially
│   └── Backups: Daily automatic
├── Redis Cache (redis-cache)
│   ├── Version: 7.x
│   ├── Memory: 512 MB initially
│   └── Persistence: RDB snapshots enabled
├── Django API Service (django-api) [PAUSED]
│   ├── Root directory: backend/
│   ├── Start command: python railway_start.py
│   └── Health check: /api/health/
├── Celery Worker Service (celery-worker) [PAUSED]
│   ├── Root directory: backend/
│   └── Start command: celery -A config worker
└── Celery Beat Service (celery-beat) [PAUSED]
    ├── Root directory: backend/
    └── Start command: celery -A config beat
```

---

## Task Group 7: Railway Project Infrastructure Setup

### 7.1 Create Railway Project

1. **Login to Railway:**
   - Visit: https://railway.app/
   - Login with GitHub account

2. **Create New Project:**
   - Click: **"New Project"**
   - Select: **"Empty Project"** (not from template)
   - Project name: `quran-apps-directory-backend`

3. **Select Region:**
   - Region: **us-west1** (or closest to target users)
   - Click **"Deploy"**

### 7.2 Add PostgreSQL Database Service

1. **Add PostgreSQL:**
   - In project dashboard, click: **"New Service"**
   - Select: **"Database"** > **"PostgreSQL"**

2. **Configure Database:**
   - Service name: `postgres-db`
   - Version: **15** or **16** (latest stable)
   - Wait for provisioning (1-2 minutes)

3. **Verify Database:**
   - Check service status: **Running** (green indicator)
   - Note: `DATABASE_URL` automatically generated in Variables tab
   - Example format: `postgresql://user:password@host:port/dbname`

4. **Configure Backups:**
   - Go to service settings
   - Verify: **Daily automatic backups** enabled (default)
   - Retention: 7 days (Railway default)

5. **Database Configuration:**
   - Storage: **1 GB initially** (expandable in Phase 2)
   - Shared preload libraries: `pg_stat_statements` (for monitoring)

### 7.3 Add Redis Cache Service

1. **Add Redis:**
   - Click: **"New Service"** > **"Database"** > **"Redis"**

2. **Configure Redis:**
   - Service name: `redis-cache`
   - Version: **7.x** (latest stable)
   - Wait for provisioning (1-2 minutes)

3. **Verify Redis:**
   - Check service status: **Running**
   - Note: `REDIS_URL` automatically generated
   - Example format: `redis://default:password@host:port`

4. **Configure Persistence:**
   - Go to service settings
   - Enable: **RDB snapshots** for durability
   - Memory: **512 MB initially** (expandable)

### 7.4 Connect GitHub Repository

1. **Connect Repository:**
   - Click: **"New Service"** > **"GitHub Repo"**
   - Select repository: `Itqan-community/quran-apps-directory`

2. **Authorize Railway:**
   - If prompted, authorize **Railway GitHub App**
   - Grant access to the repository

3. **Configure Connection:**
   - Branch: `develop`
   - Root directory: Leave empty (will configure per service)
   - Do NOT deploy yet

### 7.5 Create Django API Service Placeholder

1. **Add Django Service:**
   - Click: **"New Service"** (under existing project)
   - Select: **GitHub Repo** (already connected)

2. **Configure Service:**
   - Service name: `django-api`
   - Root directory: `backend/` (will contain Django code in Phase 2)
   - Branch: `develop`

3. **Pause Service:**
   - **IMPORTANT:** Do NOT deploy yet (no code exists)
   - Go to: **Settings** > **Service**
   - Click: **"Pause Service"** or remove build trigger
   - Status should show: **Paused**

4. **Rationale:**
   - Infrastructure ready for Phase 2
   - No failed deployments from missing code
   - Can unpause when Django code is ready

### 7.6 Create Celery Worker Service Placeholder

1. **Add Celery Worker:**
   - Click: **"New Service"** > **GitHub Repo**

2. **Configure Service:**
   - Service name: `celery-worker`
   - Root directory: `backend/`
   - Branch: `develop`

3. **Pause Service:**
   - Go to: **Settings** > **Service**
   - Click: **"Pause Service"**
   - Status: **Paused**

4. **Note:**
   - Shares codebase with `django-api`
   - Different start command (configured in Task 8.4)

### 7.7 Create Celery Beat Service Placeholder

1. **Add Celery Beat:**
   - Click: **"New Service"** > **GitHub Repo**

2. **Configure Service:**
   - Service name: `celery-beat`
   - Root directory: `backend/`
   - Branch: `develop`

3. **Pause Service:**
   - Settings > Service > Pause Service
   - Status: **Paused**

4. **Note:**
   - Handles scheduled tasks
   - Shares codebase with `django-api` and `celery-worker`

---

## Task Group 8: Railway Service Configuration

### 8.1 Configure Private Networking

1. **Verify Private Network:**
   - Railway projects have private networking enabled by default
   - All services can communicate via internal DNS

2. **Internal DNS Names:**
   - PostgreSQL: `postgres-db.railway.internal` or use `${{Postgres.DATABASE_URL}}`
   - Redis: `redis-cache.railway.internal` or use `${{Redis.REDIS_URL}}`
   - Django API: `django-api.railway.internal`

3. **Benefits:**
   - No public internet for database connections
   - Faster inter-service communication
   - Enhanced security (private network only)

### 8.2 Configure Django API Environment Variables

1. **Navigate to Django API Service:**
   - Select `django-api` service
   - Go to: **Variables** tab

2. **Add Environment Variables:**

**DATABASE_URL** (Reference to PostgreSQL):
```
${{Postgres.DATABASE_URL}}
```
- Type: Reference
- Points to PostgreSQL service's DATABASE_URL

**REDIS_URL** (Reference to Redis):
```
${{Redis.REDIS_URL}}
```
- Type: Reference
- Points to Redis service's REDIS_URL

**SECRET_KEY** (Placeholder):
```
[TO_BE_SET_IN_PHASE_2]
```
- Type: Plain text
- Will be replaced with actual Django secret key in Phase 2
- Generate with: `python -c 'from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())'`

**DEBUG:**
```
False
```
- Type: Plain text
- Always False in production/staging

**ALLOWED_HOSTS:**
```
django-api.railway.app,quran-apps-directory.pages.dev
```
- Type: Plain text
- Comma-separated list of allowed hosts
- Update with actual Railway domain after deployment

**CORS_ALLOWED_ORIGINS:**
```
https://quran-apps-directory.pages.dev
```
- Type: Plain text
- Cloudflare Pages frontend URL
- Update with custom domain in Phase 2

**DJANGO_SETTINGS_MODULE:**
```
config.settings.production
```
- Type: Plain text
- Django settings module for production

**PORT** (Auto-set by Railway):
```
$PORT
```
- Railway automatically injects this
- Django/Gunicorn binds to this port

### 8.3 Configure Django API Service Settings

1. **Navigate to Settings:**
   - Service: `django-api` > **Settings** tab

2. **Start Command:**
```bash
python railway_start.py
```

**What this script does:**
- Runs database migrations: `python manage.py migrate --noinput`
- Collects static files: `python manage.py collectstatic --noinput`
- Starts Gunicorn: `gunicorn config.wsgi:application --bind 0.0.0.0:$PORT`

3. **Health Check Configuration:**
   - Health check path: `/api/health/`
   - Health check timeout: **30 seconds**
   - Health check interval: **30 seconds**
   - Failure threshold: **3 consecutive failures**

4. **Restart Policy:**
   - Restart policy type: **Always** (auto-restart on failure)
   - Max retries: **10**

5. **Build Settings:**
   - Builder: **NIXPACKS** (Railway's auto-detection)
   - Build command: Auto-detected from requirements.txt
   - Install command: `pip install -r requirements.txt`

6. **Keep Service Paused:**
   - Do NOT unpause yet
   - Wait for Phase 2 when Django code is ready

### 8.4 Configure Celery Worker Service

1. **Navigate to Celery Worker Service:**
   - Service: `celery-worker` > **Variables** tab

2. **Add Environment Variables:**

**REDIS_URL:**
```
${{Redis.REDIS_URL}}
```

**DATABASE_URL:**
```
${{Postgres.DATABASE_URL}}
```

**CELERY_BROKER_URL:**
```
${{Redis.REDIS_URL}}
```

**DJANGO_SETTINGS_MODULE:**
```
config.settings.production
```

**SECRET_KEY:**
```
[TO_BE_SET_IN_PHASE_2]
```
- Same as Django API service

3. **Configure Start Command:**
   - Settings > Service > Start Command:
```bash
celery -A config worker --loglevel=info --concurrency=2
```

**Parameters:**
- `-A config`: Celery app location
- `worker`: Run as worker (not beat)
- `--loglevel=info`: Log level
- `--concurrency=2`: Number of worker processes (2 initially, scale up in production)

4. **Restart Policy:**
   - Restart policy: **Always**
   - Auto-restart on crash or failure

### 8.5 Configure Celery Beat Service

1. **Navigate to Celery Beat Service:**
   - Service: `celery-beat` > **Variables** tab

2. **Add Environment Variables:**

**REDIS_URL:**
```
${{Redis.REDIS_URL}}
```

**DATABASE_URL:**
```
${{Postgres.DATABASE_URL}}
```

**DJANGO_SETTINGS_MODULE:**
```
config.settings.production
```

**TZ (Timezone):**
```
UTC
```
- For consistent scheduled task execution

**SECRET_KEY:**
```
[TO_BE_SET_IN_PHASE_2]
```

3. **Configure Start Command:**
```bash
celery -A config beat --loglevel=info
```

**Parameters:**
- `-A config`: Celery app location
- `beat`: Run as scheduler (not worker)
- `--loglevel=info`: Log level

4. **Scheduler Backend:**
   - Uses `django-celery-beat` for task persistence
   - Stores schedules in PostgreSQL database
   - Survives restarts (tasks not lost)

---

## Service Dependencies

### Dependency Graph

```
PostgreSQL ────────────┐
                       ├──> Django API ──> Celery Worker
Redis ─────────────────┤                    ↓
                       └──> Celery Beat ────┘
```

**Startup Order:**
1. PostgreSQL (no dependencies)
2. Redis (no dependencies)
3. Django API (depends on PostgreSQL + Redis)
4. Celery Worker (depends on Redis + PostgreSQL + Django migrations)
5. Celery Beat (depends on Redis + PostgreSQL + Django migrations)

### Environment Variable References

Railway's service reference syntax: `${{ServiceName.VARIABLE_NAME}}`

**Examples:**
- `${{Postgres.DATABASE_URL}}` - PostgreSQL connection string
- `${{Redis.REDIS_URL}}` - Redis connection string
- `$PORT` - Railway-injected port number

**Benefits:**
- Automatic updates if service credentials change
- No hardcoded values
- Private networking by default

---

## Cost Estimates

### Phase 1 (Infrastructure Only - No Running Services)

- **PostgreSQL:** $0/month (database exists but minimal usage)
- **Redis:** $0/month (exists but minimal usage)
- **Django API:** $0/month (paused)
- **Celery Worker:** $0/month (paused)
- **Celery Beat:** $0/month (paused)

**Total Phase 1:** $0-5/month (Railway free tier: $5 credit/month)

### Phase 2 (All Services Running)

**Development/Staging:**
- **PostgreSQL:** $5-10/month (1 GB storage, light usage)
- **Redis:** $5/month (512 MB memory)
- **Django API:** $10-15/month (2 GB RAM)
- **Celery Worker:** $5-10/month (1 GB RAM)
- **Celery Beat:** $5/month (512 MB RAM)

**Total Phase 2 (Dev/Staging):** $30-45/month

**Production (Higher Resources):**
- **PostgreSQL:** $15-25/month (10 GB storage, higher IOPS)
- **Redis:** $10-15/month (1-2 GB memory)
- **Django API:** $25-40/month (4-8 GB RAM, multiple instances)
- **Celery Worker:** $15-25/month (2-4 GB RAM)
- **Celery Beat:** $5-10/month (512 MB - 1 GB RAM)

**Total Production:** $70-115/month

---

## Verification Checklist

After completing Railway setup, verify:

- [ ] Railway project created: `quran-apps-directory-backend`
- [ ] PostgreSQL service running (green status)
- [ ] Redis service running (green status)
- [ ] Django API service created and PAUSED
- [ ] Celery Worker service created and PAUSED
- [ ] Celery Beat service created and PAUSED
- [ ] All 5 services visible in Railway dashboard
- [ ] GitHub repository connected to project
- [ ] Private networking enabled (default)
- [ ] Environment variables configured for all services
- [ ] Start commands configured for Django, Celery Worker, Celery Beat
- [ ] Health check path configured for Django API

---

## Next Steps (Phase 2)

When Django backend code is ready:

1. **Generate Django Secret Key:**
   ```bash
   python -c 'from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())'
   ```

2. **Update GitHub Secrets:**
   - Add `DJANGO_SECRET_KEY` to GitHub Secrets
   - Add `RAILWAY_TOKEN` for Railway API access

3. **Update Railway Environment Variables:**
   - Replace `[TO_BE_SET_IN_PHASE_2]` with actual secret key
   - Update `ALLOWED_HOSTS` with actual Railway domain
   - Update `CORS_ALLOWED_ORIGINS` with actual Cloudflare Pages URL

4. **Create Backend Files:**
   - `backend/railway_start.py` - Startup script
   - `backend/Procfile` - Process definitions
   - `backend/railway.toml` - Railway configuration
   - `backend/requirements.txt` - Python dependencies

5. **Unpause Services:**
   - Unpause Django API service
   - Monitor logs for successful migration
   - Unpause Celery Worker service
   - Unpause Celery Beat service

6. **Verify Deployment:**
   - Check health endpoint: `https://django-api.railway.app/api/health/`
   - Verify 200 OK response
   - Check Celery Worker logs for "ready" message
   - Check Celery Beat logs for scheduler startup

---

## Troubleshooting

### PostgreSQL Service Failed to Start

**Possible Causes:**
- Resource limits exceeded
- Region unavailable

**Solution:**
```
1. Check Railway status page: https://railway.statuspage.io/
2. Try different region if available
3. Contact Railway support if persists
```

### Redis Connection Failed

**Possible Causes:**
- Service not fully provisioned
- Network issues

**Solution:**
```
1. Wait 2-3 minutes for provisioning
2. Restart Redis service
3. Check Railway logs for errors
```

### Service Won't Pause

**Possible Causes:**
- Active connections
- Deployment in progress

**Solution:**
```
1. Wait for any active deployments to complete
2. Force stop if needed (Settings > Service > Delete)
3. Recreate service if necessary
```

### Environment Variables Not Updating

**Possible Causes:**
- Service needs restart
- Cache not cleared

**Solution:**
```
1. Restart service after variable changes
2. Or: Trigger new deployment
3. Verify variables saved correctly
```

---

## Security Best Practices

1. **Never commit secrets to code:**
   - Use Railway environment variables
   - Use GitHub Secrets for CI/CD

2. **Use private networking:**
   - Database connections via private network
   - No public database URLs

3. **Rotate credentials regularly:**
   - Django secret key: Every 90 days
   - Database passwords: Automatically rotated by Railway
   - API tokens: Every 90 days

4. **Least privilege access:**
   - Database users with minimal required permissions
   - API keys scoped to specific resources

5. **Monitor logs:**
   - Check Railway logs regularly for errors
   - Set up alerts for critical failures

---

## References

- **Railway Documentation:** https://docs.railway.app/
- **PostgreSQL on Railway:** https://docs.railway.app/databases/postgresql
- **Redis on Railway:** https://docs.railway.app/databases/redis
- **Private Networking:** https://docs.railway.app/reference/private-networking
- **Environment Variables:** https://docs.railway.app/develop/variables

---

**Last Updated:** November 5, 2025
**Phase:** 1 (Infrastructure Setup - No Code Deployment)
**Status:** PostgreSQL and Redis running, Django services paused
