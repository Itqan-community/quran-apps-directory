/**
 * Smart (RAG) search ingestion: builds the bilingual embedding document for an
 * app (port of the legacy `prepare_app_text()`, spec §6) and idempotently
 * upserts its 768-dim embedding into `apps.embedding`.
 *
 * `buildAppDocument` is pure; `loadAppBundle` is repo-layer (plain async
 * Drizzle, no Next.js cache directives); `upsertAppEmbedding` compares the
 * SHA-256 of the built document against `apps.doc_hash` to skip unchanged apps.
 */
import { createHash } from "node:crypto";
import { asc, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  appMetadataValues,
  appSubmissions,
  apps,
  appsCategories,
  categories,
  developers,
  metadataOptions,
  metadataTypes,
} from "@/db/schema";
import { getEmbeddingProvider } from "./provider";
import { EmbeddingProvider, EmbeddingUnavailableError } from "./types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AppDocumentBundle = {
  id: number;
  nameEn: string;
  nameAr: string;
  slug: string;
  shortEn: string;
  shortAr: string;
  fullEn: string;
  fullAr: string;
  platform: string;
  featured: boolean;
  avgRating: string;
  reviewCount: number;
  categories: { nameEn: string; nameAr: string }[];
  developer: { nameEn: string; nameAr: string; isVerified: boolean };
  labels: { type: string; value: string; labelEn: string; labelAr: string }[]; // merged jsonb arrays + metadata options
  riwayah: string[];
  mushafType: string[];
  features: string[];
  crawledContent: string | null;
  googlePlayLink: string | null;
  appStoreLink: string | null;
  appGalleryLink: string | null;
};

// ---------------------------------------------------------------------------
// Document builder (pure)
// ---------------------------------------------------------------------------

/** Full-description token budget per language (legacy parity). */
const DESC_LIMIT = 1000;
/** External crawled-content budget (legacy parity). */
const EXTERNAL_LIMIT = 2000;
/** Every embedding in this pipeline is 768-dim (pgvector column width). */
const EMBEDDING_DIMENSIONS = 768;

/**
 * Builds the structured bilingual document embedded for an app. Sections are
 * emitted in a fixed order and empty ones are skipped:
 * [APP] · [CATEGORIES] · [DEVELOPER] · [SHORT DESC EN/AR] · [FULL DESC EN/AR]
 * (each full description truncated to DESC_LIMIT) · [PLATFORM] (+ store
 * availability per truthy link) · [QUALITY] · [FEATURED] · [RIWAYAH] ·
 * [MUSHAF] · [FEATURES] (bilingual label joins) · [EXTERNAL] (truncated to
 * EXTERNAL_LIMIT). Lines are joined with "\n".
 */
export function buildAppDocument(bundle: AppDocumentBundle): string {
  const sections: string[] = [];

  // 1. App name (critical, bilingual)
  sections.push(`[APP] ${bundle.nameEn} | ${bundle.nameAr}`);

  // 2. Categories (bilingual)
  if (bundle.categories.length > 0) {
    const en = bundle.categories.map((c) => c.nameEn).join(", ");
    const ar = bundle.categories.map((c) => c.nameAr).join(", ");
    sections.push(`[CATEGORIES] ${en} | ${ar}`);
  }

  // 3. Developer (bilingual, verified badge as a quality signal)
  let developer = `[DEVELOPER] ${bundle.developer.nameEn}`;
  if (bundle.developer.nameAr) developer += ` | ${bundle.developer.nameAr}`;
  if (bundle.developer.isVerified) developer += " + VERIFIED DEVELOPER";
  sections.push(developer);

  // 4. Short descriptions (bilingual, always included when present)
  if (bundle.shortEn) sections.push(`[SHORT DESC EN] ${bundle.shortEn}`);
  if (bundle.shortAr) sections.push(`[SHORT DESC AR] ${bundle.shortAr}`);

  // 5. Full descriptions (bilingual, truncated for token budget)
  if (bundle.fullEn) sections.push(`[FULL DESC EN] ${bundle.fullEn.slice(0, DESC_LIMIT)}`);
  if (bundle.fullAr) sections.push(`[FULL DESC AR] ${bundle.fullAr.slice(0, DESC_LIMIT)}`);

  // 6. Platform + store availability per truthy link
  let platform = `[PLATFORM] ${bundle.platform}`;
  if (bundle.googlePlayLink) platform += " + Available on Google Play";
  if (bundle.appStoreLink) platform += " + Available on App Store";
  if (bundle.appGalleryLink) platform += " + Available on AppGallery";
  sections.push(platform);

  // 7. Quality signals (rating tier always present; reviews when any)
  const quality: string[] = [`${bundle.avgRating}/5 (${qualityWord(bundle.avgRating)})`];
  if (bundle.reviewCount > 0) quality.push(`${bundle.reviewCount} reviews (${reviewWord(bundle.reviewCount)})`);
  sections.push(`[QUALITY] ${quality.join(" - ")}`);

  // 8. Featured status
  if (bundle.featured) sections.push("[FEATURED] yes");

  // 9. Metadata sections (bilingual label joins from labels + raw arrays)
  const riwayah = bilingualJoin(bundle.labels, bundle.riwayah, "riwayah");
  if (riwayah) sections.push(`[RIWAYAH] ${riwayah}`);
  const mushaf = bilingualJoin(bundle.labels, bundle.mushafType, "mushaf_type");
  if (mushaf) sections.push(`[MUSHAF] ${mushaf}`);
  const features = bilingualJoin(bundle.labels, bundle.features, "features");
  if (features) sections.push(`[FEATURES] ${features}`);

  // 10. External crawled content (truncated)
  if (bundle.crawledContent) sections.push(`[EXTERNAL] ${bundle.crawledContent.slice(0, EXTERNAL_LIMIT)}`);

  return sections.join("\n");
}

