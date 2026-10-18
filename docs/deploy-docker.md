# Production Deployment — Docker + Nginx + Certbot (Cloudflare DNS-01)

Single-VPS deployment: the app runs as a Next.js standalone container, nginx terminates
TLS, and certbot keeps a Let's Encrypt certificate renewed using the **Cloudflare DNS-01
challenge** (no inbound ACME traffic; works with the Cloudflare orange cloud enabled).
The database is a **managed Postgres** — it is *not* part of the compose stack.

## Prerequisites

1. **A VPS** with Docker + the compose plugin, ports 80/443 reachable.
2. **DNS in Cloudflare**: `A`/`AAAA` record for your domain → the VPS IP, **proxied**
   (orange cloud). Example: `apps.example.com`.
3. **Cloudflare API Token** (Zone → DNS → Edit, scoped to the zone) — used by certbot
   for DNS-01. Create it under *My profile → API Tokens*. Do not use the Global Key.
4. **Managed Postgres with the pgvector extension available** (Railway, Neon, Supabase
   all support it). Confirm with `SELECT extname FROM pg_extension` / enable
   `CREATE EXTENSION IF NOT EXISTS vector;` once.
5. **R2 bucket** credentials for production media, SMTP credentials for submission
   emails, and (optionally) Sentry keys.

## Files

| File | Role |
|---|---|
| `Dockerfile` | Multi-stage build → Next.js standalone runner (non-root, `/health` healthcheck) |
| `docker-compose.prod.yml` | `app` + `nginx` (80/443) + `certbot` (issue + renew loop) |
| `nginx/default.conf` | Static config (`server_name _`, no templating); upstream `app:3000`, TLS from `certbot/letsencrypt` |
| `nginx/self-signed-cert.sh` | First-boot self-signed pair (fixed cert name `app`) so 443 binds before the real cert exists |
| `certbot/Dockerfile` + `entrypoint.sh` | `certbot/dns-cloudflare` + docker CLI; generates `cloudflare.ini` from `CF_DNS_API_TOKEN`, issues (cert name `app`), reloads nginx, renews every 12 h |
| `certbot/letsencrypt/` | Generated certificate store, bind-mounted into nginx + certbot (git-ignored — delete to force a fresh issue) |
| `.env.prod.example` | Copy to `.env.prod` and fill in (git-ignored) |

## Deploy

```bash
cp .env.prod.example .env.prod
# … fill .env.prod (see the comments in the file):
#   DOMAIN, CF_DNS_API_TOKEN, ACME_EMAIL, DATABASE_URL (managed, pgvector!),
#   NEXT_PUBLIC_SITE_URL/AUTH_URL (https://<your-domain>), auth, R2, SMTP, AI vars.
#   PROVISION_DB=1 for the FIRST deploy — see below, then set it back to 0.

docker compose --env-file .env.prod -f docker-compose.prod.yml up -d --build
```

### First deploy: the database needs its schema first

The build prerenders DB-backed pages (`cacheComponents`), so `DATABASE_URL` must
point at a database that already has the Drizzle schema. Against an empty
database the build fails with `relation "categories" does not exist` (pg error
`42P01`), which looks like a code bug but is a missing provisioning step.

Set this in `.env.prod` for the first deploy:

```bash
PROVISION_DB=1
```

The builder then runs `scripts/provision-db.sh` before `next build`:

- `node --experimental-strip-types db/enable-pgvector.ts` — `CREATE EXTENSION vector`
- `npx --no-install drizzle-kit push --force` — `db/schema.ts` → tables

Then set `PROVISION_DB=0` again and redeploy. Two reasons not to leave it on:

- ⚠ `drizzle-kit push` applies a **blind diff**. Against a database that already
  holds data and has drifted, it can alter or drop columns. It is the right tool
  for an empty database; for later schema changes prefer generated migrations.
