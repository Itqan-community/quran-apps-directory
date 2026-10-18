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
| `docker/nginx/default.conf.template` | Rendered by nginx's envsubst; `$DOMAIN` comes from `.env.prod` |
| `docker/nginx/10-dummy-cert.sh` | First-boot self-signed pair so 443 binds before the real cert exists |
| `docker/certbot/Dockerfile` + `entrypoint.sh` | `certbot/dns-cloudflare` + docker CLI; generates `cloudflare.ini` from `CF_DNS_API_TOKEN`, issues, reloads nginx, renews every 12 h |
| `.env.prod.example` | Copy to `.env.prod` and fill in (git-ignored) |

## Deploy

```bash
cp .env.prod.example .env.prod
# … fill .env.prod (see the comments in the file):
#   DOMAIN, CF_DNS_API_TOKEN, ACME_EMAIL, DATABASE_URL (managed, pgvector!),
#   NEXT_PUBLIC_SITE_URL/AUTH_URL (https://<your-domain>), auth, R2, SMTP, AI vars.

docker compose --env-file .env.prod -f docker-compose.prod.yml up -d --build
```

What happens on first boot:

1. `app` builds (the build stage prerenders pages that read the DB, so the build
   machine must reach the managed `DATABASE_URL` — true on the VPS itself).
2. `nginx` starts; `10-dummy-cert.sh` writes a 7-day **self-signed** cert at
   `/etc/letsencrypt/live/<domain>/` because no real cert exists yet — HTTPS is up
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
  run --rm certbot certbot delete --cert-name <domain>` before re-issuing.
- `ADDITIONAL_DOMAINS` (space-separated) adds extra `-d` SANs, provided their DNS
  records already exist in the same Cloudflare zone.
- Only the `certbot` container mounts the docker socket (to `docker exec` into nginx).
- `client_max_body_size` is 20 MB (submission media uploads).
- The dev compose (`docker-compose.yml`) is untouched; use `-f` explicitly for prod.

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
bash -n docker/nginx/10-dummy-cert.sh && bash -n docker/certbot/entrypoint.sh
# → no output = shell syntax OK

cp .env.prod.example .env.prod   # temporarily, for config validation only
docker compose --env-file .env.prod -f docker-compose.prod.yml config -q
# → silent exit 0 = compose file + env wiring valid
rm .env.prod                     # (recreate for real later, filled in)
```

**1. Build the images (individually, so failures are attributable)**

```bash
docker build -t qad-certbot-check docker/certbot/
# → "Successfully built" — proves the certbot toolchain (apk/docker-cli) installs

docker build --network host \
  --build-arg DATABASE_URL=postgres://<user>:<pass>@<managed-db-host>:5432/<db> \
  --build-arg NEXT_PUBLIC_SITE_URL=https://<your-domain> \
  -t qad-app-check .
# → "Successfully built"; ~5-10 min (npm ci + next build with DB-backed prerender)
```

- On your VPS plain `docker build` works (normal DNS). On this dev machine, containers
  can't use the Tailscale-overridden DNS — hence `--network host` (and, for the certbot
  image, an `--add-host dl-cdn.alpinelinux.org:<IPv4>` pin).
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
  certbot delete --cert-name <domain>       # drop the staging cert
docker compose --env-file .env.prod -f docker-compose.prod.yml up -d --force-recreate certbot
# → re-issues a PRODUCTION certificate via DNS-01
docker compose … exec certbot certbot certificates   # → no "INVALID: STAGING" line
```

**7. Teardown (leaves volumes intact)**

```bash
docker compose --env-file .env.prod -f docker-compose.prod.yml down
# volumes (letsencrypt) survive; add --volumes to also drop certs
```

