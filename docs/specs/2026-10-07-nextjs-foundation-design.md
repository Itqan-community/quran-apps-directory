# Design Spec — Quran Apps Directory Next.js Clone (Foundation)

**Date:** 2026-10-07
**Status:** Approved design (brainstorming complete)
**Supersedes:** `docs/nextjs-clone-blueprint.md` (kept as inventory reference)
**Next step:** implementation plan via writing-plans skill

---

## 1. Problem & Goal

The current repo is a messy mono-repo: an Angular 20 frontend at the root and a Django 4.2 backend
in `backend/`, accumulated legacy DRF code, 26 data-fix migrations, three deploy-target configs, and
a public REST API whose only consumer ever was the Angular app (verified: CORS locks to frontend
domains, no mobile/third-party integration, git history shows API features built to serve the SPA).

**Goal:** a clean, single-project full-stack Next.js application (new standalone repository) that
reproduces the entire current product — public bilingual directory site, submission workflow, full
admin, analytics — with the old stack kept frozen as reference and rolled back to until DNS cutover.

**Explicitly NOT the goal:** redesigning the product, porting AI search in v1, keeping the old REST
API contract, keeping Django.

## 2. Decisions (resolved during brainstorming)

| # | Decision | Choice |
|---|---|---|
| D1 | Deliverable flow | Foundation spec first; AI search = later spec |
| D2 | Database/ORM | PostgreSQL + Drizzle ORM (postgres driver), drizzle-kit migrations |
| D3 | Data source | **Fresh DB**; one-time `migrate-live.ts` copies live Railway data; JSON fallback seed |
| D4 | Admin | **Full admin in foundation** (apps CRUD, categories, developers, metadata, submissions review, analytics) |
| D5 | Submission flow | **Full flow in foundation** (public submit + track + admin review) |
| D6 | Ramadan | Keep `/[lang]/ramadan` page; **drop** `RAMADAN_MODE` home-hijack flag |
| D7 | Mock/internal pages | **Drop** `/request` (never had a backend) and `/search-comparison` (debug tool) |
| D8 | Analytics | In foundation: view-event recording + admin charts |
| D9 | Admin auth | Auth.js v5 credentials (`next-auth@beta`); fallback iron-session if blocked |
| D10 | Testing | Vitest (unit) + Playwright (e2e) |
| D11 | Repo | New separate repository, old repo frozen as reference |
| D12 | Architecture | **Pure RSC/server-actions**, no public REST; internal handlers only (see §5) |
| D13 | Styling | Tailwind v4 + design-token CSS variables, shadcn-style components |
| D14 | Deploy | Self-hosted Node (`output: 'standalone'`) on Railway, one service |

## 3. Version Pins (verified via npm, 2026-10-07)

| Package | Version | Note |
|---|---|---|
| `next` | 16.4.0 | App Router, Node runtime |
| `react` | 19.3.0 | |
| `drizzle-orm` / `drizzle-kit` / `postgres` | 0.45.3 / 0.31.11 / 3.4.9 | pgvector extension added later (AI spec) |
| `next-auth` | 5.0.0-beta.32 | **beta — risk R1**, fallback iron-session |
| `zod` | 4.6.5 | |
| `next-intl` | 4.14.9 | |
| `next-themes` | 0.4.6 | dark/light/auto |
| `tailwindcss` | 4.3.3 | v4 CSS-first config |
| `lucide-react` | 1.52.0 | |
| `embla-carousel-react` | 8.6.0 | replaces Swiper |
| `sharp` | 0.35.5 | replaces Pillow |
| `@aws-sdk/client-s3` | 3.1147.0 | R2 (S3-compatible) |
| `@sentry/nextjs` | 11.5.0 | |
| `vitest` / `@playwright/test` | 5.0.3 / 1.63.0 | |

At implementation time, re-check versions (`npm view <pkg> version`) and pin what's current.

## 4. Repository Layout

