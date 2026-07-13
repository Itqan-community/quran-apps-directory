"""
Validators for app submission data.
"""
from urllib.parse import urlparse


def is_valid_url(url) -> bool:
    """
    Check whether a string is a well-formed http(s) URL.

    Used to validate store links (Google Play / App Store / AppGallery)
    submitted through the app submission form.
    """
    if not url or not isinstance(url, str):
        return False

    try:
        parsed = urlparse(url)
    except ValueError:
        return False

    return parsed.scheme in ('http', 'https') and bool(parsed.netloc)
