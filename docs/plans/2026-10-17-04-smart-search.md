# Smart (RAG) Hybrid Search Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port the legacy Django hybrid-search (embeddings + IDF keyword + metadata/quality ranking, soft filters, suggestions, fallback) into the Next.js app behind the existing Smart tab.

**Architecture:** Lean TS port under `src/lib/ai/` (provider factory → ingestion → pure ranking → repo orchestration), pgvector `vector(768)` in the existing Postgres via Drizzle, URL-driven `mode=smart` results rendered by the existing `AppsListing`, keyword-only fallback on any provider failure.

**Tech Stack:** Next 16.4 (cacheComponents), React 19, Drizzle 0.45.3 (`vector()`, `cosineDistance()`), Postgres 16 + pgvector, Vitest + Playwright, native `fetch` (no AI SDK).

**Spec:** `docs/specs/2026-10-17-smart-search-design.md` — read it first; this plan argues from it.

**Legacy reference (read-only):** `/home/muhammad/Work/itqan/quran-apps-directory` — `backend/core/services/search/service.py` (`hybrid_search` ~lines 424–547, `prepare_app_text`, `_augment_query_with_filters`), `backend/core/utils/arabic.py` (alias map), `backend/apps/api/schemas.py` (response shapes). Consult for behavior details; the spec + tests here pin the contract.

## Global Constraints

- Next 16 is NOT like your training data: consult `node_modules/next/dist/docs/` before touching caching/prefetching (AGENTS.md rule).
- `"use cache"` lives only in `src/lib/cache/*` (existing convention in `cache/apps.ts` comments); `src/lib/repo/*` stays framework-agnostic and uncached.
- No public REST API (foundation D12): results are server-component consumed only.
- **No new npm runtime dependencies.** Gemini/OpenAI-compatible providers via native `fetch`.
- Vector dimension is fixed **768** everywhere (column `embedding`, providers truncate/matryoshka to 768).
- `db/index.ts` Postgres client runs `prepare:false` — all pgvector statements through Drizzle builders (plain SELECTs), no prepared statements.
- Exact env names (document in `.env.example`): `AI_SEARCH_PROVIDER` (`gemini` default | `openai` | `mock`), `AI_API_KEY` (optional `GEMINI_API_KEY` override), `AI_EMBEDDING_MODEL` (default `models/gemini-embedding-001`), `AI_BASE_URL` (optional, OpenAI-compatible).
- All user-visible copy goes through `src/i18n/en.json` **and** `ar.json`.
- Arabic text handling uses `normalizeArabic()` from `@/lib/services/arabic` (exist, do not reimplement).
- Deterministic embedding in CI/e2e: `AI_SEARCH_PROVIDER=mock`.
- Legacy parity constants (single source of truth, defined once in `src/lib/ai/rank.ts`): weights `{vector:.35, keyword:.40, metadata:.15, quality:.10}`, fallback `{keyword:.55, metadata:.25, quality:.20}`, field priorities `{name:.5, full:.25, short:.15, category:.15}`, metadata step `+0.25` cap `2.0`, cutoff `0.35`, pool `100` (spec §7).

## Review Focus

Inputs no task's unit tests naturally exercise — each line names the input and the expected behavior; the test that pins it is written into the owning task.

1. **Query with only punctuation/whitespace (or >2000 chars):** must not throw or call providers with garbage; tokenize→empty ⇒ keyword contributes 0, embedding input truncated to 2000 chars, page still renders (→ Task 3 unit + Task 6 integration test).
2. **App rows with empty `description_en/ar` or `""` short descriptions (allowed by NOT NULL):** document builder must skip empty sections gracefully and never emit `null`/`undefined` into a template; search still works name-only (→ Task 5 unit fixture).
3. **Two identical smart searches in flight concurrently (cache stampede):** second insert of same `query_sha256` must be an upsert, not a PK crash (→ Task 6 integration test with two parallel calls).
4. **Provider returns malformed JSON / missing `embedding.values`:** must throw the typed unavailable error → `fallback_mode`, never a silent `undefined` vector (→ Task 2 unit test).
5. **`did-you-mean` chip hrefs carrying decoded Arabic (`?search=ورش`):** must be percent-encoded once and stable across the smart nav, e2e asserts the rendered href (→ Task 8 e2e).

Facet note (spec §7.7): the overview counts the filters bar needs **already exist** in `getMetadataValues()` (published-scoped `count`, bilingual labels, cached in `lib/cache/metadata.ts`) and the bar itself is not yet mounted — so the pipeline adds **no new facets code**; Task 6 verifies with a test-inspection step that `getMetadataValuesCached()` is what any future bar consumes. Legacy `FacetValue` ≌ `MetadataValue`.

---

### Task 1: Schema — pgvector columns, cache table, extension, npm scripts

**Files:**
- Modify: `db/schema.ts` (apps table block lines 73–125; new table after `appMetadataValues`)
- Create: `db/enable-pgvector.ts`
- Modify: `package.json` (scripts only)
- Test: `tests/schema.test.ts` (extend)

**Interfaces:**
- Consumes: nothing new.
- Produces (all later tasks import): `apps.embedding` (`vector("embedding", { dimensions: 768 })`, nullable), `apps.docHash` (`text("doc_hash")`, nullable), `apps.embeddedAt` (`timestamp("embedded_at", { withTimezone: true })`, nullable); new exported table `searchEmbeddingCache = pgTable("search_embedding_cache", { querySha256: text("query_sha256").primaryKey(), embedding: vector("embedding", { dimensions: 768 }).notNull(), model: text("model").notNull(), createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull() })`. Drizzle import in `db/schema.ts`: add `vector` to the existing `drizzle-orm/pg-core` import list.

- [ ] **Step 1: Write the failing test — append to `tests/schema.test.ts`**

