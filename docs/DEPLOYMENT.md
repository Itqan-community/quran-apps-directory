# Deployment Guide

## Overview

Deploy the Quran Apps Directory backend to production using Railway, Digital Ocean, or Docker.

## Prerequisites

- Railway/Digital Ocean account (or your preferred hosting)
- PostgreSQL database
- Domain name (optional)
- SSL certificate (included with most hosting providers)

## Option 1: Railway (Recommended for Beginners)

### 1. Prepare Your Code

```bash
# Ensure your project is on GitHub
git add .
git commit -m "Ready for deployment"
git push origin main
```

### 2. Create Railway Project

1. Go to [railway.app](https://railway.app)
2. Sign up/login with GitHub
3. Click "New Project" → "Deploy from GitHub repo"
4. Select your repository
5. Railway will detect Django automatically

### 3. Configure Environment Variables

In Railway dashboard, add these environment variables:

```bash
# Django Settings
SECRET_KEY=your-very-secure-secret-key
DEBUG=False
ALLOWED_HOSTS=your-app-name.railway.app

# Database (Railway provides PostgreSQL)
DATABASE_URL=postgresql://username:password@host:port/database

# Email (optional)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-app-password
```

### 4. Deploy

1. Click "Deploy" button
2. Railway will build and deploy your app
3. Your app will be available at `your-app-name.railway.app`

## Option 2: Digital Ocean (Droplet)

### 1. Create Droplet

1. Go to Digital Ocean dashboard
2. Click "Create" → "Droplets"
3. Choose Ubuntu 22.04
4. Select $6/month plan (minimum)
5. Add SSH key
6. Create Droplet

### 2. Connect to Server

```bash
ssh root@your_droplet_ip
```

### 3. Install Dependencies

```bash
# Update system
apt update && apt upgrade -y

# Install Python and dependencies
apt install python3 python3-pip python3-venv postgresql postgresql-contrib nginx certbot python3-certbot-nginx -y

# Install Docker (optional but recommended)
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
```

### 4. Setup Database

```bash
# Switch to postgres user
sudo -u postgres psql

# Create database and user
CREATE DATABASE quran_apps_directory;
CREATE USER quran_apps WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE quran_apps_directory TO quran_apps;
\q
```

### 5. Deploy with Docker

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  web:
    build: .
    ports:
      - "8000:8000"
    environment:
      - DEBUG=False
      - DATABASE_URL=postgresql://quran_apps:your_password@db:5432/quran_apps_directory
      - SECRET_KEY=your-secret-key
    depends_on:
      - db

  db:
    image: postgres:15
    environment:
      POSTGRES_DB: quran_apps_directory
      POSTGRES_USER: quran_apps
      POSTGRES_PASSWORD: your_password
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

Create `Dockerfile`:

```dockerfile
FROM python:3.11

WORKDIR /app

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["gunicorn", "--bind", "0.0.0.0:8000", "config.wsgi:application"]
```

### 6. Run Application

```bash
# Clone your repository
git clone your-repository-url
cd your-repo

# Run with Docker Compose
docker-compose up -d

# Run migrations
docker-compose exec web python manage.py migrate

# Create superuser
docker-compose exec web python manage.py createsuperuser
```

### 7. Setup Nginx

Create `/etc/nginx/sites-available/quran-apps`:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable site:
```bash
ln -s /etc/nginx/sites-available/quran-apps /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx
```

### 8. Setup SSL with Let's Encrypt

```bash
certbot --nginx -d your-domain.com
```

## Option 3: Heroku (Alternative)

### 1. Install Heroku CLI

```bash
# macOS
brew tap heroku/brew && brew install heroku

# Ubuntu
sudo snap install heroku --classic
```

### 2. Login to Heroku

```bash
heroku login
```

### 3. Create Heroku App

```bash
heroku create your-app-name
```

### 4. Add PostgreSQL

```bash
heroku addons:create heroku-postgresql:hobby-dev
```

### 5. Configure Environment Variables

```bash
heroku config:set DEBUG=False
heroku config:set SECRET_KEY=your-secret-key
```

### 6. Deploy

```bash
git push heroku main
heroku run python manage.py migrate
```

## Production Settings

### Django Settings (`config/settings/production.py`)

```python
from .base import *

DEBUG = False
ALLOWED_HOSTS = ['your-domain.com', 'www.your-domain.com']

# Security
SECURE_SSL_REDIRECT = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True

# Database
import dj_database_url
DATABASES['default'] = dj_database_url.parse(os.environ.get('DATABASE_URL'))

# Static files
STATIC_ROOT = 'staticfiles'
```

### Create `Procfile` for Heroku

```
web: gunicorn config.wsgi:application
```

## Environment Variables Checklist

### Required Variables
- `SECRET_KEY` - Django secret key
- `DEBUG=False` - Production setting
- `ALLOWED_HOSTS` - Your domain(s)
- `DATABASE_URL` - Database connection string

### Optional Variables
- `EMAIL_HOST` - SMTP server for emails
- `EMAIL_HOST_USER` - SMTP username
- `EMAIL_HOST_PASSWORD` - SMTP password
- `REDIS_URL` - Redis connection for caching

## Monitoring and Logging

### Setup Logging

```python
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'file': {
            'level': 'INFO',
            'class': 'logging.FileHandler',
            'filename': '/var/log/django/django.log',
        },
    },
    'root': {
        'handlers': ['file'],
        'level': 'INFO',
    },
}
```

### Health Check Endpoint

```python
# urls.py
from django.http import JsonResponse

def health_check(request):
    return JsonResponse({'status': 'healthy'})

urlpatterns = [
    path('health/', health_check),
    # ... other urls
]
```

## Backup Strategy

### Database Backups

```bash
# Manual backup
pg_dump -h host -U username -d database > backup.sql

# Automated backup (add to crontab)
0 2 * * * pg_dump -h host -U username -d database > /backups/backup_$(date +\%Y\%m\%d).sql
```

### File Backups

```bash
# Backup media files
rsync -av /path/to/media/ /backups/media/
```

## Troubleshooting

### Common Issues

1. **Database Connection Error**
   - Check DATABASE_URL format
   - Verify database is running
   - Check firewall settings

2. **Static Files Not Loading**
   - Run `collectstatic`
   - Check STATIC_URL and STATIC_ROOT settings
   - Verify Nginx configuration

3. **502 Bad Gateway**
   - Check if Django app is running
   - Verify Nginx configuration
   - Check error logs

### Check Logs

```bash
# Docker logs
docker-compose logs web

# System logs
tail -f /var/log/nginx/error.log
tail -f /var/log/django/django.log

# Heroku logs
heroku logs --tail
```

## Performance Optimization

### Basic Optimizations

1. **Enable Caching**
   ```python
   CACHES = {
       'default': {
           'BACKEND': 'django.core.cache.backends.redis.RedisCache',
           'LOCATION': 'redis://localhost:6379/1',
       }
   }
   ```

2. **Database Indexes**
   ```python
   class App(models.Model):
       name = models.CharField(max_length=200, db_index=True)
       created_at = models.DateTimeField(auto_now_add=True, db_index=True)
   ```

3. **Use Gunicorn Workers**
   ```bash
   gunicorn config.wsgi:application --workers 3
   ```

## Scaling Considerations

### When to Scale Up

1. **High Traffic** - > 1000 concurrent users
2. **Slow Response Times** - > 500ms average
3. **Database Load** - > 80% CPU usage

### Scaling Options

1. **Vertical Scaling** - Increase server resources
2. **Horizontal Scaling** - Add more app servers
3. **Database Scaling** - Read replicas, sharding
4. **CDN** - Distribute static files globally

---

**Deployment Checklist:**
- [ ] Environment variables configured
- [ ] Database connection working
- [ ] Static files collected
- [ ] SSL certificate installed
- [ ] Health check endpoint working
- [ ] Backup strategy implemented
- [ ] Monitoring configured