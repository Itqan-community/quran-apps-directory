# Railway Deployment Guide

## Overview
This guide explains how to deploy the Quran Apps Directory on Railway using the Railway CLI.

## Services

### 1. Frontend (Angular)
- **URL**: https://qad-frontend-production.up.railway.app
- **Status**: ✅ Deployed and working
- **Configuration**: Uses Dockerfile with nginx for static file serving

### 2. Backend (Django API)
- **URL**: https://qad-api-production.up.railway.app
- **Status**: ⚠️ Needs deployment
- **Configuration**: Uses Dockerfile with gunicorn

## Deployment Steps

### Frontend Deployment
1. Already deployed at https://qad-frontend-production.up.railway.app
2. Uses nginx for static file serving
3. Supports gzip compression
4. Includes security headers

### Backend Deployment (Pending)
To deploy the backend:

1. Navigate to backend directory:
   ```bash
   cd backend
   ```

2. Initialize Railway service:
   ```bash
   railway init
   ```

3. Set environment variables:
   ```bash
   railway variables set DJANGO_SETTINGS_MODULE=config.settings.production
   railway variables set DEBUG=False
   railway variables set DB_ENGINE=django.db.backends.postgresql
   # ... (set other variables from .env.railway)
   ```

4. Deploy:
   ```bash
   railway up
   ```

## Environment Variables

### Required Backend Variables
- `DJANGO_SETTINGS_MODULE=config.settings.production`
- `SECRET_KEY` (generate new secret)
- `DB_PASSWORD` (PostgreSQL password)
- `ALLOWED_HOSTS` (comma-separated list)
- `CORS_ALLOWED_ORIGINS` (comma-separated list)

### Required Frontend Variables
- `NG_APP_API_BASE_URL` (backend API URL)
- `NG_APP_SITE_DOMAIN` (frontend URL)
- `NG_APP_ENABLE_DARK_MODE=true`
- `NG_APP_ENABLE_ANALYTICS=false`

## Current Configuration

### Frontend Dockerfile
- Multi-stage build
- Uses nginx:alpine for production
- Serves static files from /usr/share/nginx/html
- Health check at /

### Backend Dockerfile
- Multi-stage build
- Python 3.9 base image
- Gunicorn WSGI server
- Health check at /api/categories/

## Troubleshooting

### Frontend Issues
- Check logs: `railway logs`
- Verify nginx configuration in nginx.conf
- Ensure build artifacts are properly copied

### Backend Issues
- Check database connection
- Verify static files are collected
- Check Django settings
- Verify health check endpoint exists

## Next Steps

1. Deploy the backend service separately
2. Set up PostgreSQL database addon on Railway
3. Configure environment variables for backend
4. Test API endpoints
5. Update frontend to use correct API URL

## Notes

- The frontend is currently deployed and working
- The backend service exists but returns 502 errors
- Both services need proper environment variable configuration
- Database connection needs to be established for backend