```ts
// New describe block; uses TEST_DATABASE_URL pattern like tests/apps-repo.test.ts
describe("smart-search schema", () => {
  it("apps.embedding columns exist and cache table holds 768-dim vectors", async () => {
    const sql = postgres(process.env.TEST_DATABASE_URL!);
    // column presence: select reads must not raise
    await expect(sql`
      SELECT doc_hash, embedded_at FROM apps WHERE embedding IS NULL AND status='published' LIMIT 1
    `).resolves.toBeDefined();
    // dimension proof: insert a real 768-dim vector, read it back
    const vec = `[${Array.from({ length: 768 }, (_, i) => (i % 2 ? 0 : 1)).join(",")}]`;
    const ins = await sql`
      INSERT INTO search_embedding_cache (query_sha256, embedding, model)
      VALUES ('t-cache-1', ${vec}::vector, 'test') RETURNING embedding::text`;
    expect(ins[0].embedding.split(",").length).toBe(768);
    await sql`DELETE FROM search_embedding_cache WHERE query_sha256='t-cache-1'`;
    await sql.end();
  });
});
```

(Copy the `postgres` import pattern from `tests/apps-repo.test.ts:2-5` if missing in the file.)

- [ ] **Step 2: Run to verify it fails**

Run: `npm run test -- tests/schema.test.ts`
Expected: FAIL — relation/column does not exist.

- [ ] **Step 3: Implement schema + extension bootstrap**

`db/schema.ts`: add the three `apps` columns and the `search_embedding_cache` table exactly as in Produces. In `(t) => [...]` of `apps` add HNSW index: `index("apps_embedding_hnsw").using("hnsw", t.embedding.op("vector_cosine_ops"))`.

`db/enable-pgvector.ts` — executable via `node --experimental-strip-types --env-file=...` (mirror how `db/seed.ts` opens its connection; use `postgres(process.env.DATABASE_URL!)` + `await sql\`CREATE EXTENSION IF NOT EXISTS vector\``) then log "pgvector ready".

`package.json` scripts: add
`"db:pgvector": "node --experimental-strip-types --env-file=.env.local db/enable-pgvector.ts"`.

- [ ] **Step 4: Apply to test DB and verify pass**

Run: `DATABASE_URL=postgres://postgres:postgres@localhost:5433/qad_test node --experimental-strip-types db/enable-pgvector.ts && npm run db:push:test && npm run test -- tests/schema.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add db/schema.ts db/enable-pgvector.ts package.json tests/schema.test.ts
git commit -m "feat(ai): pgvector schema for app embeddings and query cache"
```

---

### Task 2: Provider layer — types, mock, gemini, openai, factory, env docs

**Files:**
- Create: `src/lib/ai/types.ts`, `src/lib/ai/providers/mock.ts`, `src/lib/ai/providers/gemini.ts`, `src/lib/ai/providers/openai.ts`, `src/lib/ai/provider.ts`
- Modify: `.env.example`
- Test: `tests/smart-provider.test.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces (exact):

```ts
// types.ts
export interface EmbeddingProvider {
  readonly name: "gemini" | "openai" | "mock";
  readonly dimensions: number; // always 768
  embedDocument(text: string): Promise<number[]>;
  embedQuery(text: string): Promise<number[]>;
}
export class EmbeddingUnavailableError extends Error {} // unconfigured, unreachable, malformed
```

```ts
// provider.ts
export function getEmbeddingProvider(): EmbeddingProvider;      // picks by AI_SEARCH_PROVIDER (default "gemini")
export function aiSearchVersion(): string;                       // `${provider.name}:${model or "gemini"}` — used as cache-key ingredient
```

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { EmbeddingUnavailableError } from "@/lib/ai/types";
import { getEmbeddingProvider, aiSearchVersion } from "@/lib/ai/provider";
import { MockProvider } from "@/lib/ai/providers/mock";

const env = (v: Record<string, string | undefined>) =>
  vi.stubEnv("AI_SEARCH_PROVIDER", v.p!) && vi.stubEnv("AI_API_KEY", v.key ?? "");

it("mock is deterministic, length 768, unit-ish; document vs query differ by task tag", async () => {
  const p = new MockProvider();
  const a = await p.embedQuery("ورش");
  const b = await p.embedQuery("ورش");
  expect(a).toEqual(b); expect(a).toHaveLength(768);
  expect(a).not.toEqual(await p.embedDocument("ورش"));
});

it("factory picks by env; unknown/unconfigured -> EmbeddingUnavailableError at call time", async () => {
  env({ p: "mock" }); expect(getEmbeddingProvider().name).toBe("mock");
  env({ p: "" }); // gemini default, no key
  await expect(getEmbeddingProvider().embedQuery("q"))
    .rejects.toBeInstanceOf(EmbeddingUnavailableError);
});

it("gemini: POST embedContent with taskType + outputDimensionality=768; malformed body -> typed error", async () => {
  env({ p: "gemini", key: "K" });
  const fetchMock = vi.fn().mockResolvedValue(new Response(
    JSON.stringify({ embedding: { values: Array.from({ length: 768 }, () => 0.1) } }), { status: 200 }));
  vi.stubGlobal("fetch", fetchMock);
  const p = getEmbeddingProvider();
  await p.embedQuery("quran");
  const [url, init] = fetchMock.mock.calls[0];
  expect(String(url)).toContain("models/gemini-embedding-001:embedContent");
  const body = JSON.parse(init.body);
  expect(body).toMatchObject({ taskType: "retrieval_query", outputDimensionality: 768 });
  fetchMock.mockResolvedValue(new Response("{}", { status: 200 })); // malformed
  await expect(p.embedQuery("q")).rejects.toBeInstanceOf(EmbeddingUnavailableError);
});

it("openai: Bearer key, dimensions 768, AI_BASE_URL honored", async () => {
  env({ p: "openai", key: "K" });
  vi.stubEnv("AI_BASE_URL", "https://example.com/v1");
  const fetchMock = vi.fn().mockResolvedValue(new Response(
    JSON.stringify({ data: [{ embedding: Array.from({ length: 768 }, () => 0.2) }] }), { status: 200 }));
  vi.stubGlobal("fetch", fetchMock);
  await getEmbeddingProvider().embedDocument("t");
  const [url, init] = fetchMock.mock.calls[0];
  expect(String(url)).toBe("https://example.com/v1/embeddings");
  expect(init.headers.Authorization).toBe("Bearer K");
  expect(JSON.parse(init.body)).toMatchObject({ dimensions: 768 });
});

it("aiSearchVersion encodes provider+model", () => { expect(aiSearchVersion()).toMatch(/^mock:.+/); });
```

