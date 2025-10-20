from rest_framework import viewsets
from drf_spectacular.utils import extend_schema

from .models import Category
from .serializers import CategorySerializer, CategoryListSerializer


class CategoryViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for viewing application categories.

    Provides list and detail views for all categories.
    All endpoints are publicly accessible for read operations.
    """
    queryset = Category.objects.filter(is_active=True)
    ordering = ['sort_order', 'name_en']

    def get_serializer_class(self):
        """Return appropriate serializer based on action."""
        if self.action == 'list':
            return CategoryListSerializer
        return CategorySerializer

    @extend_schema(summary="List all categories")
    def list(self, request, *args, **kwargs):
        """
        List all active categories.

        Returns a list of all active categories sorted by sort_order and name.
        """
        return super().list(request, *args, **kwargs)

    @extend_schema(summary="Get category details")
    def retrieve(self, request, *args, **kwargs):
        """
        Get detailed information about a specific category.

        Includes the count of published apps in this category.
        """
        return super().retrieve(request, *args, **kwargs)
