"""
User-Agent parsing utilities for view analytics.
"""
import hashlib
from datetime import date
from typing import Optional

from django.conf import settings

try:
    from user_agents import parse as parse_ua
    HAS_USER_AGENTS = True
except ImportError:
    HAS_USER_AGENTS = False


def parse_user_agent(user_agent_string: Optional[str]) -> dict:
    """
    Parse User-Agent string into structured data.

    Args:
        user_agent_string: Raw User-Agent header value

    Returns:
        dict with keys: device_type, browser, os
    """
    result = {
        'device_type': 'unknown',
        'browser': None,
        'os': None,
    }

    if not user_agent_string or not HAS_USER_AGENTS:
        return result

    try:
        ua = parse_ua(user_agent_string)

        # Determine device type
        if ua.is_bot:
            result['device_type'] = 'bot'
        elif ua.is_mobile:
            result['device_type'] = 'mobile'
        elif ua.is_tablet:
            result['device_type'] = 'tablet'
        elif ua.is_pc:
            result['device_type'] = 'desktop'

        # Browser info
        browser_family = ua.browser.family
        browser_version = ua.browser.version_string
        if browser_family:
            result['browser'] = f"{browser_family} {browser_version}".strip()

        # OS info
        os_family = ua.os.family
        os_version = ua.os.version_string
        if os_family:
            result['os'] = f"{os_family} {os_version}".strip()

    except Exception:
        # Fail silently - analytics should not break main functionality
        pass

    return result


def hash_ip_address(ip_address: Optional[str]) -> Optional[str]:
    """
    Create a privacy-compliant hash of IP address.

    Uses SHA256 with a daily rotating salt to:
    - Allow same-day deduplication
    - Prevent long-term tracking
    - Comply with privacy regulations

    Args:
        ip_address: Raw IP address

    Returns:
        Hashed IP string or None
    """
    if not ip_address:
        return None

    # Daily salt rotation for privacy
    daily_salt = f"{date.today().isoformat()}-{settings.SECRET_KEY[:16]}"
    combined = f"{ip_address}:{daily_salt}"
    return hashlib.sha256(combined.encode()).hexdigest()


def get_client_ip(request) -> Optional[str]:
    """
    Extract client IP from request, handling proxies.

    Checks headers in order:
    1. CF-Connecting-IP (Cloudflare)
    2. X-Forwarded-For (generic proxy)
    3. X-Real-IP (nginx)
    4. REMOTE_ADDR (direct connection)

    Args:
        request: Django HTTP request object

    Returns:
        Client IP address or None
    """
    # Cloudflare
    cf_ip = request.META.get('HTTP_CF_CONNECTING_IP')
    if cf_ip:
        return cf_ip

    # X-Forwarded-For (take first IP in chain)
    xff = request.META.get('HTTP_X_FORWARDED_FOR')
    if xff:
        return xff.split(',')[0].strip()

    # X-Real-IP
    real_ip = request.META.get('HTTP_X_REAL_IP')
    if real_ip:
        return real_ip

    # Direct connection
    return request.META.get('REMOTE_ADDR')


def get_country_from_request(request) -> Optional[str]:
    """
    Extract country code from request headers.

    Cloudflare provides this via CF-IPCountry header.

    Args:
        request: Django HTTP request object

    Returns:
        ISO 3166-1 alpha-2 country code or None
    """
    country = request.META.get('HTTP_CF_IPCOUNTRY')
    if country and len(country) == 2:
        return country.upper()
    return None