/** Rating wording tiers (spec §6): Excellent ≥4.5, Very Good ≥4, Good ≥3, Average ≥2, else Low. */
function qualityWord(rating: string): string {
  const r = Number.parseFloat(rating) || 0;
  if (r >= 4.5) return "Excellent";
  if (r >= 4) return "Very Good";
  if (r >= 3) return "Good";
  if (r >= 2) return "Average";
  return "Low";
}

/** Review-count wording tiers (legacy parity). */
function reviewWord(count: number): string {
  if (count >= 1000) return "Many reviews";
  if (count >= 100) return "Some reviews";
  return "Few reviews";
}

/**
 * Joins the display strings for one metadata section: labels of `type` first
 * (bilingual `En (Ar)` when the labels differ, which also renders jsonb
 * pseudo-labels as their bare value), then raw array values not already
 * covered by a label. First occurrence of a value wins, so real metadata
 * option labels (merged first by loadAppBundle) shadow jsonb pseudo-labels.
 */
function bilingualJoin(
  labels: AppDocumentBundle["labels"],
  rawValues: string[],
  type: string
): string {
  const parts: string[] = [];
  const seen = new Set<string>();
  for (const label of labels) {
    if (label.type !== type || seen.has(label.value)) continue;
    seen.add(label.value);
    parts.push(label.labelAr && label.labelAr !== label.labelEn ? `${label.labelEn} (${label.labelAr})` : label.labelEn);
  }
  for (const value of rawValues) {
    if (!value || seen.has(value)) continue;
    seen.add(value);
    parts.push(value);
  }
  return parts.join(", ");
}

// ---------------------------------------------------------------------------
// Bundle loader (repo layer)
// ---------------------------------------------------------------------------

/**
 * Loads everything buildAppDocument needs for one app: the row itself, its
 * developer, categories, merged metadata labels (metadata options first, then
 * jsonb array values as pseudo-labels) and the crawled content of the latest
 * submission linked via created_app_id. Returns null when the app is missing.
 * All queries carry explicit ORDER BY so the built document (and therefore
 * its doc_hash) is deterministic.
 */
