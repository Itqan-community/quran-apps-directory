#!/usr/bin/env python3
"""
Custom server runner to bypass Railway's auto-detection.
This script will run our Django application with proper port handling.
"""
import os
import subprocess
import sys

def main():
    print("Starting Django application via custom runner...")
    
    # Set working directory to the script's directory
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    
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
