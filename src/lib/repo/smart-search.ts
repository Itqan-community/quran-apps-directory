/**
 * Smart (RAG) hybrid search orchestration (spec §7):
 *
 *   1. vocabulary-suggest the raw query (typo correction, alias map + fuzzy)
 *   2. append active filters as bilingual soft-filter augmentation clauses
 *   3. cached query embedding (search_embedding_cache, sha256(version|augmented),
 *      7-day staleness = miss)
 *   4. cosine pool over published embedded apps (SMART_POOL_SIZE, deterministic
 *      tie-break sort_order asc, name_en asc — spec §13)
 *   5. hybrid re-rank (vector + keyword/IDF + metadata + quality)
 *   6. relevance cutoff, then page slice (pool exhausted = empty page)
 *
 * Any provider/cache failure, or a zero-size pool, degrades to the legacy hard
 * keyword path (getAppListRows) with fallbackMode: true; reasons and
 * relevanceScore are absent there. A genuine DB error on the fallback path
 * itself is NOT swallowed.
 *
 * Repo layer: plain async Drizzle, no Next.js cache directives (those live in
 * src/lib/cache/smart-search.ts).
 */
import { createHash } from "node:crypto";
import { and, asc, eq, inArray, isNotNull, sql } from "drizzle-orm";
import { cosineDistance } from "drizzle-orm/sql/functions/vector";
import { db } from "@/db";
import {
  appMetadataValues,
  apps,
  appsCategories,
  categories,
  developers,
  metadataOptions,
  metadataTypes,
  searchEmbeddingCache,
} from "@/db/schema";
import { getAppListRows, parsePageParams, type AppListItem, type AppsFilters } from "./apps-rows";
import { aiSearchVersion, getEmbeddingProvider } from "@/lib/ai/provider";
import { EmbeddingUnavailableError, type EmbeddingProvider } from "@/lib/ai/types";
import {
  combinedScore,
  computeIdf,
  keywordScore,
  metadataBoost,
  qualityScore,
  tokenizeQuery,
  RELEVANCE_CUTOFF,
  SMART_POOL_SIZE,
  type DocFields,
  type MatchReason,
  type MetadataLabel,
} from "@/lib/ai/rank";
import { suggestQuery } from "@/lib/ai/suggest";
import { normalizeArabic } from "@/lib/services/arabic";

