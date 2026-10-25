/**
 * Pure hybrid-ranking math for smart (RAG) search. No DB, no network, no
 * framework imports — the only dependency is normalizeArabic. The legacy-parity
 * constants below are the single source of truth for the smart pipeline (spec §7).
 */

import { normalizeArabic } from "@/lib/services/arabic";

export type MatchReason = { type: string; value: string; labelEn: string; labelAr: string };
/** Already-normalized app text fields used for keyword scoring. */
export type DocFields = { name: string; full: string; short: string; category: string };
export type MetadataLabel = { type: string; value: string; labelEn: string; labelAr: string };

// ---------------------------------------------------------------------------
// Legacy parity constants (spec §7)
// ---------------------------------------------------------------------------

/** Combined-score weights when a vector similarity is available. */
export const RANK_WEIGHTS = { vector: 0.35, keyword: 0.4, metadata: 0.15, quality: 0.1 } as const;

/** Redistributed weights when no vector similarity (keyword-only fallback). */
export const FALLBACK_WEIGHTS = { keyword: 0.55, metadata: 0.25, quality: 0.2 } as const;

/** Per-field keyword priorities; name is the strongest signal. */
export const FIELD_PRIORITIES: Record<keyof DocFields, number> = {
  name: 0.5,
  full: 0.25,
  short: 0.15,
  category: 0.15,
};

/** Raw metadata boost added per unique matched (type, value). */
export const METADATA_STEP = 0.25;
/** Raw metadata-boost cap before normalizing to [0, 1]. */
export const METADATA_CAP = 2.0;
/** Combined-score relevance cutoff (applied only when vectors contributed). */
export const RELEVANCE_CUTOFF = 0.35;
/** Ranked candidate pool size. */
export const SMART_POOL_SIZE = 100;

// ---------------------------------------------------------------------------
// Functions
// ---------------------------------------------------------------------------

/**
 * Tokenize a raw query: normalize Arabic, lowercase, split on whitespace and
 * punctuation, drop tokens shorter than 2 characters.
 */
export function tokenizeQuery(q: string): string[] {
  return normalizeArabic(q)
    .toLowerCase()
    .split(/[\s\p{P}]+/u)
    .filter((token) => token.length >= 2);
}

/**
 * Inverse document frequency per query token: ln(1 + N/df), where N is the doc
 * count and df the number of docs containing the token — rare tokens weigh more.
 * A token absent from every doc is smoothed to df=1 so the value stays finite.
 */
export function computeIdf(docs: string[], tokens: string[]): Map<string, number> {
  const n = docs.length;
  const idf = new Map<string, number>();
  for (const token of tokens) {
    const df = docs.filter((doc) => doc.includes(token)).length;
    idf.set(token, Math.log(1 + n / Math.max(df, 1)));
  }
  return idf;
}

/**
 * Arabic definite-article variants for keyword matching: users type "الوحي"
 * while an app may be named "وحي" (and vice versa). Tokens of at least 4 chars
 * with the "ال" prefix also match their bare form.
 */
function tokenVariants(token: string): string[] {
  return token.length > 3 && token.startsWith("ال") ? [token, token.slice(2)] : [token];
}

/**
 * Keyword relevance in [0, 1]. Each field contributes its priority — normalized
 * by the strongest field so a complete name hit scores 1.0 — times the share of
 * total query IDF weight present in that field.
 */
export function keywordScore(fields: DocFields, tokens: string[], idf: Map<string, number>): number {
  if (tokens.length === 0) return 0;
  const totalIdf = tokens.reduce((sum, t) => sum + (idf.get(t) ?? 0), 0);
  if (totalIdf === 0) return 0;
  const topPriority = Math.max(...Object.values(FIELD_PRIORITIES));
  let score = 0;
  for (const field of Object.keys(FIELD_PRIORITIES) as (keyof DocFields)[]) {
    const text = fields[field];
    const fieldIdf = tokens.reduce(
      (sum, t) => (tokenVariants(t).some((v) => text.includes(v)) ? sum + (idf.get(t) ?? 0) : sum),
      0,
    );
    score += (FIELD_PRIORITIES[field] / topPriority) * (fieldIdf / totalIdf);
  }
  return Math.min(1, score);
}

/**
 * Metadata boost in [0, 1] plus bilingual match reasons. A label matches when
 * any query token (len >= 3) is a substring of its normalized EN or AR label.
 * Each unique (type, value) match adds METADATA_STEP to the raw boost; the raw
 * boost is then normalized by METADATA_CAP.
 */
export function metadataBoost(
  labels: MetadataLabel[],
  tokens: string[],
): { score: number; reasons: MatchReason[] } {
  const eligible = tokens.filter((t) => t.length >= 3);
  const reasons: MatchReason[] = [];
  if (eligible.length === 0) return { score: 0, reasons };
  const seen = new Set<string>();
  let raw = 0;
  for (const label of labels) {
    const labelEn = normalizeArabic(label.labelEn).toLowerCase();
    const labelAr = normalizeArabic(label.labelAr);
    const matched = eligible.some((t) => {
      const token = normalizeArabic(t).toLowerCase();
      return labelEn.includes(token) || labelAr.includes(token);
    });
    if (!matched) continue;
    const key = `${label.type}\u0000${label.value}`;
    if (seen.has(key)) continue;
    seen.add(key);
    raw += METADATA_STEP;
    reasons.push({ type: label.type, value: label.value, labelEn: label.labelEn, labelAr: label.labelAr });
  }
  return { score: Math.min(1, raw / METADATA_CAP), reasons };
}

/**
 * Quality score in [0, 1] — plan-pinned approximation of the legacy quality
 * phrasing: (rating/5)*0.7 + min(1, reviews/1000)*0.2 + min(1, views/10000)*0.1.
 * Rating is clamped to [0, 5] so the result stays in range.
 */
export function qualityScore(input: {
  avgRating: string;
  reviewCount: number;
  viewCount: number;
}): number {
  const rating = Math.max(0, Math.min(5, Number.parseFloat(input.avgRating) || 0));
  return (
    (rating / 5) * 0.7 +
    Math.min(1, input.reviewCount / 1000) * 0.2 +
    Math.min(1, input.viewCount / 10000) * 0.1
  );
}

/**
 * Final combined score. With a vector similarity: 0.35·v + 0.40·k + 0.15·m +
 * 0.10·q; without one (null or 0): redistribute to 0.55·k + 0.25·m + 0.20·q.
 */
export function combinedScore(p: {
  vectorSim: number | null;
  keyword: number;
  metadata: number;
  quality: number;
}): number {
  if (p.vectorSim) {
    return (
      RANK_WEIGHTS.vector * p.vectorSim +
      RANK_WEIGHTS.keyword * p.keyword +
      RANK_WEIGHTS.metadata * p.metadata +
      RANK_WEIGHTS.quality * p.quality
    );
  }
  return (
    FALLBACK_WEIGHTS.keyword * p.keyword +
    FALLBACK_WEIGHTS.metadata * p.metadata +
    FALLBACK_WEIGHTS.quality * p.quality
  );
}
