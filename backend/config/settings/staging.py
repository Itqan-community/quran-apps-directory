"""
Staging environment settings for Quran Apps Directory

Inherits from base.py and overrides for staging environment
"""

from .base import *  # noqa

# Security settings for staging
DEBUG = False
ALLOWED_HOSTS = [
    'staging.quran-apps.itqan.dev',
    'staging-api.quran-apps.itqan.dev',
    'localhost',
    '127.0.0.1',
]

# Database - Can be overridden via environment variables
# Default to PostgreSQL (set via DB_* env vars)

# Cache configuration for staging (Redis recommended)
CACHES = {
    'default': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': 'redis://redis:6379/1',
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
            'SOCKET_CONNECT_TIMEOUT': 5,
            'SOCKET_TIMEOUT': 5,
            'COMPRESSOR': 'django_redis.compressors.zlib.ZlibCompressor',
            'IGNORE_EXCEPTIONS': True,
        }
    }
}

# Cache timeouts for staging
CACHE_TIMEOUTS = {
    'APP_LIST': 600,       # 10 minutes
    'APP_DETAIL': 1200,    # 20 minutes
    'CATEGORY_LIST': 1200, # 20 minutes
    'DEVELOPER_LIST': 1200, # 20 minutes
}

# CORS settings for staging
CORS_ALLOWED_ORIGINS = [
    'https://staging.quran-apps.itqan.dev',
    'https://staging-api.quran-apps.itqan.dev',
    'https://staging-cms.itqan.dev',
    'http://localhost:4200',
    'http://127.0.0.1:4200',
]

# CSRF trusted origins for staging
CSRF_TRUSTED_ORIGINS = [
    'https://staging.quran-apps.itqan.dev',
    'https://staging-api.quran-apps.itqan.dev',
    'https://staging-cms.itqan.dev',
]

# Email configuration for staging
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = config('EMAIL_HOST', default='in-v3.mailjet.com')
EMAIL_PORT = config('EMAIL_PORT', default=2525, cast=int)
EMAIL_USE_TLS = config('EMAIL_USE_TLS', default=True, cast=bool)
EMAIL_HOST_USER = config('EMAIL_HOST_USER', default='')
EMAIL_HOST_PASSWORD = config('EMAIL_HOST_PASSWORD', default='')
DEFAULT_FROM_EMAIL = config('DEFAULT_FROM_EMAIL', default='noreply@itqan.dev')

# Static files
STATIC_ROOT = BASE_DIR / 'staticfiles'
STATIC_URL = '/static/'

# Media files
MEDIA_ROOT = BASE_DIR / 'media'
MEDIA_URL = '/media/'

# Security settings for staging (stricter than dev, but not full production)
SECURE_SSL_REDIRECT = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_HSTS_SECONDS = 3600  # 1 hour
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
SECURE_CONTENT_SECURITY_POLICY = {
    'DEFAULT_SRC': ("'self'",),
    'SCRIPT_SRC': ("'self'", "'unsafe-inline'"),
    'STYLE_SRC': ("'self'", "'unsafe-inline'"),
}

# REST Framework throttle rates for staging
REST_FRAMEWORK['DEFAULT_THROTTLE_RATES'] = {
    'anon': '100/hour',
    'user': '1000/hour',
}

# Logging for staging
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
        },
        'file': {
            'class': 'logging.FileHandler',
            'filename': BASE_DIR / 'logs' / 'staging.log',
        },
    },
    'loggers': {
        'django': {
            'handlers': ['console', 'file'],
            'level': 'INFO',
        },
        'apps': {
            'handlers': ['console', 'file'],
            'level': 'DEBUG',
        },
    },
}
