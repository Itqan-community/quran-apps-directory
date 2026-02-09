import logging
from typing import List, Any, Optional, Dict, Tuple
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

        # 9. Dynamic Metadata (loop through all active MetadataTypes)
        metadata_values = self._get_app_metadata_values(app)

        for metadata_type_name, values in metadata_values.items():
            if values:
                labels = self._get_metadata_labels(values, metadata_type_name)
                # Convert snake_case to TITLE CASE for tag: riwayah -> RIWAYAH
                tag_name = metadata_type_name.upper().replace('_', ' ')
                sections.append(f"[{tag_name}] {', '.join(labels)}")

        return "\n".join(sections)

    def _get_app_metadata_values(self, app: Any) -> Dict[str, List[str]]:
        """
        Get metadata values from AppMetadataValue table.
        Returns dict like: {'riwayah': ['hafs', 'warsh'], 'features': ['offline']}
        """
        from metadata.models import AppMetadataValue

        result = {}
        for mv in AppMetadataValue.objects.filter(app=app).select_related(
            'metadata_option', 'metadata_option__metadata_type'
        ):
            name = mv.metadata_option.metadata_type.name
            result.setdefault(name, []).append(mv.metadata_option.value)
        return result

    def _get_metadata_labels(self, values: List[str], metadata_type: str) -> List[str]:
        """
        Convert metadata values to bilingual labels for better embedding quality.
        Returns labels like: ["Offline (بدون إنترنت)", "Audio (صوت)"]
        """
        from metadata.models import MetadataOption

        labels = []
        options = MetadataOption.objects.filter(
            metadata_type__name=metadata_type,
            value__in=values
        ).select_related('metadata_type')

        for opt in options:
            labels.append(f"{opt.label_en} ({opt.label_ar})")

        return labels if labels else values

    def _get_active_metadata_names(self) -> List[str]:
        """Get list of active metadata type names from database."""
        from metadata.models import MetadataType
        return list(
            MetadataType.objects.filter(is_active=True).values_list('name', flat=True)
        )

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
        """
        Get external content from AppCrawledData table or legacy cache.
        Falls back to crawling if requested and no fresh data exists.
        """
        from apps.models import AppCrawledData, CrawlStatus

        # 1. Check AppCrawledData table for fresh content (less than 30 days old)
        if use_cached:
            fresh_threshold = timezone.now() - timedelta(days=30)
            crawled_entries = AppCrawledData.objects.filter(
                app=app,
                status=CrawlStatus.SUCCESS,
                crawled_at__gte=fresh_threshold
            )

            if crawled_entries.exists():
                # Combine content from all successful sources
                sections = []
                for entry in crawled_entries:
                    if entry.content:
                        source_label = entry.source.replace('_', ' ').title()
                        sections.append(f"[{source_label}] {entry.content}")

                if sections:
                    combined = "\n".join(sections)
                    logger.debug(f"Using AppCrawledData for {app.name_en} ({crawled_entries.count()} sources)")
                    return combined[:2000]

        # 2. Fallback: Check legacy App.crawled_content cache
        if use_cached and hasattr(app, 'crawled_content') and app.crawled_content:
            if hasattr(app, 'crawled_at') and app.crawled_at:
                cache_age = timezone.now() - app.crawled_at
                if cache_age < timedelta(days=30):
                    logger.debug(f"Using legacy cached crawl for {app.name_en} ({cache_age.days} days old)")
                    return app.crawled_content[:2000]

        # 3. Crawl if requested (and save to new table)
        if crawl_links:
            results = AppCrawler.crawl_all_sources_detailed(
                google_play_url=app.google_play_link,
                app_store_url=app.app_store_link,
                app_gallery_url=app.app_gallery_link
            )

            if results:
                # Save to AppCrawledData table and update App.crawled_content cache
                combined = AppCrawler.save_crawl_results_to_db(app, results)
                logger.info(f"Crawled and saved to AppCrawledData for {app.name_en}")
                return combined[:2000]

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

    # ====================
    # Phase 2: Hybrid Search API
    # ====================

    def hybrid_search(
        self,
        query: str,
        filters: Dict[str, List[str]] = None,
        limit: int = 50,
        rerank_top_k: int = 20,
        include_facets: bool = True,
        apply_boost: bool = True
    ) -> Dict[str, Any]:
        """
        Hybrid semantic search combining vector similarity with metadata filters.

        Args:
            query: Search query string
            filters: Dict of metadata filters {'features': ['offline'], 'riwayah': ['hafs']}
            limit: Maximum results to return
            rerank_top_k: Number of top results to rerank with LLM
            include_facets: Whether to calculate facet counts
            apply_boost: Whether to apply metadata-based ranking boost

        Returns:
            Dict with 'results' (list of apps) and 'facets' (filter counts)
        """
        from apps.models import App

        embedding = self.get_embedding(query)
        if not embedding:
            return {'results': [], 'facets': {}}

        # Start with published apps
        queryset = App.objects.filter(status='published')

        # Apply metadata filters (pre-filtering before vector search)
        if filters:
            # Get all active metadata type names from DB (dynamic)
            active_metadata_names = self._get_active_metadata_names()

            for metadata_name, values in filters.items():
                if values and metadata_name in active_metadata_names:
                    queryset = queryset.filter(
                        metadata_values__metadata_option__metadata_type__name=metadata_name,
                        metadata_values__metadata_option__value__in=values
                    ).distinct()

                elif metadata_name == 'platform' and values:
                    queryset = queryset.filter(platform__in=values)

                elif metadata_name == 'category' and values:
                    queryset = queryset.filter(categories__slug__in=values).distinct()

        # Vector search on filtered queryset
        candidates = queryset.annotate(
            distance=CosineDistance('embedding', embedding)
        ).order_by('distance')[:limit]

        candidate_list = list(candidates)

        # Apply metadata boosting (Phase 3)
        if apply_boost and candidate_list:
            for app in candidate_list:
                boost, match_reasons = self._calculate_metadata_boost(app, query)
                # Store boost info as runtime attributes
                app._metadata_boost = boost
                app._match_reasons = match_reasons
                # Calculate combined score: (1 - distance) * boost
                app._combined_score = (1 - getattr(app, 'distance', 0)) * boost

            # Re-sort by combined score (descending)
            candidate_list.sort(key=lambda x: getattr(x, '_combined_score', 0), reverse=True)

        # LLM Reranking on top candidates
        if candidate_list and self.provider and rerank_top_k > 0:
            docs_to_rank = []
            for app in candidate_list[:rerank_top_k]:
                docs_to_rank.append({
                    'id': app.id,
                    'name_en': app.name_en,
                    'description_en': app.description_en,
                    '_obj': app
                })

            reranked_docs = self.provider.rerank(query, docs_to_rank)

            final_results = []
            seen_ids = set()

            for doc in reranked_docs:
                app = doc.get('_obj')
                if app:
                    app.ai_reasoning = doc.get('ai_reasoning')
                    final_results.append(app)
                    seen_ids.add(app.id)

            # Append non-reranked candidates
            for app in candidate_list:
                if app.id not in seen_ids:
                    final_results.append(app)

            candidate_list = final_results

        # Calculate facets if requested
        facets = {}
        if include_facets:
            facets = self._calculate_facets(queryset)

        return {
            'results': candidate_list,
            'facets': facets
        }

    def _calculate_facets(self, queryset) -> Dict[str, List[Dict]]:
        """
        Calculate facet counts for metadata filters.

        Returns counts of apps per metadata option within the current queryset.
        """
        from metadata.models import MetadataType, MetadataOption, AppMetadataValue
        from django.db.models import Count

        facets = {}

        # Get app IDs in current queryset for efficient filtering
        app_ids = list(queryset.values_list('id', flat=True)[:500])

        # Calculate counts for each active metadata type
        for mt in MetadataType.objects.filter(is_active=True):
            counts = AppMetadataValue.objects.filter(
                app_id__in=app_ids,
                metadata_option__metadata_type=mt,
                metadata_option__is_active=True
            ).values(
                'metadata_option__value',
                'metadata_option__label_en',
                'metadata_option__label_ar'
            ).annotate(count=Count('app_id', distinct=True)).order_by('-count')

            facets[mt.name] = [
                {
                    'value': item['metadata_option__value'],
                    'label_en': item['metadata_option__label_en'],
                    'label_ar': item['metadata_option__label_ar'],
                    'count': item['count']
                }
                for item in counts
            ]

        # Platform facet
        platform_counts = queryset.values('platform').annotate(
            count=Count('id')
        ).order_by('-count')

        platform_labels = {
            'android': ('Android', 'أندرويد'),
            'ios': ('iOS', 'آي أو إس'),
            'cross_platform': ('Cross Platform', 'متعدد المنصات'),
            'web': ('Web', 'ويب'),
        }

        facets['platform'] = [
            {
                'value': item['platform'],
                'label_en': platform_labels.get(item['platform'], (item['platform'], item['platform']))[0],
                'label_ar': platform_labels.get(item['platform'], (item['platform'], item['platform']))[1],
                'count': item['count']
            }
            for item in platform_counts if item['platform']
        ]

        return facets

    # ====================
    # Phase 3: Ranking Boosting (Dynamic)
    # ====================

    def _calculate_metadata_boost(self, app: Any, query: str) -> Tuple[float, List[Dict]]:
        """
        Calculate ranking boost based on metadata matching query keywords.
        Keywords are derived dynamically from MetadataOption labels (EN + AR).

        Returns:
            Tuple of (boost_multiplier, match_reasons)
            - boost_multiplier: 1.0 (no boost) to 2.0 (max boost)
            - match_reasons: List of {'type': str, 'value': str, 'label_en': str, 'label_ar': str}
        """
        from metadata.models import MetadataOption

        boost = 1.0
        match_reasons = []
        query_lower = query.lower()

        # Get app's metadata values
        metadata_values = self._get_app_metadata_values(app)

        # Loop through all metadata types the app has
        for metadata_type_name, values in metadata_values.items():
            for option_value in values:
                # Get option from DB to access labels
                opt = MetadataOption.objects.filter(
                    metadata_type__name=metadata_type_name,
                    value=option_value
                ).select_related('metadata_type').first()

                if not opt:
                    continue

                # Build keyword list from: value, label_en, label_ar
                keywords = [
                    option_value.lower(),
                    opt.label_en.lower(),
                    opt.label_ar,  # Keep Arabic as-is
                ]
                # Add words from label_en (e.g., "Offline Mode" -> ["offline", "mode"])
                keywords.extend(opt.label_en.lower().split())

                # Check if any keyword appears in query
                if any(kw in query_lower for kw in keywords):
                    boost += 0.15  # Standard boost per match
                    match_reasons.append({
                        'type': metadata_type_name,
                        'value': option_value,
                        'label_en': opt.label_en,
                        'label_ar': opt.label_ar
                    })

        # Cap boost at 2.0
        return min(boost, 2.0), match_reasons
