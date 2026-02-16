"""
AutoFill Service for AI-powered app data extraction.

Uses Gemini to extract structured app data from store pages and websites.
"""
import logging
import json
import requests
from typing import Optional, Dict, Any
from bs4 import BeautifulSoup
from django.conf import settings

from core.services.search.crawler import AppCrawler

logger = logging.getLogger(__name__)


class AutoFillService:
    """
    Service for extracting app data from store URLs and websites using AI.

    Crawls provided URLs and uses Gemini to extract structured bilingual data.
    """

    EXTRACTION_PROMPT = """
You are extracting app information from store pages and/or website content.
This is for a Quran Apps Directory - the app should be Islamic/Quran-related.

Raw content from multiple sources:
{crawled_content}

Extract the following fields in JSON format:
- app_name_en: English app name
- app_name_ar: Arabic app name (translate if not present)
- short_description_en: Brief English description (max 150 chars)
- short_description_ar: Brief Arabic description (translate or extract)
- description_en: Full English description (max 2000 chars)
- description_ar: Full Arabic description (translate if not present, max 2000 chars)
- developer_name_en: Developer name in English
- developer_name_ar: Developer name in Arabic (transliterate if needed)
- developer_website: Developer website URL (extract from content or use provided website)
- developer_email: Contact email if found
- app_icon_url: App icon URL if found in content
- screenshots: Array of screenshot URLs if found
- category_suggestion: Best matching category from: Mushaf, Tafsir, Hadith, Dua, Prayer Times, Qibla, Learning, Kids, Audio, Other

Prioritize information from store pages over website when both are available.
Return valid JSON only, no markdown formatting.
"""

    HEADERS = {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9,ar;q=0.8',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
    }

    def __init__(self):
        self.api_key = getattr(settings, 'AI_API_KEY', None)
        self.model_name = getattr(settings, 'AI_RERANK_MODEL', 'gemini-2.5-flash')
        self._genai = None
        self._model = None

        if self.api_key:
            try:
                import google.generativeai as genai
                genai.configure(api_key=self.api_key)
                self._genai = genai
                self._model = genai.GenerativeModel(self.model_name)
            except ImportError:
                logger.error("google-generativeai library not installed")
            except Exception as e:
                logger.error(f"Failed to initialize Gemini: {e}")

    def extract_from_urls(
        self,
        google_play_url: Optional[str] = None,
        app_store_url: Optional[str] = None,
        app_gallery_url: Optional[str] = None,
        website_url: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Extract app data from provided URLs using AI.

        Args:
            google_play_url: Google Play Store URL
            app_store_url: Apple App Store URL
            app_gallery_url: Huawei AppGallery URL
            website_url: App/Developer website URL

        Returns:
            Dictionary with extracted app data and crawled_content

        Raises:
            ValueError: If no URLs provided or AI extraction fails
        """
        if not any([google_play_url, app_store_url, app_gallery_url, website_url]):
            raise ValueError("At least one URL must be provided")

        if not self._model:
            raise ValueError("AI service not available. Check AI_API_KEY configuration.")

        # Step 1: Crawl all store pages
        crawled_content = AppCrawler.crawl_all_sources(
            google_play_url=google_play_url,
            app_store_url=app_store_url,
            app_gallery_url=app_gallery_url
        )

        # Step 2: Crawl website if provided
        if website_url:
            website_content = self._crawl_website(website_url)
            if website_content:
                crawled_content += f"\n[Website] {website_content}"

        if not crawled_content.strip():
            raise ValueError("Failed to crawl any content from the provided URLs")

        # Step 3: Use Gemini to extract structured data
        extracted_data = self._extract_with_ai(crawled_content)

        # Step 4: Add crawled_content and URLs to response
        extracted_data['crawled_content'] = crawled_content
        extracted_data['google_play_url'] = google_play_url or ''
        extracted_data['app_store_url'] = app_store_url or ''
        extracted_data['app_gallery_url'] = app_gallery_url or ''
        extracted_data['website_url'] = website_url or ''

        return extracted_data

    def _crawl_website(self, url: str) -> Optional[str]:
        """
        Crawl a generic website for app information.

        Extracts text from main content areas, focusing on:
        - Description and features
        - Contact information
        - About sections
        """
        try:
            response = requests.get(url, headers=self.HEADERS, timeout=10)
            if response.status_code != 200:
                logger.debug(f"HTTP {response.status_code} for website {url}")
                return None

            soup = BeautifulSoup(response.text, 'html.parser')

            # Remove unwanted elements
            for tag in soup(['script', 'style', 'nav', 'header', 'footer', 'aside', 'iframe']):
                tag.decompose()

            # Try to find main content
            main_content = (
                soup.find('main') or
                soup.find('article') or
                soup.find('div', class_=['content', 'main', 'body']) or
                soup.find('body')
            )

            if main_content:
                text = main_content.get_text(separator=' ', strip=True)
                # Clean up whitespace
                text = ' '.join(text.split())
                return text[:3000]  # Limit to 3000 chars

            return None

        except Exception as e:
            logger.warning(f"Failed to crawl website {url}: {e}")
            return None

    def _extract_with_ai(self, crawled_content: str) -> Dict[str, Any]:
        """
        Use Gemini to extract structured app data from crawled content.
        """
        prompt = self.EXTRACTION_PROMPT.format(crawled_content=crawled_content[:6000])

        try:
            response = self._model.generate_content(prompt)
            response_text = response.text.strip()

            # Clean markdown formatting if present
            if response_text.startswith("```json"):
                response_text = response_text[7:]
            if response_text.startswith("```"):
                response_text = response_text[3:]
            if response_text.endswith("```"):
                response_text = response_text[:-3]

            data = json.loads(response_text.strip())

            # Ensure all required fields exist with defaults
            return {
                'app_name_en': data.get('app_name_en', ''),
                'app_name_ar': data.get('app_name_ar', ''),
                'short_description_en': data.get('short_description_en', '')[:150],
                'short_description_ar': data.get('short_description_ar', '')[:150],
                'description_en': data.get('description_en', '')[:2000],
                'description_ar': data.get('description_ar', '')[:2000],
                'developer_name_en': data.get('developer_name_en', ''),
                'developer_name_ar': data.get('developer_name_ar', ''),
                'developer_website': data.get('developer_website', ''),
                'developer_email': data.get('developer_email', ''),
                'app_icon_url': data.get('app_icon_url', ''),
                'screenshots': data.get('screenshots', []),
                'category_suggestion': data.get('category_suggestion', ''),
            }

        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse AI response as JSON: {e}")
            raise ValueError("AI extraction failed: Invalid response format")
        except Exception as e:
            logger.error(f"AI extraction error: {e}")
            raise ValueError(f"AI extraction failed: {str(e)}")
