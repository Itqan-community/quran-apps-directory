"""
Local development settings for quran_apps project.

For more information on this file, see
https://docs.djangoproject.com/en/4.2/topics/settings/

For the full list of settings and their values, see
https://docs.djangoproject.com/en/4.2/ref/settings/
"""

from .base import *

# Local development settings
DEBUG = True
USE_SQLITE = False  # Use PostgreSQL in Docker for local development

# Database configuration for local Docker PostgreSQL
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': config('DB_NAME', default='quran_apps_db'),
        'USER': config('DB_USER', default='postgres'),
        'PASSWORD': config('DB_PASSWORD', default='postgres123'),
        'HOST': config('DB_HOST', default='localhost'),
        'PORT': config('DB_PORT', default='5432'),
        'OPTIONS': {
            'connect_timeout': 60,
        }
    }
}

# Django Debug Toolbar (disabled - causes issues with API responses)
# if DEBUG:
#     try:
#         import debug_toolbar
#         INSTALLED_APPS += ['debug_toolbar']
#         MIDDLEWARE += ['debug_toolbar.middleware.DebugToolbarMiddleware']
#         INTERNAL_IPS = ['127.0.0.1', 'localhost']
#     except ImportError:
#         pass

# Email settings for development
EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'

# Static files
STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'

# Media files
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

# Cache configuration for development
# Uses in-memory cache by default, but can switch to Redis if needed
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
        'LOCATION': 'unique-snowflake',
        'TIMEOUT': 300,  # 5 minutes default
        'OPTIONS': {
            'MAX_ENTRIES': 1000
        }
    }
}

# Logging
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
        },
    },
    'root': {
        'handlers': ['console'],
        'level': 'INFO',
    },
}