- While it is `1`, provisioning re-runs on **every** rebuild (any source change
  invalidates the layer). That is not a no-op: one auto-generated foreign-key
  name exceeds Postgres's 63-character limit
  (`app_submissions_categories_appsubmission_id_app_submissions_id_fk`), so
  `push` drops and re-adds that constraint on every run — an `ACCESS EXCLUSIVE`
  lock plus a full revalidation. Invisible on an empty database; on a populated
  one, turn the flag back off.

`drizzle-kit` is a devDependency, which is why this runs in the builder stage:
the runner image only has the pruned standalone output and could not run it.

**Seeding is a separate, manual step.** `db/seed.ts` needs `ADMIN_EMAIL` /
`ADMIN_PASSWORD` to create the admin user (`db/seed.ts:163`), and those are
runtime-only values — making them build args would bake the password into image
history. Run it on the VPS after provisioning, or from any machine that can
reach the database:

```bash
export DATABASE_URL="$(sed -n 's/^DATABASE_URL=//p' .env.prod)"
npm ci --no-audit --no-fund
node --experimental-strip-types db/seed.ts     # idempotent: all inserts ON CONFLICT DO NOTHING
```

Seed **before** the deploy build if you want the first build's prerendered pages
to contain content.

What happens on first boot:

1. `app` builds (the build stage prerenders pages that read the DB, so the build
   machine must reach the managed `DATABASE_URL` — true on the VPS itself — and
   with `PROVISION_DB=1` the schema is applied first).
2. `nginx` starts; `self-signed-cert.sh` writes a 7-day **self-signed** cert at
   `/etc/letsencrypt/live/app/` (cert name `app`) because no real cert exists yet — HTTPS is up
   (browser warning until step 3).
3. `certbot` sees the `.dummy` marker, clears the pair, issues the real certificate
   via DNS-01, and runs `docker exec nginx nginx -t && nginx -s reload`.

Renewal: certbot runs `certbot renew` every 12 hours; a successful renewal triggers the
deploy hook which validates + reloads nginx. Failures are logged and retried on the next
loop tick. Let's Encrypt certificates renew at ~60 days of remaining life.

Notes:

- `STAGING=1` in `.env.prod` switches issuance to the Let's Encrypt **staging CA**
  (no rate limits) — recommended for the very first dry run; then set it back to `0`
  and remove the staging cert: `docker compose --env-file .env.prod -f docker-compose.prod.yml \
  run --rm certbot certbot delete --cert-name app` (or just `rm -rf
  certbot/letsencrypt`) before re-issuing.
- `ADDITIONAL_DOMAINS` (space-separated) adds extra `-d` SANs, provided their DNS
  records already exist in the same Cloudflare zone.
- Only the `certbot` container mounts the docker socket (to `docker exec` into nginx).
- `client_max_body_size` is 20 MB (submission media uploads).
- The dev compose (`docker-compose.yml`) is untouched; use `-f` explicitly for prod.

## Local dry-run of the production stack

Production's two external dependencies — a managed Postgres and R2 — are simply run as
plain `docker run` containers here, then `.env.prod` points at them (the compose stack
itself is unchanged). The certbot controller degrades gracefully: with an empty
`CF_DNS_API_TOKEN` (or failed issuance) it logs and retries every 12 h instead of
crash-looping, while nginx keeps serving the first-boot self-signed pair — HTTPS never
drops.

