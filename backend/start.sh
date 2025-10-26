#!/bin/sh
set -e

echo "Starting Django application..."

# Ensure PORT is set and valid
if [ -z "$PORT" ]; then
    echo "ERROR: PORT environment variable is not set. Using default 8000."
    PORT=8000
fi

# Validate PORT is numeric
if ! echo "$PORT" | grep -qE '^[0-9]+$'; then
    echo "ERROR: PORT value '$PORT' is not a valid number. Exiting."
    exit 1
fi

# Validate PORT is in valid range
if [ "$PORT" -lt 1 ] || [ "$PORT" -gt 65535 ]; then
    echo "ERROR: PORT value '$PORT' is outside valid range (1-65535). Exiting."
    exit 1
fi

echo "Using PORT=$PORT"

# Wait for database to be ready (includes migrations)
echo "Waiting for database and running migrations..."
python manage.py wait_for_db --timeout 30

# Collect static files
echo "Collecting static files..."
python manage.py collectstatic --noinput

# Start server
echo "Starting gunicorn on 0.0.0.0:$PORT..."
exec gunicorn --bind 0.0.0.0:$PORT --workers 4 --worker-class sync --timeout 30 config.wsgi:application