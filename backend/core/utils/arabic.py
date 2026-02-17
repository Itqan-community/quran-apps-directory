"""Arabic text normalization utilities for search matching."""

import re

# Tashkeel/diacritics range: U+064B-U+065F, U+0670 (superscript alef)
_TASHKEEL_RE = re.compile(r'[\u064B-\u065F\u0670]')

# Alef variants -> bare alef
_ALEF_VARIANTS = str.maketrans('أإآٱ', 'اااا')

# Taa marbuta -> haa, hamza on carriers -> base letter
_CHAR_NORMALIZE = str.maketrans('ةؤئ', 'هوي')


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
