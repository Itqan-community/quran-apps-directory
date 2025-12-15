import logging
import requests
import time
from bs4 import BeautifulSoup
from typing import Optional, List
from dataclasses import dataclass

logger = logging.getLogger(__name__)


@dataclass
class CrawlResult:
    """Result of a single URL crawl."""
    url: str
    content: str
    source: str  # 'google_play', 'app_store', 'app_gallery'
    success: bool
    error: Optional[str] = None


class AppCrawler:
    """
    Enhanced crawler for extracting app descriptions from multiple sources.
    Handles Google Play, App Store, and Huawei AppGallery.
    """

    HEADERS = {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9,ar;q=0.8',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
    }

    # Per-source character limits
    CHAR_LIMITS = {
        'google_play': 1500,
        'app_store': 1500,
        'app_gallery': 1000,
    }

    @classmethod
    def crawl_all_sources(
        cls,
        google_play_url: Optional[str] = None,
        app_store_url: Optional[str] = None,
        app_gallery_url: Optional[str] = None,
        delay_between_requests: float = 0.5
    ) -> str:
        """
        Crawl all available sources and combine unique content.
        Returns combined text from all successful crawls with source labels.
        """
        results: List[CrawlResult] = []

        url_sources = [
            (google_play_url, 'google_play', cls._extract_google_play),
            (app_store_url, 'app_store', cls._extract_app_store),
            (app_gallery_url, 'app_gallery', cls._extract_app_gallery),
        ]

        for url, source, extractor in url_sources:
            if not url:
                continue

            try:
                content = extractor(url)
                if content:
                    limit = cls.CHAR_LIMITS.get(source, 1000)
                    results.append(CrawlResult(
                        url=url,
                        content=content[:limit],
                        source=source,
                        success=True
                    ))
                    logger.info(f"Successfully crawled {source}: {len(content)} chars")
            except Exception as e:
                logger.warning(f"Failed to crawl {source} ({url}): {e}")
                results.append(CrawlResult(
                    url=url,
                    content='',
                    source=source,
                    success=False,
                    error=str(e)
                ))

            # Rate limiting between requests
            if delay_between_requests > 0:
                time.sleep(delay_between_requests)

        return cls._combine_results(results)

    @classmethod
    def _combine_results(cls, results: List[CrawlResult]) -> str:
        """Combine crawl results with source labels."""
        sections = []
        for result in results:
            if result.success and result.content:
                source_label = result.source.replace('_', ' ').title()
                sections.append(f"[{source_label}] {result.content}")
        return "\n".join(sections)

    @classmethod
    def _fetch_html(cls, url: str, timeout: int = 10) -> Optional[str]:
        """Fetch HTML content from URL."""
        try:
            response = requests.get(url, headers=cls.HEADERS, timeout=timeout)
            if response.status_code == 200:
                return response.text
            logger.debug(f"HTTP {response.status_code} for {url}")
        except requests.Timeout:
            logger.debug(f"Timeout fetching {url}")
        except Exception as e:
            logger.debug(f"HTTP fetch failed for {url}: {e}")
        return None

    @classmethod
    def _extract_google_play(cls, url: str) -> Optional[str]:
        """Extract description from Google Play Store page."""
        html = cls._fetch_html(url)
        if not html:
            return None

        soup = BeautifulSoup(html, 'html.parser')

        # Google Play description is in data-g-id="description"
        desc_elem = soup.find('div', {'data-g-id': 'description'})
        if desc_elem:
            return cls._clean_text(desc_elem.get_text())

        # Fallback: look for itemprop description
        desc_meta = soup.find('meta', {'itemprop': 'description'})
        if desc_meta and desc_meta.get('content'):
            return cls._clean_text(desc_meta['content'])

        # Second fallback: generic extraction
        return cls._extract_generic(html)

    @classmethod
    def _extract_app_store(cls, url: str) -> Optional[str]:
        """Extract description from Apple App Store page."""
        html = cls._fetch_html(url)
        if not html:
            return None

        soup = BeautifulSoup(html, 'html.parser')

        # App Store uses section with class containing "description"
        desc_section = soup.find('section', class_=lambda x: x and 'description' in str(x).lower())
        if desc_section:
            paragraphs = desc_section.find_all('p')
            if paragraphs:
                return cls._clean_text(' '.join(p.get_text() for p in paragraphs))

        # Fallback: meta description
        meta_desc = soup.find('meta', {'name': 'description'})
        if meta_desc and meta_desc.get('content'):
            return cls._clean_text(meta_desc['content'])

        # Second fallback: generic extraction
        return cls._extract_generic(html)

    @classmethod
    def _extract_app_gallery(cls, url: str) -> Optional[str]:
        """Extract description from Huawei AppGallery page."""
        html = cls._fetch_html(url)
        if not html:
            return None

        soup = BeautifulSoup(html, 'html.parser')

        # AppGallery uses specific class for description
        desc_elem = soup.find('div', class_='desc-content')
        if desc_elem:
            return cls._clean_text(desc_elem.get_text())

        # Fallback to generic extraction
        return cls._extract_generic(html)

    @classmethod
    def _extract_generic(cls, html: str) -> Optional[str]:
        """Generic text extraction as fallback."""
        soup = BeautifulSoup(html, 'html.parser')

        # Remove scripts, styles, nav, header, footer
        for tag in soup(['script', 'style', 'nav', 'header', 'footer', 'aside']):
            tag.decompose()

        # Try to find main content area
        main = soup.find('main') or soup.find('article') or soup.find('body')
        if main:
            text = main.get_text(separator=' ', strip=True)
            return cls._clean_text(text)

        return None

    @classmethod
    def _clean_text(cls, text: str) -> str:
        """Clean and normalize extracted text."""
        if not text:
            return ''

        # Normalize whitespace
        lines = (line.strip() for line in text.splitlines())
        chunks = (phrase.strip() for line in lines for phrase in line.split('  '))
        text = ' '.join(chunk for chunk in chunks if chunk)

        # Remove excessive spaces
        while '  ' in text:
            text = text.replace('  ', ' ')

        return text.strip()

    # Legacy method for backward compatibility
    @staticmethod
    def extract_text_from_url(url: str) -> Optional[str]:
        """
        Legacy method - maintained for backward compatibility.
        Use crawl_all_sources() for new implementations.
        """
        if not url:
            return None

        try:
            headers = {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
            }
            response = requests.get(url, headers=headers, timeout=5)
            if response.status_code != 200:
                return None

            soup = BeautifulSoup(response.content, 'html.parser')

            for script in soup(["script", "style"]):
                script.decompose()

            text = soup.get_text()
            lines = (line.strip() for line in text.splitlines())
            chunks = (phrase.strip() for line in lines for phrase in line.split("  "))
            text = '\n'.join(chunk for chunk in chunks if chunk)

            return text[:2000]

        except Exception as e:
            logger.warning(f"Failed to crawl {url}: {e}")
            return None
