#!/bin/sh
set -e

echo "Starting Django application..."

# Wait for database to be ready (includes migrations)
echo "Waiting for database and running migrations..."
python manage.py wait_for_db --timeout 30

# Collect static files
echo "Collecting static files..."
python manage.py collectstatic --noinput

# Start server on hardcoded port 8000
echo "Starting gunicorn on 0.0.0.0:8000..."
exec gunicorn --bind 0.0.0.0:8000 --workers 4 --worker-class sync --timeout 30 config.wsgi:application