- [ ] **Step 2: Run to verify fails**

Run: `npm run test -- tests/smart-provider.test.ts`
Expected: FAIL — module `@/lib/ai/...` not found.

- [ ] **Step 3: Implement**

- `types.ts` — exact interface + error class above.
- `mock.ts` — export `class MockProvider implements EmbeddingProvider`: seed = SHA-256 of `("doc|" + text)` or `("query|" + text)`; map hash bytes to 768 pseudo-uniform floats via a repeating block; no network.
- `gemini.ts` — `POST https://generativelanguage.googleapis.com/v1beta/${AI_EMBEDDING_MODEL ?? "models/gemini-embedding-001"}:embedContent` with header `x-goog-api-key: ${AI_API_KEY ?? GEMINI_API_KEY}`, body `{ content: { parts: [{ text: text.slice(0, 2000)] }, taskType: "retrieval_document" | "retrieval_query", outputDimensionality: 768 }`; response `embedding.values`; any shape mismatch / non-2xx / missing key → throw `EmbeddingUnavailableError` with cause.
- `openai.ts` — `POST ${AI_BASE_URL ?? "https://api.openai.com"}/v1/embeddings`, `Authorization: Bearer` `AI_API_KEY`, body `{ model: AI_EMBEDDING_MODEL ?? "text-embedding-3-small", input: text.slice(0, 2000), dimensions: 768 }`; response `data[0].embedding`; same error behavior.
- `provider.ts` — switch on `process.env.AI_SEARCH_PROVIDER` (default `"gemini"`); mock instantiation always succeeds; gemini/openai validate presence of required env at **call time** and throw `EmbeddingUnavailableError` per above (factories must not throw at import). `aiSearchVersion()` = `${providerName}:${(AI_EMBEDDING_MODEL ?? default).replace(/[^a-z0-9.]/gi, "")}`.
- `.env.example`: append block documenting the four vars verbatim with `AI_SEARCH_PROVIDER=gemini# gemini | openai | mock`.

- [ ] **Step 4: Run to verify pass**

Run: `npm run test -- tests/smart-provider.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/ai .env.example tests/smart-provider.test.ts
git commit -m "feat(ai): embedding provider abstraction (gemini/openai/mock)"
```

---

### Task 3: Pure ranking (`rank.ts`) — legacy parity constants

**Files:**
- Create: `src/lib/ai/rank.ts`
- Test: `tests/smart-rank.test.ts`

**Interfaces:**
- Consumes: `normalizeArabic` from `@/lib/services/arabic`.
- Produces (exact):

```ts
export type MatchReason = { type: string; value: string; labelEn: string; labelAr: string };
export type DocFields = { name: string; full: string; short: string; category: string }; // already normalized text
export type MetadataLabel = { type: string; value: string; labelEn: string; labelAr: string };

export function tokenizeQuery(q: string): string[];                 // normalizeArabic+lowercase, split /[\s\p{P}]+/u, drop len<2
export function computeIdf(docs: string[], tokens: string[]): Map<string, number>;  // ln(1 + N/df); df = docs containing token
export function keywordScore(fields: DocFields, tokens: string[], idf: Map<string,number>): number; // Σ_f priority_f · (Σ_t idf·has(t,f)) / Σ_t idf ; then min(1, Σ .../1)
export function metadataBoost(labels: MetadataLabel[], tokens: string[]):
  { score: number; reasons: MatchReason[] };                        // token (len>=3) substring-match vs label_en||label_ar (normalized); raw=+0.25/matchW unique (type,value); norm=min(1, raw/2); reasons unique
export function qualityScore(input: { avgRating: string; reviewCount: number; viewCount: number }): number;
  // (rating/5)*.7 + min(1, reviews/1000)*.2 + min(1, views/10000)*.1            [plan-pinned approximation of legacy quality phrasing]
export function combinedScore(p: { vectorSim: number | null; keyword: number; metadata: number; quality: number }): number;
  // vectorSim ? .35v + .40k + .15m + .10q : .55k + .25m + .20q
```

Plus module constants: `RANK_WEIGHTS`, `FALLBACK_WEIGHTS`, `FIELD_PRIORITIES`, `METADATA_STEP = 0.25`, `METADATA_CAP = 2.0`, `RELEVANCE_CUTOFF = 0.35`, `SMART_POOL_SIZE = 100`.

- [ ] **Step 1: Write the failing tests** (assert exact numbers from the constants above)

