#!/usr/bin/env python3
"""
Custom server runner to bypass Railway's auto-detection.
This script will run our Django application with proper port handling.
"""
import os
import subprocess
import sys
from pathlib import Path

def main():
    print("Starting Django application via custom runner...")

    # Set working directory to the script's directory
    script_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(script_dir)

    # Load .env.local for local development if it exists
    env_local_path = Path(script_dir) / '.env.local'
    if env_local_path.exists():
        print("Loading .env.local for local development...")
        try:
            from dotenv import load_dotenv
            load_dotenv(env_local_path)
        except ImportError:
            print("Warning: python-dotenv not installed, skipping .env.local loading")
    
    # Run migrations
    print("Running database migrations...")
    subprocess.run([sys.executable, "manage.py", "migrate"], check=True)
    
    # Collect static files
    print("Collecting static files...")
    subprocess.run([sys.executable, "manage.py", "collectstatic", "--noinput"], check=True)
    
    # Start gunicorn on port 8000 (hardcoded to avoid Railway's PORT issues)
    print("Starting gunicorn on 0.0.0.0:8000...")
    os.execvp("gunicorn", [
        "gunicorn",
        "--bind", "0.0.0.0:8000",
        "--workers", "4",
        "--worker-class", "sync",
        "--timeout", "30",
        "config.wsgi:application"
    ])

if __name__ == "__main__":
    main()
