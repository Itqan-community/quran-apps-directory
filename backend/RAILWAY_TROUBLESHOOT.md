# Railway Backend Troubleshooting

## Issue: "Error: '$PORT' is not a valid port number"

The backend container was failing to start with repeated errors: `Error: '$PORT' is not a valid port number.`

This was caused by attempting to use Railway's `$PORT` environment variable, which wasn't being properly substituted in the startup process.

## Solution: Hardcoded Port 8000

The simplest and most reliable solution is to hardcode port 8000 in both the start script and Dockerfile configuration.

## Fixed Issues

### Fix #1: Hardcoded PORT in start.sh
```bash
# Before (using environment variable)
PORT=${PORT:-8000}
exec gunicorn --bind 0.0.0.0:$PORT ...

# After (hardcoded)
exec gunicorn --bind 0.0.0.0:8000 ...
```

### Fix #2: Hardcoded HEALTHCHECK
```dockerfile
# Hardcoded to 8000 in Dockerfile
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:8000/api/categories/ || exit 1
```

### Fix #3: Simplified start.sh
- Removed PORT variable substitution
- Removed PORT validation logic
- Cleaner, simpler startup process

## Deployment Instructions

1. Ensure changes are committed:
   ```bash
   git status
   ```

2. Push to Railway:
   ```bash
   railway up
   ```

3. Monitor logs:
   ```bash
   railway logs --follow
   ```

4. Verify deployment:
   ```bash
   curl https://qad-api-production.up.railway.app/api/categories/
   ```

## Expected Behavior After Fix

1. Container starts without PORT variable errors
2. Startup script validates PORT is set and valid
3. Gunicorn binds to the PORT provided by Railway
4. Health check confirms API is responding
5. Container transitions from restarting to running

## Environment Variables

Railway automatically provides:
- `PORT` - Ephemeral port assigned by Railway (e.g., 5000-65535)
- `DATABASE_URL` - PostgreSQL connection string
- Other required variables from Railway project settings

Key Django environment variables required:
- `DJANGO_SETTINGS_MODULE=config.settings.production`
- `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT`
- `SECRET_KEY` (set securely in Railway)
- `ALLOWED_HOSTS` and `CORS_ALLOWED_ORIGINS`

## Debugging Tips

If deployment still fails, check:

1. **View full logs**:
   ```bash
   railway logs --tail 500
   ```

2. **Check environment variables**:
   ```bash
   railway env
   ```

3. **Rebuild locally**:
   ```bash
   docker build -t test-backend --target production .
   docker run -e PORT=8000 test-backend
   ```

4. **Validate start.sh**:
   ```bash
   bash -n start.sh  # Check syntax
   ```

## References

- [Docker CMD Documentation](https://docs.docker.com/engine/reference/builder/#cmd)
- [Railway Documentation](https://docs.railway.app/)
- [Gunicorn Configuration](https://docs.gunicorn.org/en/stable/)