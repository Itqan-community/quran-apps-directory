from django.db.models import Q, F
from django_filters.rest_framework import DjangoFilterBackend
from django.core.cache import cache
from django.conf import settings
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema, OpenApiParameter
from drf_spectacular.types import OpenApiTypes

from .models import App
from .serializers import AppListSerializer, AppDetailSerializer, AppCreateUpdateSerializer


class AppViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for viewing and searching Quranic applications.

    Provides list and detail views with filtering by category and search functionality.
    All endpoints are publicly accessible for read operations.
    """
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
        # Create cache key
        category_slug = request.query_params.get('category', 'all')
        cache_key = f'featured_apps_{category_slug}'

        # Try to get from cache
        cached_data = cache.get(cache_key)
        if cached_data:
            return Response(cached_data)

        queryset = self.get_queryset().filter(featured=True)

        if category_slug != 'all':
            queryset = queryset.filter(categories__slug=category_slug)

        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            response_data = self.get_paginated_response(serializer.data).data
            # Cache for 10 minutes
            cache.set(cache_key, response_data, timeout=settings.CACHE_TIMEOUTS['APP_LIST'])
            return Response(response_data)

        serializer = self.get_serializer(queryset, many=True)
        cache.set(cache_key, serializer.data, timeout=settings.CACHE_TIMEOUTS['APP_LIST'])
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
            return Response(
                {'error': 'Platform parameter is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        queryset = self.get_queryset().filter(platform=platform)
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    def get_object(self):
        """
        Get object by UUID or slug.
        """
        lookup = self.kwargs.get(self.lookup_field)

        # Try to get by UUID first
        try:
            return super().get_object()
        except (ValueError, App.DoesNotExist):
            # If UUID lookup fails, try slug lookup
            try:
                obj = App.objects.get(
                    slug=lookup,
                    status='published'
                )
                self.check_object_permissions(self.request, obj)
                return obj
            except App.DoesNotExist:
                raise
