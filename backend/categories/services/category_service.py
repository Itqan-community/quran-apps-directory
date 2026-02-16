"""
Category service for handling category-related business logic.

This service encapsulates all business logic related to categories,
including listing, filtering, app counts, and cache management.
"""

from typing import Optional, List, Dict, Any
from django.db.models import Count, Q
from django.core.cache import cache
from django.db import models

from core.services.base_service import BaseService
from categories.models import Category
from apps.models import App


class CategoryService(BaseService):
    """
    Service for managing category-related operations.

    Handles:
    - Category listing and filtering
    - App count calculations
    - Category statistics
    - Cache management for categories
    """

    def __init__(self):
        super().__init__()
        self.category_cache_timeout = self.cache_timeout.get('CATEGORY_LIST', 1800)  # 30 minutes default

    def get_all_categories(self, include_inactive: bool = False,
                           include_app_counts: bool = True) -> List[Category]:
        """
        Get all categories, optionally with app counts.

        Args:
            include_inactive: Whether to include inactive categories
            include_app_counts: Whether to include app count annotations

        Returns:
            List of Category instances
        """
        cache_key = self.get_cache_key(
            'all_categories',
            active='all' if include_inactive else 'active',
            counts='with_counts' if include_app_counts else 'no_counts'
        )

        # Try cache first
        cached_categories = self.get_from_cache(cache_key)
        if cached_categories:
            return cached_categories

        # Build queryset
        queryset = Category.objects.all()

        if not include_inactive:
            queryset = queryset.filter(is_active=True)

        if include_app_counts:
            queryset = queryset.annotate(
                app_count=Count('apps', filter=Q(apps__status='published')),
                featured_app_count=Count('apps', filter=Q(apps__status='published', apps__featured=True))
            )

        # Order by sort order and name
        queryset = queryset.order_by('sort_order', 'name_en')

        categories = list(queryset)

        # Cache the results
        self.set_cache(cache_key, categories, timeout=self.category_cache_timeout)

        self.log_operation('get_all_categories', {
            'include_inactive': include_inactive,
            'include_app_counts': include_app_counts,
            'count': len(categories)
        })

        return categories

    def get_category_by_slug(self, slug: str) -> Optional[Category]:
        """
        Get category by slug with optional app counts.

        Args:
            slug: Category slug

        Returns:
            Category instance or None if not found
        """
        cache_key = self.get_cache_key('category_by_slug', slug=slug)

        # Try cache first
        cached_category = self.get_from_cache(cache_key)
        if cached_category:
            return cached_category

        try:
            category = Category.objects.get(slug=slug, is_active=True)

            # Cache the result
            self.set_cache(cache_key, category, timeout=self.category_cache_timeout)

            self.log_operation('get_category_by_slug', {
                'slug': slug,
                'category_id': category.id
            })

            return category
        except Category.DoesNotExist:
            return None

    def get_category_with_stats(self, slug: str) -> Optional[Dict[str, Any]]:
        """
        Get category with detailed statistics.

        Args:
            slug: Category slug

        Returns:
            Dictionary with category info and statistics or None if not found
        """
        cache_key = self.get_cache_key('category_with_stats', slug=slug)

        # Try cache first
        cached_stats = self.get_from_cache(cache_key)
        if cached_stats:
            return cached_stats

        try:
            category = Category.objects.get(slug=slug, is_active=True)

            # Get app statistics
            apps_queryset = App.objects.filter(categories=category, status='published')

            stats = {
                'category': {
                    'id': category.id,
                    'slug': category.slug,
                    'name_en': category.name_en,
                    'name_ar': category.name_ar,
                    'description_en': category.description_en,
                    'description_ar': category.description_ar,
                    'icon': category.icon,
                    'color': category.color,
                    'sort_order': category.sort_order
                },
                'stats': {
                    'total_apps': apps_queryset.count(),
                    'featured_apps': apps_queryset.filter(featured=True).count(),
                    'platforms': list(
                        apps_queryset.values_list('platform', flat=True)
                        .distinct()
                        .order_by('platform')
                    ),
                    'average_rating': apps_queryset.aggregate(
                        avg_rating=models.Avg('avg_rating')
                    )['avg_rating'] or 0
                }
            }

            # Cache the results
            self.set_cache(cache_key, stats, timeout=self.category_cache_timeout)

            self.log_operation('get_category_with_stats', {
                'slug': slug,
                'total_apps': stats['stats']['total_apps']
            })

            return stats
        except Category.DoesNotExist:
            return None

    def get_popular_categories(self, limit: int = 10,
                              min_apps: int = 1) -> List[Dict[str, Any]]:
        """
        Get popular categories based on app count and activity.

        Args:
            limit: Maximum number of categories to return
            min_apps: Minimum number of apps required

        Returns:
            List of category dictionaries with statistics
        """
        cache_key = self.get_cache_key(
            'popular_categories',
            limit=limit,
            min_apps=min_apps
        )

        # Try cache first
        cached_categories = self.get_from_cache(cache_key)
        if cached_categories:
            return cached_categories

        # Get categories with app counts
        categories = Category.objects.filter(
            is_active=True
        ).annotate(
            app_count=Count('apps', filter=Q(apps__status='published')),
            featured_app_count=Count('apps', filter=Q(apps__status='published', apps__featured=True))
        ).filter(
            app_count__gte=min_apps
        ).order_by(
            '-app_count', '-featured_app_count', 'sort_order', 'name_en'
        )[:limit]

        # Format results
        result = []
        for category in categories:
            result.append({
                'id': category.id,
                'slug': category.slug,
                'name_en': category.name_en,
                'name_ar': category.name_ar,
                'icon': category.icon,
                'color': category.color,
                'app_count': category.app_count,
                'featured_app_count': category.featured_app_count
            })

        # Cache the results
        self.set_cache(cache_key, result, timeout=self.category_cache_timeout)

        self.log_operation('get_popular_categories', {
            'limit': limit,
            'min_apps': min_apps,
            'count': len(result)
        })

        return result

    def get_categories_by_platform(self, platform: str) -> List[Category]:
        """
        Get categories that have apps for a specific platform.

        Args:
            platform: Platform to filter by (android, ios, web, cross_platform)

        Returns:
            List of Category instances with apps on the specified platform
        """
        cache_key = self.get_cache_key('categories_by_platform', platform=platform)

        # Try cache first
        cached_categories = self.get_from_cache(cache_key)
        if cached_categories:
            return cached_categories

        # Get categories that have published apps for the specified platform
        categories = Category.objects.filter(
            is_active=True,
            apps__platform=platform,
            apps__status='published'
        ).distinct().order_by('sort_order', 'name_en')

        # Cache the results
        self.set_cache(cache_key, list(categories), timeout=self.category_cache_timeout)

        self.log_operation('get_categories_by_platform', {
            'platform': platform,
            'count': categories.count()
        })

        return list(categories)

    def search_categories(self, query: str) -> List[Category]:
        """
        Search categories by name or description.

        Args:
            query: Search query string

        Returns:
            List of matching Category instances
        """
        if not query or len(query.strip()) < 2:
            return []

        cache_key = self.get_cache_key('search_categories', query=query[:50])

        # Try cache first
        cached_categories = self.get_from_cache(cache_key)
        if cached_categories:
            return cached_categories

        # Search in name and description fields
        categories = Category.objects.filter(
            is_active=True
        ).filter(
            Q(name_en__icontains=query) |
            Q(name_ar__icontains=query) |
            Q(description_en__icontains=query) |
            Q(description_ar__icontains=query)
        ).order_by('sort_order', 'name_en')

        # Cache the results
        self.set_cache(cache_key, list(categories), timeout=self.category_cache_timeout)

        self.log_operation('search_categories', {
            'query': query[:50],
            'count': categories.count()
        })

        return list(categories)

    def get_category_hierarchy(self) -> Dict[str, Any]:
        """
        Get category hierarchy with app counts and statistics.

        Returns:
            Dictionary with category hierarchy data
        """
        cache_key = self.get_cache_key('category_hierarchy')

        # Try cache first
        cached_hierarchy = self.get_from_cache(cache_key)
        if cached_hierarchy:
            return cached_hierarchy

        # Get all active categories with app counts
        categories = Category.objects.filter(
            is_active=True
        ).annotate(
            total_apps=Count('apps', filter=Q(apps__status='published')),
            featured_apps=Count('apps', filter=Q(apps__status='published', apps__featured=True)),
            android_apps=Count('apps', filter=Q(apps__status='published', apps__platform='android')),
            ios_apps=Count('apps', filter=Q(apps__status='published', apps__platform='ios')),
            web_apps=Count('apps', filter=Q(apps__status='published', apps__platform='web')),
            cross_platform_apps=Count('apps', filter=Q(apps__status='published', apps__platform='cross_platform'))
        ).order_by('sort_order', 'name_en')

        # Build hierarchy data
        hierarchy = {
            'total_categories': categories.count(),
            'categories': []
        }

        for category in categories:
            category_data = {
                'id': category.id,
                'slug': category.slug,
                'name_en': category.name_en,
                'name_ar': category.name_ar,
                'description_en': category.description_en,
                'description_ar': category.description_ar,
                'icon': category.icon,
                'color': category.color,
                'sort_order': category.sort_order,
                'statistics': {
                    'total_apps': category.total_apps,
                    'featured_apps': category.featured_apps,
                    'platform_breakdown': {
                        'android': category.android_apps,
                        'ios': category.ios_apps,
                        'web': category.web_apps,
                        'cross_platform': category.cross_platform_apps
                    }
                }
            }
            hierarchy['categories'].append(category_data)

        # Cache the results
        self.set_cache(cache_key, hierarchy, timeout=self.category_cache_timeout)

        self.log_operation('get_category_hierarchy', {
            'total_categories': hierarchy['total_categories']
        })

        return hierarchy

    def invalidate_category_cache(self, category: Category = None) -> None:
        """
        Invalidate category-related cache entries.

        Args:
            category: Specific category to invalidate caches for (optional)
        """
        if category:
            # Clear specific category caches
            self.delete_cache(f"category_by_slug_{category.slug}")
            self.delete_cache(f"category_with_stats_{category.slug}")
        else:
            # Clear all category caches
            self.delete_cache_pattern("*categories*")
            self.delete_cache_pattern("*category_*")

        self.log_operation('invalidate_category_cache', {
            'category_id': category.id if category else None,
            'slug': category.slug if category else None
        })

    def get_category_navigation_data(self) -> List[Dict[str, Any]]:
        """
        Get category data suitable for navigation menus.

        Returns:
            List of category dictionaries for navigation
        """
        cache_key = self.get_cache_key('category_navigation')

        # Try cache first
        cached_nav_data = self.get_from_cache(cache_key)
        if cached_nav_data:
            return cached_nav_data

        # Get active categories with basic info
        categories = Category.objects.filter(
            is_active=True
        ).annotate(
            app_count=Count('apps', filter=Q(apps__status='published'))
        ).filter(
            app_count__gt=0  # Only include categories with apps
        ).order_by('sort_order', 'name_en')

        # Format for navigation
        nav_data = []
        for category in categories:
            nav_data.append({
                'id': category.id,
                'slug': category.slug,
                'name_en': category.name_en,
                'name_ar': category.name_ar,
                'icon': category.icon,
                'color': category.color,
                'app_count': category.app_count
            })

        # Cache the results
        self.set_cache(cache_key, nav_data, timeout=self.category_cache_timeout)

        self.log_operation('get_category_navigation_data', {
            'count': len(nav_data)
        })

        return nav_data