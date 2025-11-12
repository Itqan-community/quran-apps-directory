"""
Service layer for Quranic Applications

Following ITQAN community standards with proper business logic separation.
"""

from typing import List, Optional, Dict, Any
from django.core.cache import cache
from django.db.models import Q
from django.conf import settings

from ..models import App, Category, Developer


class AppService:
    """
    Service class for application business logic.

    Handles all app-related operations with proper caching,
    logging, and error handling following ITQAN patterns.
    """

    def __init__(self):
        pass

    def get_apps(self, filters: Dict[str, Any] = None,
                ordering: str = 'sort_order,name_en',
                page: int = 1,
                page_size: int = 100) -> Dict[str, Any]:
        """
        Get applications with filtering and pagination.

        Args:
            filters: Dictionary of filters (search, category, platform, featured)
            ordering: Order by clause
            page: Page number (1-based)
            page_size: Number of items per page

        Returns:
            Dictionary with pagination info and results
        """
        try:
            # TODO: Add logging
            # Build cache key
            cache_key = f"apps_list_{filters}_{ordering}_{page}_{page_size}"

            # Try to get from cache
            cached_result = cache.get(cache_key)
            if cached_result:
                return cached_result

            # Base queryset with optimizations
            queryset = App.objects.select_related('developer').prefetch_related('categories')

            # Apply filters
            if filters:
                search = filters.get('search')
                if search:
                    queryset = queryset.filter(
                        Q(name_en__icontains=search) |
                        Q(name_ar__icontains=search) |
                        Q(short_description_en__icontains=search) |
                        Q(short_description_ar__icontains=search)
                    )

                category = filters.get('category')
                if category:
                    queryset = queryset.filter(categories__slug=category)

                platform = filters.get('platform')
                if platform:
                    queryset = queryset.filter(platform=platform)

                featured = filters.get('featured')
                if featured is not None:
                    queryset = queryset.filter(featured=featured)

            # Filter only published apps
            queryset = queryset.filter(status='published')

            # Apply ordering
            if ordering:
                order_fields = ordering.split(',')
                queryset = queryset.order_by(*order_fields)

            # Paginate results
            from django.core.paginator import Paginator
            paginator = Paginator(queryset, page_size)
            page_obj = paginator.get_page(page)

            paginated_result = {
                'count': paginator.count,
                'next': page_obj.has_next() and f"?page={page + 1}" or None,
                'previous': page_obj.has_previous() and f"?page={page - 1}" or None,
                'results': list(page_obj.object_list)
            }

            # Cache result (5 minutes)
            cache.set(cache_key, paginated_result, 300)

            return paginated_result

        except Exception as e:
            # TODO: Add proper logging
            print(f"Error in get_apps: {e}")
            return {
                'count': 0,
                'next': None,
                'previous': None,
                'results': []
            }

    def get_app_by_identifier(self, identifier: str) -> Optional[App]:
        """
        Get app by UUID or slug.

        Args:
            identifier: App UUID or slug

        Returns:
            App instance or None
        """
        try:
            self.log_operation('get_app_by_identifier', {'identifier': identifier})

            # Try UUID first, then slug
            queryset = App.objects.select_related('developer').prefetch_related('categories')

            try:
                app = queryset.get(id=identifier, status='published')
            except (App.DoesNotExist, ValueError):
                try:
                    app = queryset.get(slug=identifier, status='published')
                except App.DoesNotExist:
                    return None

            return app

        except Exception as e:
            self.log_error('get_app_by_identifier', e, {'identifier': identifier})
            return None

    def get_featured_apps(self, category: str = 'all') -> List[App]:
        """
        Get featured applications.

        Args:
            category: Optional category filter

        Returns:
            List of featured apps
        """
        try:
            self.log_operation('get_featured_apps', {'category': category})

            cache_key = self.get_cache_key('featured_apps', category=category)
            cached_apps = self.get_from_cache(cache_key)
            if cached_apps:
                return cached_apps

            queryset = App.objects.select_related('developer').prefetch_related('categories').filter(
                featured=True,
                status='published'
            )

            if category != 'all':
                queryset = queryset.filter(categories__slug=category)

            apps = list(queryset.order_by('sort_order', 'name_en'))

            # Cache for 10 minutes
            self.set_cache(cache_key, apps,
                       timeout=self.cache_timeout.get('FEATURED_APPS', 600))

            return apps

        except Exception as e:
            self.log_error('get_featured_apps', e, {'category': category})
            return []

    def get_apps_by_platform(self, platform: str) -> List[App]:
        """
        Get applications by platform.

        Args:
            platform: Platform name (android, ios, web, cross_platform)

        Returns:
            List of apps for the platform
        """
        try:
            self.log_operation('get_apps_by_platform', {'platform': platform})

            cache_key = self.get_cache_key('apps_by_platform', platform=platform)
            cached_apps = self.get_from_cache(cache_key)
            if cached_apps:
                return cached_apps

            apps = list(
                App.objects.select_related('developer')
                .prefetch_related('categories')
                .filter(platform=platform, status='published')
                .order_by('sort_order', 'name_en')
            )

            # Cache for 10 minutes
            self.set_cache(cache_key, apps,
                       timeout=self.cache_timeout.get('APPS_BY_PLATFORM', 600))

            return apps

        except Exception as e:
            self.log_error('get_apps_by_platform', e, {'platform': platform})
            return []

    def create_app(self, app_data: Dict[str, Any]) -> App:
        """
        Create a new application.

        Args:
            app_data: Application data

        Returns:
            Created App instance
        """
        try:
            self.log_operation('create_app', app_data)

            # Extract related object IDs
            developer_id = app_data.pop('developer_id', None)
            category_ids = app_data.pop('categories', [])

            app = App(**app_data)
            self.validate_and_save(app)

            # Handle relationships
            if developer_id:
                app.developer_id = developer_id
                app.save()

            if category_ids:
                app.categories.set(category_ids)
                app.save()

            # Clear relevant caches
            self._clear_app_caches()

            return app

        except Exception as e:
            self.log_error('create_app', e, app_data)
            raise

    def update_app(self, app: App, update_data: Dict[str, Any]) -> App:
        """
        Update an existing application.

        Args:
            app: Existing App instance
            update_data: Data to update

        Returns:
            Updated App instance
        """
        try:
            self.log_operation('update_app', {
                'app_id': app.id,
                'update_data': {k: v for k, v in update_data.items() if v is not None}
            })

            # Handle relationships
            developer_id = update_data.pop('developer_id', None)
            category_ids = update_data.pop('categories', None)

            # Update fields
            for field, value in update_data.items():
                if value is not None:
                    setattr(app, field, value)

            self.validate_and_save(app)

            # Handle relationships
            if developer_id:
                app.developer_id = developer_id

            if category_ids is not None:
                if category_ids:
                    app.categories.set(category_ids)
                else:
                    app.categories.clear()

            app.save()

            # Clear relevant caches
            self._clear_app_caches()

            return app

        except Exception as e:
            self.log_error('update_app', e, {'app_id': app.id, 'update_data': update_data})
            raise

    def delete_app(self, app: App) -> bool:
        """
        Delete an application.

        Args:
            app: App instance to delete

        Returns:
            True if successful
        """
        try:
            self.log_operation('delete_app', {'app_id': app.id})

            app.delete()
            self._clear_app_caches()
            return True

        except Exception as e:
            self.log_error('delete_app', e, {'app_id': app.id})
            return False

    def search_apps(self, query: str, filters: Dict[str, Any] = None) -> List[App]:
        """
        Search applications.

        Args:
            query: Search query string
            filters: Additional filters (category, platform, etc.)

        Returns:
            List of matching apps
        """
        search_filters = {'search': query}
        if filters:
            search_filters.update(filters)

        result = self.get_apps(filters=search_filters, page_size=100)  # Limit search results
        return result.get('results', [])

    def get_queryset_optimized(self, model_class):
        """
        Get optimized queryset for App model.

        Overrides base service method with App-specific optimizations.
        """
        return model_class.objects.select_related('developer').prefetch_related('categories')

    def _clear_app_caches(self) -> None:
        """
        Clear all app-related caches.
        """
        self.delete_cache_pattern('apps_list_*')
        self.delete_cache_pattern('featured_apps_*')
        self.delete_cache_pattern('apps_by_platform_*')
        self.delete_cache_pattern('app_detail_*')