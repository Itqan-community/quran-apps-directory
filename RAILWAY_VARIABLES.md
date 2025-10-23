# Railway Environment Variables Reference

Quick reference for setting up environment variables in Railway Dashboard for each deployment environment.

## Table of Contents

- [Production Environment](#production-environment)
- [Staging Environment](#staging-environment)
- [Development Environment](#development-environment)
- [Shared Variables](#shared-variables)
- [Secret Generation](#secret-generation)

---

## Production Environment

**Branch:** `main`
**Domain:** https://quran-apps.itqan.dev

### Backend Service Variables

```
# Core Configuration
ENVIRONMENT=production
DJANGO_SETTINGS_MODULE=config.settings.production
DEBUG=False
SECRET_KEY=<generate-below>

# Database
DB_ENGINE=django.db.backends.postgresql
DB_NAME=quran_apps_db
DB_USER=postgres
DB_PASSWORD=<postgres-password>
DB_HOST=quran-postgres
DB_PORT=5432
DB_SSLMODE=prefer

# Security
ALLOWED_HOSTS=quran-apps.itqan.dev,www.quran-apps.itqan.dev
CORS_ALLOWED_ORIGINS=https://quran-apps.itqan.dev,https://www.quran-apps.itqan.dev
SECURE_SSL_REDIRECT=True
SESSION_COOKIE_SECURE=True
CSRF_COOKIE_SECURE=True
SECURE_HSTS_SECONDS=31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS=True
SECURE_HSTS_PRELOAD=True

# Email (Optional)
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.sendgrid.net
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=apikey
EMAIL_HOST_PASSWORD=<sendgrid-api-key>
DEFAULT_FROM_EMAIL=noreply@quran-apps.itqan.dev

# Logging & Monitoring
LOG_LEVEL=INFO
SENTRY_DSN=<optional-sentry-dsn>

# Gunicorn
GUNICORN_WORKERS=4
GUNICORN_TIMEOUT=30
```

### Frontend Service Variables

```
NODE_ENV=production
NG_APP_API_BASE_URL=https://quran-apps.itqan.dev/api
NG_APP_SITE_DOMAIN=https://quran-apps.itqan.dev
NG_APP_ENABLE_DARK_MODE=true
NG_APP_ENABLE_ANALYTICS=false
NG_APP_FORCE_HTTPS=true
NG_APP_CONTACT_EMAIL=connect@itqan.dev
NG_APP_TWITTER_HANDLE=itqan_community
NG_APP_GITHUB_ORG=Itqan-community
```

### Database Service Variables

```
POSTGRES_DB=quran_apps_db
POSTGRES_USER=postgres
POSTGRES_PASSWORD=<strong-secure-password>
POSTGRES_INITDB_ARGS=--encoding=UTF8 --locale=C
```

---

## Staging Environment

**Branch:** `staging`
**Domain:** https://staging.quran-apps.itqan.dev

### Backend Service Variables

```
# Core Configuration
ENVIRONMENT=staging
DJANGO_SETTINGS_MODULE=config.settings.production
DEBUG=False
SECRET_KEY=<different-from-production>

# Database (same as production or separate staging DB)
DB_ENGINE=django.db.backends.postgresql
DB_NAME=quran_apps_staging_db
DB_USER=postgres
DB_PASSWORD=<postgres-password>
DB_HOST=quran-postgres-staging
DB_PORT=5432
DB_SSLMODE=prefer

# Security
ALLOWED_HOSTS=staging.quran-apps.itqan.dev,www.staging.quran-apps.itqan.dev
CORS_ALLOWED_ORIGINS=https://staging.quran-apps.itqan.dev,https://www.staging.quran-apps.itqan.dev
SECURE_SSL_REDIRECT=True
SESSION_COOKIE_SECURE=True
CSRF_COOKIE_SECURE=True

# Email (Staging - Console backend is OK)
EMAIL_BACKEND=django.core.mail.backends.console.EmailBackend

# Logging
LOG_LEVEL=DEBUG
DJANGO_LOG_LEVEL=DEBUG

# Gunicorn
GUNICORN_WORKERS=2
GUNICORN_TIMEOUT=30
```

### Frontend Service Variables

```
NODE_ENV=production
NG_APP_API_BASE_URL=https://staging.quran-apps.itqan.dev/api
NG_APP_SITE_DOMAIN=https://staging.quran-apps.itqan.dev
NG_APP_ENABLE_DARK_MODE=true
NG_APP_ENABLE_ANALYTICS=false
NG_APP_FORCE_HTTPS=true
```

### Database Service Variables

```
POSTGRES_DB=quran_apps_staging_db
POSTGRES_USER=postgres
POSTGRES_PASSWORD=<staging-password>
POSTGRES_INITDB_ARGS=--encoding=UTF8 --locale=C
```

---

## Development Environment

**Branch:** `develop`
**Domain:** https://dev.quran-apps.itqan.dev

### Backend Service Variables

```
# Core Configuration
ENVIRONMENT=development
DJANGO_SETTINGS_MODULE=config.settings.development
DEBUG=True
SECRET_KEY=<development-key>

# Database
DB_ENGINE=django.db.backends.postgresql
DB_NAME=quran_apps_dev_db
DB_USER=postgres
DB_PASSWORD=<postgres-password>
DB_HOST=quran-postgres-dev
DB_PORT=5432
DB_SSLMODE=disable

# Security (relaxed for development)
ALLOWED_HOSTS=dev.quran-apps.itqan.dev,localhost,127.0.0.1
CORS_ALLOWED_ORIGINS=https://dev.quran-apps.itqan.dev,http://localhost:4200,http://localhost:3000
SECURE_SSL_REDIRECT=False
SESSION_COOKIE_SECURE=False
CSRF_COOKIE_SECURE=False

# Email (Console for development)
EMAIL_BACKEND=django.core.mail.backends.console.EmailBackend

# Logging
LOG_LEVEL=DEBUG
DJANGO_LOG_LEVEL=DEBUG
DB_LOG_LEVEL=DEBUG

# Gunicorn
GUNICORN_WORKERS=2
GUNICORN_TIMEOUT=60

# Optional: Create superuser
CREATE_SUPERUSER=true
LOAD_INITIAL_DATA=true
```

### Frontend Service Variables

```
NODE_ENV=development
NG_APP_API_BASE_URL=https://dev.quran-apps.itqan.dev/api
NG_APP_SITE_DOMAIN=https://dev.quran-apps.itqan.dev
NG_APP_ENABLE_DARK_MODE=true
NG_APP_ENABLE_ANALYTICS=false
NG_APP_FORCE_HTTPS=false
NG_APP_DEBUG=true
```

### Database Service Variables

```
POSTGRES_DB=quran_apps_dev_db
POSTGRES_USER=postgres
POSTGRES_PASSWORD=<dev-password>
POSTGRES_INITDB_ARGS=--encoding=UTF8 --locale=C
```

---

## Shared Variables

Variables that should be configured for ALL environments:

### All Backend Services

```
# Python Configuration
PYTHONUNBUFFERED=1
PYTHONDONTWRITEBYTECODE=1

# Database Connection Pooling
DB_CONN_MAX_AGE=600

# Static Files (WhiteNoise)
WHITENOISE_COMPRESS=True
WHITENOISE_COMPRESSION_QUALITY=85
WHITENOISE_AUTOREFRESH=False
```

### All Frontend Services

```
# Angular Common Settings
NG_APP_DEFAULT_LANG=en
NG_APP_SUPPORTED_LANGS=en,ar
NG_APP_ENABLE_SERVICE_WORKER=true
NG_APP_CACHE_ENABLED=true
```

---

## Secret Generation

### Generate Django SECRET_KEY

```bash
# Option 1: Using Django CLI
python -c 'from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())'

# Option 2: Using Python
python -c 'import secrets; print(secrets.token_urlsafe(50))'

# Option 3: Using openssl
openssl rand -base64 32
```

**Copy the output and paste into Railway Dashboard → Backend Service → Variables → SECRET_KEY**

### Generate PostgreSQL Password

```bash
# Option 1: Using openssl
openssl rand -base64 32

# Option 2: Using Python
python -c 'import secrets; print(secrets.token_urlsafe(32))'

# Option 3: Using Linux
head -c 32 /dev/urandom | base64
```

**Copy the output and use for:**
- `DB_PASSWORD` (Backend Service)
- `POSTGRES_PASSWORD` (Database Service)

---

## Setting Variables in Railway Dashboard

1. **Log into Railway Dashboard:** https://dashboard.railway.app
2. **Select Project:** Quran Apps Directory
3. **Select Service:** Backend, Frontend, or Database
4. **Click "Variables"** tab
5. **Add Variables:**
   - Click "New Variable"
   - Enter variable name and value
   - Click "Add"
6. **Repeat** for all required variables
7. **Redeploy** service: Services → [Service Name] → Deploy → Trigger Deploy

## Setting Variables via Railway CLI

```bash
# Login to Railway
railway login

# Link to project
railway link

# Set variables
railway variables set DJANGO_SETTINGS_MODULE=config.settings.production
railway variables set DEBUG=False
railway variables set SECRET_KEY='your-secret-key'

# View all variables
railway variables list

# View specific variable
railway variables get SECRET_KEY
```

---

## Environment Variable Naming Conventions

| Prefix | Scope | Example |
|--------|-------|---------|
| `NG_APP_` | Angular Frontend | `NG_APP_API_BASE_URL` |
| `DB_` | Database Connection | `DB_HOST`, `DB_PORT` |
| `POSTGRES_` | PostgreSQL Service | `POSTGRES_USER`, `POSTGRES_PASSWORD` |
| `DJANGO_` | Django Core | `DJANGO_SETTINGS_MODULE` |
| `EMAIL_` | Email Configuration | `EMAIL_HOST`, `EMAIL_PORT` |
| `GUNICORN_` | Gunicorn Server | `GUNICORN_WORKERS`, `GUNICORN_TIMEOUT` |
| `SENTRY_` | Error Tracking | `SENTRY_DSN` |
| (none) | General | `DEBUG`, `ENVIRONMENT`, `SECRET_KEY` |

---

## Common Mistakes & Fixes

### ❌ Database Connection Failed

**Cause:** `DB_HOST` is incorrect

**Fix:** Use Railway's internal DNS: `quran-postgres` (not IP address)

### ❌ CORS Errors in Frontend

**Cause:** `CORS_ALLOWED_ORIGINS` doesn't match frontend domain

**Fix:** Ensure exact match including protocol:
```
CORS_ALLOWED_ORIGINS=https://quran-apps.itqan.dev
```

### ❌ Static Files 404

**Cause:** `WHITENOISE_COMPRESS=False` or `STATIC_ROOT` not set

**Fix:** Ensure both are configured and run migrations

### ❌ SECRET_KEY Not Set

**Cause:** Missing `SECRET_KEY` environment variable

**Fix:** Generate and set in Railway Dashboard

### ❌ API Calls Fail in Frontend

**Cause:** `NG_APP_API_BASE_URL` incorrect

**Fix:** Must be absolute URL: `https://quran-apps.itqan.dev/api`

---

## Testing Variables

After setting variables, test with Railway CLI:

```bash
# SSH into backend service
railway service backend
railway shell

# Test Django settings
python manage.py shell
>>> from django.conf import settings
>>> print(settings.DEBUG)
False
>>> print(settings.ALLOWED_HOSTS)
['quran-apps.itqan.dev', ...]
```

---

**Last Updated:** October 23, 2024
**Environments:** Production, Staging, Development
**Platform:** Railway.app
