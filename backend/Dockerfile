# Multi-stage Dockerfile for Quran Apps Directory Backend
# Build stages: base, development, production

# ===== STAGE 1: Base =====
FROM python:3.9-slim as base

# Set environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    postgresql-client \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Create app user
RUN groupadd -r appuser && useradd -r -g appuser appuser

# Set working directory
WORKDIR /app

# Copy requirements
COPY requirements/ /app/requirements/

# ===== STAGE 2: Development =====
FROM base as development

# Install development dependencies
RUN pip install --no-cache-dir -r requirements/local.txt

# Copy project
COPY . /app/

# Change ownership to appuser
RUN chown -R appuser:appuser /app

USER appuser

# Expose port
EXPOSE 8000

# Default command for development
CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]

# ===== STAGE 3: Production =====
FROM base as production

# Install production dependencies only
RUN pip install --no-cache-dir -r requirements/production.txt

# Copy project
COPY . /app/

# Create necessary directories
RUN mkdir -p /app/staticfiles /app/logs

# Change ownership to appuser
RUN chown -R appuser:appuser /app

USER appuser

# Copy start script and make it executable
COPY --chown=appuser:appuser start.sh /start.sh

# Expose port
EXPOSE 8000

# Health check (hardcoded to 8000 since HEALTHCHECK doesn't expand variables)
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:8000/api/categories/ || exit 1

# Default command for production (using start script)
# NOTE: Using shell form to ensure environment variables are properly expanded
CMD ["/bin/sh", "-c", "exec /start.sh"]
