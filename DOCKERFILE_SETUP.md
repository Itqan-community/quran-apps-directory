# Dockerfile Setup Guide

Both **frontend** (Angular) and **backend** (Django) services now use **multi-stage Dockerfiles** for consistent containerization on Railway.

---

## Project Structure

```
quran-apps-directory/
├── frontend/
│   ├── Dockerfile              ← Angular frontend (NEW)
│   ├── package.json
│   └── src/
├── backend/
│   ├── Dockerfile              ← Django backend
│   ├── requirements/
│   │   ├── base.txt
│   │   ├── local.txt
│   │   └── production.txt
│   └── manage.py
├── railway.json                ← Updated to use Dockerfiles
└── DOCKERFILE_SETUP.md         ← This file
```

---

## Frontend Dockerfile (Angular)

**Location:** `frontend/Dockerfile`

### Build Stages

#### Stage 1: Base
- **Image:** `node:20-alpine`
- **Purpose:** Common setup for all stages
- **Includes:**
  - Environment variables (Node 4GB memory limit)
  - System dependencies (dumb-init, curl)
  - App user creation (appuser:1001)
  - Workspace setup

#### Stage 2: Development
- **Target:** Not used in production
- **Purpose:** Local development
- **Includes:**
  - Full dependencies (--include=dev)
  - Development server via `npm run dev`
  - Health check for http://localhost:3000

#### Stage 3: Production (Used by Railway)
- **Target:** `production` ← Railway builds this
- **Purpose:** Optimized production build
- **Includes:**
  - Production dependencies only (--only=production)
  - Angular build: `npm run build:prod`
  - Serve static files with `serve` package
  - Health check via curl

### Production Build Process

```
Stage 1 (Base)
  ├─ Node 20 Alpine image
  ├─ System dependencies
  └─ App user

Stage 3 (Production)
  ├─ Install production dependencies
  ├─ Copy source code
  ├─ Build Angular: npm run build:prod
  │  └─ Creates dist/browser/
  ├─ Install serve package globally
  ├─ Change ownership to appuser
  └─ Start command: serve -s dist/browser -l ${PORT:-3000}
```

### Key Features

| Feature | Value |
|---------|-------|
| **Base Image** | node:20-alpine |
| **Build Output** | dist/browser/ |
| **Start Command** | serve -s dist/browser -l ${PORT:-3000} |
| **Port** | 3000 (configurable via $PORT) |
| **Health Check** | curl http://localhost:${PORT:-3000} |
| **App User** | appuser (UID: 1001) |
| **Memory Limit** | 4GB (NODE_OPTIONS) |

---

## Backend Dockerfile (Django)

**Location:** `backend/Dockerfile`

### Build Stages

#### Stage 1: Base
- **Image:** `python:3.9-slim`
- **Purpose:** Common setup
- **Includes:**
  - Environment variables (Python optimization)
  - System dependencies (PostgreSQL client)
  - App user creation (appuser)

#### Stage 2: Development
- **Purpose:** Local development
- **Includes:**
  - Development dependencies from requirements/local.txt
  - Django dev server: `python manage.py runserver`

#### Stage 3: Production (Used by Railway)
- **Target:** `production` ← Railway builds this
- **Purpose:** Optimized production deployment
- **Includes:**
  - Production dependencies only (requirements/production.txt)
  - Static file collection
  - Gunicorn WSGI server
  - Health check

### Production Build Process

```
Stage 1 (Base)
  ├─ Python 3.9 Slim image
  ├─ System dependencies
  └─ App user

Stage 3 (Production)
  ├─ Install production dependencies
  ├─ Copy source code
  ├─ Collect static files
  ├─ Change ownership to appuser
  └─ Start command: gunicorn --bind 0.0.0.0:8000 ...
```

### Key Features

| Feature | Value |
|---------|-------|
| **Base Image** | python:3.9-slim |
| **WSGI Server** | Gunicorn (4 workers) |
| **Start Command** | gunicorn --bind 0.0.0.0:8000 ... |
| **Port** | 8000 |
| **Health Check** | curl http://localhost:8000/api/categories/ |
| **App User** | appuser (UID: postgres) |
| **Dependencies** | requirements/production.txt |

---

## Railway Configuration

**Location:** `railway.json`

### Frontend Service Configuration

```json
{
  "id": "quran-frontend",
  "name": "Angular Frontend",
  "serviceType": "dockerfile",
  "dockerfilePath": "frontend/Dockerfile",
  "dockerfileTarget": "production",
  "rootDirectory": ".",
  "port": 3000,
  "environment": {
    "PORT": "3000",
    "NODE_ENV": "production",
    "NG_APP_API_BASE_URL": "https://qad-api-production.up.railway.app/api",
    "NG_APP_SITE_DOMAIN": "https://qad-frontend-production.up.railway.app",
    "NG_APP_ENABLE_DARK_MODE": "true",
    "NG_APP_ENABLE_ANALYTICS": "false",
    "NG_APP_FORCE_HTTPS": "true"
  }
}
```

**Key Settings:**
- `serviceType: "dockerfile"` ← Uses Dockerfile
- `dockerfileTarget: "production"` ← Builds production stage
- `rootDirectory: "."` ← Build context from project root
- `port: 3000` ← Exposed port

### Backend Service Configuration

