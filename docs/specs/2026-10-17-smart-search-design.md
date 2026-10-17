# Design Spec — Smart (RAG) Hybrid Search

**Date:** 2026-10-17
**Status:** Approved design (brainstorming complete)
**Builds on:** `2026-10-07-nextjs-foundation-design.md` (§6 reserved table/column slots, §14 deferred items)
**Next step:** implementation plan via writing-plans skill

---

## 1. Problem & Goal

The frozen legacy mono-repo (`/home/muhammad/Work/itqan/quran-apps-directory`, reference only) ships a
"Smart Search" RAG feature: apps are embedded into a pgvector store and user queries run through a
hybrid pipeline (semantic similarity + IDF keyword scoring + metadata/quality boosts) with soft
filtering, facets, typo suggestions, and a keyword-only fallback. The foundation port already
staged UI stubs for it (Smart tab in `hero-search.tsx`, "Try Smart Search" in `no-results.tsx`,
i18n strings) and reserved the DB slots (`apps.embedding vector(768)`, `search_embedding_cache`),
but the engine was deferred to this spec.

**Goal:** reproduce the legacy hybrid-search behavior in the Next.js app — bilingual (ar/en),
meaning-based results on the existing `/apps` page via the already-present Traditional/Smart tabs —
without introducing a REST API, crawler, assistant, or managed-RAG dependency.

**Explicitly NOT the goal:** Google Play/App Store crawling, the Dalil assistant/questionnaire,
Cloudflare AutoRAG/R2 sync, LLM rerank `ai_reasoning` (unused in legacy flow), search-comparison
debug page, or changing the Traditional (keyword) search behavior.

## 2. Decisions (resolved during brainstorming)

