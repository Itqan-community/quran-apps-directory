#!/bin/sh
set -e

# Ensure PORT is set for Gunicorn
PORT=${PORT:-8000}

echo "Starting Django application..."

# Run migrations
echo "Running database migrations..."
python manage.py migrate

# Collect static files
echo "Collecting static files..."
python manage.py collectstatic --noinput

# Start server on selected port
echo "Starting gunicorn on 0.0.0.0:$PORT..."
exec gunicorn --bind 0.0.0.0:$PORT --workers 4 --worker-class sync --timeout 30 config.wsgi:application