export type SmartAppItem = AppListItem & { matchReasons?: MatchReason[]; relevanceScore?: number };
export type SmartSearchResult = {
  count: number;
  page: number;
  pageSize: number;
  results: SmartAppItem[];
  suggestedQuery: string | null;
  fallbackMode: boolean;
  query: string;
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Every embedding in this pipeline is 768-dim (pgvector column width). */
const EMBEDDING_DIMENSIONS = 768;
/** Query-embedding cache entries older than this are re-embedded (treated as a miss). */
const EMBEDDING_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
/** Suggestion-vocabulary memo staleness. */
const VOCABULARY_TTL_MS = 60 * 60 * 1000;

/** Bilingual display labels for platform filter values (mirrors lib/repo/metadata.ts). */
const PLATFORM_LABELS: Record<string, { en: string; ar: string }> = {
  android: { en: "Android", ar: "أندرويد" },
  ios: { en: "iOS", ar: "آي أو إس" },
  web: { en: "Web", ar: "ويب" },
  cross_platform: { en: "Cross Platform", ar: "متعدد المنصات" },
};

// ---------------------------------------------------------------------------
// Suggestion vocabulary (module-level memo, 60-min staleness)
// ---------------------------------------------------------------------------

type VocabularyMemo = { at: number; words: string[] };
let vocabularyMemo: VocabularyMemo | null = null;

/**
 * Published app names (en/ar) plus active metadata option labels (en/ar) —
 * the word list the typo-suggestor's fuzzy pass matches against.
 */
export async function loadSearchVocabulary(): Promise<string[]> {
  const now = Date.now();
  if (vocabularyMemo && now - vocabularyMemo.at < VOCABULARY_TTL_MS) return vocabularyMemo.words;
  const [appRows, labelRows] = await Promise.all([
    db
      .select({ nameEn: apps.nameEn, nameAr: apps.nameAr })
      .from(apps)
      .where(eq(apps.status, "published")),
    db
      .select({ labelEn: metadataOptions.labelEn, labelAr: metadataOptions.labelAr })
      .from(metadataOptions)
      .innerJoin(metadataTypes, eq(metadataOptions.metadataTypeId, metadataTypes.id))
      .where(and(eq(metadataOptions.isActive, true), eq(metadataTypes.isActive, true))),
  ]);
  const words = [
    ...appRows.flatMap((r) => [r.nameEn, r.nameAr]),
    ...labelRows.flatMap((r) => [r.labelEn, r.labelAr]),
  ]
    .map((w) => w.trim())
    .filter((w) => w.length > 0);
  vocabularyMemo = { at: now, words };
  return words;
}

/** Test hook: drop the vocabulary memo so the next load re-queries. */
export function _resetVocabularyCache(): void {
  vocabularyMemo = null;
}

// ---------------------------------------------------------------------------
// Soft-filter augmentation
// ---------------------------------------------------------------------------

/** `En (Ar)` when the labels differ, bare value otherwise (jsonb pseudo-labels render as their value). */
function bilingual(en: string, ar: string): string {
  return ar && ar !== en ? `${en} (${ar})` : en;
}

/**
 * Bilingual labels for metadata-typed filter values (same metadata join as
 * ingest): curated option labels win, the raw value stands in when no active
 * option exists for it.
 */
async function metadataFilterLabels(type: string, values: string[]): Promise<string[]> {
  if (values.length === 0) return [];
  const rows = await db
    .select({
      value: metadataOptions.value,
      labelEn: metadataOptions.labelEn,
      labelAr: metadataOptions.labelAr,
    })
    .from(metadataOptions)
    .innerJoin(metadataTypes, eq(metadataOptions.metadataTypeId, metadataTypes.id))
    .where(
      and(
        eq(metadataTypes.name, type),
        eq(metadataOptions.isActive, true),
        inArray(metadataOptions.value, values)
      )
    );
  const byValue = new Map(rows.map((r) => [r.value, r]));
  return values.map((v) => {
    const row = byValue.get(v);
    return row ? bilingual(row.labelEn, row.labelAr) : v;
  });
}

/**
 * Soft-filter augmentation (spec §7.2): appends the active filters as bilingual
 * `[Filter: <label> <type>]` clauses so the query embedding carries facet
 * context, e.g. `quran [Filter: Warsh (ورش) riwayah]`. Filters stay soft —
 * the pool query does not apply them as hard WHERE conditions. status,
 * ordering, featured and pagination are presentation/positional and add no
 * semantic label.
 */
async function buildAugmentedQuery(query: string, filters: AppsFilters): Promise<string> {
  const parts: string[] = [query];
  const [riwayah, mushaf, features] = await Promise.all([
    metadataFilterLabels("riwayah", filters.riwayah ?? []),
    metadataFilterLabels("mushaf_type", filters.mushafType ?? []),
    metadataFilterLabels("features", filters.features ?? []),
  ]);
  for (const label of riwayah) parts.push(`[Filter: ${label} riwayah]`);
  for (const label of mushaf) parts.push(`[Filter: ${label} mushaf_type]`);
  for (const label of features) parts.push(`[Filter: ${label} features]`);
  for (const value of filters.platforms ?? []) {
    const p = PLATFORM_LABELS[value];
    parts.push(`[Filter: ${p ? bilingual(p.en, p.ar) : value} platform]`);
  }
  if (filters.categorySlugs?.length) {
    const cats = await db
      .select({ nameEn: categories.nameEn, nameAr: categories.nameAr })
      .from(categories)
      .where(inArray(categories.slug, filters.categorySlugs));
    for (const c of cats) parts.push(`[Filter: ${bilingual(c.nameEn, c.nameAr)} category]`);
  }
  if (filters.developerId) {
    const devs = await db
      .select({ nameEn: developers.nameEn, nameAr: developers.nameAr })
      .from(developers)
      .where(eq(developers.id, filters.developerId))
      .limit(1);
    if (devs[0]) parts.push(`[Filter: ${bilingual(devs[0].nameEn, devs[0].nameAr)} developer]`);
  }
  return parts.join(" ");
}

// ---------------------------------------------------------------------------
// Cached query embedding
// ---------------------------------------------------------------------------

function sha256Hex(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

/**
 * Cached query embedding (spec §7.3): lookup by sha256(version + "|" +
 * augmented); entries older than 7 days count as a miss. Misses embed via the
 * given provider (or the deployment default) and upsert
 * ON CONFLICT (query_sha256) DO UPDATE SET embedding, model, created_at = now(),
 * so concurrent misses converge to one row.
 */
async function getQueryEmbedding(augmented: string, provider?: EmbeddingProvider): Promise<number[]> {
  const version = aiSearchVersion();
  const key = sha256Hex(`${version}|${augmented}`);
  const rows = await db
    .select({
      embedding: searchEmbeddingCache.embedding,
      createdAt: searchEmbeddingCache.createdAt,
    })
    .from(searchEmbeddingCache)
    .where(eq(searchEmbeddingCache.querySha256, key));
  const hit = rows[0];
  if (hit && Date.now() - hit.createdAt.getTime() < EMBEDDING_CACHE_TTL_MS) {
    return hit.embedding;
  }

  const active = provider ?? getEmbeddingProvider();
  const values = await active.embedQuery(augmented);
  if (values.length !== EMBEDDING_DIMENSIONS) {
    throw new EmbeddingUnavailableError(
      `provider "${active.name}" returned ${values.length} dimensions, expected ${EMBEDDING_DIMENSIONS}`
    );
  }

  await db
    .insert(searchEmbeddingCache)
    .values({ querySha256: key, embedding: values, model: version })
    .onConflictDoUpdate({
      target: searchEmbeddingCache.querySha256,
      set: { embedding: values, model: version, createdAt: sql`now()` },
    });
  return values;
}

// ---------------------------------------------------------------------------
// Cosine pool + hydration
// ---------------------------------------------------------------------------

/**
 * Nearest-embedding pool (spec §7.4): published apps with an embedding,
 * ordered by cosine distance asc with the deterministic tie-break
 * sort_order asc, name_en asc (spec §13), capped at SMART_POOL_SIZE.
 */
async function fetchEmbeddingPool(vector: number[]): Promise<{ id: number; distance: number }[]> {
  const distance = cosineDistance(apps.embedding, vector);
  const rows = await db
    .select({ id: apps.id, distance })
    .from(apps)
    .where(and(eq(apps.status, "published"), isNotNull(apps.embedding)))
    .orderBy(distance, asc(apps.sortOrder), asc(apps.nameEn))
    .limit(SMART_POOL_SIZE);
  return rows.map((r) => ({ id: r.id, distance: Number(r.distance) }));
}

/** AppListItem plus the internal fields the re-rank needs (full descriptions, merged labels). */
type Candidate = AppListItem & {
  descriptionEn: string;
  descriptionAr: string;
  labels: MetadataLabel[];
};

/** A jsonb array value has no curated bilingual label: the value stands in for both. */
function jsonbArrayLabels(
  values: string[] | null,
  type: string
): { type: string; value: string; labelEn: string; labelAr: string }[] {
  return (values ?? []).map((value) => ({ type, value, labelEn: value, labelAr: value }));
}

/**
 * Hydrates pool candidates in the same row shape as getAppListRows (developer
 * + categories), plus full descriptions and merged metadata labels (metadata
 * options first, then jsonb pseudo-labels — same merge as ingest).
 */
async function hydratePool(ids: number[]): Promise<Candidate[]> {
  const rows = await db
    .select({
      id: apps.id,
      slug: apps.slug,
      nameEn: apps.nameEn,
      nameAr: apps.nameAr,
      shortDescriptionEn: apps.shortDescriptionEn,
      shortDescriptionAr: apps.shortDescriptionAr,
      descriptionEn: apps.descriptionEn,
      descriptionAr: apps.descriptionAr,
      applicationIcon: apps.applicationIcon,
      mainImageEn: apps.mainImageEn,
      mainImageAr: apps.mainImageAr,
      avgRating: apps.avgRating,
      reviewCount: apps.reviewCount,
      viewCount: apps.viewCount,
      sortOrder: apps.sortOrder,
      featured: apps.featured,
      platform: apps.platform,
      status: apps.status,
      createdAt: apps.createdAt,
      isNew: sql<boolean>`apps.created_at > now() - interval '30 days'`,
      riwayah: apps.riwayah,
      mushafType: apps.mushafType,
      features: apps.features,
      devId: developers.id,
      devNameEn: developers.nameEn,
      devNameAr: developers.nameAr,
      devWebsite: developers.website,
      devLogo: developers.logoUrl,
    })
    .from(apps)
    .innerJoin(developers, eq(developers.id, apps.developerId))
    .where(inArray(apps.id, ids));

  const catRows = await db
    .select({
      appId: appsCategories.appId,
      id: categories.id,
      slug: categories.slug,
      nameEn: categories.nameEn,
      nameAr: categories.nameAr,
    })
    .from(appsCategories)
    .innerJoin(categories, eq(categories.id, appsCategories.categoryId))
    .where(inArray(appsCategories.appId, ids));

  const labelRows = await db
    .select({
      appId: appMetadataValues.appId,
      type: metadataTypes.name,
      value: metadataOptions.value,
      labelEn: metadataOptions.labelEn,
      labelAr: metadataOptions.labelAr,
    })
    .from(appMetadataValues)
    .innerJoin(metadataOptions, eq(metadataOptions.id, appMetadataValues.metadataOptionId))
    .innerJoin(metadataTypes, eq(metadataTypes.id, metadataOptions.metadataTypeId))
    .where(inArray(appMetadataValues.appId, ids))
    .orderBy(asc(metadataTypes.sortOrder), asc(metadataOptions.sortOrder), asc(metadataOptions.id));

  const catsByApp = new Map<number, AppListItem["categories"]>();
  for (const c of catRows) {
    const list = catsByApp.get(c.appId) ?? [];
    list.push({ id: c.id, slug: c.slug, nameEn: c.nameEn, nameAr: c.nameAr });
    catsByApp.set(c.appId, list);
  }
  const labelsByApp = new Map<number, MetadataLabel[]>();
  for (const l of labelRows) {
    const list = labelsByApp.get(l.appId) ?? [];
    list.push({ type: l.type, value: l.value, labelEn: l.labelEn, labelAr: l.labelAr });
    labelsByApp.set(l.appId, list);
  }

  return rows.map((r) => {
    const optionLabels = labelsByApp.get(r.id) ?? [];
    const optionKeys = new Set(optionLabels.map((l) => `${l.type}\u0000${l.value}`));
    const jsonbLabels = [
      ...jsonbArrayLabels(r.riwayah, "riwayah"),
      ...jsonbArrayLabels(r.mushafType, "mushaf_type"),
      ...jsonbArrayLabels(r.features, "features"),
    ].filter((l) => !optionKeys.has(`${l.type}\u0000${l.value}`));
    return {
      id: r.id,
      slug: r.slug,
      nameEn: r.nameEn,
      nameAr: r.nameAr,
      shortDescriptionEn: r.shortDescriptionEn,
      shortDescriptionAr: r.shortDescriptionAr,
      descriptionEn: r.descriptionEn,
      descriptionAr: r.descriptionAr,
      applicationIcon: r.applicationIcon,
      mainImageEn: r.mainImageEn,
      mainImageAr: r.mainImageAr,
      avgRating: r.avgRating,
      reviewCount: r.reviewCount,
      viewCount: r.viewCount,
      sortOrder: r.sortOrder,
      featured: r.featured,
      platform: r.platform,
      status: r.status,
      createdAt: r.createdAt,
      isNew: r.isNew,
      developer: {
        id: r.devId,
        nameEn: r.devNameEn,
        nameAr: r.devNameAr,
        website: r.devWebsite,
        logo: r.devLogo,
      },
      categories: catsByApp.get(r.id) ?? [],
      labels: [...optionLabels, ...jsonbLabels],
    };
  });
}

// ---------------------------------------------------------------------------
// Re-rank
// ---------------------------------------------------------------------------

const norm = (s: string): string => normalizeArabic(s).toLowerCase();

/** Per-app IDF document: name, full, short and category texts (normalized). */
function docText(c: Candidate): string {
  return norm(
    [
      c.nameEn,
      c.nameAr,
      c.descriptionEn,
      c.descriptionAr,
      c.shortDescriptionEn,
      c.shortDescriptionAr,
      ...c.categories.map((cat) => `${cat.nameEn} ${cat.nameAr}`),
    ].join(" ")
  );
}

function docFields(c: Candidate): DocFields {
  return {
    name: norm(`${c.nameEn} ${c.nameAr}`),
    full: norm(`${c.descriptionEn} ${c.descriptionAr}`),
    short: norm(`${c.shortDescriptionEn} ${c.shortDescriptionAr}`),
    category: norm(c.categories.map((cat) => `${cat.nameEn} ${cat.nameAr}`).join(" ")),
  };
}

/**
 * The full smart pipeline. Returns null when the embedding pool is empty
 * (caller falls back); throws on any provider/cache/DB failure (caller falls
 * back).
 */
async function runSmartSearch(
  filters: AppsFilters,
  search: string,
  provider?: EmbeddingProvider
): Promise<SmartSearchResult | null> {
  const vocabulary = await loadSearchVocabulary();
  const suggested = suggestQuery(search, vocabulary);
  const query = suggested ?? search;

  const augmented = await buildAugmentedQuery(query, filters);
  const vector = await getQueryEmbedding(augmented, provider);

  const pool = await fetchEmbeddingPool(vector);
  if (pool.length === 0) return null;

  const candidates = await hydratePool(pool.map((p) => p.id));
  const byId = new Map(candidates.map((c) => [c.id, c]));
  const tokens = tokenizeQuery(query);
  const idf = computeIdf(candidates.map(docText), tokens);

  const scored = pool
    .map((p) => {
      const c = byId.get(p.id);
      if (!c) return null;
      const keyword = keywordScore(docFields(c), tokens, idf);
      const { score: metadata, reasons } = metadataBoost(c.labels, tokens);
      const quality = qualityScore({
        avgRating: c.avgRating,
        reviewCount: c.reviewCount,
        viewCount: c.viewCount,
      });
      // 1 - cosine distance; a real number here (vectors contributed), so
      // combinedScore uses the vector weights.
      const vectorSim = 1 - p.distance;
      const score = combinedScore({ vectorSim, keyword, metadata, quality });
      return { item: c, reasons, score };
    })
    .filter((s): s is NonNullable<typeof s> => s !== null);

  const kept = scored.filter((s) => s.score >= RELEVANCE_CUTOFF);
  kept.sort(
    (a, b) => b.score - a.score || a.item.sortOrder - b.item.sortOrder || a.item.nameEn.localeCompare(b.item.nameEn)
  );

  const { page, pageSize } = parsePageParams(filters);
  const start = (page - 1) * pageSize;
  const results: SmartAppItem[] = kept
    .slice(start, start + pageSize)
    .map(({ item, reasons, score }) => ({
      ...item,
      matchReasons: reasons,
      relevanceScore: score,
    }));

  return {
    count: kept.length,
    page,
    pageSize,
    results,
    suggestedQuery: suggested,
    fallbackMode: false,
    query: search,
  };
}

/** Legacy hard keyword path with the smart result shape (no reasons/relevanceScore). */
async function runFallback(filters: AppsFilters, query: string): Promise<SmartSearchResult> {
  const { count, results } = await getAppListRows({ ...filters, search: query });
  const { page, pageSize } = parsePageParams(filters);
  return {
    count,
    page,
    pageSize,
    results,
    suggestedQuery: null,
    fallbackMode: true,
    query,
  };
}

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------

/**
 * Hybrid smart search. Without a search term there is nothing to embed or
 * suggest, so the legacy list path answers directly (fallbackMode: true).
 * Provider/cache failures and an empty embedding pool degrade to the same
 * fallback; a genuine DB error on the fallback path itself propagates.
 */
export async function searchAppsSmart(
  filters: AppsFilters,
  opts?: { provider?: EmbeddingProvider }
): Promise<SmartSearchResult> {
  const search = (filters.search ?? "").trim();
  if (!search) return runFallback(filters, search);

  let smart: SmartSearchResult | null = null;
  try {
    smart = await runSmartSearch(filters, search, opts?.provider);
  } catch {
    smart = null;
  }
  return smart ?? runFallback(filters, search);
}
