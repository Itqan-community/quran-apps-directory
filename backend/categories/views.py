from rest_framework import viewsets, status
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema

from .models import Category
from .services.category_service import CategoryService
from .serializers import CategorySerializer, CategoryListSerializer


class CategoryViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for viewing application categories.

    Provides list and detail views for all categories.
    All endpoints are publicly accessible for read operations.
    Uses service layer for business logic.
    """

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.category_service = CategoryService()

    def get_queryset(self):
        """
        Get queryset using service layer.
        """
        return Category.objects.filter(is_active=True).order_by('sort_order', 'name_en')

    def get_serializer_class(self):
        """Return appropriate serializer based on action."""
        if self.action == 'list':
            return CategoryListSerializer
        return CategorySerializer

    @extend_schema(summary="List all categories")
    def list(self, request, *args, **kwargs):
        """
        List all active categories.

        Returns a list of all active categories with app counts,
        sorted by sort_order and name.
        """
        # Use service layer to get categories with app counts
        include_app_counts = request.query_params.get('include_counts', 'true').lower() == 'true'
        categories = self.category_service.get_all_categories(
            include_app_counts=include_app_counts
        )

        serializer = self.get_serializer(categories, many=True)
        return Response(serializer.data)

    @extend_schema(summary="Get category details")
    def retrieve(self, request, *args, **kwargs):
        """
        Get detailed information about a specific category.

        Includes detailed statistics and app counts.
        """
        slug = kwargs.get('pk')

        # Use service layer to get category with detailed stats
        include_stats = request.query_params.get('include_stats', 'false').lower() == 'true'

        if include_stats:
            category_data = self.category_service.get_category_with_stats(slug)
            if not category_data:
                return Response(
                    {'error': 'Category not found'},
                    status=status.HTTP_404_NOT_FOUND
                )

            # Use the detailed serializer that includes stats
            serializer = CategorySerializer(category_data['category'])
            # Add stats to the response
            response_data = serializer.data
            response_data['stats'] = category_data['stats']
            return Response(response_data)
        else:
            # Simple category lookup
            category = self.category_service.get_category_by_slug(slug)
            if not category:
                return Response(
                    {'error': 'Category not found'},
                    status=status.HTTP_404_NOT_FOUND
                )

            serializer = self.get_serializer(category)
            return Response(serializer.data)
