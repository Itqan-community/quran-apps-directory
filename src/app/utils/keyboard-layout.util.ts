const englishToArabic: Record<string, string> = {
  q: 'ض',
  w: 'ص',
  e: 'ث',
  r: 'ق',
  t: 'ف',
  y: 'غ',
  u: 'ع',
  i: 'ه',
  o: 'خ',
  p: 'ح',
  '[': 'ج',
  ']': 'د',

  a: 'ش',
  s: 'س',
  d: 'ي',
  f: 'ب',
  g: 'ل',
  h: 'ا',
  j: 'ت',
  k: 'ن',
  l: 'م',
  ';': 'ك',
  "'": 'ط',

  z: 'ئ',
  x: 'ء',
  c: 'ؤ',
  v: 'ر',
  b: 'لا',
  n: 'ى',
  m: 'ة',
  ',': 'و',
  '.': 'ز',
  '/': 'ظ',
};

const arabicToEnglish: Record<string, string> = {
  'ض': 'q',
  'ص': 'w',
  'ث': 'e',
  'ق': 'r',
  'ف': 't',
  'غ': 'y',
  'ع': 'u',
  'ه': 'i',
  'خ': 'o',
  'ح': 'p',
  'ج': '[',
  'د': ']',

  'ش': 'a',
  'س': 's',
  'ي': 'd',
  'ب': 'f',
  'ل': 'g',
  'ا': 'h',
  'ت': 'j',
  'ن': 'k',
  'م': 'l',
  'ك': ';',
  'ط': "'",

  'ئ': 'z',
  'ء': 'x',
  'ؤ': 'c',
  'ر': 'v',
  'لا': 'b',
  'ى': 'n',
  'ة': 'm',
  'و': ',',
  'ز': '.',
  'ظ': '/',
};

/**
 * Detects if a query is purely Arabic script.
 */
export function isArabicQuery(query: string): boolean {
  return /^[\u0600-\u06FF\s]+$/.test(query);
}

/**
 * Detects if a query is purely Latin (English) script,
 * including punctuation keys that map to Arabic characters
 * on the Arabic keyboard layout: [ ] ; ' , . /
 */
export function isLatinQuery(query: string): boolean {
  return /^[a-zA-Z\s[\];',.\/]+$/.test(query);
}

/**
 * Converts a query typed in the wrong keyboard layout to the intended layout.
 *
 * - Arabic chars typed on English layout → converts to English
 * - English chars typed on Arabic layout → converts to Arabic
 *
 * Returns the converted string, or an empty string if no conversion is needed
 * or the query is not purely one script.
 */
export function convertKeyboardLayout(query: string): string {
  if (!query) return '';

  if (isArabicQuery(query)) {
    return convertArabicToEnglish(query);
  }

  if (isLatinQuery(query)) {
    return convertEnglishToArabic(query);
  }

  // Mixed-script query — not a layout mistake, skip conversion
  return '';
}

function convertEnglishToArabic(query: string): string {
  return query
    .toLowerCase()
    .split('')
    .map((char) => englishToArabic[char] ?? char)
    .join('');
}

function convertArabicToEnglish(query: string): string {
  // Handle multi-char Arabic tokens (e.g. 'لا') before single chars
  let result = query;
  for (const [arabic, english] of Object.entries(arabicToEnglish)) {
    result = result.split(arabic).join(english);
  }
  return result;
}
