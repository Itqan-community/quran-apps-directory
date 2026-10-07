/** Arabic text normalization for search matching. Port of backend/core/utils/arabic.py. */

const TASHKEEL = /[\u064B-\u065F\u0670]/g;
const ALEF_VARIANTS: Record<string, string> = { "أ": "ا", "إ": "ا", "آ": "ا", "ٱ": "ا" };
const CHAR_NORMALIZE: Record<string, string> = { "ة": "ه", "ؤ": "و", "ئ": "ي" };

export function normalizeArabic(text: string): string {
  if (!text) return "";
  return text
    .replace(TASHKEEL, "")
    .replace(/[أإآٱةؤئ]/g, (ch) => ALEF_VARIANTS[ch] ?? CHAR_NORMALIZE[ch] ?? ch);
}