```json
{
  "id": "quran-backend-api",
  "name": "Django API (Backend)",
  "serviceType": "dockerfile",
  "dockerfilePath": "backend/Dockerfile",
  "dockerfileTarget": "production",
  "rootDirectory": "backend",
  "buildCommand": "cd /app && python manage.py collectstatic --noinput",
  "startCommand": "gunicorn --bind 0.0.0.0:8000 --workers 4 --worker-class sync --timeout 30 --access-logfile - --error-logfile - config.wsgi:application",
  "port": 8000,
  "environment": {
    // ... database and security settings
  },
  "depends": [
    {
      "id": "quran-postgres",
      "condition": "service_healthy"
    }
  ]
}
```

**Key Settings:**
- `serviceType: "dockerfile"` ← Uses Dockerfile
- `dockerfileTarget: "production"` ← Builds production stage
- `rootDirectory: "backend"` ← Build context from backend/
- `buildCommand` ← Static file collection
- `depends` ← Waits for PostgreSQL to be healthy

---

## Build Process on Railway

### Trigger
When you push to `main`, `staging`, or `develop`:

```bash
git push origin develop
```

### Build Steps for Each Service

**Frontend (qad-frontend):**
1. Railway detects Dockerfile at `frontend/Dockerfile`
2. Builds target `production`
3. Multi-stage build:
   - Base stage: Sets up Node environment
   - Production stage: Installs deps, builds Angular, installs serve
4. Final image contains: dist/browser/ + serve package
5. Start: `serve -s dist/browser -l 3000`

**Backend (qad-backend-api):**
1. Railway detects Dockerfile at `backend/Dockerfile`
2. Waits for PostgreSQL health check
3. Builds target `production`
4. Multi-stage build:
   - Base stage: Sets up Python environment
   - Production stage: Installs deps, collects static files
5. Final image contains: Django app + Gunicorn
6. Start: `gunicorn --bind 0.0.0.0:8000 ...`

---

## Dockerfile Best Practices Used

### Multi-Stage Builds
✅ Separates build tools from runtime
- Smaller final images
- Build dependencies not in production
- Development tools excluded from production

### Security
✅ Non-root user (appuser)
- Reduced attack surface
- Cannot modify system files
- Proper file ownership

✅ Alpine base images
- Smaller attack surface
- Security-focused distribution
- Regular updates

### Optimization
✅ `.dockerignore` considerations
- Node modules not copied
- Dependencies installed fresh
- Uses npm ci for consistency

✅ Layer caching
- Package files copied first
- Source code copied after
- Faster rebuilds when code changes

### Health Checks
✅ Production health checks
- Automatic service healing
- Railway monitors service health
- Can trigger restarts if unhealthy

---

## Local Development

### Build Locally

```bash
# Build frontend (development stage)
docker build -f frontend/Dockerfile --target development -t qad-frontend:dev .

# Build frontend (production stage)
docker build -f frontend/Dockerfile --target production -t qad-frontend:prod .

# Build backend (production stage)
docker build -f backend/Dockerfile --target production -t qad-api:prod backend/
```

### Run Locally

```bash
# Run frontend dev
docker run -it -p 3000:3000 qad-frontend:dev

# Run frontend prod
docker run -it -p 3000:3000 qad-frontend:prod

# Run backend
docker run -it -p 8000:8000 \
  -e DB_HOST=localhost \
  -e DB_PASSWORD=yourpassword \
  qad-api:prod
```

---

## Troubleshooting

### Frontend Build Issues

#### Issue: npm ci fails
**Solution:** Ensure package-lock.json exists
```bash
npm install
```

#### Issue: "dist/browser not found"
**Solution:** Verify build command in package.json
```bash
npm run build:prod  # Should create dist/browser/
```

#### Issue: serve package not found
**Solution:** Dockerfile installs it globally in production stage

### Backend Build Issues

#### Issue: requirements.txt not found
**Solution:** Use requirements/production.txt (or adjust path)

#### Issue: Static files not collecting
**Solution:** Check DJANGO_SETTINGS_MODULE environment variable

#### Issue: Database connection fails
**Solution:** Health check waits for PostgreSQL - verify DB_HOST is correct

---

## Deployment Checklist

Before deploying:

- ✅ Both Dockerfiles present and syntactically valid
- ✅ railway.json configured for both services
- ✅ Environment variables set in Railway dashboard
- ✅ Database credentials configured
- ✅ Health checks defined
- ✅ Dependencies in requirements.txt or package.json
- ✅ Build commands correct
- ✅ Start commands correct

---

## Performance Metrics

### Frontend Build Time (typical)
- Base stage: ~2-3 minutes (Node installation)
- Production stage: ~3-5 minutes (npm install + npm build)
- **Total:** 5-8 minutes

### Backend Build Time (typical)
- Base stage: ~2-3 minutes (Python installation)
- Production stage: ~2-3 minutes (pip install + collectstatic)
- **Total:** 4-6 minutes

### Image Sizes (typical)
- Frontend: ~200-300 MB
- Backend: ~400-500 MB

---

## Related Files

- `frontend/Dockerfile` - Angular frontend containerization
- `backend/Dockerfile` - Django backend containerization
- `railway.json` - Railway deployment configuration
- `RAILWAY_VALIDATION_REPORT.md` - Service configuration validation
- `RAILWAY_VARIABLES.md` - Environment variable reference

---

## Next Steps

1. **Push to develop branch:**
   ```bash
   git push origin develop
   ```

2. **Monitor Railway build:**
   ```bash
   railway logs
   ```

3. **Verify deployment:**
   - Frontend: https://qad-frontend-production.up.railway.app
   - Backend API: https://qad-api-production.up.railway.app/api/

4. **Check health:**
   ```bash
   railway service qad-frontend
   railway logs

   railway service qad-api
   railway logs
   ```

---

**Last Updated:** 2025-10-23
**Dockerfiles:** Both frontend and backend
**Platform:** Railway.app
