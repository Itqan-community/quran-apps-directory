"""
Simplified service layer for Quranic Applications

Basic implementation to get Django Ninja API running quickly.
"""

from typing import List, Optional, Dict, Any
from ..models import App


class AppService:
    """
    Simplified service class for application business logic.
    """

    def __init__(self):
        pass

    def get_apps(self, filters: Dict[str, Any] = None,
                ordering: str = 'sort_order,name_en',
                page: int = 1,
                page_size: int = 20) -> Dict[str, Any]:
        """
        Get applications with filtering and pagination.
        """
        # Mock data for now - replace with actual database queries
        mock_apps = [
            {
                "id": "1",
                "name_en": "Quran.com",
                "name_ar": "قرآن.كوم",
                "slug": "quran-com",
                "short_description_en": "Read, listen, and study the Quran",
                "short_description_ar": "اقرأ واستمع وادرس القرآن",
                "application_icon": "/assets/icons/quran-com.png",
                "avg_rating": 4.8,
                "review_count": 1250,
                "view_count": 50000,
                "sort_order": 1,
                "featured": True,
                "platform": "cross_platform",
                "status": "published",
                "developer": {
                    "id": 1,
                    "name_en": "Quran.com",
                    "name_ar": "قرآن.كوم",
                    "website": "https://quran.com",
                    "logo": "/assets/logos/quran-com.png"
                },
                "categories": ["quran-reading", "arabic-learning"],
                "created_at": "2025-01-01T00:00:00Z"
            },
            {
                "id": "2",
                "name_en": "Muslim Pro",
                "name_ar": "مسلم برو",
                "slug": "muslim-pro",
                "short_description_en": "Prayer times, Azan, Qibla & Quran",
                "short_description_ar": "مواقيت الصلاة، الأذان، القبلة والقرآن",
                "application_icon": "/assets/icons/muslim-pro.png",
                "avg_rating": 4.6,
                "review_count": 2100,
                "view_count": 75000,
                "sort_order": 2,
                "featured": True,
                "platform": "cross_platform",
                "status": "published",
                "developer": {
                    "id": 2,
                    "name_en": "Muslim Pro Limited",
                    "name_ar": "مسلم برو المحدودة",
                    "website": "https://muslimpro.com",
                    "logo": "/assets/logos/muslim-pro.png"
                },
                "categories": ["prayer-times", "qibla-compass"],
                "created_at": "2025-01-01T00:00:00Z"
            }
        ]

        # Apply basic filtering
        if filters and filters.get('search'):
            search_term = filters['search'].lower()
            mock_apps = [app for app in mock_apps if
                        search_term in app['name_en'].lower() or
                        search_term in app['name_ar'].lower() or
                        search_term in app['short_description_en'].lower() or
                        search_term in app['short_description_ar'].lower()]

        # Simple pagination
        start = (page - 1) * page_size
        end = start + page_size
        paginated_apps = mock_apps[start:end]

        return {
            'count': len(mock_apps),
            'next': end < len(mock_apps) and f"?page={page + 1}" or None,
            'previous': page > 1 and f"?page={page - 1}" or None,
            'results': paginated_apps
        }

    def get_app_by_identifier(self, identifier: str) -> Optional[Dict]:
        """
        Get app by UUID or slug.
        """
        result = self.get_apps()
        for app in result['results']:
            if app['id'] == identifier or app['slug'] == identifier:
                return app
        return None

    def get_featured_apps(self, category: str = 'all') -> List[Dict]:
        """
        Get featured applications.
        """
        result = self.get_apps()
        featured_apps = [app for app in result['results'] if app['featured']]
        return featured_apps

    def get_apps_by_platform(self, platform: str) -> List[Dict]:
        """
        Get applications by platform.
        """
        result = self.get_apps()
        platform_apps = [app for app in result['results'] if app['platform'] == platform]
        return platform_apps