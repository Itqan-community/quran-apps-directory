/**
 * Keyboard layout conversion utility.
 *
 * Detects when a user has typed with the wrong keyboard layout active
 * (e.g. Arabic characters when they meant to type English, or vice-versa)
 * and converts the query to the intended script.
 *
 * Rules:
 * - Only converts when the query is *purely* one script (all Arabic or all Latin).
 * - Skips conversion for very short queries (≤ 2 meaningful chars) or
 *   punctuation-only strings to avoid false positives.
 * - For Arabic → English: multi-character tokens (e.g. 'لا') are processed
 *   before single characters to avoid incorrect partial replacements.
 */

// ── English key → Arabic character ────────────────────────────────────────────
const englishToArabic: Record<string, string> = {
  q: 'ض', w: 'ص', e: 'ث', r: 'ق', t: 'ف',
  y: 'غ', u: 'ع', i: 'ه', o: 'خ', p: 'ح',
  '[': 'ج', ']': 'د',

  a: 'ش', s: 'س', d: 'ي', f: 'ب', g: 'ل',
  h: 'ا', j: 'ت', k: 'ن', l: 'م', ';': 'ك',
  "'": 'ط',

  z: 'ئ', x: 'ء', c: 'ؤ', v: 'ر', b: 'لا',
  n: 'ى', m: 'ة', ',': 'و', '.': 'ز', '/': 'ظ',
  '`': 'ذ',
};

// ── Arabic character → English key ────────────────────────────────────────────
// NOTE: 'لا' maps to 'b'.  It MUST appear before 'ل' and 'ا' in iteration
// so the multi-char token is replaced first.  We achieve this by sorting
// entries by descending key length before building the lookup list.
const arabicToEnglishRaw: [string, string][] = [
  ['ض', 'q'], ['ص', 'w'], ['ث', 'e'], ['ق', 'r'], ['ف', 't'],
  ['غ', 'y'], ['ع', 'u'], ['ه', 'i'], ['خ', 'o'], ['ح', 'p'],
  ['ج', '['], ['د', ']'],

  ['ش', 'a'], ['س', 's'], ['ي', 'd'], ['ب', 'f'], ['ل', 'g'],
  ['ا', 'h'], ['ت', 'j'], ['ن', 'k'], ['م', 'l'], ['ك', ';'],
  ['ط', "'"],

  ['ئ', 'z'], ['ء', 'x'], ['ؤ', 'c'], ['ر', 'v'], ['لا', 'b'],
  ['ى', 'n'], ['ة', 'm'], ['و', ','], ['ز', '.'], ['ظ', '/'],
  ['ذ', '`'],
  // Common Hamza forms — mapped to their most recognisable Latin phonetic key
  ['أ', 'h'], ['إ', 'h'], ['آ', 'h'],
];

// Sort longest Arabic keys first so 'لا' is processed before 'ل' / 'ا'
const arabicToEnglishEntries = [...arabicToEnglishRaw].sort(
  ([a], [b]) => b.length - a.length,
);

// ── Minimum meaningful characters required to attempt conversion ──────────────
const MIN_MEANINGFUL_CHARS = 3;

// ── Script detection ──────────────────────────────────────────────────────────

/**
 * Returns true if every non-whitespace character in `query`
 * falls within the Arabic Unicode block (U+0600–U+06FF).
 */
export function isArabicQuery(query: string): boolean {
  return /^[\u0600-\u06FF\s]+$/.test(query);
}

/**
 * Returns true if every non-whitespace character in `query` is a Latin letter
 * or one of the punctuation keys that map to Arabic on the Arabic keyboard
 * layout: [ ] ; ' , . /
 */
export function isLatinQuery(query: string): boolean {
  return /^[a-zA-Z\s\[\];',.\/'`]+$/.test(query);
}

// ── Guard: skip trivially short or punctuation-only inputs ───────────────────

function hasSufficientMeaningfulChars(query: string): boolean {
  // Strip whitespace and punctuation; count remaining meaningful chars
  const meaningful = query.replace(/[\s[\];',./]+/g, '');
  return meaningful.length >= MIN_MEANINGFUL_CHARS;
}

// ── Conversion helpers ────────────────────────────────────────────────────────

function convertEnglishToArabic(query: string): string {
  return query
    .toLowerCase()
    .split('')
    .map((char) => englishToArabic[char] ?? char)
    .join('');
}

function convertArabicToEnglish(query: string): string {
  let result = query;
  // Process multi-char tokens first (longest match first) to avoid partial
  // replacements — e.g. 'لا' must become 'b', not 'g' + 'h'
  for (const [arabic, english] of arabicToEnglishEntries) {
    result = result.split(arabic).join(english);
  }
  return result;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Converts a query typed in the wrong keyboard layout to the intended script.
 *
 * - Arabic chars typed on an English layout → converts to English
 * - English chars typed on an Arabic layout → converts to Arabic
 *
 * Returns the converted string, or an empty string when:
 * - the query is empty
 * - the query is mixed-script (not a clear layout mistake)
 * - the query is too short to make a reliable guess
 */
export function convertKeyboardLayout(query: string): string {
  if (!query || !hasSufficientMeaningfulChars(query)) {
    return '';
  }

  if (isArabicQuery(query)) {
    return convertArabicToEnglish(query);
  }

  if (isLatinQuery(query)) {
    return convertEnglishToArabic(query);
  }

  // Mixed-script query — not a layout mistake; skip conversion
  return '';
}
