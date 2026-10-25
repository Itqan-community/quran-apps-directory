/**
 * Pure query typo-suggestion for smart (RAG) search. No DB, no network, no
 * framework imports — the only dependency is normalizeArabic. Each whitespace
 * token (2..50 chars) is corrected first by the curated alias map, then — for
 * tokens of at least 4 chars — by the nearest vocabulary word within
 * Levenshtein distance 2. Original whitespace is preserved; null is returned
 * when nothing changed.
 */

import { normalizeArabic } from "@/lib/services/arabic";

// ---------------------------------------------------------------------------
// Curated alias map (port of legacy backend/core/utils/arabic.py _QUERY_ALIASES)
// ---------------------------------------------------------------------------

/** Raw ported entries; keys are normalized/lowercased when building QUERY_ALIASES. */
const RAW_ALIASES: Record<string, string> = {
  // English transliteration variants
  wersh: "warsh",
  werch: "warsh",
  warch: "warsh",
  worsh: "warsh",
  hafss: "hafs",
  hafz: "hafs",
  haafs: "hafs",
  kuran: "quran",
  koran: "quran",
  qoran: "quran",
  quoran: "quran",
  quraan: "quran",
  alqran: "quran", // 3 edits from "quran": alias, unreachable by the <=2 fuzzy pass
  tafseer: "tafsir",
  tafser: "tafsir",
  moshaf: "mushaf",
  "mus-haf": "mushaf",
  tajwid: "tajweed",
  tagweed: "tajweed",
  tajwead: "tajweed",
  tartil: "tarteel",
  tarteal: "tarteel",
  qaloon: "qalun",
  kalun: "qalun",
  sura: "surah",
  soorah: "surah",
  sora: "surah",
  ayat: "ayah",
  aya: "ayah",
  // Arabic misspellings (legacy ورس plus seeded وريش/ورييش variants)
  "قران": "قرآن",
  "مشحف": "مصحف",
  "تفسبر": "تفسير",
  "حفض": "حفظ",
  "تجوبد": "تجويد",
  "ورس": "ورش",
  "وريش": "ورش",
  "ورييش": "ورش",
};

/**
 * Alias map: latin keys lowercase, arabic keys normalized; values are
 * canonical forms. Built on a null prototype so indexing it with a user token
 * can never resolve inherited Object.prototype properties (constructor,
 * toString, valueOf, ...) as if they were alias entries.
 */
export const QUERY_ALIASES: Record<string, string> = (() => {
  const aliases = Object.create(null) as Record<string, string>;
  for (const [key, value] of Object.entries(RAW_ALIASES)) {
    aliases[normalizeArabic(key).toLowerCase()] = value;
  }
  return aliases;
})();

// ---------------------------------------------------------------------------
// Tuning constants
// ---------------------------------------------------------------------------

/** Max edit distance for the fuzzy vocabulary fallback. */
const MAX_EDIT_DISTANCE = 2;
/** Minimum token length (chars) eligible for any correction. */
const MIN_TOKEN_LEN = 2;
/** Maximum token length (chars) eligible for any correction. */
const MAX_TOKEN_LEN = 50;
/** Minimum token length (chars) eligible for the fuzzy fallback. */
const MIN_FUZZY_LEN = 4;

// ---------------------------------------------------------------------------
// Functions
// ---------------------------------------------------------------------------

/**
 * Classic iterative Levenshtein edit distance (insert/delete/substitute each
 * cost 1). Two-row DP; symmetric, so the longer string drives the rows.
 */
export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  const [longer, shorter] = a.length >= b.length ? [a, b] : [b, a];
  let previous: number[] = Array.from({ length: shorter.length + 1 }, (_, j) => j);
  for (let i = 1; i <= longer.length; i++) {
    const current: number[] = [i];
    for (let j = 1; j <= shorter.length; j++) {
      const cost = longer[i - 1] === shorter[j - 1] ? 0 : 1;
      current[j] = Math.min(current[j - 1] + 1, previous[j] + 1, previous[j - 1] + cost);
    }
    previous = current;
  }
  return previous[shorter.length];
}

/**
 * Suggest a corrected query, or null when nothing improves. Per whitespace
 * token (2..50 chars): (1) alias lookup on the normalized+lowercased token,
 * replacing when the alias differs; (2) else, for tokens of >= 4 chars, the
 * nearest vocabulary word (normalized, lowercased) with Levenshtein distance
 * <= MAX_EDIT_DISTANCE — strictly smaller distance wins, ties break
 * lexicographically — replacing only when the distance is > 0. A token whose
 * article-stripped form (الوحي → وحي) is already a vocabulary word is left
 * untouched. Original whitespace is preserved around tokens.
 */
export function suggestQuery(query: string, vocabulary: string[]): string | null {
  const parts = query.match(/\S+|\s+/g) ?? [];
  // Normalize the vocabulary once: the fuzzy pass compares every token against
  // every word, and the article check below needs exact membership.
  const vocab = vocabulary.map((w) => normalizeArabic(w).toLowerCase());
  const vocabSet = new Set(vocab);
  const corrected = parts.map((part) => {
    if (/^\s+$/.test(part)) return part; // preserve whitespace runs verbatim
    if (part.length < MIN_TOKEN_LEN || part.length > MAX_TOKEN_LEN) return part;
    const token = normalizeArabic(part).toLowerCase();
    // 1. Curated alias (highest priority).
    const alias = QUERY_ALIASES[token];
    if (alias !== undefined && alias !== token) return alias;
    // 2. Nearest vocabulary word within MAX_EDIT_DISTANCE (tokens >= 4 chars).
    if (token.length < MIN_FUZZY_LEN) return part;
    // A definite-article prefix (الوحي → وحي) is already a vocabulary word:
    // keep the user's wording instead of "correcting" it to an unrelated word
    // that happens to be equidistant (e.g. الدوري).
    const bare = token.startsWith("ال") ? token.slice(2) : null;
    if (bare && vocabSet.has(bare)) return part;
    let bestWord: string | null = null;
    let bestDist = Infinity;
    for (const vocabWord of vocab) {
      if (Math.abs(vocabWord.length - token.length) > MAX_EDIT_DISTANCE) continue;
      const dist = levenshtein(token, vocabWord);
      if (bestWord === null || dist < bestDist || (dist === bestDist && vocabWord < bestWord)) {
        bestWord = vocabWord;
        bestDist = dist;
      }
    }
    if (bestWord !== null && bestDist > 0 && bestDist <= MAX_EDIT_DISTANCE) return bestWord;
    return part;
  });
  const result = corrected.join("");
  return result === query ? null : result;
}
