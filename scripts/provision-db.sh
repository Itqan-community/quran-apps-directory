#!/bin/sh
# Applies the Drizzle schema (and the pgvector extension) to $DATABASE_URL.
#
# Gated by PROVISION_DB=1 in .env.prod — see docker-compose.prod.yml. It runs
# from the Dockerfile *builder* stage before `next build`, for two reasons:
#   1. the build prerenders DB-backed pages, so the schema MUST exist or the
#      build dies with `relation "categories" does not exist`;
#   2. only that stage has devDependencies — drizzle-kit and dotenv live there,
#      not in the pruned standalone runner image.
#
# Re-runnable, and `push` applies only the diff — but it is NOT a no-op on an
# unchanged schema: one auto-generated FK name exceeds Postgres's 63-char limit
# (app_submissions_categories_appsubmission_id_app_submissions_id_fk), so push
# drops and re-adds that constraint on every run — an ACCESS EXCLUSIVE lock plus
# a full revalidation. Invisible on an empty database; on a populated one, turn
# PROVISION_DB back off rather than leaving it re-running each deploy.
# NOT drift-safe either: push applies a blind diff, so on a database that
# already has data and has drifted it can alter or drop columns. Run it against
# a database you are willing to reshape.
#
# POSIX sh on purpose: the node image's /bin/sh is dash.
set -eu

: "${DATABASE_URL:?DATABASE_URL is required}"

echo "provision-db: enabling pgvector"
node --experimental-strip-types db/enable-pgvector.ts

echo "provision-db: pushing db/schema.ts"
npx --no-install drizzle-kit push --force

echo "provision-db: done"
