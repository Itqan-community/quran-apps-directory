"""
Ninja API controllers for Quranic Applications

Following ITQAN community standards using Django Ninja framework.
"""

from typing import List, Optional
from ninja import Router, ModelSchema, Schema
from django.shortcuts import get_object_or_404
from django.db.models import Q

from ..services.app_service_simple import AppService
from ..utils.user_agent_parser import parse_user_agent, hash_ip_address, get_client_ip, get_country_from_request
from .schemas import (
    AppSchema, AppListSchema, AppCreateSchema, AppUpdateSchema,
    PaginatedAppListSchema, CategorySchema, MetadataValuesResponseSchema
)


router = Router(tags=["Apps"])


@router.get("/", response=PaginatedAppListSchema)
def list_apps(request):
    """
    List all published Quranic applications.

    Supports filtering by category, platform, featured status, developer, and dynamic filters.
    All multi-select filters support comma-separated values (e.g., riwayah=hafs,warsh).
    Filter logic: AND between different filter types, OR within same filter type.

    Query Parameters:
    - search: Search in app names and descriptions
    - developer_id: Filter by developer ID (most robust)
    - category: Filter by category slug(s) - comma-separated for multi-select
    - platform: Filter by platform(s) - comma-separated (android, ios, web, cross_platform)
    - featured: Filter by featured status (true/false)
    - [dynamic filters]: Any active MetadataType name can be used (e.g., riwayah, mushaf_type, features)
    - ordering: Order by field(s) (default: sort_order,name_en)
    - page: Page number (default: 1)
    - page_size: Items per page (default: 100)
    """
    from metadata.models import MetadataType

    # Extract standard query parameters
    search = request.GET.get('search', '').strip() or None
    developer_id = request.GET.get('developer_id', '').strip() or None
    category = request.GET.get('category', '').strip() or None
    platform = request.GET.get('platform', '').strip() or None
    featured_str = request.GET.get('featured', '').strip()
    ordering = request.GET.get('ordering', '').strip() or None

    try:
        page = int(request.GET.get('page', 1) or 1)
    except (ValueError, TypeError):
        page = 1

    try:
        page_size = int(request.GET.get('page_size', 100) or 100)
    except (ValueError, TypeError):
        page_size = 100

    # Parse featured boolean
    featured = None
    if featured_str:
        featured = featured_str.lower() in ('true', '1', 'yes', 'on')

    app_service = AppService()

    filters = {}
    if search:
        filters['search'] = search
    if developer_id:
        filters['developer_id'] = developer_id
    if category:
        filters['category'] = category
    if platform:
        filters['platform'] = platform
    if featured is not None:
        filters['featured'] = featured

    # Dynamically extract filter parameters based on active MetadataTypes
    # This allows new metadata types added via admin to work without code changes
    active_metadata_names = list(
        MetadataType.objects.filter(is_active=True).values_list('name', flat=True)
    )

    for metadata_name in active_metadata_names:
        metadata_value = request.GET.get(metadata_name, '').strip()
        if metadata_value:
            filters[metadata_name] = metadata_value

    result = app_service.get_apps(
        filters=filters,
        ordering=ordering or 'sort_order,name_en',
        page=page,
        page_size=page_size
    )

    return result


# More specific routes BEFORE the catch-all /{app_id} route
@router.get("/metadata-values/", response=MetadataValuesResponseSchema)
def get_metadata_values(request):
    """
    Get all available metadata values for building filter dropdowns.

    Returns dynamically from database - new metadata types added via admin
    appear here automatically without code changes.

    Returns lists of available options for each metadata type with:
    - value: The metadata value to use in API queries
    - label_en: English display label
    - label_ar: Arabic display label
    - count: Number of published apps with this value
    """
    from apps.models import App
    from metadata.models import MetadataType, MetadataOption
    from django.db.models import Count, Q

    # Get base queryset of published apps
    published_apps = App.objects.filter(status='published')

    # Platform options with counts (platform is still on App model, not in metadata)
    platform_choices = [
        ('android', 'Android', 'أندرويد'),
        ('ios', 'iOS', 'آي أو إس'),
        ('web', 'Web', 'ويب'),
        ('cross_platform', 'Cross Platform', 'متعدد المنصات'),
    ]
    platforms = []
    for value, label_en, label_ar in platform_choices:
        count = published_apps.filter(platform=value).count()
        if count > 0:
            platforms.append({
                'value': value,
                'label_en': label_en,
                'label_ar': label_ar,
                'count': count
            })

    # Build response dynamically from MetadataType/MetadataOption tables
    response = {'platforms': platforms}

    # Get all active metadata types
    metadata_types = MetadataType.objects.filter(is_active=True).order_by('sort_order')

    for metadata_type in metadata_types:
        options = []

        # Get active options for this metadata type
        metadata_options = metadata_type.options.filter(is_active=True).order_by('sort_order')

        for option in metadata_options:
            # Count apps that have this metadata option and are published
            app_count = option.app_values.filter(app__status='published').count()

            if app_count > 0:
                options.append({
                    'value': option.value,
                    'label_en': option.label_en,
                    'label_ar': option.label_ar,
                    'count': app_count,
                })

        # Add to response using metadata type name as key
        response[metadata_type.name] = options

    return response


