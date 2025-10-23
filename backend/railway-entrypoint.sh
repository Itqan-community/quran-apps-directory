#!/bin/bash
#
# Railway Deployment Entrypoint Script for Django Backend
#
# This script runs database migrations and collects static files
# before starting the Gunicorn web server.
#
# Usage: railway-entrypoint.sh
#

set -e  # Exit on error

echo "[Railway] Starting Django backend deployment..."

# ===== Environment Verification =====
echo "[Railway] Verifying environment..."

if [ -z "$DJANGO_SETTINGS_MODULE" ]; then
  echo "[ERROR] DJANGO_SETTINGS_MODULE not set. Exiting."
  exit 1
fi

if [ -z "$SECRET_KEY" ]; then
  echo "[ERROR] SECRET_KEY not set. Exiting."
  exit 1
fi

echo "[Railway] Environment: $ENVIRONMENT"
echo "[Railway] Django Settings: $DJANGO_SETTINGS_MODULE"
echo "[Railway] Debug Mode: $DEBUG"

# ===== Database Connection Check =====
echo "[Railway] Checking database connection..."
python -c "
import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', os.environ.get('DJANGO_SETTINGS_MODULE'))
django.setup()
from django.db import connection
try:
    connection.ensure_connection()
    print('[Railway] ✓ Database connection successful')
except Exception as e:
    print(f'[ERROR] Database connection failed: {e}')
    exit(1)
"

# ===== Database Migrations =====
echo "[Railway] Running database migrations..."
python manage.py migrate --noinput --verbosity 2

if [ $? -eq 0 ]; then
  echo "[Railway] ✓ Migrations completed successfully"
else
  echo "[ERROR] Migrations failed. Exiting."
  exit 1
fi

# ===== Collect Static Files =====
echo "[Railway] Collecting static files..."
python manage.py collectstatic --noinput --verbosity 2

if [ $? -eq 0 ]; then
  echo "[Railway] ✓ Static files collected successfully"
else
  echo "[WARNING] Static files collection had issues, but continuing..."
fi

# ===== Create Superuser (Optional - only for development/staging) =====
if [ "$ENVIRONMENT" != "production" ] && [ "$CREATE_SUPERUSER" = "true" ]; then
  echo "[Railway] Creating superuser..."
  python manage.py shell << END
from django.contrib.auth.models import User
if not User.objects.filter(username='admin').exists():
    User.objects.create_superuser('admin', 'admin@example.com', 'admin123')
    print('[Railway] ✓ Superuser created: admin / admin123')
else:
    print('[Railway] Superuser already exists')
END
fi

# ===== Load Initial Data (Optional) =====
if [ "$LOAD_INITIAL_DATA" = "true" ]; then
  echo "[Railway] Loading initial data..."
  python manage.py loaddata initial_data.json 2>/dev/null || echo "[Railway] No initial data fixture found"
fi

# ===== Print Configuration Summary =====
echo ""
echo "=========================================="
echo "Django Backend Ready for Production"
echo "=========================================="
echo "Environment:    $ENVIRONMENT"
echo "Debug Mode:     $DEBUG"
echo "Settings:       $DJANGO_SETTINGS_MODULE"
echo "Allowed Hosts:  $ALLOWED_HOSTS"
echo "Database:       $DB_HOST:$DB_PORT/$DB_NAME"
echo "Static Files:   /app/staticfiles"
echo "=========================================="
echo ""

# ===== Start Gunicorn Server =====
echo "[Railway] Starting Gunicorn server..."
echo "Command: gunicorn --bind 0.0.0.0:$PORT --workers $GUNICORN_WORKERS --worker-class $GUNICORN_WORKER_CLASS --timeout $GUNICORN_TIMEOUT --access-logfile - --error-logfile - config.wsgi:application"
echo ""

exec gunicorn \
  --bind 0.0.0.0:${PORT:-8000} \
  --workers ${GUNICORN_WORKERS:-4} \
  --worker-class ${GUNICORN_WORKER_CLASS:-sync} \
  --timeout ${GUNICORN_TIMEOUT:-30} \
  --max-requests ${GUNICORN_MAX_REQUESTS:-1000} \
  --max-requests-jitter ${GUNICORN_MAX_REQUESTS_JITTER:-50} \
  --access-logfile - \
  --error-logfile - \
  --log-level info \
  config.wsgi:application