```bash
cp .env.prod.example .env.prod
# change the "Local dry-run" block at the bottom of .env.prod (all values listed there)

# 1. Stand-ins for the external services (host ports 5434/9010/9011, so the dev
#    stack on 5433/9000 can stay up). Re-runnable: reuse the named volumes.
docker run -d --name qad-db -p 5434:5432 \
  -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=qad \
  -v qad-db-data:/var/lib/postgresql/data pgvector/pgvector:pg16
docker run -d --name qad-minio -p 9010:9000 -p 9011:9001 \
  -e MINIO_ROOT_USER=minioadmin -e MINIO_ROOT_PASSWORD=minioadmin \
  -e MINIO_DEFAULT_BUCKETS=qad \
  -v qad-minio-data:/bitnami/minio/data bitnamilegacy/minio:latest

# 2. Schema into that db; optional seed for realistic pages
DATABASE_URL=postgres://postgres:postgres@localhost:5434/qad node --experimental-strip-types db/enable-pgvector.ts
DATABASE_URL=postgres://postgres:postgres@localhost:5434/qad npx drizzle-kit push --force
DATABASE_URL=postgres://postgres:postgres@localhost:5434/qad npm run db:seed        # optional

# 3. Build the images (prerender hits the db; see the host-network note below)
docker build --network host \
  --build-arg DATABASE_URL=postgres://postgres:postgres@127.0.0.1:5434/qad \
  --build-arg NEXT_PUBLIC_SITE_URL=https://localhost \
  -t qad-prod-app .
docker build -t qad-prod-certbot certbot/   # + --add-host dl-cdn… pin on this box

# If the machine's containers are DNS-blind (Tailscale MagicDNS — the same
# reason certbot can't reach Let's Encrypt above), `docker build` can't run
# `npm ci`. Run the identical steps with an explicit resolver instead, then
# package the output with a COPY-only Dockerfile (same node:22 base + CMD):
#   docker run --rm --dns 1.1.1.1 --add-host=host.docker.internal:host-gateway \
#     -v /tmp/qad-build:/app -w /app \
#     -e DATABASE_URL=postgres://postgres:postgres@host.docker.internal:5434/qad \
#     -e NEXT_PUBLIC_SITE_URL=https://localhost \
#     node:22-bookworm-slim sh -c 'npm ci --no-audit --no-fund && npm run build'

# 4. Raise the stack, then hook the stand-ins onto its network so the app
#    resolves them by name (DATABASE_URL=@qad-db, R2_ENDPOINT=http://qad-minio:9000)
docker compose --env-file .env.prod -f docker-compose.prod.yml up -d
docker network connect qad-prod_default qad-db
docker network connect qad-prod_default qad-minio

# 5. Validate
curl -sk https://localhost:8443/health                            # → {"status":"ok"}
curl -sk https://localhost:8443/ar | head -c 200                  # → Arabic home HTML
docker compose --env-file .env.prod -f docker-compose.prod.yml exec nginx \
  curl -sI http://localhost/ar                                    # → 301 → https
docker compose --env-file .env.prod -f docker-compose.prod.yml ps # app (healthy)
```

Notes:

- Why the two steps (run, then `docker network connect`): the db has to be up
  *before* the image is built (the prerender reads it) — and it can't be created on
  the stack network first, because compose only creates `qad-prod_default` at `up`
  (and refuses a foreign network of that name). Attaching afterwards gives the app
  plain DNS names, exactly like the managed DB's hostname in production.
- Ports: `HTTP_PORT=8080`/`HTTPS_PORT=8443` in the local dry-run (the box's 80/443 may
  be owned by something else — e.g. an unrelated reverse proxy). With the 8443 default
  the host-side port-80 redirect targets the wrong port, hence the redirect check from
  inside the compose network above.
- The build stage prerenders DB-backed pages → the db must be up with schema pushed
  *before* the build (step 2 before 3). `BUILD_DATABASE_URL` points the prerender at
  the db's host-mapped port; on the VPS it stays unset and `DATABASE_URL` is used.
- Builds on this dev machine need host networking (containers can't use the
  Tailscale-overridden DNS) — that is why the images are built with plain
  `docker build --network host` rather than `docker compose … --build`.
