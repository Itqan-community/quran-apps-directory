"""
API Views for Quranic Applications

Provides RESTful endpoints for browsing, searching, and filtering applications.
"""

from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema, OpenApiParameter
from drf_spectacular.types import OpenApiTypes

from apps.models import App
from .serializers import AppListSerializer, AppDetailSerializer, AppCreateUpdateSerializer


class AppViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for viewing and searching Quranic applications.

    Provides list and detail views with filtering by category and search functionality.
    All endpoints are publicly accessible for read operations.
    Uses service layer for business logic.
    """
    lookup_field = 'pk'  # Allow both UUID and slug lookup in get_object method
    queryset = App.objects.select_related('developer').prefetch_related('categories')
    filter_backends = [DjangoFilterBackend]
    filterset_fields = {
        'categories__slug': ['exact'],
        'platform': ['exact'],
        'featured': ['exact'],
        'developer__id': ['exact'],
    }
    search_fields = ['name_en', 'name_ar', 'short_description_en', 'short_description_ar']
    ordering_fields = ['name_en', 'name_ar', 'avg_rating', 'review_count', 'view_count', 'sort_order', 'created_at']
    ordering = ['sort_order', 'name_en']

    def get_serializer_class(self):
        """Return appropriate serializer based on action."""
        if self.action == 'list':
            return AppListSerializer
        return AppDetailSerializer

    def get_queryset(self):
        """
        Filter queryset to only show published apps for public access.
        """
        queryset = super().get_queryset()
        return queryset.filter(status='published')

    @extend_schema(
        parameters=[
            OpenApiParameter(
                name='search',
                type=OpenApiTypes.STR,
                description='Search apps by name or description (English and Arabic)'
            ),
            OpenApiParameter(
                name='categories__slug',
                type=OpenApiTypes.STR,
                description='Filter by category slug'
            ),
            OpenApiParameter(
                name='platform',
                type=OpenApiTypes.STR,
                description='Filter by platform (android, ios, web, cross_platform)'
            ),
            OpenApiParameter(
                name='featured',
                type=OpenApiTypes.BOOL,
                description='Filter featured apps only'
            ),
            OpenApiParameter(
                name='ordering',
                type=OpenApiTypes.STR,
                description='Order results (e.g., -avg_rating, name_en, view_count)'
            ),
        ]
    )
    def list(self, request, *args, **kwargs):
        """
        List all published Quranic applications.

        Supports filtering by category, platform, and featured status.
        Supports search in English and Arabic.
        Supports ordering by various fields.
        """
        return super().list(request, *args, **kwargs)

    def _get_next_link(self, request, current_page, total_pages):
        """Get next page link."""
        if current_page >= total_pages:
            return None
        next_page = current_page + 1
        request_data = request.query_params.copy()
        request_data['page'] = str(next_page)
        return request.build_absolute_uri(f"?{request_data.urlencode()}")

    def _get_previous_link(self, request, current_page):
        """Get previous page link."""
        if current_page <= 1:
            return None
        previous_page = current_page - 1
        request_data = request.query_params.copy()
        request_data['page'] = str(previous_page)
        return request.build_absolute_uri(f"?{request_data.urlencode()}")

    @extend_schema(summary="Get app details by ID or slug")
    def retrieve(self, request, *args, **kwargs):
        """
        Get detailed information about a specific application.

        Can be accessed by UUID or slug.
        Automatically increments view count.
        """
        # Increment view count
        instance = self.get_object()
        instance.increment_view_count()

        # Re-fetch with updated view count
        instance.refresh_from_db()
        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    @extend_schema(
        parameters=[
            OpenApiParameter(
                name='category',
                type=OpenApiTypes.STR,
                description='Filter by category slug'
            ),
        ]
    )
    def featured(self, request):
        """
        Get featured applications.

        Returns a list of featured apps, optionally filtered by category.
        """
        category_slug = request.query_params.get('category', 'all')

        # Use service layer to get featured apps (handles caching)
        featured_apps = self.app_service.get_featured_apps(
            category_slug=category_slug if category_slug != 'all' else None
        )

        # Paginate results
        page = self.paginate_queryset(featured_apps)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(featured_apps, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    @extend_schema(
        parameters=[
            OpenApiParameter(
                name='platform',
                type=OpenApiTypes.STR,
                description='Filter by platform'
            ),
        ]
    )
    def by_platform(self, request):
        """
        Get applications by platform.

        Filter apps by specific platform (android, ios, web, cross_platform).
        """
        platform = request.query_params.get('platform')
        if not platform:
            return ErrorResponse.validation_error(
                message="Platform parameter is required",
                field_errors={'platform': ['This field is required.']}
            )

        # Get page parameters
        page = int(request.query_params.get('page', 1))
        page_size = int(request.query_params.get('page_size', 20))

        # Use service layer to get apps by platform (handles caching and pagination)
        result = self.app_service.get_apps_by_platform(
            platform=platform,
            page=page,
            page_size=page_size
        )

        # Return paginated response
        if page > 1 and not result['results']:
            return ErrorResponse.not_found(
                message="Page not found",
                resource_type="Page",
                resource_id=str(page)
            )

        # Create manual paginated response using DRF format
        from rest_framework.pagination import PageNumberPagination
        paginator = PageNumberPagination()
        paginator.page_size = page_size
        paginator.page = page

        response_data = {
            'count': result['count'],
            'next': paginator.get_next_link() if result['has_next'] else None,
            'previous': paginator.get_previous_link() if result['has_previous'] else None,
            'results': self.get_serializer(result['results'], many=True).data
        }
        return Response(response_data)

    def get_object(self):
        """
        Get object by integer ID or slug.
        """
        lookup = self.kwargs.get('pk')  # Always use 'pk' from URL kwargs

        # Try to get by integer ID first
        try:
            return App.objects.get(id=int(lookup), status='published')
        except (ValueError, App.DoesNotExist):
            # If integer lookup fails, try case-insensitive slug lookup
            try:
                obj = App.objects.get(
                    slug__iexact=lookup,
                    status='published'
                )
                self.check_object_permissions(self.request, obj)
                return obj
            except App.DoesNotExist:
                raise
