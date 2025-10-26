#!/bin/sh
set -e

echo "Starting Django application..."

# Run migrations
echo "Running database migrations..."
python manage.py migrate

# Collect static files
echo "Collecting static files..."
python manage.py collectstatic --noinput

# Start server on hardcoded port 8000
echo "Starting gunicorn on 0.0.0.0:8000..."
exec gunicorn --bind 0.0.0.0:8000 --workers 4 --worker-class sync --timeout 30 config.wsgi:application