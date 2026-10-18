# Quran Apps Directory

A bilingual (Arabic-first / RTL + English) directory of Quran applications — mushafs, tafsir,
memorization trainers, kids' readers and more — with rich filtering, **AI-powered Smart Search**,
a public app-submission workflow, and a full admin console.

This is the Next.js rewrite of the original Angular 20 + Django 4.2 monorepo
(`../quran-apps-directory`, kept frozen as a read-only reference). All content, the submission
pipeline and admin capabilities were ported; the public REST API was intentionally dropped
(pages are server-rendered, writes go through Server Actions).

## Features

### Public site (`/[lang]`, lang = `ar` | `en`)

- **Apps listing** with URL-driven filters: categories, platform, riwayah, mushaf type, features,
  featured — AND between filter types, OR within one type. Sort, pagination, new-app badges.
- **Traditional search** — keyword search over names/descriptions with Arabic normalization
  (tashkeel-stripping, alef/hamza/ta-marbuta folding) both in SQL and in TypeScript.
- **Smart Search (RAG)** — see [Smart Search](#smart-search) below. The hero search has
  Traditional/Smart tabs; empty keyword results offer "Try Smart Search".
- **Top-level category pages** (`/{lang}/{category}`), **app detail** (id-or-slug) with screenshots,
  store links and view tracking, **developer pages**.
- **App submission** — public bilingual form with media upload (Cloudflare R2), email confirmations,
  and a tracking page (`/track-submission`) by tracking id or email.
- **SEO** — JSON-LD, dynamic OpenGraph images, hreflang-alternates sitemap, env-driven noindex.
- Dark/light/auto theme, Arabic-first i18n via `next-intl`.

### Admin console (`/admin`, credentials login)

- Dashboard, apps CRUD (bulk actions, slug rules, imagery transfer), categories, developers,
  and a **full metadata section**: sidebar submenu of metadata types, per-type detail page, and
  per-option create/edit pages.
- **Submissions review**: approve (creates the published app, transfers media, generates the
  search embedding), reject / request info with emails and status logs.
- **Analytics**: view-event charts; a per-request analytics beacon records views.
- **Embeddings reindex**: one-click "Regenerate embeddings" (admin apps toolbar) for the
  Smart Search index.

### Smart Search

The RAG hybrid search ported from the legacy Django backend, right-sized for Next.js
(spec: `docs/specs/2026-10-17-smart-search-design.md`):

1. **Ingestion** — each published app is rendered into a bilingual structured document
   (names, categories, developer, descriptions, quality, riwayah/features/mushaf labels, external
   store text when available), embedded to a 768-dim vector (`gemini-embedding-001`) and stored in
   **pgvector** with a document hash for idempotent reindexing.
2. **Query pipeline** — Arabic normalization → typo suggestion (alias map + Levenshtein ≤ 2) →
   soft-filter augmentation (active filters become bilingual labels appended to the query — they
   boost ranking, never hard-exclude) → query embedding (7-day cache in `search_embedding_cache`)
   → cosine top-100 pool.
3. **Hybrid re-ranking** (in TypeScript) —
   `0.35·vector + 0.40·IDF-keyword + 0.15·metadata + 0.10·quality`, relevance cutoff `0.35`,
   match reasons per result, facets/counts served by the existing metadata repo.
4. **Fallback** — any provider failure, misconfiguration or empty vector pool degrades to the
   keyword path with a visible "AI search temporarily unavailable" notice; never a 500.

Providers are selected by env (`AI_SEARCH_PROVIDER`): `gemini` (default), `openai` (any
OpenAI-compatible endpoint, dims trimmed to 768), or `mock` (deterministic, for tests/CI/dev
without keys).

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16.4 (App Router, `cacheComponents`, `proxy.ts`), React 19, TypeScript 5 |
| DB / ORM | PostgreSQL 16 + **pgvector**, Drizzle ORM (`postgres` driver, `prepare: false`), drizzle-kit push |
| Auth | Auth.js v5 (credentials), admin guard in `proxy.ts` + `lib/admin-guard.ts` |
| Styling | Tailwind CSS v4 (CSS-first `@theme` tokens), dark mode via `next-themes` |
| i18n | `next-intl` (`ar` default, `en`), `[lang]` segment, RTL/LTR layouts |
| Media | Cloudflare R2 (S3-compatible; MinIO locally), `sharp` processing |
| Email | Nodemailer (submission confirmations, review notices) |
| Observability | Sentry (Next.js instrumentation), health endpoint at `/health` |
| Testing | Vitest (unit + integration, dockerized test DB), Playwright (e2e, mock AI provider) |
| Deploy | Self-hosted Node standalone (`output: "standalone"`) on Railway |

## Architecture

**No public REST API.** Server Components read through a cached repo layer; all writes are
Server Actions validated with Zod.

```
src/
├── app/
│   ├── [lang]/(site)/…        # public pages (home, apps, app/[id], [category], developer/, submit-app, track-submission, …)
│   ├── [lang]/(ramadan)/      # seasonal landing
│   ├── admin/                 # console (noindex, guarded)
│   └── api/                   # internal handlers only (auth, upload, health, view beacon)
├── components/                # apps/, site/, admin/, ui/
├── lib/
│   ├── repo/                  # framework-agnostic Drizzle data access (incl. repo/smart-search.ts)
│   ├── cache/                 # "use cache" + cacheLife/cacheTag wrappers (invalidated via cacheTag("apps"))
│   ├── actions/               # "use server" mutations
│   ├── services/              # arabic.ts normalization, r2, images, email, view-analytics
│   ├── ai/                    # providers/, ingest, rank, suggest, reindex
│   └── validation/            # Zod schemas
├── i18n/                      # en.json / ar.json
└── proxy.ts                   # Next 16 middleware replacement (lang redirect, admin guard)
db/                            # schema.ts (pgvector columns), seed, live-migration, parity-check
scripts/                       # reindex-embeddings.ts
e2e/ tests/                    # Playwright specs / Vitest suites
docs/specs/ docs/plans/        # design specs and implementation plans
```

## Getting Started

Prerequisites: Node 20+, Docker.

```bash
npm install
docker compose up -d db        # pgvector/pg16 on :5433 (add `minio` for local R2)
cp .env.example .env.local     # then fill the values you need (see below)
npm run db:pgvector            # CREATE EXTENSION vector (idempotent)
npm run db:push                # push the Drizzle schema
npm run db:seed                # idempotent seed from db/seed-data/
npm run dev                    # http://localhost:3000 → /ar
```

### Scripts

| Command | Purpose |
|---|---|
| `npm run dev` / `build` / `start` | Dev server (Turbopack) / standalone build / run build |
| `npm run lint` | ESLint |
| `npm run db:pgvector` | Enable the pgvector extension on `DATABASE_URL` |
| `npm run db:push` / `db:push:test` | Push schema to dev / test DB |
| `npm run db:seed` | Idempotent seed (upsert by slug) |
| `npm run db:migrate-live` | One-time copy from the legacy Railway DB (`LIVE_DB_URL`) |
| `npm run db:parity` / `db:sync-live-json` | Legacy parity checks / JSON sync |
| `npm run embeddings:reindex` | Re-embed all published apps for Smart Search (tallies `{embedded, skipped, failed}`, exit 0) |
| `npm test` / `test:watch` | Vitest unit + integration suites |
| `npm run e2e` | Playwright (builds the app; AI provider forced to `mock`) |

### Testing

- Vitest suites run against `TEST_DATABASE_URL` (dockerized `qad_test` on :5433); suites share one
  DB and run sequentially (`fileParallelism: false`) with exact-count assertions.
- e2e and CI run with `AI_SEARCH_PROVIDER=mock` — deterministic 768-dim embeddings, zero external
  calls. For the did-you-mean e2e to show a suggestion chip, the dev DB must have embeddings:
  `AI_SEARCH_PROVIDER=mock npm run embeddings:reindex`.

## Environment Variables

Core DB: `DATABASE_URL`, `TEST_DATABASE_URL`, `LIVE_DB_URL` (one-time legacy migration).

Auth/admin: `AUTH_SECRET`, `AUTH_URL`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_API_KEY`.

Media (R2/MinIO): `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`,
`R2_PUBLIC_URL`, `R2_ENDPOINT`, `R2_FORCE_PATH_STYLE`.

Email: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`.

Site/ops: `NEXT_PUBLIC_SITE_URL`, `NOINDEX`, `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN`,
`VIEW_IP_SALT`.

AI smart search:

```bash
AI_SEARCH_PROVIDER=gemini      # gemini | openai | mock
AI_API_KEY=                    # primary key (gemini also accepts GEMINI_API_KEY fallback)
GEMINI_API_KEY=                # used when AI_API_KEY is absent or blank
AI_EMBEDDING_MODEL=models/gemini-embedding-001
AI_BASE_URL=                   # optional; OpenAI-compatible endpoint (…/v1)
```

The vector dimension is fixed at **768** — both providers trim to it (Gemini
`output_dimensionality`, OpenAI `dimensions`), so switching providers requires a full reindex,
not a schema migration.

## Deployment (Railway)

Single Node service running the standalone build. First deploy / Smart Search rollout:

```bash
npm run db:pgvector && npm run db:push   # once, against the prod DATABASE_URL
# set AI_SEARCH_PROVIDER=gemini and AI_API_KEY in the service env
npm run embeddings:reindex               # seed the Smart Search index
```

CI (GitHub Actions) runs lint, pushes the schema to a fresh `pgvector/pgvector:pg16` service
(after enabling the extension) and the Vitest suites; Playwright runs on `main`.

## Documentation

- Foundation design spec: `docs/specs/2026-10-07-nextjs-foundation-design.md`
- Smart Search spec: `docs/specs/2026-10-17-smart-search-design.md`
- Implementation plans: `docs/plans/`
- Legacy reference (read-only): `../quran-apps-directory` — original Django search service under
  `backend/core/services/search/`, docs under `docs/` and `backend/docs/`.
