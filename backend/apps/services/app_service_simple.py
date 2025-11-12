"""
Simplified service layer for Quranic Applications

Uses actual database queries instead of mock data.
"""

from typing import List, Optional, Dict, Any
from django.db.models import Q
from ..models import App


class AppService:
    """
    Service class for application business logic.
    Queries actual database instead of using mock data.
    """

    def __init__(self):
        pass

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

        return {
            "id": str(app.id),
            "name_en": app.name_en,
            "name_ar": app.name_ar,
            "slug": app.slug,
            "short_description_en": app.short_description_en,
            "short_description_ar": app.short_description_ar,
            "description_en": app.description_en or "",
            "description_ar": app.description_ar or "",
            "application_icon": app.application_icon or "",
            "main_image_en": app.main_image_en or "",
            "main_image_ar": app.main_image_ar or "",
            "google_play_link": app.google_play_link or "",
            "app_store_link": app.app_store_link or "",
            "app_gallery_link": app.app_gallery_link or "",
            "screenshots_en": app.screenshots_en or [],
            "screenshots_ar": app.screenshots_ar or [],
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
            "created_at": app.created_at.isoformat() if app.created_at else "",
            "updated_at": app.updated_at.isoformat() if app.updated_at else ""
        }

    def get_apps(self, filters: Dict[str, Any] = None,
                ordering: str = 'sort_order,name_en',
                page: int = 1,
                page_size: int = 100) -> Dict[str, Any]:
        """
        Get applications from database with filtering and pagination.
        """
        # Start with published apps
        queryset = App.objects.filter(status='published')

        # Apply filters
        if filters:
            # Search filter (search in name and descriptions)
            if filters.get('search'):
                search_term = filters['search']
                queryset = queryset.filter(
                    Q(name_en__icontains=search_term) |
                    Q(name_ar__icontains=search_term) |
                    Q(short_description_en__icontains=search_term) |
                    Q(short_description_ar__icontains=search_term)
                )

            # Category filter
            if filters.get('category'):
                queryset = queryset.filter(categories__slug=filters['category'])

            # Platform filter
            if filters.get('platform'):
                queryset = queryset.filter(platform=filters['platform'])

            # Featured filter
            if filters.get('featured') is not None:
                queryset = queryset.filter(featured=filters['featured'])

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