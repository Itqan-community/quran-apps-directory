"""
Application service for handling app-related business logic.

This service encapsulates all business logic related to applications,
including search, filtering, caching, and analytics.
"""

from typing import Optional, List, Dict, Any
from django.db.models import QuerySet
from django.db.models import Q, F, Count, Avg
from django.core.cache import cache
from django.conf import settings
from django.core.exceptions import ValidationError
from decimal import Decimal

from core.services.base_service import BaseService
from apps.models import App
from developers.models import Developer
from categories.models import Category


class AppService(BaseService):
    """
    Service for managing application-related operations.

    Handles:
    - App search and filtering
    - Featured apps management
    - View counting and analytics
    - Category-based operations
    - Platform-specific operations
    """

    def __init__(self):
        super().__init__()
        self.app_cache_timeout = self.cache_timeout.get('APP_LIST', 600)  # 10 minutes default

    def get_queryset_optimized(self, include_ratings: bool = True) -> QuerySet[App]:
        """
        Get optimized queryset with common relations.

        Args:
            include_ratings: Whether to include rating calculations

        Returns:
            Optimized App queryset
        """
        queryset = App.objects.select_related('developer').prefetch_related('categories')

        if include_ratings:
            queryset = queryset.annotate(
                avg_rating_calc=Avg('reviews__rating'),
                review_count_calc=Count('reviews')
            )

        return queryset.filter(status='published')

    def get_featured_apps(self, category_slug: Optional[str] = None,
                         limit: int = 20) -> List[App]:
        """
        Get featured applications, optionally filtered by category.

        Args:
            category_slug: Category slug to filter by (optional)
            limit: Maximum number of apps to return

        Returns:
            List of featured App instances
        """
        cache_key = self.get_cache_key('featured_apps', category=category_slug or 'all')

        # Try cache first
        cached_apps = self.get_from_cache(cache_key)
        if cached_apps:
            return cached_apps

        # Build queryset
        queryset = self.get_queryset_optimized().filter(featured=True)

        if category_slug and category_slug != 'all':
            queryset = queryset.filter(categories__slug=category_slug)

        # Order by sort order and rating
        queryset = queryset.order_by('sort_order', '-avg_rating', '-view_count')

        # Limit results
        apps = list(queryset[:limit])

        # Cache the results
        self.set_cache(cache_key, apps, timeout=self.app_cache_timeout)

        self.log_operation('get_featured_apps', {
            'category': category_slug,
            'count': len(apps)
        })

        return apps

    def search_apps(self, query: str, filters: Dict[str, Any] = None,
                   ordering: str = '-sort_order', page: int = 1,
                   page_size: int = 20) -> Dict[str, Any]:
        """
        Search applications with filters and pagination.

        Args:
            query: Search query string
            filters: Dictionary of filters (category, platform, featured, etc.)
            ordering: Ordering string
            page: Page number
            page_size: Number of items per page

        Returns:
            Dictionary with search results and pagination info
        """
        cache_key = self.get_cache_key(
            'search_apps',
            query=query[:100],  # Limit query length for cache key
            **(filters or {}),
            ordering=ordering,
            page=page,
            page_size=page_size
        )

        # Try cache first
        cached_result = self.get_from_cache(cache_key)
        if cached_result:
            return cached_result

        # Start with base queryset
        queryset = self.get_queryset_optimized()

        # Apply search query
        if query:
            search_conditions = Q()
            for term in query.split():
                search_conditions |= Q(name_en__icontains=term)
                search_conditions |= Q(name_ar__icontains=term)
                search_conditions |= Q(short_description_en__icontains=term)
                search_conditions |= Q(short_description_ar__icontains=term)
            queryset = queryset.filter(search_conditions)

        # Apply filters
        if filters:
            if 'category_slug' in filters:
                queryset = queryset.filter(categories__slug=filters['category_slug'])
            if 'platform' in filters:
                queryset = queryset.filter(platform=filters['platform'])
            if 'featured' in filters:
                queryset = queryset.filter(featured=filters['featured'])
            if 'developer_id' in filters:
                queryset = queryset.filter(developer_id=filters['developer_id'])

        # Apply ordering
        if ordering:
            queryset = queryset.order_by(ordering)

        # Paginate results
        result = self.paginate_results(queryset, page, page_size)

        # Cache the results
        self.set_cache(cache_key, result, timeout=self.app_cache_timeout)

        self.log_operation('search_apps', {
            'query': query[:100],
            'filters': filters,
            'count': result['count']
        })

        return result

    def get_apps_by_category(self, category_slug: str,
                            ordering: str = 'sort_order',
                            page: int = 1, page_size: int = 20) -> Dict[str, Any]:
        """
        Get applications filtered by category.

        Args:
            category_slug: Category slug to filter by
            ordering: Ordering string
            page: Page number
            page_size: Number of items per page

        Returns:
            Dictionary with category apps and pagination info
        """
        cache_key = self.get_cache_key(
            'apps_by_category',
            category=category_slug,
            ordering=ordering,
            page=page,
            page_size=page_size
        )

        # Try cache first
        cached_result = self.get_from_cache(cache_key)
        if cached_result:
            return cached_result

        # Verify category exists
        try:
            category = Category.objects.get(slug=category_slug, status='published')
        except Category.DoesNotExist:
            self.log_error('get_apps_by_category', ValueError(f"Category not found: {category_slug}"))
            return self._empty_paginated_result()

        # Filter by category
        queryset = self.get_queryset_optimized().filter(categories__slug=category_slug)

        # Apply ordering
        if ordering:
            queryset = queryset.order_by(ordering)

        # Paginate results
        result = self.paginate_results(queryset, page, page_size)

        # Add category info
        result['category'] = {
            'id': category.id,
            'slug': category.slug,
            'name_en': category.name_en,
            'name_ar': category.name_ar
        }

        # Cache the results
        self.set_cache(cache_key, result, timeout=self.app_cache_timeout)

        self.log_operation('get_apps_by_category', {
            'category': category_slug,
            'count': result['count']
        })

        return result

    def get_apps_by_platform(self, platform: str,
                            ordering: str = '-sort_order',
                            page: int = 1, page_size: int = 20) -> Dict[str, Any]:
        """
        Get applications filtered by platform.

        Args:
            platform: Platform to filter by (android, ios, web, cross_platform)
            ordering: Ordering string
            page: Page number
            page_size: Number of items per page

        Returns:
            Dictionary with platform apps and pagination info
        """
        if platform not in [choice[0] for choice in App.PLATFORM_CHOICES]:
            self.log_error('get_apps_by_platform', ValueError(f"Invalid platform: {platform}"))
            return self._empty_paginated_result()

        cache_key = self.get_cache_key(
            'apps_by_platform',
            platform=platform,
            ordering=ordering,
            page=page,
            page_size=page_size
        )

        # Try cache first
        cached_result = self.get_from_cache(cache_key)
        if cached_result:
            return cached_result

        # Filter by platform
        queryset = self.get_queryset_optimized().filter(platform=platform)

        # Apply ordering
        if ordering:
            queryset = queryset.order_by(ordering)

        # Paginate results
        result = self.paginate_results(queryset, page, page_size)

        # Add platform info
        result['platform'] = platform

        # Cache the results
        self.set_cache(cache_key, result, timeout=self.app_cache_timeout)

        self.log_operation('get_apps_by_platform', {
            'platform': platform,
            'count': result['count']
        })

        return result

    def get_app_detail(self, app_identifier: str) -> Optional[App]:
        """
        Get detailed app information by ID or slug.

        Args:
            app_identifier: App ID (integer) or slug

        Returns:
            App instance or None if not found
        """
        cache_key = self.get_cache_key('app_detail', identifier=app_identifier)

        # Try cache first
        cached_app = self.get_from_cache(cache_key)
        if cached_app:
            return cached_app

        app = None

        # Try to get by integer ID first
        try:
            app_id = int(app_identifier)
            app = self.get_queryset_optimized().get(id=app_id)
        except (ValueError, App.DoesNotExist):
            # If not an integer or not found by ID, try slug
            try:
                app = self.get_queryset_optimized().get(slug__iexact=app_identifier)
            except App.DoesNotExist:
                pass

        if app:
            # Increment view count
            self.increment_view_count(app)

            # Cache the result (shorter timeout for details)
            self.set_cache(cache_key, app, timeout=self.cache_timeout.get('APP_DETAIL', 300))

            self.log_operation('get_app_detail', {
                'identifier': app_identifier,
                'app_id': app.id
            })

        return app

    def increment_view_count(self, app: App) -> bool:
        """
        Increment the view count for an app.

        Args:
            app: App instance to increment view count for

        Returns:
            True if successful, False otherwise
        """
        try:
            # Use F() expression to avoid race conditions
            App.objects.filter(id=app.id).update(view_count=F('view_count') + 1)

            # Clear relevant caches
            self._clear_app_caches(app)

            self.log_operation('increment_view_count', {
                'app_id': app.id,
                'new_count': app.view_count + 1
            })

            return True
        except Exception as e:
            self.log_error('increment_view_count', e, {'app_id': app.id})
            return False

    def get_popular_apps(self, limit: int = 20,
                        min_reviews: int = 5) -> List[App]:
        """
        Get popular apps based on ratings and review count.

        Args:
            limit: Maximum number of apps to return
            min_reviews: Minimum number of reviews required

        Returns:
            List of popular App instances
        """
        cache_key = self.get_cache_key('popular_apps', limit=limit, min_reviews=min_reviews)

        # Try cache first
        cached_apps = self.get_from_cache(cache_key)
        if cached_apps:
            return cached_apps

        # Get apps with sufficient reviews, ordered by rating and review count
        queryset = self.get_queryset_optimized().filter(
            review_count__gte=min_reviews
        ).order_by('-avg_rating', '-review_count', '-view_count')

        apps = list(queryset[:limit])

        # Cache the results
        self.set_cache(cache_key, apps, timeout=self.app_cache_timeout)

        self.log_operation('get_popular_apps', {
            'limit': limit,
            'min_reviews': min_reviews,
            'count': len(apps)
        })

        return apps

    def get_apps_by_developer(self, developer_id: int,
                             page: int = 1, page_size: int = 20) -> Dict[str, Any]:
        """
        Get applications by developer.

        Args:
            developer_id: Developer ID
            page: Page number
            page_size: Number of items per page

        Returns:
            Dictionary with developer apps and pagination info
        """
        cache_key = self.get_cache_key(
            'apps_by_developer',
            developer_id=developer_id,
            page=page,
            page_size=page_size
        )

        # Try cache first
        cached_result = self.get_from_cache(cache_key)
        if cached_result:
            return cached_result

        # Verify developer exists
        try:
            developer = Developer.objects.get(id=developer_id)
        except Developer.DoesNotExist:
            self.log_error('get_apps_by_developer', ValueError(f"Developer not found: {developer_id}"))
            return self._empty_paginated_result()

        # Filter by developer
        queryset = self.get_queryset_optimized().filter(developer_id=developer_id)

        # Order by sort order and name
        queryset = queryset.order_by('sort_order', 'name_en')

        # Paginate results
        result = self.paginate_results(queryset, page, page_size)

        # Add developer info
        result['developer'] = {
            'id': developer.id,
            'name_en': developer.name_en,
            'name_ar': developer.name_ar,
            'slug': developer.slug
        }

        # Cache the results
        self.set_cache(cache_key, result, timeout=self.app_cache_timeout)

        self.log_operation('get_apps_by_developer', {
            'developer_id': developer_id,
            'count': result['count']
        })

        return result

    def _clear_app_caches(self, app: App) -> None:
        """
        Clear all cache entries related to a specific app.

        Args:
            app: App instance to clear caches for
        """
        # Clear app detail caches
        self.delete_cache(f"app_detail_{app.id}")
        self.delete_cache(f"app_detail_{app.slug}")

        # Clear featured apps caches
        self.delete_cache("featured_apps_all")
        for category in app.categories.all():
            self.delete_cache(f"featured_apps_{category.slug}")

        # Clear search and list caches (use pattern if available)
        self.delete_cache_pattern("*search_apps*")
        self.delete_cache_pattern("*apps_by_category*")
        self.delete_cache_pattern("*apps_by_platform*")

    def _empty_paginated_result(self) -> Dict[str, Any]:
        """
        Return empty paginated result structure.

        Returns:
            Empty paginated result dictionary
        """
        return {
            'count': 0,
            'num_pages': 0,
            'current_page': 1,
            'has_next': False,
            'has_previous': False,
            'results': []
        }