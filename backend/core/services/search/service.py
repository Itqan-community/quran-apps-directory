import hashlib
import logging
from typing import List, Any, Optional, Dict, Tuple
from decimal import Decimal
from django.db.models import QuerySet
from django.utils import timezone
from datetime import timedelta
from pgvector.django import CosineDistance

from .factory import AISearchFactory
from .crawler import AppCrawler
from core.utils.arabic import normalize_arabic

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

    def get_embedding_cached(self, text: str) -> List[float]:
        """
        Get embedding with PostgreSQL caching.
        Returns cached embedding if available, otherwise generates and caches it.
        Also cleans up entries older than 7 days on cache miss.
        """
        from core.models import SearchEmbeddingCache

        query_hash = hashlib.sha256(text.encode('utf-8')).hexdigest()

        # Check cache
        cached = SearchEmbeddingCache.objects.filter(query_hash=query_hash).first()
        if cached:
            logger.debug(f"Embedding cache hit for: {text[:50]}")
            return list(cached.embedding)

        # Cache miss - generate embedding
        embedding = self.get_embedding(text)
        if not embedding:
            return []

        # Store in cache
        try:
            SearchEmbeddingCache.objects.create(
                query_hash=query_hash,
                query_text=text,
                embedding=embedding
            )
        except Exception as e:
            # Race condition or DB error - non-fatal
            logger.warning(f"Failed to cache embedding: {e}")

        # Opportunistic cleanup: delete entries older than 7 days
        try:
            cutoff = timezone.now() - timedelta(days=7)
            SearchEmbeddingCache.objects.filter(created_at__lt=cutoff).delete()
        except Exception:
            pass

        return embedding

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

    def search_apps(self, query: str, limit: int = 50) -> List[Any]:
        """
        Perform semantic search on Apps using pgvector cosine similarity
        with keyword and quality scoring.

        Returns:
            List of App objects ordered by combined score.
        """
        from apps.models import App

        embedding = self.get_embedding(query)
        if not embedding:
            return []

        candidates = App.objects.select_related('developer').prefetch_related(
            'categories'
        ).annotate(
            distance=CosineDistance('embedding', embedding)
        ).order_by('distance')[:limit]

        candidate_list = list(candidates)

        # Apply multi-signal scoring
        for app in candidate_list:
            distance = getattr(app, 'distance', 0) or 0
            vector_similarity = 1 - distance
            keyword_score = self._calculate_keyword_score(app, query)
            quality_boost = self._calculate_quality_boost(app)

            app._combined_score = (
                (vector_similarity * 0.5)
                + (keyword_score * 0.3)
                + (quality_boost * 0.2)
            )

        candidate_list.sort(key=lambda x: getattr(x, '_combined_score', 0), reverse=True)
        return candidate_list

    # ====================
    # Query Augmentation (Soft Filters)
    # ====================

    def _augment_query_with_filters(self, query: str, filters: Dict[str, List[str]]) -> str:
        """
        Augment query with filter context for soft semantic filtering.

        Instead of hard ORM pre-filters, converts filters into bilingual labels
        appended to the query. This lets vector similarity naturally rank matching
        apps higher without excluding non-matches.

        Example:
            query="quran", filters={"riwayah": ["warsh"], "features": ["offline"]}
            -> "quran [Filter: Warsh (ورش) riwayah] [Filter: Offline Mode (بدون إنترنت) features]"
        """
        from metadata.models import MetadataOption

        if not filters:
            return query

        augmented = query

        # Platform labels (not in MetadataOption table)
        platform_labels = {
            'android': ('Android', 'أندرويد'),
            'ios': ('iOS', 'آي أو إس'),
            'cross_platform': ('Cross Platform', 'متعدد المنصات'),
            'web': ('Web', 'ويب'),
        }

        for filter_type, values in filters.items():
            if not values:
                continue

            if filter_type == 'platform':
                for val in values:
                    label_en, label_ar = platform_labels.get(val, (val, val))
                    augmented += f" [Filter: {label_en} ({label_ar}) platform]"

            elif filter_type == 'category':
                from categories.models import Category
                for val in values:
                    cat = Category.objects.filter(slug=val).first()
                    if cat:
                        augmented += f" [Filter: {cat.name_en} ({cat.name_ar}) category]"
                    else:
                        augmented += f" [Filter: {val} category]"

            else:
                # Dynamic metadata types - lookup bilingual labels
                options = MetadataOption.objects.filter(
                    metadata_type__name=filter_type,
                    value__in=values
                ).select_related('metadata_type')

                for opt in options:
                    augmented += f" [Filter: {opt.label_en} ({opt.label_ar}) {filter_type}]"

                # Handle values not found in DB (pass through raw)
                found_values = {opt.value for opt in options}
                for val in values:
                    if val not in found_values:
                        augmented += f" [Filter: {val} {filter_type}]"

        return augmented

    # ====================
    # Phase 2: Hybrid Search API
    # ====================

    def hybrid_search(
        self,
        query: str,
        filters: Dict[str, List[str]] = None,
        limit: int = 50,
        include_facets: bool = True,
        apply_boost: bool = True
    ) -> Dict[str, Any]:
        """
        Hybrid semantic search combining vector similarity with metadata filters.

        Args:
            query: Search query string
            filters: Dict of metadata filters {'features': ['offline'], 'riwayah': ['hafs']}
            limit: Maximum results to return
            include_facets: Whether to calculate facet counts
            apply_boost: Whether to apply metadata-based ranking boost

        Returns:
            Dict with 'results' (list of apps) and 'facets' (filter counts)
        """
        from apps.models import App

        # Soft filters: augment query with filter context instead of hard pre-filtering
        augmented_query = self._augment_query_with_filters(query, filters) if filters else query

        embedding = self.get_embedding_cached(augmented_query)
        has_embedding = bool(embedding)

        # Search ALL published apps - no pre-filtering
        queryset = App.objects.filter(status='published')

        if has_embedding:
            # Normal path: vector search + multi-signal ranking
            candidates = queryset.select_related('developer').prefetch_related('categories').annotate(
                distance=CosineDistance('embedding', embedding)
            ).order_by('distance')[:limit]
        else:
            # Fallback: keyword-only search (Gemini unavailable)
            logger.warning(f"Embedding failed for query '{query}' - falling back to keyword search")
            candidates = queryset.select_related('developer').prefetch_related('categories').all()[:200]

        candidate_list = list(candidates)

        # Prefetch all metadata for candidates in bulk (eliminates N+1 queries)
        app_ids = [app.id for app in candidate_list] if candidate_list else []
        metadata_by_app = {}
        if app_ids:
            from metadata.models import AppMetadataValue
            all_metadata = AppMetadataValue.objects.filter(
                app_id__in=app_ids
            ).select_related('metadata_option', 'metadata_option__metadata_type')
            for mv in all_metadata:
                app_meta = metadata_by_app.setdefault(mv.app_id, {})
                type_name = mv.metadata_option.metadata_type.name
                app_meta.setdefault(type_name, []).append(mv.metadata_option)

        # Apply multi-signal ranking using the original query (not augmented)
        if apply_boost and candidate_list:
            for app in candidate_list:
                boost, match_reasons = self._calculate_metadata_boost(
                    app, query, prefetched_metadata=metadata_by_app.get(app.id, {})
                )
                # Store boost info as runtime attributes
                app._metadata_boost = boost
                app._match_reasons = match_reasons

                # Multi-signal scoring
                keyword_score = self._calculate_keyword_score(app, query)
                metadata_boost_normalized = min(boost - 1.0, 1.0)
                quality_boost = self._calculate_quality_boost(app)

                app._keyword_score = keyword_score
                app._quality_boost = quality_boost

                if has_embedding:
                    distance = getattr(app, 'distance', 0) or 0
                    vector_similarity = 1 - distance
                    app._combined_score = (
                        (vector_similarity * 0.5)
                        + (keyword_score * 0.3)
                        + (metadata_boost_normalized * 0.1)
                        + (quality_boost * 0.1)
                    )
                else:
                    # No vector component - redistribute weights
                    app._combined_score = (
                        (keyword_score * 0.6)
                        + (metadata_boost_normalized * 0.2)
                        + (quality_boost * 0.2)
                    )

            # Re-sort by combined score (descending)
            candidate_list.sort(key=lambda x: getattr(x, '_combined_score', 0), reverse=True)

        # Relevance cutoff - only when embeddings are available (not fallback mode)
        if has_embedding and candidate_list:
            RELEVANCE_THRESHOLD = 0.35
            candidate_list = [
                app for app in candidate_list
                if getattr(app, '_combined_score', 0) >= RELEVANCE_THRESHOLD
            ]

        # Calculate facets if requested
        facets = {}
        if include_facets:
            facets = self._calculate_facets(queryset)

        result = {
            'results': candidate_list,
            'facets': facets
        }
        if not has_embedding:
            result['_fallback_mode'] = True
        return result

    def hybrid_search_cf(
        self,
        query: str,
        filters: Dict[str, List[str]] = None,
        limit: int = 50,
        include_facets: bool = True,
        apply_boost: bool = True
    ) -> Dict[str, Any]:
        """
        Hybrid search using Cloudflare AutoRAG with query augmentation.

        Flow:
        1. Augment query with filter terms
        2. Call CF provider for semantic search
        3. Fetch full app objects from DB
        4. Apply metadata boosting (reuse existing logic)
        5. Calculate facets (reuse existing logic)

        Returns:
            Dict with 'results' (list of apps) and 'facets' (filter counts)
        """
        from apps.models import App
        from .factory import AISearchFactory

        cf_provider = AISearchFactory.get_cloudflare_provider()
        if not cf_provider:
            logger.warning("Cloudflare provider not configured for hybrid search")
            return {'results': [], 'facets': {}}

        # 1. Search via CF with augmented query
        try:
            cf_results = cf_provider.search_hybrid(query, filters=filters, max_results=limit)
        except Exception as e:
            logger.error(f"CF hybrid search failed: {e}")
            return {'results': [], 'facets': {}, 'error': str(e)}

        if not cf_results:
            return {'results': [], 'facets': {}}

        # 2. Fetch full app objects preserving CF score order
        app_ids = [r['id'] for r in cf_results]
        cf_scores = {r['id']: r['cf_score'] for r in cf_results}

        apps_by_id = {
            app.id: app
            for app in App.objects.filter(
                id__in=app_ids, status='published'
            ).select_related('developer').prefetch_related('categories')
        }

        # Preserve CF ranking order
        candidate_list = []
        for app_id in app_ids:
            app = apps_by_id.get(app_id)
            if app:
                app._cf_score = cf_scores.get(app_id, 0)
                candidate_list.append(app)

        # 3. Apply metadata boosting (bulk prefetch to avoid N+1)
        cf_app_ids = [app.id for app in candidate_list]
        cf_metadata_by_app = {}
        if cf_app_ids:
            from metadata.models import AppMetadataValue as AMV
            for mv in AMV.objects.filter(
                app_id__in=cf_app_ids
            ).select_related('metadata_option', 'metadata_option__metadata_type'):
                app_meta = cf_metadata_by_app.setdefault(mv.app_id, {})
                type_name = mv.metadata_option.metadata_type.name
                app_meta.setdefault(type_name, []).append(mv.metadata_option)

        if apply_boost and candidate_list:
            for app in candidate_list:
                boost, match_reasons = self._calculate_metadata_boost(
                    app, query, prefetched_metadata=cf_metadata_by_app.get(app.id, {})
                )
                app._metadata_boost = boost
                app._match_reasons = match_reasons
                # Combined score: CF score * metadata boost
                app._combined_score = app._cf_score * boost

            candidate_list.sort(key=lambda x: getattr(x, '_combined_score', 0), reverse=True)

        # 4. Calculate facets from published apps (not just CF results)
        facets = {}
        if include_facets:
            base_queryset = App.objects.filter(status='published')
            facets = self._calculate_facets(base_queryset)

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

    def _calculate_keyword_score(self, app: Any, query: str) -> float:
        """Score 0.0-1.0 based on keyword presence in app fields."""
        query_lower = normalize_arabic(query.lower())
        query_words = [w for w in query_lower.split() if len(w) > 2]
        if not query_words:
            return 0.0

        score = 0.0
        # Exact name match (strongest signal)
        name = normalize_arabic((app.name_en or '').lower())
        name_ar = normalize_arabic(app.name_ar or '')
        if query_lower in name or query_lower in name_ar:
            score += 0.5
        else:
            # Partial word matches in name
            name_hits = sum(1 for w in query_words if w in name or w in name_ar)
            score += 0.3 * (name_hits / len(query_words))

        # Short description matches
        desc = normalize_arabic((app.short_description_en or '').lower())
        desc_ar = normalize_arabic(app.short_description_ar or '')
        desc_hits = sum(1 for w in query_words if w in desc or w in desc_ar)
        score += 0.2 * (desc_hits / len(query_words))

        # Category name matches
        for cat in app.categories.all():
            cat_name = (cat.name_en or '').lower()
            if any(w in cat_name for w in query_words):
                score += 0.15
                break

        return min(score, 1.0)

    def _calculate_quality_boost(self, app: Any) -> float:
        """Score 0.0-0.3 based on app quality signals."""
        boost = 0.0
        if getattr(app, 'featured', False):
            boost += 0.1
        if app.avg_rating and app.avg_rating >= Decimal('4.5'):
            boost += 0.1
        elif app.avg_rating and app.avg_rating >= Decimal('4.0'):
            boost += 0.05
        if getattr(app, 'review_count', 0) and app.review_count >= 100:
            boost += 0.05
        return boost

    def _calculate_metadata_boost(
        self, app: Any, query: str,
        prefetched_metadata: Optional[Dict[str, list]] = None
    ) -> Tuple[float, List[Dict]]:
        """
        Calculate ranking boost based on metadata matching query keywords.
        Keywords are derived dynamically from MetadataOption labels (EN + AR).

        Args:
            app: The App instance
            query: Search query string
            prefetched_metadata: Pre-fetched dict of {type_name: [MetadataOption objects]}
                If None, falls back to per-app DB query (legacy path).

        Returns:
            Tuple of (boost_multiplier, match_reasons)
            - boost_multiplier: 1.0 (no boost) to 2.0 (max boost)
            - match_reasons: List of {'type': str, 'value': str, 'label_en': str, 'label_ar': str}
        """
        boost = 1.0
        match_reasons = []
        query_lower = normalize_arabic(query.lower())

        # Use prefetched metadata if available, otherwise fall back to DB query
        if prefetched_metadata is not None:
            # prefetched_metadata: {type_name: [MetadataOption objects]}
            for metadata_type_name, options in prefetched_metadata.items():
                for opt in options:
                    keywords = [
                        opt.value.lower(),
                        opt.label_en.lower(),
                        normalize_arabic(opt.label_ar),
                    ]
                    keywords.extend(opt.label_en.lower().split())

                    if any(kw in query_lower for kw in keywords):
                        boost += 0.15
                        match_reasons.append({
                            'type': metadata_type_name,
                            'value': opt.value,
                            'label_en': opt.label_en,
                            'label_ar': opt.label_ar
                        })
        else:
            # Legacy fallback - per-app DB query
            from metadata.models import MetadataOption
            metadata_values = self._get_app_metadata_values(app)
            for metadata_type_name, values in metadata_values.items():
                for option_value in values:
                    opt = MetadataOption.objects.filter(
                        metadata_type__name=metadata_type_name,
                        value=option_value
                    ).select_related('metadata_type').first()
                    if not opt:
                        continue
                    keywords = [
                        option_value.lower(),
                        opt.label_en.lower(),
                        normalize_arabic(opt.label_ar),
                    ]
                    keywords.extend(opt.label_en.lower().split())
                    if any(kw in query_lower for kw in keywords):
                        boost += 0.15
                        match_reasons.append({
                            'type': metadata_type_name,
                            'value': option_value,
                            'label_en': opt.label_en,
                            'label_ar': opt.label_ar
                        })

        # Cap boost at 2.0
        return min(boost, 2.0), match_reasons