```
quran-apps-directory-next/
├── src/
│   ├── app/
│   │   ├── layout.tsx               # next/font (Expo Arabic), ThemeProvider, Toaster
│   │   ├── globals.css              # @theme tokens (light/dark), base styles
│   │   ├── not-found.tsx            # bilingual 404
│   │   ├── error.tsx                # global error boundary
│   │   ├── health/route.ts          # GET liveness (+?check_db=true)
│   │   ├── upload/route.ts          # POST media → R2 (XHR progress; auth: session or X-Admin-Key)
│   │   ├── sentry-tunnel/route.ts   # Sentry proxy
│   │   ├── sitemap.ts               # DB-driven, hreflang alternates
│   │   ├── robots.ts                # env-driven noindex for dev/staging
│   │   ├── manifest.ts              # port of manifest.webmanifest
│   │   ├── [lang]/                  # 'ar' | 'en'
│   │   │   ├── layout.tsx           # <html dir lang>, SiteHeader/SiteFooter/SupportWidget
│   │   │   ├── page.tsx             # home (RSC, ISR 1h)
│   │   │   ├── apps/page.tsx        # all apps + filters (URL params, server-rendered)
│   │   │   ├── app/[id]/page.tsx    # detail (id-or-slug, ISR, tag app:{id})
│   │   │   ├── category/[category]/page.tsx
│   │   │   ├── developer/[developer]/page.tsx
│   │   │   ├── submit-app/page.tsx       # client form island → server actions + /upload
│   │   │   ├── track-submission/page.tsx # server-rendered via ?id= / ?email=
│   │   │   ├── ramadan/page.tsx          # static content, no footer
│   │   │   ├── about-us/page.tsx
│   │   │   ├── contact-us/page.tsx
│   │   │   └── opengraph-image.tsx / opengraph-image for dynamic routes
│   │   └── admin/                   # noindex layout, middleware-guarded
│   │       ├── login/page.tsx
│   │       ├── page.tsx                  # dashboard
│   │       ├── apps/page.tsx             # list
│   │       ├── apps/new/page.tsx, apps/[id]/page.tsx
│   │       ├── categories/page.tsx
│   │       ├── developers/page.tsx
│   │       ├── metadata/page.tsx         # types + options editor
│   │       ├── submissions/page.tsx, submissions/[id]/page.tsx
│   │       └── analytics/page.tsx
│   ├── components/
│   │   ├── ui/                      # button, card, badge, input, select, dialog, skeleton…
│   │   ├── site/                    # header (+compact variant), footer, support-widget, lang-toggle
│   │   └── apps/                    # app-card, filters, rating, store-buttons, screenshot-swiper
│   ├── lib/
│   │   ├── repo/                    # ALL data access (framework-agnostic):
│   │   │   ├── apps.ts              # getApps (AND/OR filters, pagination, ordering), getApp(idOrSlug)
│   │   │   ├── categories.ts, developers.ts, metadata.ts, submissions.ts, analytics.ts, admin.ts
│   │   ├── actions/                 # "use server": admin CRUD, submitApp, reviewSubmission, uploadMedia
│   │   ├── services/                # r2.ts, images.ts (sharp), email.ts, view-analytics.ts, arabic.ts
│   │   ├── validation/              # Zod schemas shared by actions + forms
│   │   └── seo/                     # jsonld.ts (10 generators ported), metadata helpers
│   ├── i18n/                        # dictionaries (copied verbatim from old src/assets/i18n)
│   └── proxy.ts                     # lang validation, / → /ar redirect, /admin guard
│                                     # (Next 16 convention: proxy.ts replaces middleware.ts)
├── db/
│   ├── schema.ts                    # Drizzle tables (phase-1 set only)
│   ├── seed.ts                      # idempotent seed (upsert by slug)
│   ├── migrate-live.ts              # one-time live Railway → fresh DB migration
│   └── index.ts                     # drizzle client (pooled, max 10)
├── tests/                           # vitest unit
├── e2e/                             # playwright
├── public/
│   ├── fonts/ExpoArabic-{Book,Medium,Bold}.woff2   # copied from old repo
│   ├── images/                      # favicons, logo, misc SVGs, ramadan assets actually used
│   └── DG-Ghareeb-REG.ttf
├── next.config.ts                   # standalone output, headers (CSP/HSTS/caching), sentry
├── Dockerfile                       # node:22-slim + sharp native deps
├── drizzle.config.ts
├── .env.example                     # full env map (§9)
└── package.json
```

## 5. Architecture & Data Flow

**Rendering strategy per route:**

