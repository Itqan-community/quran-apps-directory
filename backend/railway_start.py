#!/usr/bin/env python3
"""
Railway startup script that bypasses auto-detection

Force redeploy: 2026-02-03
"""
import os
import subprocess
import sys

def main():
    print("=== Railway Custom Startup Script ===")
    print(f"Python executable: {sys.executable}")
    print(f"Working directory: {os.getcwd()}")
    
    # Set hardcoded port to bypass Railway's $PORT injection
    os.environ['PORT'] = '8000'
    
    print("DEBUG: Environment variables:")
    for key, value in os.environ.items():
        if 'PORT' in key or 'RAILWAY' in key:
            print(f"  {key}={value}")
    
    # Run migrations
    print("\n=== Running Database Migrations ===")
    try:
        subprocess.run([sys.executable, "django_manage.py", "migrate"], check=True)
        print("✓ Migrations completed successfully")
    except subprocess.CalledProcessError as e:
        print(f"✗ Migration failed: {e}")
        sys.exit(1)

    # Reindex app embeddings for smart search (quick mode - skips crawling)
    print("\n=== Reindexing App Embeddings ===")
    try:
        subprocess.run([sys.executable, "django_manage.py", "reindex_embeddings", "--quick"], check=True)
        print("✓ Embeddings reindexed successfully")
    except subprocess.CalledProcessError as e:
        print(f"✗ Embedding reindex failed: {e}")
        print("  Continuing with deployment...")

    # Load categories from frontend
    print("\n=== Loading Categories from Frontend ===")
    try:
        subprocess.run([sys.executable, "django_manage.py", "load_categories_from_frontend"], check=True)
        print("✓ Categories loaded successfully")
    except subprocess.CalledProcessError as e:
        print(f"✗ Categories loading failed: {e}")
        # Don't exit on failure - categories might already exist
        print("  Continuing with deployment...")

    # Collect static files
    print("\n=== Collecting Static Files ===")
    try:
        subprocess.run([sys.executable, "django_manage.py", "collectstatic", "--noinput"], check=True)
        print("✓ Static files collected successfully")
    except subprocess.CalledProcessError as e:
        print(f"✗ Static file collection failed: {e}")
        sys.exit(1)
    
    # Start Gunicorn server
    print("\n=== Starting Gunicorn Server ===")
    print("Starting gunicorn on 0.0.0.0:8000...")
    
    # Use exec to replace the current process
    os.execvp("gunicorn", [
        "gunicorn",
        "--bind", "0.0.0.0:8000",
        "--workers", "4",
        "--worker-class", "sync",
        "--timeout", "30",
        "--access-logfile", "-",
        "--error-logfile", "-",
        "config.wsgi:application"
    ])

if __name__ == "__main__":
    main()