export async function loadAppBundle(appId: number): Promise<AppDocumentBundle | null> {
  const appRows = await db.select().from(apps).where(eq(apps.id, appId)).limit(1);
  const a = appRows[0];
  if (!a) return null;

  const devRows = await db
    .select({
      nameEn: developers.nameEn,
      nameAr: developers.nameAr,
      isVerified: developers.isVerified,
    })
    .from(developers)
    .where(eq(developers.id, a.developerId))
    .limit(1);
  const d = devRows[0];

  const catRows = await db
    .select({ nameEn: categories.nameEn, nameAr: categories.nameAr })
    .from(appsCategories)
    .innerJoin(categories, eq(categories.id, appsCategories.categoryId))
    .where(eq(appsCategories.appId, a.id))
    .orderBy(asc(categories.sortOrder), asc(categories.id));

  const optionRows = await db
    .select({
      type: metadataTypes.name,
      value: metadataOptions.value,
      labelEn: metadataOptions.labelEn,
      labelAr: metadataOptions.labelAr,
    })
    .from(appMetadataValues)
    .innerJoin(metadataOptions, eq(metadataOptions.id, appMetadataValues.metadataOptionId))
    .innerJoin(metadataTypes, eq(metadataTypes.id, metadataOptions.metadataTypeId))
    .where(eq(appMetadataValues.appId, a.id))
    .orderBy(asc(metadataTypes.sortOrder), asc(metadataOptions.sortOrder), asc(metadataOptions.id));

  const subRows = await db
    .select({ crawledContent: appSubmissions.crawledContent })
    .from(appSubmissions)
    .where(eq(appSubmissions.createdAppId, a.id))
    .orderBy(desc(appSubmissions.id))
    .limit(1);

  // Merge: real metadata option labels first (they shadow jsonb pseudo-labels
  // with the same type+value in bilingualJoin), then jsonb array values.
  const optionKeys = new Set(optionRows.map((r) => `${r.type}\u0000${r.value}`));
  const jsonbLabels = [
    ...jsonbArrayLabels(a.riwayah, "riwayah"),
    ...jsonbArrayLabels(a.mushafType, "mushaf_type"),
    ...jsonbArrayLabels(a.features, "features"),
  ].filter((l) => !optionKeys.has(`${l.type}\u0000${l.value}`));

  return {
    id: a.id,
    nameEn: a.nameEn,
    nameAr: a.nameAr,
    slug: a.slug,
    shortEn: a.shortDescriptionEn,
    shortAr: a.shortDescriptionAr,
    fullEn: a.descriptionEn,
    fullAr: a.descriptionAr,
    platform: a.platform,
    featured: a.featured,
    avgRating: a.avgRating,
    reviewCount: a.reviewCount,
    categories: catRows,
    developer: {
      nameEn: d?.nameEn ?? "",
      nameAr: d?.nameAr ?? "",
      isVerified: d?.isVerified ?? false,
    },
    labels: [...optionRows, ...jsonbLabels],
    riwayah: a.riwayah ?? [],
    mushafType: a.mushafType ?? [],
    features: a.features ?? [],
    crawledContent: subRows[0]?.crawledContent ?? null,
    googlePlayLink: a.googlePlayLink,
    appStoreLink: a.appStoreLink,
    appGalleryLink: a.appGalleryLink,
  };
}

/** A jsonb array value has no curated bilingual label: the value stands in for both. */
function jsonbArrayLabels(
  values: string[] | null,
  type: string
): { type: string; value: string; labelEn: string; labelAr: string }[] {
  return (values ?? []).map((value) => ({ type, value, labelEn: value, labelAr: value }));
}

// ---------------------------------------------------------------------------
// Embedding upsert
// ---------------------------------------------------------------------------

/**
 * Embeds one app: builds the document, skips when its SHA-256 matches
 * `apps.doc_hash` (unchanged doc), otherwise embeds via `opts.provider` (or
 * the factory default) and writes embedding + doc_hash + embedded_at.
 * Throws EmbeddingUnavailableError for a malformed (non-768-dim) vector;
 * provider failures propagate as-is for callers to catch.
 */
export async function upsertAppEmbedding(
  appId: number,
  opts?: { provider?: EmbeddingProvider }
): Promise<{ status: "embedded" | "skipped" | "app_not_found" }> {
  const bundle = await loadAppBundle(appId);
  if (!bundle) return { status: "app_not_found" };

  const doc = buildAppDocument(bundle);
  const hash = sha256Hex(doc);

  const hashRows = await db
    .select({ docHash: apps.docHash })
    .from(apps)
    .where(eq(apps.id, appId));
  if (hashRows[0]?.docHash === hash) return { status: "skipped" };

  const provider = opts?.provider ?? getEmbeddingProvider();
  const values = await provider.embedDocument(doc);
  if (values.length !== EMBEDDING_DIMENSIONS) {
    throw new EmbeddingUnavailableError(
      `provider "${provider.name}" returned ${values.length} dimensions, expected ${EMBEDDING_DIMENSIONS}`
    );
  }

  await db
    .update(apps)
    .set({ embedding: values, docHash: hash, embeddedAt: sql`now()` })
    .where(eq(apps.id, appId));

  return { status: "embedded" };
}

function sha256Hex(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}