```ts
it("tokenizeQuery normalizes Arabic + drops stopwords <2 chars", () => {
  expect(tokenizeQuery("مُصْحَفِ الوَرْش!")).toEqual(["مصحف", "الورش"]);
  expect(tokenizeQuery("a و")).toEqual([]); // latin 1-char + arabic 1-char dropped
  expect(tokenizeQuery("!!!")).toEqual([]);
});
it("IDF weights rare tokens higher", () => {
  const idf = computeIdf(["ورش quran quran", "quran"], ["ورش", "quran"]);
  expect(idf.get("ورش")!).toBeGreaterThan(idf.get("quran")!);
});
it("keywordScore respects field priorities and normalizes to [0,1]", () => {
  const idf = computeIdf(["alpha alpha gamma"], ["alpha"]);
  const hit   = keywordScore({ name: "alpha", full: "gamma", short: "", category: "" }, ["alpha"], idf);
  const part  = keywordScore({ name: "", full: "alpha gamma", short: "", category: "" }, ["alpha"], idf);
  expect(hit).toBe(1);                      // name priority .5 * idf share 1 ... then Σ over fields capped 1
  expect(part).toBeCloseTo(0.5, 5);         // full desc priority .25, doubled-field text -> capped contribution
});
it("metadataBoost caps at 1 normalized (raw cap 2.0) and emits bilingual reasons", () => {
  const labels = [
    { type: "riwayah", value: "warsh", labelEn: "Warsh", labelAr: "ورش" },
    { type: "features", value: "offline", labelEn: "Offline", labelAr: "بدون إنترنت" },
    { type: "riwayah", value: "hafs", labelEn: "Hafs", labelAr: "حفص" },
  ];
  const { score, reasons } = metadataBoost(labels, ["warsh", "offline"]);
  expect(reasons).toHaveLength(2);
  expect(reasons[0]).toEqual({ type: "riwayah", value: "warsh", labelEn: "Warsh", labelAr: "ورش" });
  expect(score).toBe(1); // raw .5 -> /2.0 -> .25 … verify math with 2 matches: raw .5, norm .25
  // NOTE: keep this assertion literal to the formula: score === min(1, (0.25*2)/2.0) = .25
});
it("combinedScore uses legacy weights; fallback distribution when vectorSim null", () => {
  expect(combinedScore({ vectorSim: 1, keyword: 1, metadata: 1, quality: 1 })).toBeCloseTo(1, 6);
  expect(combinedScore({ vectorSim: null, keyword: 1, metadata: 1, quality: 1 })).toBeCloseTo(1, 6);
  expect(combinedScore({ vectorSim: 0, keyword: 0, metadata: 0, quality: 0 })).toBe(0);
});
it("qualityScore anchors: 0 / great app", () => {
  expect(qualityScore({ avgRating: "0.00", reviewCount: 0, viewCount: 0 })).toBe(0);
  expect(qualityScore({ avgRating: "5.00", reviewCount: 1000, viewCount: 10000 })).toBeCloseTo(1, 6);
});
```

(Correct the metadataBoost expectation to literally `min(1, (.25*2)/2.0) = .25` — write that number in the test.)

- [ ] **Step 2: Run verify fails**

Run: `npm run test -- tests/smart-rank.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement exactly per Produces signatures + formulas above** (pure file, no imports from db or actions).

- [ ] **Step 4: Run verify pass**

Run: `npm run test -- tests/smart-rank.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/ai/rank.ts tests/smart-rank.test.ts
git commit -m "feat(ai): pure hybrid ranking with legacy parity weights"
```

---

### Task 4: Typo suggestions (`suggest.ts`)

**Files:**
- Create: `src/lib/ai/suggest.ts`
- Test: `tests/smart-suggest.test.ts`

**Interfaces:**
- Consumes: `normalizeArabic`.
- Produces (exact):

```ts
export const QUERY_ALIASES: Record<string, string>;     // latin keys lowercase; arabic keys normalized
export function levenshtein(a: string, b: string): number;
export function suggestQuery(query: string, vocabulary: string[]): string | null;
```

- [ ] **Step 1: Write the failing tests**

```ts
it("aliases exact token hits are replaced", () => {
  expect(suggestQuery("werSh mishaf", ["hafs", "mushaf"])).toBe("warsh mushaf");
  expect(suggestQuery("قران كريم", [])).toBe("قرآن كريم");
});
it("levenshtein distance <=2 suggests nearest vocab word for tokens >=4 chars", () => {
  expect(suggestQuery("hafs alqran", ["quran"])).toBe("quran alqran".replace("quran alqran", "quran alquran"));
  // ^ write literal expectation: "hsfs" pattern instead:
  expect(suggestQuery("hsfs", ["hafs"])).toBe("hafs");
});
it("returns null when nothing improves", () => {
  expect(suggestQuery("quran", ["quran", "warsh"])).toBeNull();
  expect(suggestQuery("ab", ["ab"])).toBeNull(); // token <4 chars: no levenshtein guessing
});
```

(Write each expectation literally; do not leave the `replace` self-check above in the file.)

- [ ] **Step 2: Run verify fails** — `npm run test -- tests/smart-suggest.test.ts` → FAIL module not found.

- [ ] **Step 3: Implement**

`QUERY_ALIASES`: port the alias map from legacy `backend/core/utils/arabic.py` (read the file and **copy its live entries**, normalizing Arabic keys with `normalizeArabic`); seed at minimum `wersh→warsh, kuran→quran, قران→قرآن, وريش→ورش` so tests pass without legacy access. `suggestQuery`: per token (2..50 chars): 1) alias lookup on normalized token → replace if different; 2) else if len ≥ 4: nearest vocabulary word (vocabulary normalized; lowercase for latin) with `levenshtein ≤ 2`, preferring strictly smaller distance, tie → lexicographically first; replace only if distance > 0. Rebuild string with original whitespace preserved around tokens. `null` when no token changed.

- [ ] **Step 4: Run verify pass** — Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/ai/suggest.ts tests/smart-suggest.test.ts
git commit -m "feat(ai): query typo suggestion via alias map + levenshtein"
```

---

### Task 5: Ingestion (`ingest.ts`) — bilingual doc + embedding upsert

**Files:**
- Create: `src/lib/ai/ingest.ts`
- Test: `tests/smart-ingest.test.ts`

**Interfaces:**
- Consumes: `EmbeddingProvider`, `getEmbeddingProvider` (Task 2); `db`, `apps`, `developers`, `categories`, `appsCategories`, `appMetadataValues`, `metadataTypes`, `metadataOptions`, `appSubmissions` (schema); `apps.docHash` cols (Task 1).
- Produces (exact):