@router.get("/featured/", response=PaginatedAppListSchema)
def get_featured_apps(request):
    """
    Get featured applications.

    Returns a list of featured apps, optionally filtered by category.
    """
    category = request.GET.get('category', 'all').strip() or 'all'

    try:
        page = int(request.GET.get('page', 1) or 1)
    except (ValueError, TypeError):
        page = 1

    try:
        page_size = int(request.GET.get('page_size', 100) or 100)
    except (ValueError, TypeError):
        page_size = 100

    app_service = AppService()
    filters = {'featured': True}

    if category != "all":
        filters['category'] = category

    result = app_service.get_apps(
        filters=filters,
        ordering='-sort_order,name_en',
        page=page,
        page_size=page_size
    )

    return result


@router.get("/by-platform/", response=PaginatedAppListSchema)
def get_apps_by_platform(request):
    """
    Get applications by platform.

    Filter apps by specific platform (android, ios, web, cross_platform).
    """
    platform = request.GET.get('platform', '').strip()
    if not platform:
        return {"error": "Platform parameter is required"}, 400

    try:
        page = int(request.GET.get('page', 1) or 1)
    except (ValueError, TypeError):
        page = 1

    try:
        page_size = int(request.GET.get('page_size', 100) or 100)
    except (ValueError, TypeError):
        page_size = 100

    app_service = AppService()
    result = app_service.get_apps(
        filters={'platform': platform},
        ordering='-sort_order,name_en',
        page=page,
        page_size=page_size
    )

    return result


# Catch-all route for getting individual app by ID or slug
# MUST come AFTER more specific routes like /featured/ and /by-platform/
@router.get("/{app_id}", response=AppSchema)
def get_app(request, app_id: str):
    """
    Get detailed information about a specific application.

    Can be accessed by UUID or slug.
    Automatically increments view count and records view event.
    """
    from apps.models import App, AppViewEvent

    # Find app by ID or slug
    app_obj = None
    try:
        # Try to get by UUID first
        app_obj = App.objects.filter(status='published').get(id=app_id)
    except:
        # Try to get by slug
        try:
            app_obj = App.objects.filter(status='published').get(slug=app_id)
        except:
            pass

    if not app_obj:
        return {"error": "Application not found"}, 404

    # Increment view count
    app_obj.view_count = (app_obj.view_count or 0) + 1
    app_obj.save(update_fields=['view_count'])

    # Record view event for analytics
    try:
        user_agent = request.META.get('HTTP_USER_AGENT', '')
        ua_data = parse_user_agent(user_agent)

        AppViewEvent.objects.create(
            app=app_obj,
            referrer=request.META.get('HTTP_REFERER'),
            user_agent=user_agent,
            session_id=request.COOKIES.get('sessionid'),
            country_code=get_country_from_request(request),
            ip_hash=hash_ip_address(get_client_ip(request)),
            device_type=ua_data['device_type'],
            browser=ua_data['browser'],
            os=ua_data['os'],
        )
    except Exception:
        # Analytics should not break main functionality
        pass

    # Use AppService to convert to dictionary with full category objects for detailed view
    app_service = AppService()
    result = app_service._app_to_dict(app_obj, include_full_categories=True)

    return result


