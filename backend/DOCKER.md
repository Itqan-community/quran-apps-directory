# Docker Setup Guide - Quran Apps Directory Backend

This guide explains how to use Docker for development and deployment of the Quran Apps Directory backend.

## Prerequisites

- Docker 20.10+
- Docker Compose 2.0+
- At least 4GB RAM available for Docker

## Quick Start (Development)

### 1. Start Services

```bash
# Navigate to backend directory
cd backend

# Start all services (db + web)
docker-compose up -d

# Check services are running
docker-compose ps
```

Expected output:
```
CONTAINER ID   IMAGE                           COMMAND                  STATUS
...            quran_apps_web:latest           "python manage.py ..."   Up
...            postgres:15-alpine              "postgres"               Up (healthy)
```

### 2. Access the Application

- **API**: http://localhost:8000/api/v1/
- **API Docs**: http://localhost:8000/api/docs/
- **Admin**: http://localhost:8000/admin/
- **Database**: localhost:5432 (use psql or GUI tools)

### 3. Run Initial Setup

```bash
# Run migrations
docker-compose exec web python manage.py migrate

# Create superuser
docker-compose exec web python manage.py createsuperuser

# Collect static files (production only)
docker-compose exec web python manage.py collectstatic --noinput
```

### 4. View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f web
docker-compose logs -f db
```

## Development Workflow

### Running Tests

```bash
# Run all tests
docker-compose exec web python manage.py test

# Run specific test class
docker-compose exec web python manage.py test apps.tests.AppListAPITest

# Run with coverage
docker-compose exec web coverage run --source='.' manage.py test
docker-compose exec web coverage report
```

### Code Quality Checks

```bash
# Format code with Black
docker-compose exec web black .

# Sort imports with isort
docker-compose exec web isort .

# Lint with Ruff
docker-compose exec web ruff check .

# Type check with mypy
docker-compose exec web mypy .

# Run pre-commit hooks
docker-compose exec web pre-commit run --all-files
```

### Database Access

```bash
# Connect with psql
docker-compose exec db psql -U postgres -d quran_apps_db

# Dump database
docker-compose exec db pg_dump -U postgres -d quran_apps_db > backup.sql

# Restore database
docker-compose exec -T db psql -U postgres -d quran_apps_db < backup.sql
```

### Debug Python Shell

```bash
docker-compose exec web python manage.py shell
```

## Stopping Services

```bash
# Stop all services (keep data)
docker-compose stop

# Stop and remove containers (keep volumes)
docker-compose down

# Remove everything including volumes (clean slate)
docker-compose down -v
```

## Production Deployment

### 1. Build Production Image

```bash
# From backend directory
docker build -f Dockerfile --target production -t quran-apps:latest .
```

### 2. Use Production Compose File

Create `docker-compose.prod.yml`:

```yaml
version: '3.8'
services:
  web:
    image: quran-apps:latest
    container_name: quran_apps_web_prod
    restart: always
    environment:
      DEBUG: "False"
      DJANGO_SETTINGS_MODULE: config.settings.production
      # Add production secrets via environment or .env.prod
    ports:
      - "8000:8000"
    depends_on:
      - db

  db:
    # Same as development, but with:
    restart: always
    # And backup volumes
```

### 3. Deploy with Gunicorn

```bash
docker run -d \
  -e DJANGO_SETTINGS_MODULE=config.settings.production \
  -p 8000:8000 \
  --name quran-apps-prod \
  quran-apps:latest
```

## Environment Variables

### Development (.env or docker-compose.yml)

```
DEBUG=True
DJANGO_SETTINGS_MODULE=config.settings.local
DB_HOST=db
DB_PORT=5432
DB_NAME=quran_apps_db
DB_USER=postgres
DB_PASSWORD=postgres123
SECRET_KEY=dev-key-change-in-production
ALLOWED_HOSTS=localhost,127.0.0.1
```

### Production (.env.prod)

```
DEBUG=False
DJANGO_SETTINGS_MODULE=config.settings.production
DB_HOST=secure-db-host
DB_PORT=5432
DB_NAME=quran_apps_prod
DB_USER=prod_user
DB_PASSWORD=<SECURE_PASSWORD>
SECRET_KEY=<SECURE_KEY>
ALLOWED_HOSTS=quran-apps.example.com
CSRF_TRUSTED_ORIGINS=https://quran-apps.example.com
```

## Troubleshooting

### Services Won't Start

```bash
# Check logs
docker-compose logs -f

# Restart services
docker-compose restart

# Full rebuild
docker-compose down -v
docker-compose up --build
```

### Database Connection Issues

```bash
# Check if database is healthy
docker-compose exec db pg_isready -U postgres

# View database logs
docker-compose logs db

# Reset database
docker-compose down -v
docker-compose up -d db
docker-compose exec web python manage.py migrate
```

### Port Conflicts

If port 8000 or 5432 is already in use:

```bash
# Edit docker-compose.yml ports section:
# Change "8000:8000" to "8080:8000"
# Change "5432:5432" to "5433:5432"

docker-compose up -d
```

### Build Failures

```bash
# Clear Docker cache
docker builder prune

# Rebuild from scratch
docker-compose build --no-cache

docker-compose up
```

## Useful Commands

```bash
# List all Docker images
docker images | grep quran-apps

# View container stats
docker stats

# Interactive bash in container
docker-compose exec web bash

# Run single command in container
docker-compose exec web ls -la

# Monitor real-time logs
docker-compose logs -f --tail=100

# Backup database
docker-compose exec db pg_dump -U postgres quran_apps_db | gzip > db_backup.sql.gz

# Health status
docker-compose exec db pg_isready -U postgres
```

## Performance Tuning

### Increase Worker Count (Production)

In `Dockerfile`, modify:

```dockerfile
CMD ["gunicorn", "--bind", "0.0.0.0:8000", "--workers", "8", ...]
```

### Enable Redis Caching

Uncomment Redis service in `docker-compose.yml`:

```yaml
redis:
  image: redis:7-alpine
  restart: unless-stopped
  ports:
    - "6379:6379"
```

Update settings to use Redis:

```python
CACHES = {
    'default': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': 'redis://redis:6379/1',
    }
}
```

## CI/CD Integration

### GitHub Actions Example

```yaml
- name: Run Docker tests
  run: |
    docker-compose -f docker-compose.test.yml up --abort-on-container-exit
```

### GitLab CI Example

```yaml
test:
  image: docker/compose:latest
  services:
    - docker:dind
  script:
    - docker-compose up --abort-on-container-exit
```

## Next Steps

- [ ] Set up monitoring (Prometheus, Grafana)
- [ ] Configure logging (ELK stack, Loki)
- [ ] Set up backup automation
- [ ] Configure SSL/TLS certificates
- [ ] Set up health checks and alerts

---

For more information, see the [Django documentation](https://docs.djangoproject.com/en/5.2/howto/deployment/wsgi/gunicorn/) and [Docker documentation](https://docs.docker.com/).
