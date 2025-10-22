"""
Developer service for handling developer-related business logic.

This service encapsulates all business logic related to developers,
including listing, search, statistics, and app management.
"""

from typing import Optional, List, Dict, Any
from django.db.models import Count, Q, Avg
from django.core.cache import cache
from django.db import models

from core.services.base_service import BaseService
from developers.models import Developer
from apps.models import App


class DeveloperService(BaseService):
    """
    Service for managing developer-related operations.

    Handles:
    - Developer listing and search
    - Developer statistics and analytics
    - App management per developer
    - Verification status management
    """

    def __init__(self):
        super().__init__()
        self.developer_cache_timeout = self.cache_timeout.get('DEVELOPER_LIST', 1800)  # 30 minutes default

    def get_all_developers(self, include_unverified: bool = False,
                          include_app_counts: bool = True) -> List[Developer]:
        """
        Get all developers, optionally with app counts.

        Args:
            include_unverified: Whether to include unverified developers
            include_app_counts: Whether to include app count annotations

        Returns:
            List of Developer instances
        """
        cache_key = self.get_cache_key(
            'all_developers',
            verified='all' if include_unverified else 'verified',
            counts='with_counts' if include_app_counts else 'no_counts'
        )

        # Try cache first
        cached_developers = self.get_from_cache(cache_key)
        if cached_developers:
            return cached_developers

        # Build queryset
        queryset = Developer.objects.all()

        if not include_unverified:
            queryset = queryset.filter(is_verified=True)

        if include_app_counts:
            queryset = queryset.annotate(
                app_count=Count('apps', filter=Q(apps__status='published')),
                featured_app_count=Count('apps', filter=Q(apps__status='published', apps__featured=True)),
                avg_rating=Avg('apps__avg_rating', filter=Q(apps__status='published'))
            )

        # Order by name
        queryset = queryset.order_by('name_en')

        developers = list(queryset)

        # Cache the results
        self.set_cache(cache_key, developers, timeout=self.developer_cache_timeout)

        self.log_operation('get_all_developers', {
            'include_unverified': include_unverified,
            'include_app_counts': include_app_counts,
            'count': len(developers)
        })

        return developers

    def get_developer_by_slug(self, slug: str) -> Optional[Developer]:
        """
        Get developer by slug.

        Args:
            slug: Developer slug

        Returns:
            Developer instance or None if not found
        """
        cache_key = self.get_cache_key('developer_by_slug', slug=slug)

        # Try cache first
        cached_developer = self.get_from_cache(cache_key)
        if cached_developer:
            return cached_developer

        try:
            developer = Developer.objects.get(slug=slug)

            # Cache the result
            self.set_cache(cache_key, developer, timeout=self.developer_cache_timeout)

            self.log_operation('get_developer_by_slug', {
                'slug': slug,
                'developer_id': developer.id
            })

            return developer
        except Developer.DoesNotExist:
            return None

    def get_developer_with_stats(self, slug: str) -> Optional[Dict[str, Any]]:
        """
        Get developer with detailed statistics.

        Args:
            slug: Developer slug

        Returns:
            Dictionary with developer info and statistics or None if not found
        """
        cache_key = self.get_cache_key('developer_with_stats', slug=slug)

        # Try cache first
        cached_stats = self.get_from_cache(cache_key)
        if cached_stats:
            return cached_stats

        try:
            developer = Developer.objects.get(slug=slug)

            # Get app statistics
            apps_queryset = App.objects.filter(developer=developer, status='published')

            # Calculate detailed statistics
            platform_stats = {}
            for platform, _ in App.PLATFORM_CHOICES:
                count = apps_queryset.filter(platform=platform).count()
                if count > 0:
                    platform_stats[platform] = count

            stats = {
                'developer': {
                    'id': developer.id,
                    'slug': developer.slug,
                    'name_en': developer.name_en,
                    'name_ar': developer.name_ar,
                    'website': developer.website,
                    'email': developer.email,
                    'logo_url': developer.logo_url,
                    'description_en': developer.description_en,
                    'description_ar': developer.description_ar,
                    'contact_info': developer.contact_info,
                    'is_verified': developer.is_verified,
                    'social_links': developer.social_links
                },
                'stats': {
                    'total_apps': apps_queryset.count(),
                    'featured_apps': apps_queryset.filter(featured=True).count(),
                    'platform_breakdown': platform_stats,
                    'average_rating': apps_queryset.aggregate(
                        avg_rating=Avg('avg_rating')
                    )['avg_rating'] or 0,
                    'total_downloads': apps_queryset.aggregate(
                        total_downloads=models.Sum('view_count')
                    )['total_downloads'] or 0
                }
            }

            # Cache the results
            self.set_cache(cache_key, stats, timeout=self.developer_cache_timeout)

            self.log_operation('get_developer_with_stats', {
                'slug': slug,
                'total_apps': stats['stats']['total_apps']
            })

            return stats
        except Developer.DoesNotExist:
            return None

    def get_verified_developers(self, limit: int = 50) -> List[Dict[str, Any]]:
        """
        Get verified developers with app counts.

        Args:
            limit: Maximum number of developers to return

        Returns:
            List of developer dictionaries with basic statistics
        """
        cache_key = self.get_cache_key('verified_developers', limit=limit)

        # Try cache first
        cached_developers = self.get_from_cache(cache_key)
        if cached_developers:
            return cached_developers

        # Get verified developers with app counts
        developers = Developer.objects.filter(
            is_verified=True
        ).annotate(
            app_count=Count('apps', filter=Q(apps__status='published')),
            featured_app_count=Count('apps', filter=Q(apps__status='published', apps__featured=True)),
            avg_rating=Avg('apps__avg_rating', filter=Q(apps__status='published'))
        ).filter(
            app_count__gt=0  # Only include developers with published apps
        ).order_by('name_en')[:limit]

        # Format results
        result = []
        for developer in developers:
            result.append({
                'id': developer.id,
                'slug': developer.slug,
                'name_en': developer.name_en,
                'name_ar': developer.name_ar,
                'logo_url': developer.logo_url,
                'is_verified': developer.is_verified,
                'app_count': developer.app_count,
                'featured_app_count': developer.featured_app_count,
                'average_rating': float(developer.avg_rating or 0)
            })

        # Cache the results
        self.set_cache(cache_key, result, timeout=self.developer_cache_timeout)

        self.log_operation('get_verified_developers', {
            'limit': limit,
            'count': len(result)
        })

        return result

    def get_popular_developers(self, limit: int = 20,
                              min_apps: int = 1) -> List[Dict[str, Any]]:
        """
        Get popular developers based on app count, ratings, and activity.

        Args:
            limit: Maximum number of developers to return
            min_apps: Minimum number of apps required

        Returns:
            List of popular developer dictionaries
        """
        cache_key = self.get_cache_key(
            'popular_developers',
            limit=limit,
            min_apps=min_apps
        )

        # Try cache first
        cached_developers = self.get_from_cache(cache_key)
        if cached_developers:
            return cached_developers

        # Get developers with statistics
        developers = Developer.objects.filter(
            apps__status='published'
        ).annotate(
            app_count=Count('apps', filter=Q(apps__status='published')),
            featured_app_count=Count('apps', filter=Q(apps__status='published', apps__featured=True)),
            avg_rating=Avg('apps__avg_rating', filter=Q(apps__status='published')),
            total_downloads=Count('apps', filter=Q(apps__status='published'))  # Using view_count as proxy
        ).filter(
            app_count__gte=min_apps
        ).order_by(
            '-app_count', '-featured_app_count', '-avg_rating', 'name_en'
        )[:limit]

        # Format results
        result = []
        for developer in developers:
            result.append({
                'id': developer.id,
                'slug': developer.slug,
                'name_en': developer.name_en,
                'name_ar': developer.name_ar,
                'logo_url': developer.logo_url,
                'is_verified': developer.is_verified,
                'app_count': developer.app_count,
                'featured_app_count': developer.featured_app_count,
                'average_rating': float(developer.avg_rating or 0),
                'total_downloads': developer.total_downloads
            })

        # Cache the results
        self.set_cache(cache_key, result, timeout=self.developer_cache_timeout)

        self.log_operation('get_popular_developers', {
            'limit': limit,
            'min_apps': min_apps,
            'count': len(result)
        })

        return result

    def search_developers(self, query: str) -> List[Developer]:
        """
        Search developers by name or description.

        Args:
            query: Search query string

        Returns:
            List of matching Developer instances
        """
        if not query or len(query.strip()) < 2:
            return []

        cache_key = self.get_cache_key('search_developers', query=query[:50])

        # Try cache first
        cached_developers = self.get_from_cache(cache_key)
        if cached_developers:
            return cached_developers

        # Search in name and description fields
        developers = Developer.objects.filter(
            Q(name_en__icontains=query) |
            Q(name_ar__icontains=query) |
            Q(description_en__icontains=query) |
            Q(description_ar__icontains=query)
        ).order_by('-is_verified', 'name_en')

        # Cache the results
        self.set_cache(cache_key, list(developers), timeout=self.developer_cache_timeout)

        self.log_operation('search_developers', {
            'query': query[:50],
            'count': developers.count()
        })

        return list(developers)

    def get_developer_apps(self, slug: str, include_unpublished: bool = False) -> List[App]:
        """
        Get all apps by a developer.

        Args:
            slug: Developer slug
            include_unpublished: Whether to include unpublished apps

        Returns:
            List of App instances by the developer
        """
        cache_key = self.get_cache_key(
            'developer_apps',
            slug=slug,
            published='all' if include_unpublished else 'published'
        )

        # Try cache first
        cached_apps = self.get_from_cache(cache_key)
        if cached_apps:
            return cached_apps

        try:
            developer = Developer.objects.get(slug=slug)

            queryset = App.objects.filter(developer=developer)

            if not include_unpublished:
                queryset = queryset.filter(status='published')

            apps = list(queryset.select_related('developer').prefetch_related('categories').order_by('-sort_order', 'name_en'))

            # Cache the results
            self.set_cache(cache_key, apps, timeout=self.developer_cache_timeout)

            self.log_operation('get_developer_apps', {
                'slug': slug,
                'include_unpublished': include_unpublished,
                'count': len(apps)
            })

            return apps
        except Developer.DoesNotExist:
            return []

    def get_developer_analytics(self, slug: str) -> Optional[Dict[str, Any]]:
        """
        Get comprehensive analytics for a developer.

        Args:
            slug: Developer slug

        Returns:
            Dictionary with detailed analytics or None if not found
        """
        cache_key = self.get_cache_key('developer_analytics', slug=slug)

        # Try cache first
        cached_analytics = self.get_from_cache(cache_key)
        if cached_analytics:
            return cached_analytics

        try:
            developer = Developer.objects.get(slug=slug)
            apps_queryset = App.objects.filter(developer=developer)

            # Basic stats
            total_apps = apps_queryset.count()
            published_apps = apps_queryset.filter(status='published').count()

            if published_apps == 0:
                return None

            # Detailed analytics
            published_queryset = apps_queryset.filter(status='published')

            platform_breakdown = {}
            category_breakdown = {}
            rating_distribution = {'1': 0, '2': 0, '3': 0, '4': 0, '5': 0}

            for app in published_queryset:
                # Platform breakdown
                platform = app.platform
                platform_breakdown[platform] = platform_breakdown.get(platform, 0) + 1

                # Category breakdown
                for category in app.categories.all():
                    category_name = category.name_en
                    category_breakdown[category_name] = category_breakdown.get(category_name, 0) + 1

                # Rating distribution
                rating_range = str(int(float(app.avg_rating))) if app.avg_rating else '0'
                if rating_range in rating_distribution:
                    rating_distribution[rating_range] += 1

            analytics = {
                'developer_id': developer.id,
                'slug': slug,
                'name_en': developer.name_en,
                'name_ar': developer.name_ar,
                'is_verified': developer.is_verified,
                'app_statistics': {
                    'total_apps': total_apps,
                    'published_apps': published_apps,
                    'draft_apps': total_apps - published_apps,
                    'featured_apps': published_queryset.filter(featured=True).count()
                },
                'platform_breakdown': platform_breakdown,
                'category_breakdown': category_breakdown,
                'rating_distribution': rating_distribution,
                'performance_metrics': {
                    'average_rating': published_queryset.aggregate(
                        avg_rating=Avg('avg_rating')
                    )['avg_rating'] or 0,
                    'total_views': published_queryset.aggregate(
                        total_views=models.Sum('view_count')
                    )['total_views'] or 0,
                    'total_reviews': published_queryset.aggregate(
                        total_reviews=models.Sum('review_count')
                    )['total_reviews'] or 0
                }
            }

            # Cache the results
            self.set_cache(cache_key, analytics, timeout=self.developer_cache_timeout)

            self.log_operation('get_developer_analytics', {
                'slug': slug,
                'published_apps': published_apps
            })

            return analytics
        except Developer.DoesNotExist:
            return None

    def invalidate_developer_cache(self, developer: Developer = None) -> None:
        """
        Invalidate developer-related cache entries.

        Args:
            developer: Specific developer to invalidate caches for (optional)
        """
        if developer:
            # Clear specific developer caches
            self.delete_cache(f"developer_by_slug_{developer.slug}")
            self.delete_cache(f"developer_with_stats_{developer.slug}")
            self.delete_cache(f"developer_apps_{developer.slug}")
            self.delete_cache(f"developer_analytics_{developer.slug}")
        else:
            # Clear all developer caches
            self.delete_cache_pattern("*developers*")
            self.delete_cache_pattern("*developer_*")

        self.log_operation('invalidate_developer_cache', {
            'developer_id': developer.id if developer else None,
            'slug': developer.slug if developer else None
        })