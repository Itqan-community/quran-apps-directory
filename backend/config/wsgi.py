"""
WSGI config for quran_apps project.

It exposes the WSGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/4.2/howto/deployment/wsgi/
"""

import os
from pathlib import Path

# Load .env.local for local development if it exists
env_local_path = Path(__file__).resolve().parent.parent / '.env.local'
if env_local_path.exists():
    try:
        from dotenv import load_dotenv
        load_dotenv(env_local_path)
    except ImportError:
        pass  # python-dotenv not installed, skip loading .env.local

from django.core.wsgi import get_wsgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.production')

application = get_wsgi_application()
