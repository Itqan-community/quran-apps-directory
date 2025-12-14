import logging
import requests
from bs4 import BeautifulSoup
from typing import Optional

logger = logging.getLogger(__name__)

class AppCrawler:
    """
    Helper class to crawl external links for richer app context.
    """

    @staticmethod
    def extract_text_from_url(url: str) -> Optional[str]:
        """
        Fetches a URL and extracts meaningful text content.
        """
        if not url:
            return None
            
        try:
            headers = {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
            response = requests.get(url, headers=headers, timeout=5)
            if response.status_code != 200:
                return None

            soup = BeautifulSoup(response.content, 'html.parser')
            
            # Remove scripts and styles
            for script in soup(["script", "style"]):
                script.decompose()
                
            # Get text
            text = soup.get_text()
            
            # Break into lines and remove leading and trailing space on each
            lines = (line.strip() for line in text.splitlines())
            # Break multi-headlines into a line each
            chunks = (phrase.strip() for line in lines for phrase in line.split("  "))
            # Drop blank lines
            text = '\n'.join(chunk for chunk in chunks if chunk)
            
            # Limit context size to avoid token overflow cost
            return text[:2000] # First 2000 chars

        except Exception as e:
            logger.warning(f"Failed to crawl {url}: {e}")
            return None
