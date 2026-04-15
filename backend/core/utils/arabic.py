"""Arabic text normalization utilities for search matching."""

import logging
import re
from typing import Optional, Set

logger = logging.getLogger(__name__)

# Tashkeel/diacritics range: U+064B-U+065F, U+0670 (superscript alef)
_TASHKEEL_RE = re.compile(r'[\u064B-\u065F\u0670]')

# Alef variants -> bare alef
_ALEF_VARIANTS = str.maketrans('أإآٱ', 'اااا')

# Taa marbuta -> haa, hamza on carriers -> base letter
_CHAR_NORMALIZE = str.maketrans('ةؤئ', 'هوي')


# Curated word-level alias map for common misspellings and transliteration variants
_QUERY_ALIASES = {
    # English transliteration variants
    'wersh': 'warsh', 'werch': 'warsh', 'warch': 'warsh', 'worsh': 'warsh',
    'hafss': 'hafs', 'hafz': 'hafs', 'haafs': 'hafs',
    'kuran': 'quran', 'koran': 'quran', 'qoran': 'quran', 'quoran': 'quran', 'quraan': 'quran',
    'tafseer': 'tafsir', 'tafser': 'tafsir',
    'moshaf': 'mushaf', 'mus-haf': 'mushaf',
    'tajwid': 'tajweed', 'tagweed': 'tajweed', 'tajwead': 'tajweed',
    'tartil': 'tarteel', 'tarteal': 'tarteel',
    'qaloon': 'qalun', 'kalun': 'qalun',
    'sura': 'surah', 'soorah': 'surah', 'sora': 'surah',
    'ayat': 'ayah', 'aya': 'ayah',
    # Arabic misspellings (raw comparison, not normalized)
    'قران': 'قرآن',
    'مشحف': 'مصحف',
    'تفسبر': 'تفسير',
    'حفض': 'حفظ',
    'تجوبد': 'تجويد',
    'ورس': 'ورش',
}


# Static base vocabulary - cold start safe, no DB needed
_BASE_VOCABULARY = {
    'quran', 'mushaf', 'tafsir', 'tajweed', 'tarteel', 'hafs', 'warsh',
    'qalun', 'surah', 'ayah', 'hifz', 'tilawah', 'riwayah', 'dua',
    'hadith', 'sunnah', 'ramadan', 'offline', 'audio', 'memorize',
    'recite', 'kids', 'accessibility',
    'قرآن', 'مصحف', 'تفسير', 'تجويد', 'ترتيل', 'حفص', 'ورش',
    'قالون', 'سورة', 'آية', 'حفظ', 'تلاوة', 'رواية', 'دعاء',
}

VOCAB_CACHE_KEY = 'search_vocabulary'


def _levenshtein(s1: str, s2: str) -> int:
    """Pure Python iterative Levenshtein edit distance."""
    if len(s1) < len(s2):
        return _levenshtein(s2, s1)
    if len(s2) == 0:
        return len(s1)
    prev_row = list(range(len(s2) + 1))
    for i, c1 in enumerate(s1):
        curr_row = [i + 1]
        for j, c2 in enumerate(s2):
            cost = 0 if c1 == c2 else 1
            curr_row.append(min(
                curr_row[j] + 1,        # insert
                prev_row[j + 1] + 1,    # delete
                prev_row[j] + cost,     # substitute
            ))
        prev_row = curr_row
    return prev_row[-1]


def _build_vocabulary_from_db() -> Set[str]:
    """Query DB for app names, categories, metadata to build vocabulary."""
    words = set()
    try:
        from apps.models import App
        from categories.models import Category
        from metadata.models import MetadataOption

        for app in App.objects.filter(status='published').only('name_en', 'name_ar'):
            for field in (app.name_en, app.name_ar):
                if field:
                    words.update(w.lower() for w in field.split() if len(w) >= 3)

        for cat in Category.objects.filter(is_active=True).only('name_en', 'name_ar'):
            for field in (cat.name_en, cat.name_ar):
                if field:
                    words.update(w.lower() for w in field.split() if len(w) >= 3)

        for opt in MetadataOption.objects.only('value', 'label_en', 'label_ar'):
            for field in (opt.value, opt.label_en, opt.label_ar):
                if field:
                    words.update(w.lower() for w in field.split() if len(w) >= 3)
    except Exception as e:
        logger.debug('Could not build DB vocabulary: %s', e)
    return words


def _get_vocabulary() -> Set[str]:
    """Get combined vocabulary from cache/DB + static base."""
    try:
        from django.core.cache import cache
        cached = cache.get(VOCAB_CACHE_KEY)
        if cached is not None:
            return cached

        db_words = _build_vocabulary_from_db()
        combined = _BASE_VOCABULARY | db_words
        cache.set(VOCAB_CACHE_KEY, combined, 3600)  # 1 hour TTL
        return combined
    except Exception:
        return _BASE_VOCABULARY


def _fuzzy_match_word(word: str, vocabulary: Set[str]) -> Optional[str]:
    """Find closest vocabulary match within edit distance threshold."""
    if word in vocabulary:
        return None  # already correct
    max_dist = 1 if len(word) < 5 else 2
    best_match = None
    best_dist = max_dist + 1
    for candidate in vocabulary:
        # Quick length pre-filter
        if abs(len(candidate) - len(word)) > max_dist:
            continue
        dist = _levenshtein(word, candidate)
        if dist <= max_dist and dist < best_dist:
            best_dist = dist
            best_match = candidate
    return best_match


def suggest_query_correction(query: str) -> Optional[str]:
    """Return corrected query if any word matches an alias or fuzzy match, else None.

    Priority: alias map first (curated), then fuzzy edit-distance fallback.
    Word-level only to avoid false matches on substrings.
    """
    if not query or not query.strip():
        return None
    words = query.lower().split()
    vocabulary = _get_vocabulary()
    corrected = []
    for w in words:
        # 1. Alias map (curated, highest priority)
        alias = _QUERY_ALIASES.get(w)
        if alias:
            corrected.append(alias)
            continue
        # 2. Fuzzy match against vocabulary
        fuzzy = _fuzzy_match_word(w, vocabulary)
        corrected.append(fuzzy if fuzzy else w)
    result = ' '.join(corrected)
    return result if result != query.lower() else None


def normalize_arabic(text: str) -> str:
    """
    Normalize Arabic text for search comparison.

    - Removes tashkeel/diacritics
    - Normalizes alef variants to bare alef
    - Normalizes taa marbuta to haa
    - Normalizes hamza on waw/yaa to base letter
    """
    if not text:
        return ''
    text = _TASHKEEL_RE.sub('', text)
    text = text.translate(_ALEF_VARIANTS)
    text = text.translate(_CHAR_NORMALIZE)
    return text
