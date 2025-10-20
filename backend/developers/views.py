from rest_framework import viewsets
from drf_spectacular.utils import extend_schema

from .models import Developer
from .serializers import DeveloperSerializer, DeveloperListSerializer


class DeveloperViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for viewing application developers.

    Provides list and detail views for all developers.
    All endpoints are publicly accessible for read operations.
    """
    queryset = Developer.objects.all()
    ordering = ['name_en']

    def get_serializer_class(self):
        """Return appropriate serializer based on action."""
        if self.action == 'list':
            return DeveloperListSerializer
        return DeveloperSerializer

    @extend_schema(summary="List all developers")
    def list(self, request, *args, **kwargs):
        """
        List all developers.

        Returns a list of all developers sorted by name.
        """
        return super().list(request, *args, **kwargs)

    @extend_schema(summary="Get developer profile")
    def retrieve(self, request, *args, **kwargs):
        """
        Get detailed information about a specific developer.

        Includes the count of published apps and a list of recent apps.
        """
        return super().retrieve(request, *args, **kwargs)
