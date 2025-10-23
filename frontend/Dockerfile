# Multi-stage Dockerfile for Quran Apps Directory Frontend
# Build stages: base, development, production

# ===== STAGE 1: Base =====
FROM node:20-alpine as base

# Set environment variables
ENV NODE_ENV=production \
    NODE_OPTIONS=--max-old-space-size=4096

# Install system dependencies
RUN apk add --no-cache \
    dumb-init \
    curl

# Create app user
RUN addgroup -g 1001 -S appuser && \
    adduser -S appuser -u 1001

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# ===== STAGE 2: Development =====
FROM base as development

ENV NODE_ENV=development

# Install all dependencies (including dev)
RUN npm ci --include=dev

# Copy project
COPY . .

# Change ownership to appuser
RUN chown -R appuser:appuser /app

USER appuser

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:3000 || exit 1

# Default command for development
CMD ["npm", "run", "dev"]

# ===== STAGE 3: Production =====
FROM base as production

ENV NODE_ENV=production

# Install production dependencies only
RUN npm ci --only=production

# Copy project
COPY . .

# Build Angular application
RUN npm run build:prod

# Install serve globally for serving static files
RUN npm install -g serve

# Create necessary directories
RUN mkdir -p /app/logs

# Change ownership to appuser
RUN chown -R appuser:appuser /app

USER appuser

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:${PORT:-3000} || exit 1

# Default command for production (serve static files)
CMD ["serve", "-s", "dist/browser", "-l", "${PORT:-3000}"]