| # | Decision | Choice |
|---|---|---|
| S1 | Scope | Core hybrid search only: ingestion/embedding + hybrid ranking + facets/match_reasons/typo-suggestion + fallback mode. No crawler, no assistant, no AutoRAG, no LLM reranker |
| S2 | Embedding provider | Provider abstraction (legacy `factory.py` pattern): Gemini default (`models/gemini-embedding-001`, 768-dim), OpenAI-compatible selectable by env, deterministic mock for tests/dev |
| S3 | Result delivery | URL-driven page state: `/[lang]/apps?search=…&mode=smart` served by the existing server component + `AppsListing` (per D12: no REST, no client-fetch results UI) |
| S4 | Class structure | Lean TS port (flat `src/lib/ai/` modules), not a 1:1 Django class hierarchy; not SQL-side ranking |
| S5 | Filter semantics in Smart mode | Soft filtering only: filters augment the query (bilingual labels) and boost ranking — never hard-exclude (legacy parity; hard exclusion stays the Traditional tab's behavior) |
| S6 | Vector dimensions | Fixed `vector(768)`: Gemini truncates via `output_dimensionality=768`; OpenAI accepts `dimensions=768` (Matryoshka); either provider fits the same column as the reserved schema slot |
| S7 | External text enrichment | No crawler; optionally reuse the already-existing `app_submissions.crawled_content` of the submission that created an app at ingestion time |
| S8 | Embedding trigger points | Non-fatal hook on `approveSubmission`, admin panel "Regenerate embeddings" action, and `npm run embeddings:reindex` CLI script |

## 3. Dependencies & Version Notes

No new runtime npm package is required: Gemini uses native `fetch` against
`generativelanguage.googleapis.com`, and OpenAI-compatible providers use the same native `fetch`
pattern (no `openai` SDK — decision, not an option). Drizzle 0.45.3 already
ships `pg-core/columns/vector_extension/vector` (`vector(name, {dimensions})`) and
`sql/functions/vector` (`cosineDistance()`); no drizzle upgrade needed. Re-check exact symbols
against `node_modules/drizzle-orm` at implementation time.

## 4. Reference Implementation (legacy, frozen)

| Legacy file | What to port |
|---|---|
| `backend/core/services/search/service.py` → `prepare_app_text()` | Bilingual app document format (§6) |
| `service.py` → `hybrid_search()` | Pipeline order, weights, cutoff, pool size (§7) |
| `service.py` → `_augment_query_with_filters()` | Soft-filter query augmentation (§7.2) |
| `core/utils/arabic.py` | Alias map + Levenshtein typo suggestion; reuses new `lib/services/arabic.ts` |
| `core/services/search/providers/gemini.py` / `openai.py` | Provider request shapes (task_type, dimensionality) |
| `core/models.py` → `SearchEmbeddingCache` | SHA-256-keyed cache, 7-day TTL (§5) |
| `apps/management/commands/reindex_embeddings.py` | Bulk reindex semantics (idempotent via doc hash) |
| `docs/AI_SEARCH_SETUP.md`, `docs/API_SEARCH_USAGE.md`, `docs/stories/ai-search/ai-search.md` | Behavioral reference ("Librarian" retrieval + note: "Professor" LLM rerank was implemented but unused — excluded per S1) |

## 5. Data Model (`db/schema.ts` additions)

- `apps.embedding` — `vector("embedding", { dimensions: 768 })`, nullable. `NULL` = not indexed
  (row is simply absent from vector retrieval; everything else works).
- `apps.doc_hash` — `text`, nullable: SHA-256 of the built document; drives idempotent reindex skips.
- `apps.embedded_at` — `timestamptz`, nullable.
- New table `search_embedding_cache`:
  - `query_sha256 text PRIMARY KEY` (hash includes model name),
  - `embedding vector(768) NOT NULL`, `model text NOT NULL`,
  - `created_at timestamptz` default now.
  A hit with `created_at` older than 7 days is treated as a miss: re-embed synchronously (single
  call, ~hundreds of ms) and update the row; prune stale rows opportunistically on miss
  (legacy 7-day TTL).
- Migration script must run `CREATE EXTENSION IF NOT EXISTS vector` (drizzle-kit push creates
  columns/tables but not extensions; docker image `pgvector/pgvector:pg16` ships the binary).
- HNSW index on `apps.embedding` (`<=>` ops, m=16) — harmless at ~44 rows, future-proofs growth.
- `postgres` driver runs with `prepare: false` (foundation D2/`db/index.ts`) — all pgvector queries
  go through Drizzle's regular SQL builders, which stay compatible.

## 6. AI Layer (`src/lib/ai/`)

- `types.ts` — `EmbeddingProvider { name; dimensions: 768; embedDocument(text): number[];
  embedQuery(text): number[] }` (legacy `retrieval_document` / `retrieval_query` distinction).
- `providers/gemini.ts` (default) — POST `models/gemini-embedding-001:embedContent`,
  `task_type=retrieval_document|retrieval_query`, `output_dimensionality=768`.
  Key: `AI_API_KEY` or `GEMINI_API_KEY`; model overridable via `AI_EMBEDDING_MODEL`.
- `providers/openai.ts` — POST `/v1/embeddings`, model default `text-embedding-3-small` with
  `dimensions: 768`; `AI_BASE_URL` override enables DeepSeek-style compatible endpoints.
- `providers/mock.ts` — deterministic hash-derived 768-dim vector; used by Vitest/e2e/CI and local
  dev without keys via `AI_SEARCH_PROVIDER=mock`.
- `provider.ts` — factory on `AI_SEARCH_PROVIDER` (`gemini|openai|mock`). Misconfiguration raises
  a typed error at call time — callers convert it into `fallback_mode`, never a 500.
- `ingest.ts`:
  - `buildAppDocument(app)` — port of `prepare_app_text()`; bilingual structured document:
    `[APP] name_en | name_ar` · `[CATEGORIES] en | ar` · `[DEVELOPER] (+ [VERIFIED DEVELOPER])` ·
    `[SHORT DESC EN/AR]` · `[FULL DESC EN/AR]` (each truncated to 1000 chars) · `[PLATFORM]
    (+ store availability phrasing)` · `[QUALITY] rating/reviews/popularity phrasing` ·
    `[FEATURED]` · metadata sections `[RIWAYAH]`, `[FEATURES]`, `[MUSHAF]` as bilingual labels
    from `metadata_types`/`metadata_options` · optional `[EXTERNAL]` from the originating
    `app_submissions.crawled_content` (≤2000 chars, per S7).
  - `upsertAppEmbedding(appId)` — load app bundle (developer, categories, metadata values,
    submission crawled_content) → build doc → hash → skip if `doc_hash` matches → embed → write
    `apps.embedding`, `doc_hash`, `embedded_at`.
- Reindex surfaces (S8):
  - `approveSubmission` (`src/lib/actions/admin-submissions.ts`): after the published app row
    exists, call `upsertAppEmbedding` inside try/catch — failure logs to Sentry, never blocks
    approval.
  - Admin action `reindexAllEmbeddings()` ("Regenerate embeddings" button in the admin apps-list
    toolbar, wired via same pattern as other admin service actions): re-embeds published apps
    (new/changed first), admin-guarded, returns counts.
  - `scripts/reindex-embeddings.ts` + `npm run embeddings:reindex` for deploys (legacy
    `reindex_embeddings --quick` equivalent; no rate-limit gymnastics — 1 call per changed app).

## 7. Hybrid Search Pipeline

`src/lib/ai/rank.ts` (pure functions, unit-testable) + `src/lib/repo/smart-search.ts` (DB access):

1. **Normalize & suggest** — `normalizeArabic()` (existing service); `suggestQueryCorrection()`:
   alias file (`wersh→warsh`, `kuran→quran`, `قران→قرآن`, …; conservative port of legacy map) +
   Levenshtein distance ≤ 2 against a DB-built vocabulary (app-name tokens + metadata labels,
   cached). Output becomes `suggested_query` (informational chip only, never auto-rewrites).
2. **Soft-filter augmentation** — for each active filter (riwayah, mushaf_type, features, platform,
   category, dynamic metadata values) append bilingual label(s) to the embedding input, e.g.
   `quran [Filter: Warsh (ورش) riwayah]`. No hard ORM conditions (S5). `rank.ts` also records
   per-query metadata keywords for the boost step.
3. **Query embedding (cached)** — `embedQuery(augmented)`; lookup `search_embedding_cache` by
   SHA-256(model + augmented query); miss inserts; >7d refreshes.
4. **Vector retrieval** — `cosineDistance(apps.embedding, q)` over `status=published AND embedding
   IS NOT NULL`, ordered ascending by distance, top **100** (legacy pool size; 44 apps ⇒ full set).
5. **TS re-rank** — for candidates (hydrated with developer/categories/metadata):
   - `keyword_score`: tokenized normalized query × IDF weights over the candidate set; field
     priorities name 0.5 / full-desc 0.25 / short-desc 0.15 / category 0.15.
   - `metadata_boost`: +0.25 per matched metadata keyword (cap 2.0, normalized); matches produce
     `match_reasons: {type, value, label_en, label_ar}`.
   - `quality_boost`: `avg_rating` + `review_count` + popularity, normalized.
   - `combined = 0.35·vector_sim + 0.40·keyword + 0.15·metadata + 0.10·quality`; when embeddings
     are unavailable, keyword path redistributes to `0.55/0.25/0.20` (legacy exact fallback
     weights).
6. **Cutoff** — keep apps with `combined ≥ 0.35` (only when embeddings exist and contributed).
7. **Pagination & facets** — page/pageSize slice of the ranked pool (top-100 after cutoff; results
   beyond the pool are unreachable in Smart mode — identical to legacy behavior); `facets` =
   per-option counts across published apps for the filters bar (metadata options + platform),
   SQL-side, short-lived cache (legacy shape `FacetValue {value,label_en,label_ar,count}`).
   Page numbers beyond the pool result in the normal empty-page state (legacy returned 0 results
   there identically).

`src/lib/cache/smart-search.ts` wraps the repo call following the foundation pattern
(`"use cache"` + `cacheLife("hours")` + `cacheTag("apps")` keyed by version input — follows the
existing `getAppsCached` signature conventions; admin mutations already call `revalidateTag("apps")`).

## 8. UI Integration

- `hero-search.tsx`: Smart tab navigates to `/{lang}/apps?search={q}&mode=smart`
  (router transition pending state replaces the 900ms fake spinner; Traditional tab unchanged,
  navigates without `mode`).
- `/[lang]/apps/page.tsx`: when `mode=smart` branch to the smart repo call; else existing
  `getAppsCached` path. Same `AppsListing` renders both — no duplicated result UI.
- `AppsListing` smart-mode extras: "Did you mean X?" chip linking to the corrected query;
  ≤3 localized `match_reasons` chips per card; subtle fallback info banner when
  `fallback_mode=true`; card ordering is ranking order (Traditional's sort controls don't apply).
- `no-results.tsx`: "Try Smart Search" button → `?search={q}&mode=smart` (real wiring, replacing
  the dead link); empty Smart state switches back to Traditional (searching state).
- `compact-search.tsx` (header): unchanged, traditional behavior.
- i18n: new keys under `appList.search.*` / `empty.*` in `src/i18n/en.json` + `ar.json`:
  did-you-mean, fallback banner, match-reason label prefix, smart-empty hint. Existing smart tab /
  smart-hint strings already present.

## 9. Env & Infra

`.env.example` additions (documented): `AI_SEARCH_PROVIDER` (`gemini` default per S2), `AI_API_KEY`
(+optional `GEMINI_API_KEY`), `AI_BASE_URL` (OpenAI-compatible override), `AI_EMBEDDING_MODEL`.
No new deployment target; Railway single service unchanged; CI needs no new services (pgvector
image already there; e2e/unit run with `AI_SEARCH_PROVIDER=mock`, zero external calls).

## 10. Error Handling

- Provider unconfigured/unreachable at query time → `fallback_mode: true` → existing keyword path
  (`getAppListRows`) still filters/ranks lexically; UI banner; Sentry event.
- Embedding **generation** failure during reindex/approval → logged (Sentry), app left un-embedded,
  approval flow unaffected; next reindex retries (idempotent via `doc_hash`).
- `search_embedding_cache` inserts are best-effort (failure = uncached query, search still works).
- Empty embedding pool (migration run but reindex not yet run) → automatic fallback_mode.
- Published-app data changes do not need explicit invalidation beyond `revalidateTag("apps")` –
  smart results wrapped in the same tag as the listing, so admin edits auto-clear both.

## 11. Testing & Verification

- Unit (Vitest, no DB): `rank.ts` — tokenization, IDF, field priority weights, metadata boost cap,
  combined weights for both weighted and fallback distributions, 0.35 cutoff, `match_reasons`
  production; `suggest.ts` — alias map + Levenshtein threshold (mirror of existing
  `tests/arabic.test.ts` style); `ingest.ts` — document builder snapshot on seeded fixtures.
- Integration (Vitest vs dockerized pgvector test DB `:5433`, `AI_SEARCH_PROVIDER=mock`):
  `upsertAppEmbedding` writes hash/vector/idempotent second run skip; cosine ordering matches
  expected for crafted seed vectors; cache hit/miss/refresh; facets counts; pagination slices;
  fallback-mode route when the provider is unconfigured (env unset in a test scenario).
- SQL sanity: all pgvector statements go through Drizzle SELECT builders (plain queries, no
  prepared statements) so the `prepare: false` driver constraint stays satisfied; add a smoke
  assertion in the integration suite that the smart repo search executes against the
  `prepare:false` client without error.
- e2e (Playwright, mock provider): Smart tab navigation produces `mode=smart` URL with ranked
  results, did-you-mean chip appears for a known typo (e.g. `wersh`), match-reason chips render,
  and Smart's empty state offers switching back to Traditional. Fallback-mode UI is covered by
  integration tests (env-dependent behavior is slow/flaky to force in Playwright); Traditional
  flows are already covered by existing e2e and remain untouched.
- Manual verification script in plan docs: seed typo query, filter+query combo, empty state,
  and a fallback check with an intentionally invalid API key (staging).

## 12. Success Criteria

1. Smart tab on `/apps` returns meaning-based results for paraphrased/no-keyword queries in both
   `ar` and `en` (e.g. a plain-Arabic query like "قارئ قرآن للأطفال يشتغل بدون إنترنت" surfaces a
   kids' offline quran app even though those exact tokens never appear in its description — the
   legacy goal of finding apps by meaning, not exact words).
2. Behavior parity with legacy: soft-filter augmentation, IDF+metadata+quality ranking weights,
   0.35 cutoff, top-100 pool, facets, match_reasons, suggested_query, fallback_mode.
3. No regression in Traditional search; admin approval still publishes apps even when the
   embedding step fails; reindex is idempotent (~44 apps, one changed-app lookup each).
4. `mode=smart` URLs render with zero client-side result fetching (D12) and share/SEO cleanly.
5. Traditional keyword pipeline untouched (its only change is the "Try Smart Search" link target
   in `no-results.tsx`, which was already dead before this spec).

## 13. Risks

| Risk | Mitigation |
|---|---|
| Provider API drift / key quota | Provider abstraction + default Gemini; mock provider keeps CI independent; fallback mode keeps UX alive |
| Dimension mismatch if a provider can't honor 768 | Providers must assert `dimensions === 768` at build/first call; misconfig → typed error → fallback |
| Next 16 `cacheComponents` interplay with searchParams | Follow existing `apps/page.tsx` `instant:false` + version-keyed `"use cache"` pattern; verify with cached-function args, not `cookies/headers` |
| Arabic tokenization accuracy vs legacy Python pipeline | Port normalization + alias file + Levenshtein faithfully; unit tests pin behavior; iterate thresholds later via parity tests against legacy outputs |
| pgvector ordering stability with equal scores | Tie-break by `sort_order, name_en` (legacy similarly paginated a deterministic pool) |

## 14. Out of Scope (later specs)

- App crawler (`AppCrawler`, `app_crawled_data`) and scheduled re-crawl.
- Dalil assistant (`assistant_conversations`, questionnaire endpoints) — candidate for its own spec.
- Cloudflare AutoRAG/R2 export path (`sync_to_r2`, `use_cf` param) — dropped as stale even legacy.
- LLM rerank / `ai_reasoning` text ("Professor") — unused in final legacy flow.
- Semantic boosting of app detail/content pages; header live suggestions via
  `searchSuggestions()` (stub exists) — separate small follow-up if wanted.

## 15. Rollout

1. Migration (extension + columns + table + index) via drizzle-kit.
2. Deploy with provider env set (`AI_SEARCH_PROVIDER=gemini`, `AI_API_KEY`).
3. `npm run embeddings:reindex` once (Railway shell) — ~44 embeddings.
4. Verify Smart tab queries (ar/en), fallback by temporarily removing key in staging.
5. CI/e2e green (mock provider); ship.
