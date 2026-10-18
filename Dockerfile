# Production image for the Quran Apps Directory (Next.js standalone output).
# Build-time note: `next build` prerenders the cached home page, which touches
# the database — the DATABASE_URL build-arg must reach the managed DB from the
# build machine (typically the VPS itself via `docker compose up --build`).
# The URL is kept only in build-arg metadata of a self-hosted image; never push
# this image to a public registry.

FROM node:22-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

FROM node:22-bookworm-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ARG NEXT_PUBLIC_SITE_URL
ARG NEXT_PUBLIC_SENTRY_DSN
ARG DATABASE_URL
# Opt-in schema provisioning (PROVISION_DB=1 in .env.prod). Needed on the first
# deploy: the prerender below reads the DB, so a schema-less DATABASE_URL fails
# the build. See scripts/provision-db.sh and docs/deploy-docker.md.
ARG PROVISION_DB=0
ENV NEXT_TELEMETRY_DISABLED=1 \
    NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL \
    NEXT_PUBLIC_SENTRY_DSN=$NEXT_PUBLIC_SENTRY_DSN \
    DATABASE_URL=$DATABASE_URL
RUN if [ "$PROVISION_DB" = "1" ]; then \
      sh scripts/provision-db.sh; \
    else \
      echo "PROVISION_DB=0 — skipping schema provisioning (set PROVISION_DB=1 in .env.prod for the first deploy)"; \
    fi
RUN npm run build

FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0
# Next's standalone output: server.js + a pruned node_modules tree.
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
COPY --from=builder --chown=node:node /app/public ./public
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=25s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server.js"]