- MinIO note: MinIO removed the free community images from Docker Hub in 2025 (repo
  404s, quay.io needs auth), so the stand-in is the archived
  `bitnamilegacy/minio:latest` (local-testing only — production media always goes to
  real R2). `MINIO_DEFAULT_BUCKETS` creates the `qad` bucket; to also test public
  image URLs, make it readable:
  `docker run --rm --network host bitnamilegacy/mc sh -c "mc alias set local http://localhost:9010 minioadmin minioadmin && mc anonymous set download local/qad"`
- Teardown: `docker rm -f qad-db qad-minio` (volumes `qad-db-data` / `qad-minio-data`
  survive; add `-v` to drop them).
- Everything else in the prod path is exercised: multi-stage build, standalone runtime
  + `/health`, nginx TLS/config/self-signed-cert wiring, security headers, healthchecks.
  Not covered: real DNS-01 issuance/renewal (empty token locally), real R2/SMTP.

## Smart Search on prod

After the first successful deploy:

1. Ensure the managed DB has the extension: run `npm run db:pgvector && npm run db:push`
   from a checkout with `DATABASE_URL` pointed at the managed DB (or enable the
   extension from the provider console).
2. Set `AI_SEARCH_PROVIDER=gemini` (or `openai`) + `AI_API_KEY` in `.env.prod` and
   `docker compose --env-file .env.prod -f docker-compose.prod.yml up -d` to recreate
   `app`.
3. Generate the embeddings — either:
   - **Admin console → Apps → "Regenerate embeddings"** button (runs server-side in the
     container), or
   - from a checkout (laptop/CI) with `DATABASE_URL` pointed at the managed DB:
     `npm run embeddings:reindex` → prints `{"embedded":N,"skipped":0,"failed":0}`.
4. Verify `/ar/apps?search=ورش&mode=smart` returns ranked results; then test fallback by
   temporarily breaking the key (banner appears, keyword results still served).

## Ops cheatsheet

```bash
docker compose --env-file .env.prod -f docker-compose.prod.yml logs -f app
docker compose --env-file .env.prod -f docker-compose.prod.yml ps
docker compose --env-file .env.prod -f docker-compose.prod.yml up -d --build app   # app-only redeploy
docker compose --env-file .env.prod -f docker-compose.prod.yml logs certbot | tail  # renewal trail
docker compose --env-file .env.prod -f docker-compose.prod.yml exec certbot \
  certbot certificates                                                            # expiry overview
```

Updating: `git pull` on the VPS, then re-run `up -d --build` (rebuilds app only; nginx
and certbot are unaffected by app changes).

## Manual validation checklist

Run these in order; each step states what success looks like. Static steps work anywhere;
the runtime steps assume a machine with Docker and (for step 4+) a reachable managed DB.

**0. Static checks (no Docker needed)**

```bash
bash -n nginx/self-signed-cert.sh && bash -n certbot/entrypoint.sh
# → no output = shell syntax OK

cp .env.prod.example .env.prod   # temporarily, for config validation only
docker compose --env-file .env.prod -f docker-compose.prod.yml config -q
# → silent exit 0 = compose file + env wiring valid
rm .env.prod                     # (recreate for real later, filled in)
```

**1. Build the images (individually, so failures are attributable)**

```bash
docker build -t qad-certbot-check certbot/
# → "Successfully built" — proves the certbot toolchain (apk/docker-cli) installs

docker build --network host \
  --build-arg DATABASE_URL=postgres://<user>:<pass>@<managed-db-host>:5432/<db> \
  --build-arg NEXT_PUBLIC_SITE_URL=https://<your-domain> \
  -t qad-app-check .
# → "Successfully built"; ~5-10 min (npm ci + next build with DB-backed prerender)
```

- On your VPS plain `docker build` works (normal DNS). On this dev machine
  containers resolve via the host's Tailscale MagicDNS, which ignores
  container-sourced queries — and `--network host` inherits the same
  `resolv.conf`, so it does **not** help. Either fix the machine's Docker
  resolver (`/etc/docker/daemon.json`: `{"dns": ["1.1.1.1","8.8.8.8"]}`) or
  build the artifacts via `docker run --dns 1.1.1.1` (see "Local dry-run"
  step 3 below).
