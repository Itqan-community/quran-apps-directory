"""
Simplified service layer for Quranic Applications

Uses actual database queries instead of mock data.
Supports dynamic filters via MetadataType/MetadataOption/AppMetadataValue tables.
"""

from typing import List, Optional, Dict, Any
from django.db.models import Q
from ..models import App


class AppService:
    """
    Service class for application business logic.
    Queries actual database instead of using mock data.

    Dynamic metadata filter support:
    - Filters are read from MetadataType table (added via admin, no code changes needed)
    - App metadata values are stored in AppMetadataValue M2M junction table
    - Filter logic: AND between different metadata types, OR within same metadata type
    """

    def __init__(self):
        # Cache active metadata type names to avoid repeated DB queries
        self._active_metadata_names = None

    def _get_active_metadata_names(self) -> List[str]:
        """Get list of active metadata type names from database."""
        if self._active_metadata_names is None:
            from metadata.models import MetadataType
            self._active_metadata_names = list(
                MetadataType.objects.filter(is_active=True).values_list('name', flat=True)
            )
        return self._active_metadata_names

    def _get_app_metadata_values(self, app: App) -> Dict[str, List[str]]:
        """
        Get metadata values for an app from AppMetadataValue table.

        Returns dict like: {'riwayah': ['hafs', 'warsh'], 'features': ['offline']}
        """
        from metadata.models import AppMetadataValue

        result = {}

        # Query all metadata values for this app
        metadata_values = AppMetadataValue.objects.filter(app=app).select_related(
            'metadata_option', 'metadata_option__metadata_type'
        )

        for mv in metadata_values:
            metadata_name = mv.metadata_option.metadata_type.name
            option_value = mv.metadata_option.value

            if metadata_name not in result:
                result[metadata_name] = []
            result[metadata_name].append(option_value)

        return result

    def _app_to_dict(self, app: App, include_full_categories: bool = False) -> Dict[str, Any]:
        """Convert App model instance to dictionary.

        Args:
            app: App model instance to convert
            include_full_categories: If True, return full category objects; if False, return slug strings
        """
        # Format categories based on include_full_categories flag
        if include_full_categories:
            categories = [
                {
                    "id": cat.id,
                    "name_en": cat.name_en,
                    "name_ar": cat.name_ar,
                    "slug": cat.slug,
                    "description_en": cat.description_en or "",
                    "description_ar": cat.description_ar or "",
                    "icon": cat.icon or ""
                }
                for cat in app.categories.all()
            ]
        else:
            categories = [cat.slug for cat in app.categories.all()]

        # Main images - use .url accessor (returns full URL from R2Storage)
        main_image_en = app.main_image_en.url if app.main_image_en else ""
        main_image_ar = app.main_image_ar.url if app.main_image_ar else ""

        # Screenshots - prefer AppScreenshot model, fallback to legacy JSON during transition
        screenshot_files_en = list(app.screenshot_files.filter(language='en').order_by('sort_order'))
        screenshot_files_ar = list(app.screenshot_files.filter(language='ar').order_by('sort_order'))

        if screenshot_files_en:
            screenshots_en = [s.image.url for s in screenshot_files_en]
        else:
            screenshots_en = app.screenshots_en or []

        if screenshot_files_ar:
            screenshots_ar = [s.image.url for s in screenshot_files_ar]
        else:
            screenshots_ar = app.screenshots_ar or []

        # Get metadata values from AppMetadataValue table (dynamic)
        metadata_values = self._get_app_metadata_values(app)

        return {
            "id": str(app.id),
            "name_en": app.name_en,
            "name_ar": app.name_ar,
            "slug": app.slug,
            "short_description_en": app.short_description_en,
            "short_description_ar": app.short_description_ar,
            "description_en": app.description_en or "",
            "description_ar": app.description_ar or "",
            "application_icon": app.application_icon.url if app.application_icon else "",
            "main_image_en": main_image_en,
            "main_image_ar": main_image_ar,
            "google_play_link": app.google_play_link or "",
            "app_store_link": app.app_store_link or "",
            "app_gallery_link": app.app_gallery_link or "",
            "screenshots_en": screenshots_en,
            "screenshots_ar": screenshots_ar,
            "avg_rating": float(app.avg_rating) if app.avg_rating else 0,
            "review_count": app.review_count or 0,
            "view_count": app.view_count or 0,
            "sort_order": app.sort_order,
            "featured": app.featured,
            "platform": app.platform,
            "status": app.status,
            "developer": {
                "id": str(app.developer.id) if app.developer else "",
                "name_en": app.developer.name_en if app.developer else "",
                "name_ar": app.developer.name_ar if app.developer else "",
                "website": app.developer.website or "" if app.developer else "",
                "logo": app.developer.logo_url or "" if app.developer else ""
            },
            "categories": categories,
            # Dynamic metadata values from AppMetadataValue table
            "riwayah": metadata_values.get('riwayah', []),
            "mushaf_type": metadata_values.get('mushaf_type', []),
            "features": metadata_values.get('features', []),
            "created_at": app.created_at.isoformat() if app.created_at else "",
            "updated_at": app.updated_at.isoformat() if app.updated_at else ""
        }

    def _parse_multi_value(self, value: str) -> List[str]:
        """Parse comma-separated values into a list."""
        if not value:
            return []
        return [v.strip().lower() for v in value.split(',') if v.strip()]

    def _apply_dynamic_filter(self, queryset, metadata_type_name: str, values: List[str]):
        """
        Apply dynamic filter using AppMetadataValue joins.

        Uses the new normalized tables instead of JSONField queries.
        OR logic: app matches any of the selected values for this metadata type.
        """
        if not values:
            return queryset

        # Filter apps that have AppMetadataValue records matching:
        # - metadata_option__metadata_type__name = metadata_type_name
        # - metadata_option__value IN values
        return queryset.filter(
            metadata_values__metadata_option__metadata_type__name=metadata_type_name,
            metadata_values__metadata_option__value__in=values
        ).distinct()

    def get_apps(self, filters: Dict[str, Any] = None,
                ordering: str = 'sort_order,name_en',
                page: int = 1,
                page_size: int = 100) -> Dict[str, Any]:
        """
        Get applications from database with filtering and pagination.

        Supports multi-value filters with:
        - OR logic within the same filter type (e.g., riwayah=hafs,warsh)
        - AND logic between different filter types

        Query Parameters:
        - search: Search in app names and descriptions
        - developer_id: Filter by developer ID
        - category: Filter by category slug(s) - comma-separated for multi-select
        - platform: Filter by platform(s) - comma-separated for multi-select
        - featured: Filter by featured status (true/false)
        - [dynamic filters]: Any active MetadataType name (e.g., riwayah, mushaf_type, features)
        """
        # Start with published apps
        queryset = App.objects.filter(status='published')

        # Apply filters
        if filters:
            # Developer ID filter (most robust - exact match by ID)
            if filters.get('developer_id'):
                queryset = queryset.filter(developer_id=filters['developer_id'])

            # Search filter (search in name and descriptions)
            if filters.get('search'):
                search_term = filters['search']
                queryset = queryset.filter(
                    Q(name_en__icontains=search_term) |
                    Q(name_ar__icontains=search_term) |
                    Q(short_description_en__icontains=search_term) |
                    Q(short_description_ar__icontains=search_term)
                )

            # Category filter (supports multi-select with comma-separated values)
            if filters.get('category'):
                category_values = self._parse_multi_value(filters['category'])
                if category_values:
                    # OR logic: matches any of the selected categories
                    queryset = queryset.filter(categories__slug__in=category_values).distinct()

            # Platform filter (supports multi-select with comma-separated values)
            if filters.get('platform'):
                platform_values = self._parse_multi_value(filters['platform'])
                if platform_values:
                    queryset = queryset.filter(platform__in=platform_values)

            # Featured filter
            if filters.get('featured') is not None:
                queryset = queryset.filter(featured=filters['featured'])

            # Dynamic filters from MetadataType table
            # Each active metadata type can be applied using AppMetadataValue joins
            active_metadata_names = self._get_active_metadata_names()

            for metadata_name in active_metadata_names:
                metadata_value = filters.get(metadata_name)
                if metadata_value:
                    values = self._parse_multi_value(metadata_value)
                    if values:
                        queryset = self._apply_dynamic_filter(queryset, metadata_name, values)

        # Get total count before pagination
        total_count = queryset.count()

        # Apply ordering
        if ordering:
            # Split by comma for multiple orderings
            order_fields = [field.strip() for field in ordering.split(',')]
            queryset = queryset.order_by(*order_fields)

        # Apply pagination
        start = (page - 1) * page_size
        end = start + page_size
        paginated_queryset = queryset[start:end]

        # Convert to dictionaries
        apps_list = [self._app_to_dict(app) for app in paginated_queryset]

        return {
            'count': total_count,
            'next': end < total_count and f"?page={page + 1}" or None,
            'previous': page > 1 and f"?page={page - 1}" or None,
            'results': apps_list
        }

    def get_app_by_identifier(self, identifier: str) -> Optional[Dict]:
        """
        Get app by UUID or slug from database.
        """
        try:
            app = App.objects.filter(status='published').filter(
                Q(id=identifier) | Q(slug=identifier)
            ).first()
            if app:
                return self._app_to_dict(app)
        except:
            pass
        return None

    def get_featured_apps(self, category: str = 'all') -> List[Dict]:
        """
        Get featured applications from database.
        """
        queryset = App.objects.filter(status='published', featured=True)

        if category and category != 'all':
            queryset = queryset.filter(categories__slug=category)

        queryset = queryset.order_by('sort_order', 'name_en')
        return [self._app_to_dict(app) for app in queryset]

    def get_apps_by_platform(self, platform: str) -> List[Dict]:
        """
        Get applications by platform from database.
        """
        queryset = App.objects.filter(status='published', platform=platform)
        queryset = queryset.order_by('sort_order', 'name_en')
        return [self._app_to_dict(app) for app in queryset]