```ts
export type AppDocumentBundle = {
  id: number; nameEn: string; nameAr: string; slug: string;
  shortEn: string; shortAr: string; fullEn: string; fullAr: string;
  platform: string; featured: boolean; avgRating: string; reviewCount: number;
  categories: { nameEn: string; nameAr: string }[];
  developer: { nameEn: string; nameAr: string; isVerified: boolean };
  labels: { type: string; value: string; labelEn: string; labelAr: string }[]; // merged jsonb arrays + metadata options
  riwayah: string[]; mushafType: string[]; features: string[];
  crawledContent: string | null;
};
export function buildAppDocument(bundle: AppDocumentBundle): string;
export async function loadAppBundle(appId: number): Promise<AppDocumentBundle | null>;
export async function upsertAppEmbedding(appId: number, opts?: { provider?: EmbeddingProvider }):
  Promise<{ status: "embedded" | "skipped" | "app_not_found" }>;
```

Document format (port of legacy `prepare_app_text()`, spec §6): sections in order, skipping empty ones —
`[APP] {nameEn} | {nameAr}` · `[CATEGORIES] {en.join} | {ar.join}` · `[DEVELOPER] {devEn} | {devAr}[ + VERIFIED DEVELOPER]` · `[SHORT DESC EN] …` `[SHORT DESC AR] …` · `[FULL DESC EN] …` `[FULL DESC AR] …` (each description truncated **1000 chars**) · `[PLATFORM] {platform}` + `+ Available on Google Play/App Store/AppGallery` per truthy link fields (add `googlePlayLink/appStoreLink/appGalleryLink` to bundle) · `[QUALITY] {rating}/5 ({word}) - {reviews} reviews ({word})` where word ∈ Excellent(≥4.5)/Very Good(≥4)/Good(≥3)/Average(≥2)/Low · `[FEATURED] yes` when featured · `[RIWAYAH] …` `[MUSHAF] …` `[FEATURES] …` bilingual label joins from `labels`+arrays · `[EXTERNAL] {crawledContent truncated 2000}`. Join with `\n`.

- [ ] **Step 1: Write failing tests**

Unit (no DB):
```ts
it("builds bilingual doc with truncation 1000 and external 2000", () => {
  const b: AppDocumentBundle = { /* minimal fixture incl crawledContent "x".repeat(3000) */ };
  const doc = buildAppDocument(b);
  expect(doc).toContain("[APP] Alpha | ألفا");
  expect(doc).toContain("[EXTERNAL]");
  expect(doc).toContain("x".repeat(2000)); expect(doc).not.toContain("x".repeat(2001));
});
it("skips empty description sections without emitting undefined", () => {
  const doc = buildAppDocument({ /* fixture with fullEn:"", fullAr:"" */ } as AppDocumentBundle);
  expect(doc).not.toMatch(/undefined|NaN|\[FULL DESC EN\]\s*(\n|$)/);
});
it("quality wording tiers", () => {
  // 4.50 -> Excellent, 3.00 -> Good, 0.00 -> Low
});
```

Integration (test DB, like `apps-repo.test.ts` fixtures):
```ts
it("upsertAppEmbedding embeds via mock provider and is idempotent on unchanged doc", async () => {
  // seed app row (reuse apps-repo INSERT pattern + doc-able fields)
  const first = await upsertAppEmbedding(id);
  expect(first.status).toBe("embedded");
  const row = SELECT embedding, doc_hash, embedded_at FROM apps WHERE id=…
  expect(row.doc_hash).toBeTruthy(); expect(vector_dims(row.embedding) = 768)
  expect((await upsertAppEmbedding(id)).status).toBe("skipped");
  await sql`UPDATE apps SET description_en='changed' WHERE id=${id}`;
  expect((await upsertAppEmbedding(id)).status).toBe("embedded");
});
it("broken provider propagates typed error (callers catch)", async () => {
  await expect(upsertAppEmbedding(id, { provider: brokenProvider }))
    .rejects.toBeInstanceOf(EmbeddingUnavailableError);
});
it("metadata labels come from jsonb arrays + metadata_options (bilingual)", async () => {
  // seed metadata_type riwayah + option value warsh w/ label_ar ورش; attach; buildAppDocument contains "[RIWAYAH]"
});
```

- [ ] **Step 2: Run verify fails** — `npm run test -- tests/smart-ingest.test.ts` → FAIL (module missing).

- [ ] **Step 3: Implement**

`loadAppBundle`: single joins per repo-layer conventions (no `use cache`); submission lookup `WHERE created_app_id = appId ORDER BY id DESC LIMIT 1`. `upsertAppEmbedding`: bundle → doc → sha256 hex → compare `apps.doc_hash` → skip; else `provider ?? getEmbeddingProvider()`, `embedDocument(doc)`; assert `values.length === 768` (else throw typed error); UPDATE `apps SET embedding=$v, doc_hash=$h, embedded_at=now()`. `app_not_found` when bundle null.

- [ ] **Step 4: Run verify pass** — `npm run test -- tests/smart-ingest.test.ts` PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/ai/ingest.ts tests/smart-ingest.test.ts
git commit -m "feat(ai): bilingual app document builder and idempotent embedding upsert"
```

---

### Task 6: Search orchestration (`repo/smart-search.ts`) + cache wrapper

**Files:**
- Create: `src/lib/repo/smart-search.ts`, `src/lib/cache/smart-search.ts`
- Test: `tests/smart-search-repo.test.ts`

**Interfaces:**
- Consumes: `getAppListRows` (existing; fallback path), `AppsFilters`/`AppListItem` from `@/lib/repo/apps-rows`; `getEmbeddingProvider`, `aiSearchVersion`, `EmbeddingUnavailableError` (T2); `tokenizeQuery`, `computeIdf`, `keywordScore`, `metadataBoost`, `qualityScore`, `combinedScore`, `MatchReason`, `RELEVANCE_CUTOFF`, `SMART_POOL_SIZE` (T3); `suggestQuery` (T4); `loadAppBundle` pipeline not needed here; `searchEmbeddingCache`, `apps` (T1); `cosineDistance` from `drizzle-orm`; `getMetadataValuesCached` (verify-only).
- Produces (exact; consumed by Task 7 UI and cache layer):

```ts
export type SmartAppItem = AppListItem & { matchReasons?: MatchReason[]; relevanceScore?: number };
export type SmartSearchResult = {
  count: number; page: number; pageSize: number;
  results: SmartAppItem[];
  suggestedQuery: string | null;
  fallbackMode: boolean;
  query: string;
};
export async function searchAppsSmart(
  filters: AppsFilters, opts?: { provider?: EmbeddingProvider }
): Promise<SmartSearchResult>;

