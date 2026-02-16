"""
API versioning utilities.

Provides consistent API versioning support across endpoints.
"""

from typing import Optional, Dict, Any, List
from django.http import Http404
from rest_framework import views
from rest_framework.request import Request
from rest_framework.response import Response

from .responses import ErrorResponse


class APIVersionMixin:
    """
    Mixin for adding API versioning support to ViewSets.

    Supports version detection from headers, query parameters, and URL patterns.
    """

    # Supported API versions
    SUPPORTED_VERSIONS = ['v1', 'v2']
    DEFAULT_VERSION = 'v1'

    # Version in header name
    VERSION_HEADER = 'X-API-Version'

    def get_api_version(self, request: Request) -> str:
        """
        Extract API version from request.

        Priority order:
        1. Header (X-API-Version)
        2. Query parameter (version)
        3. URL pattern (if configured)
        4. Default version

        Args:
            request: DRF request object

        Returns:
            API version string

        Raises:
            Http404: If version is not supported
        """
        # Check header first
        version = request.headers.get(self.VERSION_HEADER)

        # Then check query parameter
        if not version:
            version = request.query_params.get('version')

        # Then check URL kwargs (if configured in URL patterns)
        if not version:
            version = request.kwargs.get('version')

        # Fall back to default
        if not version:
            version = self.DEFAULT_VERSION

        # Validate version
        if version not in self.SUPPORTED_VERSIONS:
            raise Http404(f"API version {version} is not supported")

        return version

    def get_serializer_context(self) -> Dict[str, Any]:
        """
        Add API version to serializer context.

        Returns:
            Serializer context with version information
        """
        context = super().get_serializer_context() if hasattr(super(), 'get_serializer_context') else {}
        context['api_version'] = getattr(self, '_current_version', self.DEFAULT_VERSION)
        return context

    def initial(self, request: Request, *args, **kwargs) -> None:
        """
        Initialize view with version detection.

        Args:
            request: DRF request object
            *args: Additional positional arguments
            **kwargs: Additional keyword arguments
        """
        super().initial(request, *args, **kwargs)

        # Detect and store version
        self._current_version = self.get_api_version(request)

    def handle_version_not_supported(self, request: Request, version: str) -> Response:
        """
        Handle requests for unsupported API versions.

        Args:
            request: DRF request object
            version: Unsupported version string

        Returns:
            Error response with version information
        """
        return ErrorResponse.error(
            message=f"API version {version} is not supported",
            error_code='UNSUPPORTED_VERSION',
            status_code=404,
            details={
                'supported_versions': self.SUPPORTED_VERSIONS,
                'default_version': self.DEFAULT_VERSION,
                'requested_version': version
            }
        )

    def get_versioned_response_headers(self) -> Dict[str, str]:
        """
        Get response headers indicating API version.

        Returns:
            Dictionary of version-related headers
        """
        return {
            self.VERSION_HEADER: getattr(self, '_current_version', self.DEFAULT_VERSION),
            'X-API-Version-Supported': ','.join(self.SUPPORTED_VERSIONS),
            'X-API-Version-Default': self.DEFAULT_VERSION
        }


class APIVersionInfoView(views.APIView):
    """
    API endpoint for version information.

    Returns supported versions, current version, and deprecation notices.
    """

    def get(self, request: Request) -> Response:
        """
        Get API version information.

        Args:
            request: DRF request object

        Returns:
            Version information response
        """
        # Determine current version
        version_mixin = APIVersionMixin()
        current_version = version_mixin.get_api_version(request)

        version_info = {
            'current_version': current_version,
            'supported_versions': version_mixin.SUPPORTED_VERSIONS,
            'default_version': version_mixin.DEFAULT_VERSION,
            'version_header': version_mixin.VERSION_HEADER,
            'deprecation_notices': self._get_deprecation_notices(),
            'version_features': self._get_version_features()
        }

        return Response({
            'success': True,
            'data': version_info
        })

    def _get_deprecation_notices(self) -> Dict[str, Dict[str, Any]]:
        """
        Get deprecation notices for API versions.

        Returns:
            Dictionary mapping versions to deprecation info
        """
        # Example: v1 will be deprecated in the future
        return {
            'v1': {
                'deprecated': False,
                'deprecation_date': None,
                'removal_date': None,
                'migration_guide': None,
                'message': None
            }
        }

    def _get_version_features(self) -> Dict[str, List[str]]:
        """
        Get feature lists for each API version.

        Returns:
            Dictionary mapping versions to feature lists
        """
        return {
            'v1': [
                'App listing and filtering',
                'Category browsing',
                'Developer profiles',
                'Search functionality',
                'Basic analytics',
                'Featured apps',
                'Platform-specific filtering'
            ],
            'v2': [
                'All v1 features',
                'Advanced analytics',
                'Rate limiting',
                'Enhanced caching',
                'Webhook support',
                'Bulk operations',
                'Advanced search filters'
            ]
        }


def get_api_version_from_request(request: Request) -> str:
    """
    Utility function to extract API version from request.

    Args:
        request: DRF request object

    Returns:
        API version string
    """
    version_mixin = APIVersionMixin()
    return version_mixin.get_api_version(request)


def add_version_headers(response: Response, version: str) -> None:
    """
    Add version headers to API response.

    Args:
        response: DRF response object
        version: API version string
    """
    version_mixin = APIVersionMixin()
    headers = version_mixin.get_versioned_response_headers()

    for header, value in headers.items():
        response[header] = value


def validate_version_compatibility(
    requested_version: str,
    required_version: str,
    compatibility_matrix: Optional[Dict[str, List[str]]] = None
) -> bool:
    """
    Validate if requested version is compatible with required version.

    Args:
        requested_version: Version requested by client
        required_version: Minimum version required
        compatibility_matrix: Custom compatibility matrix

    Returns:
        True if versions are compatible
    """
    if compatibility_matrix:
        return requested_version in compatibility_matrix.get(required_version, [])

    # Default compatibility logic (v1 compatible with v1, v2 compatible with v1 and v2)
    version_order = ['v1', 'v2']

    try:
        requested_idx = version_order.index(requested_version)
        required_idx = version_order.index(required_version)
        return requested_idx >= required_idx
    except ValueError:
        return False