from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action
from drf_spectacular.utils import extend_schema, OpenApiParameter
from drf_spectacular.types import OpenApiTypes

from .models import Developer
from .services.developer_service import DeveloperService
from .serializers import DeveloperSerializer, DeveloperListSerializer


class DeveloperViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for viewing application developers.

    Provides list and detail views for all developers.
    All endpoints are publicly accessible for read operations.
    Uses service layer for business logic.
    """

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.developer_service = DeveloperService()

    def get_queryset(self):
        """
        Get queryset using service layer.
        """
        return Developer.objects.all().order_by('name_en')

    def get_serializer_class(self):
        """Return appropriate serializer based on action."""
        if self.action == 'list':
            return DeveloperListSerializer
        return DeveloperSerializer

    @extend_schema(summary="List all developers")
    def list(self, request, *args, **kwargs):
        """
        List all developers.

        Returns a list of developers with optional filtering.
        """
        # Get query parameters
        verified_only = request.query_params.get('verified_only', 'false').lower() == 'true'
        include_app_counts = request.query_params.get('include_counts', 'true').lower() == 'true'
        popular = request.query_params.get('popular', 'false').lower() == 'true'

        if popular:
            # Get popular developers
            limit = int(request.query_params.get('limit', 20))
            min_apps = int(request.query_params.get('min_apps', 1))
            developers_data = self.developer_service.get_popular_developers(
                limit=limit,
                min_apps=min_apps
            )
            return Response(developers_data)
        else:
            # Get all developers with optional filtering
            developers = self.developer_service.get_all_developers(
                include_unverified=not verified_only,
                include_app_counts=include_app_counts
            )

            serializer = self.get_serializer(developers, many=True)
            return Response(serializer.data)

    @extend_schema(summary="Get developer profile")
    def retrieve(self, request, *args, **kwargs):
        """
        Get detailed information about a specific developer.

        Includes detailed statistics and app information.
        """
        slug = kwargs.get('pk')

        # Use service layer to get developer with detailed stats
        include_stats = request.query_params.get('include_stats', 'false').lower() == 'true'

        if include_stats:
            developer_data = self.developer_service.get_developer_with_stats(slug)
            if not developer_data:
                return Response(
                    {'error': 'Developer not found'},
                    status=status.HTTP_404_NOT_FOUND
                )

            # Use the detailed serializer that includes stats
            serializer = DeveloperSerializer(developer_data['developer'])
            # Add stats to the response
            response_data = serializer.data
            response_data['stats'] = developer_data['stats']
            return Response(response_data)
        else:
            # Simple developer lookup
            developer = self.developer_service.get_developer_by_slug(slug)
            if not developer:
                return Response(
                    {'error': 'Developer not found'},
                    status=status.HTTP_404_NOT_FOUND
                )

            serializer = self.get_serializer(developer)
            return Response(serializer.data)

    @action(detail=False, methods=['get'])
    @extend_schema(
        parameters=[
            OpenApiParameter(
                name='query',
                type=OpenApiTypes.STR,
                description='Search query for developers'
            ),
        ]
    )
    def search(self, request):
        """
        Search developers by name or description.
        """
        query = request.query_params.get('query', '').strip()
        if not query:
            return Response(
                {'error': 'Search query is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        developers = self.developer_service.search_developers(query)
        serializer = self.get_serializer(developers, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    @extend_schema(
        parameters=[
            OpenApiParameter(
                name='limit',
                type=OpenApiTypes.INT,
                description='Maximum number of developers to return'
            ),
        ]
    )
    def verified(self, request):
        """
        Get verified developers with apps.
        """
        limit = int(request.query_params.get('limit', 50))
        developers_data = self.developer_service.get_verified_developers(limit=limit)
        return Response(developers_data)
