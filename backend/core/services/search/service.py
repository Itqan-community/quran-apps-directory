import logging
from typing import List, Any, Optional
from decimal import Decimal
from django.db.models import QuerySet
from django.utils import timezone
from datetime import timedelta
from pgvector.django import CosineDistance

from .factory import AISearchFactory
from .crawler import AppCrawler

logger = logging.getLogger(__name__)


class AISearchService:
    """
    Service for AI-powered semantic search.
    Uses AISearchFactory to load the configured provider (OpenAI, DeepSeek, Gemini).
    """

    def __init__(self):
        self.provider = AISearchFactory.get_provider()
        if not self.provider:
            logger.warning("AISearchProvider could not be initialized. Check settings.")

    def get_embedding(self, text: str) -> List[float]:
        """
        Generate embedding vector using the active provider.
        """
        if not self.provider:
            return []
        return self.provider.get_embedding(text)

    def prepare_app_text(
        self,
        app: Any,
        crawl_links: bool = False,
        use_cached_crawl: bool = True,
        include_full_descriptions: bool = True
    ) -> str:
        """
        Prepare rich, structured text representation of an App for embedding.

        Args:
            app: The App model instance
            crawl_links: Whether to crawl external links for additional context
            use_cached_crawl: Whether to use cached crawled content if available
            include_full_descriptions: Whether to include full descriptions (vs short only)

        Returns:
            Structured text optimized for embedding generation with bilingual content
        """
        sections = []

        # 1. App Name (Critical - bilingual)
        sections.append(f"[APP] {app.name_en} | {app.name_ar}")

        # 2. Categories with bilingual names and descriptions
        category_parts_en = []
        category_parts_ar = []
        category_context = []

        for category in app.categories.all():
            category_parts_en.append(category.name_en)
            category_parts_ar.append(category.name_ar)
            # Include category description for semantic context
            if hasattr(category, 'description_en') and category.description_en:
                category_context.append(category.description_en[:100])

        if category_parts_en:
            sections.append(
                f"[CATEGORIES] {', '.join(category_parts_en)} | {', '.join(category_parts_ar)}"
            )
            if category_context:
                sections.append(f"[CATEGORY CONTEXT] {' '.join(category_context)}")

        # 3. Developer Information (bilingual)
        if app.developer:
            dev = app.developer
            dev_info = f"[DEVELOPER] {dev.name_en}"
            if hasattr(dev, 'name_ar') and dev.name_ar:
                dev_info += f" | {dev.name_ar}"
            if hasattr(dev, 'description_en') and dev.description_en:
                dev_info += f" - {dev.description_en[:200]}"
            sections.append(dev_info)

            # Verified developer badge for quality signal
            if hasattr(dev, 'is_verified') and dev.is_verified:
                sections.append("[VERIFIED DEVELOPER]")

        # 4. Descriptions (Bilingual - short descriptions always included)
        sections.append(f"[SHORT DESC EN] {app.short_description_en}")
        sections.append(f"[SHORT DESC AR] {app.short_description_ar}")

        # Full descriptions - truncated for token budget
        if include_full_descriptions:
            if app.description_en:
                sections.append(f"[FULL DESC EN] {app.description_en[:1000]}")
            if app.description_ar:
                sections.append(f"[FULL DESC AR] {app.description_ar[:1000]}")

        # 5. Platform Information with store availability
        platform_display = app.get_platform_display()
        store_availability = []
        if app.google_play_link:
            store_availability.append("Android/Google Play")
        if app.app_store_link:
            store_availability.append("iOS/App Store")
        if app.app_gallery_link:
            store_availability.append("Huawei/AppGallery")

        platform_text = f"[PLATFORM] {platform_display}"
        if store_availability:
            platform_text += f" (Available on: {', '.join(store_availability)})"
        sections.append(platform_text)

        # 6. Quality/Popularity Signals
        rating_text = self._format_rating_context(app)
        if rating_text:
            sections.append(rating_text)

        # 7. Featured Status
        if app.featured:
            sections.append("[FEATURED] Recommended App - Editor's Choice")

        # 8. External Crawled Content
        external_content = self._get_external_content(
            app,
            crawl_links=crawl_links,
            use_cached=use_cached_crawl
        )
        if external_content:
            sections.append(f"[EXTERNAL] {external_content}")

        return "\n".join(sections)

    def _format_rating_context(self, app: Any) -> str:
        """Format rating and review count into semantic context."""
        parts = []

        if app.avg_rating and app.avg_rating > Decimal('0'):
            rating_tier = "Excellent" if app.avg_rating >= Decimal('4.5') else \
                          "Very Good" if app.avg_rating >= Decimal('4.0') else \
                          "Good" if app.avg_rating >= Decimal('3.5') else \
                          "Average"
            parts.append(f"{app.avg_rating}/5 ({rating_tier})")

        if app.review_count > 0:
            review_tier = "Many reviews" if app.review_count >= 1000 else \
                          "Some reviews" if app.review_count >= 100 else \
                          "Few reviews"
            parts.append(f"{app.review_count} reviews ({review_tier})")

        if app.view_count > 0:
            popularity = "Very Popular" if app.view_count >= 10000 else \
                         "Popular" if app.view_count >= 1000 else \
                         "Growing"
            parts.append(popularity)

        if parts:
            return f"[QUALITY] {' - '.join(parts)}"
        return ""

    def _get_external_content(
        self,
        app: Any,
        crawl_links: bool = False,
        use_cached: bool = True
    ) -> str:
        """Get external content, using cache or crawling as needed."""
        # Check for cached content first
        if use_cached and hasattr(app, 'crawled_content') and app.crawled_content:
            # Check if cache is fresh (less than 30 days old)
            if hasattr(app, 'crawled_at') and app.crawled_at:
                cache_age = timezone.now() - app.crawled_at
                if cache_age < timedelta(days=30):
                    logger.debug(f"Using cached crawl for {app.name_en} ({cache_age.days} days old)")
                    return app.crawled_content[:2000]

        # Crawl if requested
        if crawl_links:
            crawled = AppCrawler.crawl_all_sources(
                google_play_url=app.google_play_link,
                app_store_url=app.app_store_link,
                app_gallery_url=app.app_gallery_link
            )

            if crawled:
                # Cache the result if the model supports it
                if hasattr(app, 'crawled_content'):
                    app.crawled_content = crawled
                    app.crawled_at = timezone.now()
                    app.save(update_fields=['crawled_content', 'crawled_at'])
                    logger.info(f"Cached crawled content for {app.name_en}")

                return crawled[:2000]

        return ""

    def search_apps(self, query: str, limit: int = 50, rerank_top_k: int = 20) -> List[Any]:
        """
        Perform semantic search on Apps with optional Reranking.

        Flow:
        1. Vector Search (Retrieval) -> Get top 'limit' candidates (fast).
        2. LLM Reranking (Reasoning) -> Sort top 'rerank_top_k' candidates by strict relevance (slower).

        Returns:
            List of App objects (possibly reordered).
        """
        from apps.models import App

        embedding = self.get_embedding(query)
        if not embedding:
            return []

        # 1. Retrieval: Semantic Search using Cosine Distance
        candidates = App.objects.annotate(
            distance=CosineDistance('embedding', embedding)
        ).order_by('distance')[:limit]

        # Convert queryset to list
        candidate_list = list(candidates)

        if not candidate_list or not self.provider:
            return candidate_list

        # 2. Reasoning: LLM Reranking
        # We assume the first 'rerank_top_k' are worth checking deeply.
        # We pass minimal context to the LLM to save tokens.
        docs_to_rank = []
        for app in candidate_list[:rerank_top_k]:
            docs_to_rank.append({
                'id': app.id,
                'name_en': app.name_en,
                'description_en': app.description_en,
                # Store the original obj reference to retrieve later
                '_obj': app
            })

        reranked_docs = self.provider.rerank(query, docs_to_rank)

        # Reconstruct the list of App objects based on reranked order
        final_results = []
        seen_ids = set()

        for doc in reranked_docs:
            app = doc.get('_obj')
            if app:
                # Attach AI reasoning if available (not persisted to DB, just runtime)
                app.ai_reasoning = doc.get('ai_reasoning')
                final_results.append(app)
                seen_ids.add(app.id)

        # Append any candidates that weren't reranked (the long tail)
        for app in candidate_list:
            if app.id not in seen_ids:
                final_results.append(app)

        return final_results