- ⚠️ The build stage runs `next build`, which prerenders DB-backed pages: the
  `DATABASE_URL` build-arg must resolve from the build machine. On the VPS use the
  managed DB's network-reachable host (private link or public endpoint).

**2. Smoke the app container alone**

```bash
docker run -d --name qad-app-smoke -p 3000:3000 --env-file .env.prod qad-app-check
sleep 10 && docker ps --filter name=qad-app-smoke --format '{{.Status}}'
# → "Up … (healthy)" within ~30s (healthcheck hits /health)
curl -s http://127.0.0.1:3000/ar | head -c 200
# → Arabic HTML; then:
docker rm -f qad-app-smoke
```

**3. Full stack with a dry-run certificate (STAGING=1)**

```bash
# In .env.prod set: STAGING=1, DOMAIN=<your real domain>, CF_DNS_API_TOKEN=<token>,
# DATABASE_URL=<managed db>, NEXT_PUBLIC_SITE_URL=https://<domain>
docker compose --env-file .env.prod -f docker-compose.prod.yml up -d --build
docker compose --env-file .env.prod -f docker-compose.prod.yml ps
# → app (healthy), nginx (running), certbot (running)
```

- **First-boot TLS:** before certbot finishes, `curl -k https://<domain>` (from outside,
  or via the VPS itself) answers with the **self-signed dummy** — nginx bound 443 without
  a real cert (the chicken-and-egg fix). Browser shows a warning at this stage: expected.
- **Cert issuance:** `docker compose --env-file .env.prod -f docker-compose.prod.yml logs certbot`
  should show "issuing certificate … (DNS-01)" followed by a successful `certonly`, then
  "entering renewal loop". The `.dummy` marker + pair are removed automatically.
- **Real cert served:** `curl -sI https://<domain>` (no `-k`) → `HTTP/2 200` with a
  valid Let's Encrypt (staging) chain; `docker compose … exec certbot certbot certificates`
  shows the cert with `STAGING` in its name.

**4. Functional checks through nginx**

```bash
curl -sI http://<domain>/ar          # → 301 → https
curl -s https://<domain>/health      # → {"status":"ok"}-style JSON
curl -s https://<domain>/ar          # → home page HTML
curl -s https://<domain>/ar/apps     # → apps listing
curl -s "https://<domain>/ar/apps?search=ورش&mode=smart" | grep -c "app-card"  # > 0
curl -sI "https://<domain>/ar" | grep -i strict-transport  # → HSTS header present
# Real client IP (orange cloud): nginx logs should show CF edge IPs as X-Forwarded-For
# after real_ip, and app-side VIEW_IP_SALT hashing stays consistent.
```

**5. Renewal path**

```bash
docker compose --env-file .env.prod -f docker-compose.prod.yml exec certbot \
  certbot renew --dry-run
# → "Congratulations! All dry-run renewals succeeded" (staging credentials used
#   for the dry run's staging endpoints; production runs use the same DNS token)
docker compose … logs certbot | grep reload
# → the deploy hook's "nginx -t && nginx -s reload" trail appears on real renewals
```

**6. Rollout finish (after switching STAGING back to 0)**

```bash
docker compose --env-file .env.prod -f docker-compose.prod.yml run --rm certbot \
  certbot delete --cert-name app            # drop the staging cert
docker compose --env-file .env.prod -f docker-compose.prod.yml up -d --force-recreate certbot
# → re-issues a PRODUCTION certificate via DNS-01
docker compose … exec certbot certbot certificates   # → no "INVALID: STAGING" line
```

**7. Teardown (certs persist on disk)**

```bash
docker compose --env-file .env.prod -f docker-compose.prod.yml down
# ./certbot/letsencrypt survives (git-ignored, written as root — use sudo to
# delete it and force a fresh issue)
```