| Route | Strategy | Revalidation |
|---|---|---|
| home, `/apps`, `/category/*` | RSC + ISR | 1h + tag `apps` on mutations |
| `/app/[id]`, `/developer/*` | RSC + ISR | 24h + `revalidateTag('apps')` / `revalidatePath` |
| static pages, ramadan | RSC static | build time |
| submit-app | client island | — |
| track-submission | RSC (query params) | no-store |
| admin/* | RSC + actions | no-store |

**Data flow:**
- **Reads:** page RSC → `lib/repo/*` → Drizzle. No HTTP hop, no client fetching on public pages.
- **Writes:** form → server action (`lib/actions`) → Zod → repo/service → DB/R2 → typed result `{ok, error?, fields?}` → revalidateTag.
- **View analytics:** app-detail RSC awaits `recordViewEvent()` (writes `app_view_events`: UA parse → device/browser/os; `CF-IPCountry` header; IP hashed with daily-rotating salt; session cookie hash for dedupe). No client JS.
- **Media:** `/upload` route handler (XHR for progress) → `lib/services/images.ts` (sharp: icon 512×512, main 1280×800, screenshots → WebP) → `lib/services/r2.ts` → public URL. Path conventions preserved: `app-icons/{slug}/icon.webp`, `app-images/{slug}/…`. Existing R2 objects stay valid.
- **Search:** keyword only. Header live search → debounced server action → `ilike` on name_en/name_ar/short_descriptions. Arabic normalization ported from `backend/core/utils/arabic.py` (alef/hamza/ta-marbuta folding) applied to both query and indexed text.
- **Filter semantics (must match old behavior):** AND between filter types, OR within one type (CSV values). GIN `@>` containment on the jsonb arrays. Dynamic: any active `metadata_types.name` is a valid query param, read from DB (no code change needed for new types).

## 6. Data Model (`db/schema.ts`)

Helper `baseColumns()` = `id bigserial pk`, `created_at`, `updated_at` (mirrors old `BaseModel`);
`published` mixin adds `status ∈ draft|published|archived`.

| Table | Columns (key ones) | Constraints/Indexes |
|---|---|---|
| `users` | email unique, password_hash, name, is_staff | — |
| `developers` | name_en/name_ar unique, website, email, logo_url, description_en/ar, social_links jsonb, is_verified | idx is_verified |
| `categories` | name_en/ar unique, slug unique, description_en/ar, icon, color hex(7), sort_order, is_active | idx slug, is_active, sort_order |
| `apps` | name_en/ar idx, slug unique, short_description_en/ar req, description_en/ar req, application_icon req, main_image_en/ar req, google_play_link, app_store_link, app_gallery_link, screenshots_en/ar jsonb[], avg_rating numeric(3,2) idx 0–5, review_count idx, view_count idx, sort_order, platform enum text idx (android/ios/web/cross_platform), featured idx, riwayah/mushaf_type/features jsonb[] **GIN**, developer FK CASCADE, status | composite idx (status, featured); ordering `sort_order, name_en` |
| `app_screenshots` | app FK, language en/ar, image URL, sort_order | idx (app, language, sort_order) |
| `metadata_types` | name (regexp `^[a-z][a-z0-9_]*$`) unique = query-param key, label_en/ar, description_en/ar, is_multi_select, sort_order, is_active idx, icon | ordering sort_order |
| `metadata_options` | type FK CASCADE, value slug, label_en/ar, description_en/ar, sort_order, is_active | unique (type, value) |
| `app_metadata_values` | app FK, option FK | unique (app_id, metadata_option_id) |
| `app_submissions` | tracking_id `QAD-` + 6 A-Z0-9 unique, status enum pending/under_review/info_requested/approved/rejected idx, submitter_name/email idx/phone/organization, is_developer, app_name_en/ar, short_description_en/ar (≤150), description_en/ar, 4 store links, categories M2M, developer_name_en/ar, developer_website/email, crawled_content (nullable, AI-spec reuse), app_icon_url, main_image_en/ar, screenshots_en/ar jsonb, additional_notes, content_confirmation, admin_notes, rejection_reason, info_request_message, reviewed_by FK users SET NULL, reviewed_at, created_app FK apps SET NULL | idx (status, created_at) |
| `app_view_events` | app FK, viewed_at idx, referrer, user_agent, session_id idx, country_code(2) idx, ip_hash(64), device_type enum mobile/tablet/desktop/bot/unknown, browser, os | composite idx (app, viewed_at), (app, country_code), (app, device_type) |

**Deferred to the AI-search spec:** `apps.embedding vector(768)`, `apps.crawled_content/crawled_at`,
`app_crawled_data`, `search_embedding_cache`, `assistant_conversations`.

**Seeded metadata (matches old migration 0002):** `riwayah` (11 options: hafs, warsh, qalun, shubah,
alduri, alsusi, hisham, ibn_dhakwan, khalaf, khallad, other), `mushaf_type` (7: madani, uthmani,
indo_pak, moroccan, simple, tajweed, other), `features` (12: offline, audio, translation, tafsir,
bookmarks, search, tajweed, dark_mode, memorization, prayer_times, qibla, notifications).

## 7. Public Site (pages design approved in session)

- Shared chrome: header (logo, Home/About/Contact/Submit App nav, community external button, `ع|EN`
  toggle), scroll-triggered compact header with live search, footer (ITQAN projects links, sponsor),
  support FAQ FAB (4 bilingual Q&As hardcoded as dictionary entries).
- App card: icon, name, developer, short description, rating + review count, platform/featured badges,
  category tags, screenshots swiper (embla). Grid 1/2/3/4 responsive columns.
- App detail: cover by lang, icon + name + developer + rating, category & metadata badges, three store
  download buttons, screenshots swiper, description with newline rendering, developer website card.
- Track submission: `?id=QAD-XXXXXX` or `?email=` renders status timeline server-side.
- Submit app: multi-step client form (App Info → Developer → Media → Review) with auto-fill from store
  URLs (`fetch` + `cheerio` in an action; AI extraction deferred), media upload with progress,
  category multi-select, tracking-ID success screen.
- All strings from i18n dictionaries; RTL via logical Tailwind properties; dark/light/auto theme.

## 8. Admin (auth design approved in session)

- Auth.js v5 credentials; single seeded staff user; middleware guard on `/admin/*`; `X-Admin-Key`
  alternative for `/upload` used by scripts.
- Submission review lifecycle mirrors old Django Admin: approve → transactional App creation
  (bilingual fields, media, categories, developer upsert) + email; reject → reason email; request-info
  → message email. Emails via `lib/services/email.ts` (console backend in dev, SMTP in prod).
- Admin mutations call `revalidateTag('apps')` and revalidate affected paths; app save regenerates slug
  only when name changes and collision-resolves (old `save()` logic).
- Analytics screen: views/day 30d, top apps, country + device breakdown — plain SVG/CSS charts.

## 9. SEO, i18n, Infra, Env

- Metadata API per page; JSON-LD generators ported (WebSite, Organization, FAQPage, ItemList,
  CollectionPage, BreadcrumbList, SoftwareApplication + enhanced variant, Developer/Organization).
- `app/sitemap.ts` DB-driven with hreflang; `app/robots.ts` env-driven; `manifest.ts` ported.
- OG images via `ImageResponse` (Node runtime) for home/category/app/developer routes.
- `next.config.ts` headers: immutable static assets, 7d for R2 images, CSP
  (`default-src 'self'; img-src 'self' data: blob: https:; style-src 'self' 'unsafe-inline';
  connect-src 'self' https:; worker-src 'self' blob:; font-src 'self' data:`), HSTS 1y,
  X-Frame-Options DENY, Referrer-Policy strict-origin-when-cross-origin.
- Env map: `DATABASE_URL`, `AUTH_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_API_KEY`,
  `R2_ACCOUNT_ID/R2_ACCESS_KEY_ID/R2_SECRET_ACCESS_KEY/R2_BUCKET/R2_PUBLIC_URL`,
  `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN`, `NEXT_PUBLIC_SITE_URL`, `SMTP_HOST/PORT/USER/PASS/FROM`,
  `LIVE_DB_URL` (one-time migration), `NOINDEX` (dev/staging).

## 10. Error Handling

- Server actions return typed results; Zod failures map to field errors on forms.
- `error.tsx` boundaries per route group (bilingual message + retry); global Sentry capture both sides.
- No silent fallbacks: DB/upload errors surface as user-visible errors with retry.
- `/health?check_db=true` returns 503 when DB unreachable.

## 11. Testing & Verification

- **Vitest:** repo filter semantics (AND/OR, CSV, GIN), id-or-slug lookup, pagination/ordering;
  actions (validation, tracking-ID generation, approve→App transaction, slug collision); images (sharp
  outputs); arabic normalization; email provider selection.
- **Playwright:** public smoke (home EN/AR, category filter, detail render, submit→track roundtrip),
  admin smoke (login, create app with image upload, approve seeded submission), RTL spot-checks.
- **Seed parity check:** script asserts app count == 44 and spot-fields (slugs, ratings, icons) match
  live data; CI runs lint + vitest on PR, Playwright on main.

## 12. Success Criteria

1. Every URL in the old sitemap resolves on the clone with 200 (minus dropped `/request`,
   `/search-comparison`), equivalent SEO tags and JSON-LD.
2. Side-by-side visual parity (EN+AR, light+dark) for home/category/detail/submit/track/admin.
3. Admin covers 100% of Django Admin's operational surface used today.
4. Post-seed: a parity-check script verifies 44 published apps in the fresh DB with preserved slugs
   and matching ratings/icons/categories vs live data.
5. View analytics records device/country data comparable to old events.
6. Lighthouse perf/SEO/a11y ≥ old production baseline.

## 13. Risks

| # | Risk | Mitigation |
|---|---|---|
| R1 | next-auth v5 is beta; possible Next 16 incompatibilities | Fallback: hand-rolled iron-session, same middleware guards (1-day swap, isolated to `lib/auth.ts` + middleware) |
| R2 | Live DB schema drift vs old migrations | `migrate-live.ts` reads via explicit column lists; parity check fails loudly |
| R3 | Slug/URL loss breaking external shares | Preserve original slugs verbatim; never regenerate |
| R4 | sharp/Pillow visual differences | Golden-image tests for pipeline outputs (dimensions/format/WebP size bound) |
| R5 | Token drift from real site | Tokens extracted programmatically from `themes.scss`/`global_styles.css` at scaffold time |
| R6 | ISR staleness after admin edits | Every mutation path ends with explicit revalidateTag/Path; ISR is only a safety net |

## 14. Out of Scope (later specs)

1. **AI Search spec:** pgvector + Gemini embeddings, hybrid ranking (IDF/metadata boosts), facets,
   match_reasons, typo suggestion, reindex/sync-r2 admin jobs, `apps.crawled_content`.
2. **Dalil Assistant spec:** question bank, recommend/select-app, conversations table.
3. PWA service worker runtime caching (manifest ships now).
4. GA4 analytics wiring (view events are DB-based; GA optional later).

## 15. Rollout

1. Stand up Railway service at `next.quran-apps.itqan.dev` with fresh DB; deploy via Dockerfile.
2. Run `migrate-live` from a production dump copy → parity check green.
3. Side-by-side QA old vs new (EN+AR, light+dark).
4. DNS cutover; old stack stays reachable at its Railway URL for instant rollback.
5. Archive old repo to a branch; update docs/CLAUDE.md.

*End of spec.*

---

## 16. Plan 2 Amendments (implemented 2026-10-08)

1. **View analytics beacon**: recorded via internal `POST /view` handler from a client
   `<ViewTracker/>` on the detail page — not a synchronous RSC write. ISR caching would
   otherwise record once per revalidation instead of per visit. Session id comes from the
   `qad_vid` cookie set by `proxy.ts`.
2. **Category pages are top-level `/{lang}/{category}`** (spec §4 tree updated): sitemap and
   external links depend on it. Implemented via `(site)/[category]/page.tsx`; static segments
   (`apps`, `about-us`…) win over the dynamic catch-all naturally.
3. **next-intl**: custom routing via `src/i18n/request.ts` + `getLang()` per section
   (`setRequestLocale`); no intl middleware (proxy handles only bare-root redirect + admin).
4. **cacheComponents interactions** (Next 16.4):
   - Legacy `export const revalidate` is forbidden; ISR done with `"use cache"` +
     `cacheLife("hours")` + `cacheTag("apps")` wrappers in `src/lib/cache/*`.
   - Filter/metadata/category data cached the same way; notFound() before streaming yields a
     real 404 only for whole-route misses (`global-not-found`); unknown *category* and app
     params stream a soft-200 in-app not-found view — matches old SPA behavior; invalid
     *locales* (`/fr`) return true 404.
5. **Arabic-normalized search**: SQL-side `translate()` fold on `name_ar` + TS-side query
   normalization (covers tashkeel in the query); description-level folding deferred (unaccent).
6. **Route groups**: `(site)` carries header/footer/support chrome; `(ramadan)` ships its own
   footer (old `hideFooter` semantics) — spec §4 tree stays conceptual.
7. **Sitemap**: DB-driven with hreflang alternates; app URLs by slug; category slugs lowercase
   (matches live DB; old sitemap's TitleCase entries were legacy); `/request` dropped (D7),
   `/apps` + `/ramadan` added.
8. **Developer URL contract**: `/{lang}/developer/{name-slug}_{id}` (or bare `{name-slug}`);
   shared helper `devUrlParam` in `lib/repo/developers.ts`.
9. **OG images**: `ImageResponse` with TTF font (satori cannot read woff2; DG-Ghareeb TTF ships
   for OG text rendering). Legacy `export const runtime` removed (incompatible with
   cacheComponents).
10. **Playwright**: standalone server needs `.next/static` + `public` copied into
    `.next/standalone/` before start; e2e webServer command does that. Auth.js requires
    `trustHost: true` behind proxies.

*Amendment end.*
