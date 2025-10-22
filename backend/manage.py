#!/usr/bin/env python
"""Django's command-line utility for administrative tasks."""
import os
import sys


def main():
    """Run administrative tasks."""
    # Support both development.py and local.py for backward compatibility
    settings_module = os.environ.get('DJANGO_SETTINGS_MODULE', 'config.settings.development')

    # Try to import the settings module, fallback to local.py if development.py doesn't exist
    try:
        __import__(settings_module)
    except ImportError as e:
        # Check if the error is specifically about the missing local.py file
        if 'config.settings.local' in str(e):
            # Fall back to development.py if local.py doesn't exist
            settings_module = 'config.settings.development'
            try:
                __import__(settings_module)
            except ImportError:
                # If development.py also doesn't exist, try local.py one more time
                settings_module = 'config.settings.local'
        else:
            # Re-raise the original ImportError if it's not about local.py
            raise

    os.environ.setdefault('DJANGO_SETTINGS_MODULE', settings_module)
    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise ImportError(
            "Couldn't import Django. Are you sure it's installed and "
            "available on your PYTHONPATH environment variable? Did you "
            "forget to activate a virtual environment?"
        ) from exc
    execute_from_command_line(sys.argv)


if __name__ == '__main__':
    main()
