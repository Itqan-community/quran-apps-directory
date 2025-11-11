"""
Production settings for Quran Apps Directory.

Configured for Railway deployment with security best practices.
See: https://docs.djangoproject.com/en/4.2/topics/settings/
"""

from .base import *

# Production settings
DEBUG = config('DEBUG', default=False, cast=bool)
USE_SQLITE = False

# Security settings
# Note: Set to False during Railway deployment to debug SSL redirect issues
# Railway proxies requests properly, so this may not be needed
SECURE_SSL_REDIRECT = config('SECURE_SSL_REDIRECT', default=False, cast=bool)
SECURE_HSTS_SECONDS = config('SECURE_HSTS_SECONDS', default=31536000, cast=int)
SECURE_HSTS_INCLUDE_SUBDOMAINS = config('SECURE_HSTS_INCLUDE_SUBDOMAINS', default=True, cast=bool)
SECURE_HSTS_PRELOAD = config('SECURE_HSTS_PRELOAD', default=True, cast=bool)
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_BROWSER_XSS_FILTER = True
X_FRAME_OPTIONS = 'DENY'

# Allowed hosts - required for production
ALLOWED_HOSTS = config(
    'ALLOWED_HOSTS',
    default='quran-apps.itqan.dev,www.quran-apps.itqan.dev,qad-backend-api-production.up.railway.app,qad-api-production.up.railway.app,api.quran-apps.itqan.dev,.railway.app,railway.app,quran-apps-directory.railway.internal',
    cast=lambda v: [s.strip() for s in v.split(',')]
)

# CORS configuration
CORS_ALLOWED_ORIGINS = config(
    'CORS_ALLOWED_ORIGINS',
    default='https://quran-apps.itqan.dev,https://www.quran-apps.itqan.dev,https://staging.quran-apps.itqan.dev,https://dev.quran-apps.itqan.dev,https://qad-frontend-production.up.railway.app',
    cast=lambda v: [s.strip() for s in v.split(',')]
)
CORS_ALLOW_CREDENTIALS = True

# Database
# Support Railway's DATABASE_URL or individual config variables
import dj_database_url

database_url = config('DATABASE_URL', default='')
if database_url:
    # Use Railway's DATABASE_URL if available
    DATABASES = {
        'default': dj_database_url.config(
            default=database_url,
            conn_max_age=600,
            conn_health_checks=True,
        )
    }
else:
    # Fall back to individual environment variables
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': config('DB_NAME', default='postgres'),
            'USER': config('DB_USER', default='postgres'),
            'PASSWORD': config('DB_PASSWORD', default=''),
            'HOST': config('DB_HOST', default='localhost'),
            'PORT': config('DB_PORT', default='5432'),
            'OPTIONS': {
                'sslmode': 'prefer',  # Use 'prefer' for Railway internal connections
            },
        }
    }

# Email settings
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = config('EMAIL_HOST', default='')
EMAIL_PORT = config('EMAIL_PORT', default=587, cast=int)
EMAIL_USE_TLS = config('EMAIL_USE_TLS', default=True, cast=bool)
EMAIL_HOST_USER = config('EMAIL_HOST_USER', default='')
EMAIL_HOST_PASSWORD = config('EMAIL_HOST_PASSWORD', default='')
DEFAULT_FROM_EMAIL = config('DEFAULT_FROM_EMAIL', default='')

# Static files
STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'

# Media files
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

# Logging - output to console for Railway
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '[{levelname}] {asctime} {name} {message}',
            'style': '{',
            'datefmt': '%Y-%m-%d %H:%M:%S',
        },
        'simple': {
            'format': '[{levelname}] {message}',
            'style': '{',
        },
    },
    'handlers': {
        'console': {
            'level': 'INFO',
            'class': 'logging.StreamHandler',
            'formatter': 'verbose',
        },
    },
    'root': {
        'handlers': ['console'],
        'level': 'INFO',
    },
    'loggers': {
        'django': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': False,
        },
        'django.db.backends': {
            'handlers': ['console'],
            'level': 'WARNING',
            'propagate': False,
        },
        'django.request': {
            'handlers': ['console'],
            'level': 'ERROR',
            'propagate': False,
        },
    },
}

# ===== WHITENOISE FOR STATIC FILES =====
MIDDLEWARE = [
    'whitenoise.middleware.WhiteNoiseMiddleware',
] + MIDDLEWARE

# Enable WhiteNoise's compression and caching
WHITENOISE_COMPRESS = True
WHITENOISE_COMPRESSION_QUALITY = 85
WHITENOISE_AUTOREFRESH = False

# ===== PERFORMANCE & CACHING =====
# Database connection pooling
DATABASES['default']['CONN_MAX_AGE'] = 600

# ===== ERROR TRACKING (Optional - Sentry) =====
SENTRY_DSN = config('SENTRY_DSN', default='')
if SENTRY_DSN:
    import sentry_sdk
    from sentry_sdk.integrations.django import DjangoIntegration

    sentry_sdk.init(
        dsn=SENTRY_DSN,
        integrations=[DjangoIntegration()],
        traces_sample_rate=0.1,
        send_default_pii=False,
        environment=config('ENVIRONMENT', default='production'),
    )