// cache/smart-search.ts
export async function getSmartAppsCached(filters: AppsFilters, version: string): Promise<SmartSearchResult>;
// "use cache"; cacheLife("hours"); cacheTag("apps"); calls searchAppsSmart(filters); version arg keeps deployment-level provider/model in the cache key
```

Pipeline (spec §7 order): vocabulary-suggest (`suggestQuery(search, loadSearchVocabulary())`) → soft-filter augmentation string (active filters of AppsFilters ∪ jsonb/metadata bilingual labels, e.g. `quran [Filter: Warsh (ورش) riwayah]`; labels fetched from same metadata join as ingest) → cached `embedQuery` into `search_embedding_cache` keyed `sha256(aiSearchVersion() + "|" + augmented)`; `{ model: aiSearchVersion() }`; upsert `ON CONFLICT (query_sha256) DO UPDATE SET embedding, model, created_at = now()`; refresh when older than 7 days (treat-stale-as-miss) → `cosineDistance(apps.embedding, q)` where `status='published' AND embedding IS NOT NULL` order by distance asc **with deterministic tie-break `sort_order asc, name_en asc`** (spec §13), limit **SMART_POOL_SIZE** → hydrate candidates (same row shape as `getAppListRows`) → score via rank.ts (+ IDF over candidate docs: per-app doc = `[name_en,name_ar,full_en,full_ar,short_en,short_ar,category...]` join) → cutoff then page slice (pool exhausted = empty page as chosen) → assemble `SmartSearchResult`. Any provider/cache error or **zero-pool** ⇒ `fallbackMode: true` and delegate to `getAppListRows({ ...filters, search })` (legacy hard keyword path), reasons/relevanceScore absent.

- [ ] **Step 1: Write failing integration tests** (dockerized test DB; seeds like `tests/apps-repo.test.ts`; mock provider via `opts`)

```ts
it("ranks by hybrid score and returns match reasons", async () => {
  // 2 published apps embedded-with-mock (short: "offline mushaf warsh" vs "audio kids")
  const r = await searchAppsSmart({ search: "werSh mushaf" }, { provider: mock });
  expect(r.fallbackMode).toBe(false);
  expect(r.suggestedQuery).toBe("warsh mushaf");
  expect(r.results[0].slug).toBe("alpha");           // offline+warsh match ranks first
  expect(r.results[0].matchReasons?.length).toBeGreaterThan(0);
  expect(r.results[0].relevanceScore).toBeGreaterThan(0.35); // above cutoff
  expect(r.results[0].matchReasons![0].labelAr).toBeTruthy();
});
it("seeds query-embedding cache; duplicate concurrent calls upsert, not crash", async () => {
  await Promise.all([searchAppsSmart(f, o), searchAppsSmart(f, o)]);
  const n = await sql`SELECT count(*)::int c FROM search_embedding_cache WHERE model = ${aiSearchVersion()}`;
  expect(n[0].c).toBe(1);
  const cached = await sql`SELECT length(embedding::text) FROM search_embedding_cache LIMIT 0`; // vector column sanity only
});
it("unreachable provider -> fallbackMode + keyword results still returned", async () => {
  const r = await searchAppsSmart({ search: "Alpha" }, { provider: broken });
  expect(r.fallbackMode).toBe(true);
  expect(r.results.some(x => x.slug === "alpha")).toBe(true);
});
it("empty embedding pool -> fallbackMode", async () => { /* seed nothing; mock repo search */ });
it("punct-only query renders fallback-safe empty results (no throw)", async () => {
  await expect(searchAppsSmart({ search: "!!!" }, { provider: mock })).resolves.toBeDefined();
});
```

Also a **verification step** (no new code): `lib/repo/metadata.ts` `getMetadataValues()` covers legacy `FacetValue` (value/label_en/label_ar/count) — assertion only in the plan, nothing to build. If FYI mismatch found (e.g. counts scoped to status), report instead of silently adding code.

- [ ] **Step 2: Run verify fails** — `npm run test -- tests/smart-search-repo.test.ts` → FAIL.

- [ ] **Step 3: Implement both files exactly per the Produces contract + pipeline.** Keep `getAppListRows` untouched; do not import `"use cache"` inside `repo/*`. Vocabulary loader: `loadSearchVocabulary()` module-level memo (60-min staleness) of published app names en/ar + metadata labels — placed in `repo/smart-search.ts` itself (not consumed elsewhere).

- [ ] **Step 4: Run verify pass** — `npm run test -- tests/smart-search-repo.test.ts` PASS. Also `npm test` for full-suite regressions.

- [ ] **Step 5: Commit**

```bash
git add src/lib/repo/smart-search.ts src/lib/cache/smart-search.ts tests/smart-search-repo.test.ts
git commit -m "feat(ai): hybrid smart search orchestration with fallback mode"
```

---

### Task 7: UI — mode=smart delivery, notices, cards, no-results wiring

**Files:**
- Modify: `src/app/[lang]/(site)/apps/page.tsx` (read `mode` after line 26)
- Modify: `src/components/apps/apps-listing.tsx` (branch + notices + chip passthrough, lines 26–103)
- Modify: `src/components/apps/app-card.tsx` (optional `matchReasons` prop)
- Modify: `src/components/apps/no-results.tsx` (query/mode-aware button)
- Modify: `src/i18n/en.json`, `src/i18n/ar.json`

**Interfaces:**
- Consumes: `getSmartAppsCached(filters, aiSearchVersion())` (T6); `SmartAppItem.matchReasons`.
- Produces: page-level contract — `/[lang]/apps?search=…&mode=smart` renders ranked results with same `AppCard` UI; chips ≤3 per card localized by `lang`; fallback banner only when `fallbackMode`; no traditional-path behavior change.

- [ ] **Step 1 (test first): extend e2e-independent unit? No component test infra exists — instead pin behavior via the e2e in Task 8 and type/lint here.** Write the integration-visible i18n keys now (both files):

`appList.search.fallbackNotice` = "AI search temporarily unavailable — showing keyword results" / ar "تعذر الوصول للبحث الذكي مؤقتًا — نعرض نتائج البحث العادي".
`empty.noApps.tryTraditional` = "Try Traditional Search" / ar "جرّب البحث العادي".
(Remaining copy keys already exist: `didYouMean`, `trySmartSearch`, `smartSearchHint`, tabs.)

- [ ] **Step 2: Implement**

`apps/page.tsx`: `const mode = sp.mode === "smart" ? "smart": undefined;` pass `mode` to `<AppsListing …>`.
(Filter note, §8: `FiltersBar` exists but is **not mounted anywhere today** — verify with one grep and leave it unmodified; when it gets mounted later, its `push()` must carry `mode` through the URLSearchParams or smart mode will silently drop on filter change.)
`apps-listing.tsx`: props + `mode?: "smart"`; data source:
```ts
const smart = mode === "smart" ? await getSmartAppsCached(filters, aiSearchVersion()) : null;
const { count, results, suggestedQuery, fallbackMode } = smart ?? { ...(await getAppsCached(filters)), suggestedQuery: null, fallbackMode: false };
```
Render when `smart`: (a) did-you-mean chip above grid when `suggestedQuery && suggestedQuery !== search`: `<Link href={`/${lang}/apps?search=${encodeURIComponent(suggestedQuery)}&mode=smart`}>{t("search.didYouMean")} “{suggestedQuery}”</Link>`; (b) fallback banner `<div role="status" className="…">{t("search.fallbackNotice")}</div>` when `fallbackMode`; pass `matchReasons` to each AppCard when present; pagination `searchParams={{ ...(filters as unknown as Record<string, unknown>), ...(fallbackMode ? {} : {}) }}` + `mode` injected the same way so page links preserve `mode=smart` (Pagination serializes arbitrary keys — verified in `pagination.tsx:16-25`, no change needed to it).
`app-card.tsx`: optional `matchReasons?: MatchReason[]` prop; when set render up to 3 chips `<span className="match-reason-chip">{lang === "ar" ? mr.labelAr : mr.labelEn}</span>` with `title={t("search.aiReasoning")}` (key exists).
`no-results.tsx`: props + `query?: string; mode?: "smart"`; smart button href — traditional→`?search={q}&mode=smart`, smart→`?search={q}` labeled `empty.noApps.tryTraditional` (existing `smartSearchHint` paragraph stays).
`AppsListing` calls `<NoResults … query={search} mode={mode} />`.

- [ ] **Step 3: Verify**

Run: `npm run lint && npx tsc --noEmit && npm test`
Expected: clean. Manual sanity on dev: `npm run dev` → `/ar/apps?search=ورش&mode=smart` renders (fallback banner acceptable pre-reindex; results still listed).

- [ ] **Step 4: Commit**

```bash
git add src/app/[lang]/\(site\)/apps/page.tsx src/components/apps src/i18n
git commit -m "feat(site): smart search mode=smart UI with suggestions and fallback notice"
```

---

### Task 8: Smart tab navigation + e2e

**Files:**
- Modify: `src/components/apps/hero-search.tsx` (submit handler lines 13–24)
- Modify: `playwright.config.ts` (webServer env, lines 10–16)
- Modify: `e2e/public.spec.ts` (append smart describe block)

**Interfaces:**
- Consumes: `mode=smart` URL contract (T7).
- Produces: Smart tab navigates to `/{lang}/apps?search={q}&mode=smart` with `useRouter`/`useTransition` pending state (spin class while `isPending`); Traditional unchanged.

- [ ] **Step 1: Write failing e2e in `e2e/public.spec.ts`**

```ts
test.describe("smart search", () => {
  test("smart tab navigates to mode=smart and renders results/chips", async ({ page }) => {
    await page.goto("/ar/apps");
    await page.getByRole("tab", { name: "البحث الذكي" }).click(); // or fill-in placeholder expectation from i18n ar
    await page.getByLabel(/البحث الذكي|بحث/).first().fill("قارئ قران");
    await page.getByRole("button", { name: /إرسال|بحث/ }).click();
    await expect(page).toHaveURL(/\/ar\/apps\?.*mode=smart/);
    // did-you-mean chip when suggestion exists (alias 'قران'→'قرآن'); must be encoded href:
    await expect(page.locator("a.did-you-mean")).toHaveAttribute("href", /search=%D9%82%D8%B1%D8%A2/);
    // page still lists apps or shows fallback notice — both are valid UI; assert no 500:
    await expect(page.locator("main")).toBeVisible();
  });
  test("traditional tab stays modeless", async ({ page }) => {
    await page.goto("/en/apps");
    await page.getByRole("tab", { name: /Traditional/ }).click();
    await page.getByPlaceholder("Search apps...").fill("alpha");
    await page.getByRole("button", { name: "Search Now" }).click();
    await expect(page).toHaveURL(/\/en\/apps\?search=alpha/);
    await expect(page).not.toHaveURL(/mode=smart/);
  });
});
```

(Selector literals copy the existing e2e file's conventions — open `e2e/public.spec.ts` and match how tabs/inputs are selected today; adjust class/role names to the real DOM, keeping the URL + did-you-mean-href assertions.)

- [ ] **Step 2: Make e2e env deterministic** — in `playwright.config.ts` add to `webServer`:
`env: { AI_SEARCH_PROVIDER: "mock", ...process.env }`.

- [ ] **Step 3: Implement hero-search change** — replace `setTimeout`-spinner block with `const [isPending, startTransition] = useTransition();` + `startTransition(() => router.push(url))` where `url` includes `&mode=smart` for the smart tab; spin only while `isPending`. Remove unused refs.

- [ ] **Step 4: Run** — `npx playwright test e2e/public.spec.ts` (mock provider ⇒ no external calls). Expected: new tests PASS, existing PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/apps/hero-search.tsx playwright.config.ts e2e/public.spec.ts
git commit -m "feat(site): smart tab navigation wired to mode=smart with e2e coverage"
```

---

### Task 9: Jobs — reindex core, CLI script, admin action, approval hook

**Files:**
- Create: `src/lib/ai/reindex.ts`
- Create: `scripts/reindex-embeddings.ts`
- Create: `src/components/admin/reindex-embeddings-button.tsx`
- Modify: `src/lib/actions/admin-apps.ts` (append action)
- Modify: `src/app/admin/apps/page.tsx` (toolbar, near line 68)
- Modify: `src/lib/actions/admin-submissions.ts` (approval hook after lines 294–298)
- Modify: `package.json` (script)
- Test: `tests/smart-reindex.test.ts` (new, integration)

**Interfaces:**
- Consumes: `upsertAppEmbedding`, `loadAppBundle` (T5); `AppsFilters` (T6 path); admin guard pattern from `admin-submissions.ts:148-150` (`requireAdmin`).
- Produces (exact):

```ts
// src/lib/ai/reindex.ts  (plain server-side module — NOT "use server"; testable directly)
export type ReindexReport = { embedded: number; skipped: number; failed: number };
export async function reindexAllEmbeddings(opts?: { provider?: EmbeddingProvider }): Promise<ReindexReport>;
// iterates published apps: getAppListRows({ status: "published", pageSize: 200 }) looped to exhaustion;
// per app: upsertAppEmbedding; tally statuses; exceptions → failed++ (never throws upward)
export async function reindexAppEmbedding(appId: number): Promise<{ status: "embedded" | "skipped" | "app_not_found" }>;
// thin wrapper: upsertAppEmbedding(appId) with the default provider — used by the approval hook

// src/lib/actions/admin-apps.ts (append; "use server")
export async function reindexAllEmbeddingsAction(): Promise<ReindexReport>; // requireAdmin() first; revalidateTag("apps", "max") after
```

- [ ] **Step 1: Failing test**

```ts
it("reindex all: embedded+skipped+failed counts and never throws with a broken provider", async () => {
  // seed 3 published apps (2 without embeddings, 1 already embedded in Task 5 fixture style)
  const ok = await reindexAllEmbeddings({ provider: mock });
  expect(ok.failed).toBe(0); expect(ok.embedded).toBeGreaterThanOrEqual(2);
  const again = await reindexAllEmbeddings({ provider: mock }); // unchanged docs
  expect(again.embedded).toBe(0); expect(again.skipped).toBeGreaterThanOrEqual(3);
  const bad = await reindexAllEmbeddings({ provider: broken });
  expect(bad.failed).toBeGreaterThanOrEqual(3);
});
it("admin action is guarded", async () => { /* follow existing review-actions.test.ts auth mocking pattern */ });
```

- [ ] **Step 2: verify fails** — `npm run test -- tests/smart-reindex.test.ts` → FAIL (module missing).

- [ ] **Step 3: Implement**

`src/lib/ai/reindex.ts` per Produces; `scripts/reindex-embeddings.ts`: load `.env.local`-style env exactly like `db/seed.ts`, call `getEmbeddingProvider()` default, print `ReindexReport` JSON + exit code 0 always (failures tallied); `package.json` add `"embeddings:reindex": "node --experimental-strip-types --env-file=.env.local scripts/reindex-embeddings.ts"`. Admin page toolbar: render new client button next to `AddButtonLink` (lucide `DatabaseZap` icon, confirmation `confirm("إعادة توليد الترميزات؟")`, shows result toast/`alert` with counts). Approval hook: in `admin-submissions.ts` inside `if (outcome.kind === "ok")` block, **after** `revalidateTag(...)` lines and before `return { ok: true … }`:

```ts
try { await reindexAppEmbedding(outcome.appId); } // reindex.ts exports reindexAppEmbedding(appId) = upsertAppEmbedding wrapper with default provider
catch (e) { console.error("approval embedding failed", e); }
```

- [ ] **Step 4: verify pass** — `npm test` (full suite) PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/ai/reindex.ts scripts/reindex-embeddings.ts src/lib/actions src/components/admin src/app/admin/apps/page.tsx package.json tests/smart-reindex.test.ts
git commit -m "feat(ai): embeddings reindex (admin action, approval hook, CLI)"
```

---

## Rollout (after all tasks)

1. Deploy DB first: on Railway run `npm run db:pgvector && npm run db:push` (extension + columns + table + index).
2. Set env on Railway: `AI_SEARCH_PROVIDER=gemini`, `AI_API_KEY=…`.
3. `npm run embeddings:reindex` — expect `{ embedded: ~44, skipped: 0, failed: 0 }`.
4. Verify `/ar/apps?search=ورش&mode=smart` + `/en/apps?search=quran offline&mode=smart` ranked results with chips; staging fallback check with an invalid `AI_API_KEY` (banner appears, keyword results still served).
5. Merge to main (e2e already green with mock provider).