# Categories endpoint - query actual database
def get_categories(request):
    """
    Get all application categories from database.

    Returns a list of all available categories for filtering apps.
    """
    from categories.models import Category

    # Query all active categories from database
    categories = Category.objects.filter(is_active=True).order_by('sort_order', 'name_en')

    # Icon mapping for common categories - SVG icons from production (main branch)
    icon_mapping = {
        "mushaf": '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 19.2" width="24" height="19.2"><path fill="#A0533B" d="M19.2 12.645V1.965l-6.3.922v11.1zm-8.1 1.342v-11.1l-6.3-.922v10.68zM19.627.083A1.196 1.196 0 0 1 21 1.267v11.861c0 .566-.397 1.054-.949 1.174l-7.549 1.613c-.33.071-.671.071-1.001 0l-7.549-1.613A1.2 1.2 0 0 1 3 13.129V1.267C3 .536 3.649-.026 4.372.083L12 1.2zM1.436.889l.382.075a3 3 0 0 0-.019.304v14.063l9.967 2.044a1.2 1.2 0 0 0 .464 0l9.97-2.045V1.267q0-.157-.019-.304l.382-.075a1.197 1.197 0 0 1 1.436 1.174v13.759c0 .57-.401 1.061-.96 1.174L12.592 19.14q-.294.06-.593.06a2.3 2.3 0 0 1-.593-.06L.96 16.995A1.196 1.196 0 0 1 0 15.821V2.063C0 1.306.694.739 1.436.889"/></svg>',
        "translations": '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24"><path fill="#A0533B" d="M12 21.75c.347 0 1.266-.338 2.231-2.269.413-.83.769-1.838 1.031-2.981H8.738c.262 1.144.619 2.152 1.031 2.981.965 1.932 1.884 2.269 2.231 2.269m-3.633-7.5h7.266a21.7 21.7 0 0 0 0-4.5H8.367a21.7 21.7 0 0 0 0 4.5m.37-6.75h6.525c-.262-1.144-.619-2.152-1.031-2.981C13.266 2.588 12.347 2.25 12 2.25s-1.266.338-2.231 2.269C9.356 5.349 9 6.357 8.738 7.5m9.155 2.25c.07.727.103 1.481.103 2.25s-.038 1.523-.103 2.25h3.595c.169-.722.262-1.477.262-2.25s-.089-1.528-.262-2.25zm2.756-2.25a9.8 9.8 0 0 0-4.613-4.378c.661 1.2 1.186 2.695 1.528 4.378h3.089zm-14.217 0c.342-1.683.867-3.173 1.528-4.378A9.8 9.8 0 0 0 3.347 7.5h3.089zM2.513 9.75c-.169.722-.263 1.477-.263 2.25s.089 1.528.262 2.25h3.595c-.07-.727-.103-1.481-.103-2.25s.038-1.523.103-2.25zm13.523 11.128a9.8 9.8 0 0 0 4.613-4.378H17.56c-.342 1.683-.867 3.173-1.528 4.378zm-8.072 0c-.661-1.2-1.186-2.695-1.528-4.378H3.347a9.8 9.8 0 0 0 4.613 4.378zM12 24a12 12 0 1 1 0-24 12 12 0 1 1 0 24"/></svg>',
        "recite": '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 32" width="24" height="32"><path fill="#A0533B" d="M15 6v10c0 1.656 -1.344 3 -3 3s-3 -1.344 -3 -3V6c0 -1.656 1.344 -3 3 -3s3 1.344 3 3M6 6v10c0 3.313 2.688 6 6 6s6 -2.688 6 -6V6c0 -3.313 -2.688 -6 -6 -6S6 2.688 6 6M4 13.5c0 -0.831 -0.669 -1.5 -1.5 -1.5s-1.5 0.669 -1.5 1.5v2.5c0 5.569 4.138 10.169 9.5 10.9V29h-3c-0.831 0 -1.5 0.669 -1.5 1.5s0.669 1.5 1.5 1.5h9c0.831 0 1.5 -0.669 1.5 -1.5s-0.669 -1.5 -1.5 -1.5h-3v-2.1c5.362 -0.731 9.5 -5.331 9.5 -10.9v-2.5c0 -0.831 -0.669 -1.5 -1.5 -1.5s-1.5 0.669 -1.5 1.5v2.5c0 4.419 -3.581 8 -8 8S4 20.419 4 16z"/></svg>',
        "kids": '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 32" width="24" height="32"><path fill="#A0533B" d="M12 3a1.5 1.5 0 1 1 0 3 1.5 1.5 0 1 1 0 -3m0 6a4.5 4.5 0 1 0 0 -9 4.5 4.5 0 1 0 0 9m-0.013 2c-2.6 0 -5 -1.4 -6.287 -3.656L4.806 5.763c-0.406 -0.719 -1.325 -0.975 -2.044 -0.563s-0.975 1.325 -0.563 2.044l0.9 1.581c0.938 1.656 2.3 2.981 3.906 3.881L7 30.5c0 0.831 0.669 1.5 1.5 1.5s1.5 -0.669 1.5 -1.5V24h4v6.5c0 0.831 0.669 1.5 1.5 1.5s1.5 -0.669 1.5 -1.5V12.688c1.563 -0.875 2.888 -2.163 3.819 -3.763l0.975 -1.669c0.419 -0.713 0.175 -1.631 -0.537 -2.05s-1.631 -0.175 -2.05 0.537l-0.975 1.669C16.938 9.637 14.556 11 11.988 11M14 21h-4V13.806c0.65 0.131 1.313 0.194 1.988 0.194 0.681 0 1.356 -0.069 2.013 -0.2z"/></svg>',
        "tafsir": '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24"><path fill="#A0533B" d="M2.25 19.5v2.25h3v-2.25zm4.125 4.2c-0.333 0.192 -0.717 0.3 -1.125 0.3H2.25c-1.242 0 -2.25 -1.008 -2.25 -2.25V2.25C0 1.008 1.008 0 2.25 0h3c0.408 0 0.792 0.108 1.125 0.3 0.333 -0.192 0.717 -0.3 1.125 -0.3h3c0.966 0 1.786 0.605 2.109 1.458 0.262 -0.286 0.605 -0.502 1.003 -0.609l2.789 -0.773c1.158 -0.319 2.348 0.389 2.658 1.584l0.844 3.244 0.281 1.087 2.897 11.17 0.281 1.087 0.558 2.156c0.309 1.195 -0.375 2.423 -1.533 2.742L19.594 23.92c-1.158 0.319 -2.348 -0.389 -2.658 -1.584l-0.844 -3.244 -0.281 -1.087 -2.892 -11.166 -0.169 -0.642V21.75c0 1.242 -1.008 2.25 -2.25 2.25h-3c-0.408 0 -0.792 -0.108 -1.125 -0.3m1.125 -1.95h3v-2.25h-3zM5.25 2.25H2.25v2.25h3zm0 4.5H2.25v10.5h3zm2.25 -2.25h3V2.25h-3zm3 12.75V6.75h-3v10.5zm10.13 -0.577 -2.616 -10.078 -2.648 0.731 2.616 10.078zm-2.081 2.911 0.558 2.142 2.644 -0.731v-0.019l-0.548 -2.119 -2.648 0.731zm-3.745 -14.438 2.648 -0.731 -0.558 -2.142L14.25 3.005v0.019l0.548 2.119z"/></svg>',
        "riwayat": '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 21.333" width="24" height="21.333"><path fill="#A0533B" d="M6.5 1.333c-2.308 0-4.467.609-5.371.9C.429 2.458 0 3.104 0 3.796v13.017c0 1.087 1 1.842 2 1.675a26 26 0 0 1 4.167-.321c2.25 0 4.063 1.063 4.688 1.483.313.208.7.35 1.125.35.479 0 .9-.175 1.221-.412.558-.408 2.179-1.421 4.633-1.421 1.988 0 3.354.167 4.125.3.996.171 2.042-.575 2.042-1.692V3.796c0-.688-.429-1.337-1.129-1.563-.905-.291-3.064-.9-5.372-.9-1.533 0-2.992.267-4.058.529-.533.133-.979.262-1.287.362q-.083.025-.154.05-.071-.025-.154-.05c-.313-.1-.754-.229-1.287-.362-1.068-.262-2.527-.529-4.06-.529M11 4.054v13.358c-1.083-.571-2.8-1.246-4.833-1.246-1.787 0-3.225.154-4.167.296V4.054c.929-.279 2.683-.721 4.5-.721 1.317 0 2.608.233 3.579.471.358.087.671.175.921.25m2 13.3v-13.3c.25-.075.563-.162.921-.25.971-.237 2.262-.471 3.579-.471 1.817 0 3.571.442 4.5.721v12.392c-.904-.137-2.287-.279-4.167-.279-2.142 0-3.783.625-4.833 1.192z"/></svg>',
        "audio": '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 21.333" width="24" height="21.333"><path fill="#A0533B" d="M7.996 8.412 12.667 4.262v12.804l-4.671 -4.146c-0.183 -0.162 -0.421 -0.254 -0.662 -0.254H3.667c-0.183 0 -0.333 -0.15 -0.333 -0.333v-3.333c0 -0.183 0.15 -0.333 0.333 -0.333h3.667c0.246 0 0.483 -0.092 0.662 -0.254M13.425 1.333c-0.304 0 -0.596 0.113 -0.825 0.313L6.954 6.667H3.667c-1.287 0 -2.333 1.046 -2.333 2.333v3.333c0 1.287 1.046 2.333 2.333 2.333h3.288l5.646 5.021c0.229 0.2 0.521 0.313 0.825 0.313 0.688 0 1.242 -0.554 1.242 -1.242V2.575c0 -0.688 -0.554 -1.242 -1.242 -1.242m7.621 3.125c-0.429 -0.35 -1.058 -0.283 -1.408 0.146s-0.283 1.058 0.146 1.408C21.137 7.112 22 8.787 22 10.667s-0.862 3.554 -2.217 4.658c-0.429 0.35 -0.492 0.979 -0.146 1.408s0.979 0.492 1.408 0.146c1.8 -1.467 2.954 -3.704 2.954 -6.208s-1.154 -4.742 -2.954 -6.208zm-2.521 3.104c-0.429 -0.35 -1.058 -0.283 -1.408 0.146s-0.283 1.058 0.146 1.408C17.712 9.483 18 10.042 18 10.667s-0.287 1.183 -0.737 1.554c-0.429 0.35 -0.492 0.979 -0.146 1.408s0.979 0.492 1.408 0.146c0.896 -0.737 1.475 -1.854 1.475 -3.108s-0.579 -2.371 -1.475 -3.104"/></svg>',
        "memorize": '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 27.429" width="24" height="27.429"><path fill="#A0533B" d="M0 4.714A4.715 4.715 0 0 1 4.714 0H21c1.655 0 3 1.345 3 3v15.429a3 3 0 0 1-1.714 2.711v3.717h.429c.713 0 1.286.573 1.286 1.286s-.573 1.286-1.286 1.286H4.286a4.285 4.285 0 0 1-4.265-4.715H0zm4.286 16.714c-.948 0-1.714.766-1.714 1.714s.766 1.714 1.714 1.714h15.429v-3.429zm-1.714-2.212a4.3 4.3 0 0 1 1.714-.359H21a.43.43 0 0 0 .429-.429V3A.43.43 0 0 0 21 2.571H4.714a2.14 2.14 0 0 0-2.143 2.143zm4.286-9.932a3.284 3.284 0 0 1 5.604-2.325l.396.396.396-.396a3.284 3.284 0 0 1 4.645 4.645l-4.43 4.43a.86.86 0 0 1-1.211 0l-4.43-4.43a3.28 3.28 0 0 1-.959-2.32z"/></svg>',
        "tajweed": '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 19.2" width="24" height="19.2"><path fill="#A0533B" d="M12 0c0.499 0 0.9 0.401 0.9 0.9v17.4c0 0.499 -0.401 0.9 -0.9 0.9s-0.9 -0.401 -0.9 -0.9V0.9c0 -0.499 0.401 -0.9 0.9 -0.9m7.5 2.4c0.499 0 0.9 0.401 0.9 0.9v12.6c0 0.499 -0.401 0.9 -0.9 0.9s-0.9 -0.401 -0.9 -0.9V3.3c0 -0.499 0.401 -0.9 0.9 -0.9M8.1 3.6c0.499 0 0.9 0.401 0.9 0.9v10.2c0 0.499 -0.401 0.9 -0.9 0.9s-0.9 -0.401 -0.9 -0.9V4.5c0 -0.499 0.401 -0.9 0.9 -0.9m7.8 1.2c0.499 0 0.9 0.401 0.9 0.9v7.8c0 0.499 -0.401 0.9 -0.9 0.9s-0.9 -0.401 -0.9 -0.9V5.7c0 -0.499 0.401 -0.9 0.9 -0.9m-11.4 2.4c0.499 0 0.9 0.401 0.9 0.9v3c0 0.499 -0.401 0.9 -0.9 0.9s-0.9 -0.401 -0.9 -0.9v-3c0 -0.499 0.401 -0.9 0.9 -0.9m-3.6 1.2c0.499 0 0.9 0.401 0.9 0.9v0.6c0 0.499 -0.401 0.9 -0.9 0.9S0 10.399 0 9.9v-0.6c0 -0.499 0.401 -0.9 0.9 -0.9m22.2 0c0.499 0 0.9 0.401 0.9 0.9v0.6c0 0.499 -0.401 0.9 -0.9 0.9s-0.9 -0.401 -0.9 -0.9v-0.6c0 -0.499 0.401 -0.9 0.9 -0.9"/></svg>',
        "accessibility": '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24"><path fill="#A0533B" d="M9 0a2.25 2.25 0 1 1 0 4.5 2.25 2.25 0 1 1 0 -4.5m-3.352 11.587C3.661 12.337 2.25 14.255 2.25 16.5c0 2.902 2.348 5.25 5.25 5.25 2.006 0 3.75 -1.125 4.636 -2.78 0.291 -0.548 0.975 -0.755 1.523 -0.464s0.755 0.975 0.464 1.523c-1.266 2.362 -3.755 3.97 -6.623 3.97C3.356 24 0 20.644 0 16.5c0 -3.211 2.02 -5.948 4.852 -7.017 0.581 -0.22 1.228 0.075 1.448 0.656s-0.075 1.228 -0.656 1.448zm3.15 -5.569c0.609 -0.112 1.195 0.295 1.308 0.905l0.239 1.327H16.125c0.623 0 1.125 0.502 1.125 1.125s-0.502 1.125 -1.125 1.125H10.758l0.628 3.441c0.033 0.178 0.188 0.309 0.37 0.309h5.756c0.745 0 1.42 0.441 1.716 1.125l2.016 4.608 1.275 -0.427c0.591 -0.197 1.228 0.122 1.425 0.712s-0.122 1.228 -0.712 1.425l-2.25 0.75c-0.553 0.183 -1.153 -0.084 -1.388 -0.614L17.264 16.5H11.752c-1.27 0 -2.358 -0.909 -2.583 -2.156l-1.275 -7.017c-0.112 -0.609 0.295 -1.195 0.905 -1.308"/></svg>',
        "default": '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24"><path fill="#A0533B" d="M3.75 3.75v4.5h4.5v-4.5zm-2.25 0A2.25 2.25 0 0 1 3.75 1.5h4.5a2.25 2.25 0 0 1 2.25 2.25v4.5a2.25 2.25 0 0 1-2.25 2.25h-4.5A2.25 2.25 0 0 1 1.5 8.25zm2.25 12v4.5h4.5v-4.5zm-2.25 0a2.25 2.25 0 0 1 2.25-2.25h4.5a2.25 2.25 0 0 1 2.25 2.25v4.5a2.25 2.25 0 0 1-2.25 2.25h-4.5a2.25 2.25 0 0 1-2.25-2.25zm18.75-12h-4.5v4.5h4.5zm-4.5-2.25h4.5a2.25 2.25 0 0 1 2.25 2.25v4.5a2.25 2.25 0 0 1-2.25 2.25h-4.5a2.25 2.25 0 0 1-2.25-2.25v-4.5a2.25 2.25 0 0 1 2.25-2.25m0 14.25v4.5h4.5v-4.5zm-2.25 0a2.25 2.25 0 0 1 2.25-2.25h4.5a2.25 2.25 0 0 1 2.25 2.25v4.5a2.25 2.25 0 0 1-2.25 2.25h-4.5a2.25 2.25 0 0 1-2.25-2.25z"/></svg>'
    }

    # Convert to list of dictionaries
    result = []
    for cat in categories:
        # Get SVG icon from mapping or use stored icon or default
        icon = cat.icon or ""
        if not icon or icon in icon_mapping:
            icon = icon_mapping.get(cat.slug.lower(), icon_mapping.get(icon.lower(), icon_mapping["default"]))
        
        result.append({
            "id": cat.id,
            "name_en": cat.name_en,
            "name_ar": cat.name_ar,
            "slug": cat.slug,
            "description_en": cat.description_en or "",
            "description_ar": cat.description_ar or "",
            "icon": icon
        })

    return result