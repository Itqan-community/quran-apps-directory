# Railway Backend Troubleshooting

## Issue: "Error: '$PORT' is not a valid port number"

The backend container was failing to start with repeated errors: `Error: '$PORT' is not a valid port number.`

This occurred because the Docker `CMD` instruction wasn't properly expanding environment variables before executing the start script.

## Root Cause Analysis

### 1. Dockerfile CMD Used Exec Form (Not Shell Form)
**Problem**: `CMD ["/start.sh"]` does not invoke a shell, so environment variables in the startup script aren't expanded
**Impact**: The shell script receives an unexpanded `$PORT` variable literal
**Solution**: Changed to shell form: `CMD ["/bin/sh", "-c", "exec /start.sh"]`

### 2. Insufficient PORT Validation in start.sh
**Problem**: Script didn't validate PORT existence, format, or range
**Impact**: No helpful error messages when PORT was invalid or missing
**Solution**: Added comprehensive validation with clear error messages

### 3. HEALTHCHECK Used Variable Substitution
**Problem**: `HEALTHCHECK CMD curl ... ${PORT:-8000}` doesn't expand variables in HEALTHCHECK context
**Solution**: Hardcoded to 8000 since gunicorn binds to Railway's PORT, but the app responds on 8000 internally

## Fixed Issues

### Fix #1: Updated Dockerfile CMD
```dockerfile
# Before (WRONG - exec form doesn't expand variables)
CMD ["/start.sh"]

# After (CORRECT - shell form expands environment variables)
CMD ["/bin/sh", "-c", "exec /start.sh"]
```

### Fix #2: Enhanced start.sh Validation
- Check if PORT environment variable is set (default to 8000 if missing)
- Validate PORT is numeric using regex
- Validate PORT is within valid range (1-65535)
- Provide clear error messages for debugging

### Fix #3: Updated HEALTHCHECK
- Hardcoded to 8000 since variables don't expand in HEALTHCHECK context
- Django/gunicorn runs on the PORT provided by Railway
- Health check validates the application is responsive

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