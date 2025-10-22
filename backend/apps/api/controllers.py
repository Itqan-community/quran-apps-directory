"""
Ninja API controllers for Quranic Applications

Following ITQAN community standards using Django Ninja framework.
"""

from typing import List, Optional
from ninja import Router, ModelSchema, Schema
from django.shortcuts import get_object_or_404
from django.db.models import Q

from ..services.app_service_simple import AppService
from .schemas import AppSchema, AppListSchema, AppCreateSchema, AppUpdateSchema, PaginatedAppListSchema, CategorySchema


router = Router(tags=["Apps"])


@router.get("/", response=PaginatedAppListSchema)
def list_apps(
    request,
    search: Optional[str] = None,
    category: Optional[str] = None,
    platform: Optional[str] = None,
    featured: Optional[bool] = None,
    ordering: Optional[str] = None,
    page: int = 1,
    page_size: int = 20
):
    """
    List all published Quranic applications.

    Supports filtering by category, platform, and featured status.
    Supports search in English and Arabic.
    Supports ordering by various fields.
    """
    app_service = AppService()

    filters = {}
    if search:
        filters['search'] = search
    if category:
        filters['category'] = category
    if platform:
        filters['platform'] = platform
    if featured is not None:
        filters['featured'] = featured

    return app_service.get_apps(
        filters=filters,
        ordering=ordering or 'sort_order,name_en',
        page=page,
        page_size=page_size
    )


@router.get("/{app_id}", response=AppSchema)
def get_app(request, app_id: str):
    """
    Get detailed information about a specific application.

    Can be accessed by UUID or slug.
    Automatically increments view count.
    """
    app_service = AppService()
    app = app_service.get_app_by_identifier(app_id)

    if not app:
        return {"error": "Application not found"}, 404

    # Increment view count
    app.increment_view_count()

    return app


@router.get("/featured/", response=List[AppListSchema])
def get_featured_apps(
    request,
    category: str = "all"
):
    """
    Get featured applications.

    Returns a list of featured apps, optionally filtered by category.
    """
    app_service = AppService()
    filters = {'featured': True}

    if category != "all":
        filters['category'] = category

    return app_service.get_apps(filters=filters, ordering='-sort_order,name_en')


@router.get("/by-platform/", response=List[AppListSchema])
def get_apps_by_platform(
    request,
    platform: str
):
    """
    Get applications by platform.

    Filter apps by specific platform (android, ios, web, cross_platform).
    """
    if not platform:
        return {"error": "Platform parameter is required"}, 400

    app_service = AppService()
    return app_service.get_apps(
        filters={'platform': platform},
        ordering='-sort_order,name_en'
    )


# Categories endpoint moved to main API in urls.py
def get_categories(request):
    """
    Get all application categories.

    Returns a list of all available categories for filtering apps.
    """
    # Mock categories data - replace with actual service call
    mock_categories = [
        {
            "id": 1,
            "name_en": "Quran Reading",
            "name_ar": "قراءة القرآن",
            "slug": "quran-reading",
            "description_en": "Apps for reading the Holy Quran",
            "description_ar": "تطبيقات لقراءة القرآن الكريم",
            "icon": "book"
        },
        {
            "id": 2,
            "name_en": "Prayer Times",
            "name_ar": "مواقيت الصلاة",
            "slug": "prayer-times",
            "description_en": "Apps for prayer times and reminders",
            "description_ar": "تطبيقات مواقيت الصلاة والتذكير",
            "icon": "clock"
        },
        {
            "id": 3,
            "name_en": "Qibla Compass",
            "name_ar": "بوصلة القبلة",
            "slug": "qibla-compass",
            "description_en": "Apps for finding Qibla direction",
            "description_ar": "تطبيقات لإيجاد اتجاه القبلة",
            "icon": "compass"
        }
    ]
    
    return mock_categories