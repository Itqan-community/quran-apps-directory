"""
API middleware components.

Provides middleware for API versioning, error handling, and request/response processing.
"""

import time
import uuid
from typing import Callable, Dict, Any, Optional
from django.http import JsonResponse, HttpRequest, HttpResponse
from django.utils.deprecation import MiddlewareMixin
from django.conf import settings
from django.core.exceptions import PermissionDenied
from rest_framework.exceptions import APIException as DRFAPIException
from rest_framework import status

from .responses import ErrorResponse
from .exceptions import APIException
from .versioning import get_api_version_from_request, add_version_headers


class APIVersionMiddleware(MiddlewareMixin):
    """
    Middleware to add API version headers to all responses.

    Ensures consistent API version information across all endpoints.
    """

    def process_response(self, request: HttpRequest, response: HttpResponse) -> HttpResponse:
        """
        Add API version headers to response.

        Args:
            request: HTTP request object
            response: HTTP response object

        Returns:
            Response with version headers added
        """
        # Only process API responses
        if getattr(request, 'is_api_request', False):
            try:
                version = get_api_version_from_request(request)
                add_version_headers(response, version)
            except Exception:
                # If version detection fails, add default headers
                add_version_headers(response, 'v1')

        return response

    def process_request(self, request: HttpRequest) -> Optional[HttpResponse]:
        """
        Mark API requests for version header processing.

        Args:
            request: HTTP request object

        Returns:
            None or HTTP response if request should be short-circuited
        """
        # Mark as API request if path starts with /api/
        if request.path.startswith('/api/'):
            request.is_api_request = True

        return None


class APIErrorHandlerMiddleware(MiddlewareMixin):
    """
    Middleware to handle API errors consistently.

    Catches exceptions and returns standardized error responses.
    """

    def process_exception(self, request: HttpRequest, exception: Exception) -> Optional[JsonResponse]:
        """
        Process unhandled exceptions for API requests.

        Args:
            request: HTTP request object
            exception: Exception that was raised

        Returns:
            JSON error response or None if not an API request
        """
        # Only process API requests
        if not getattr(request, 'is_api_request', False):
            return None

        # Handle DRF API exceptions
        if isinstance(exception, DRFAPIException):
            return self._handle_drf_api_exception(request, exception)

        # Handle custom API exceptions
        if isinstance(exception, APIException):
            return self._handle_custom_api_exception(request, exception)

        # Handle Django permission denied
        if isinstance(exception, PermissionDenied):
            return self._handle_permission_denied(request, exception)

        # Handle other exceptions
        return self._handle_generic_exception(request, exception)

    def _handle_drf_api_exception(self, request: HttpRequest, exception: DRFAPIException) -> JsonResponse:
        """
        Handle DRF API exceptions.

        Args:
            request: HTTP request object
            exception: DRF API exception

        Returns:
            JSON error response
        """
        status_code = getattr(exception, 'status_code', status.HTTP_400_BAD_REQUEST)
        error_data = exception.get_full_details() if hasattr(exception, 'get_full_details') else str(exception)

        return ErrorResponse.error(
            message=str(exception),
            error_code='DRF_ERROR',
            status_code=status_code,
            details={'drf_error': error_data} if error_data else None
        )

    def _handle_custom_api_exception(self, request: HttpRequest, exception: APIException) -> JsonResponse:
        """
        Handle custom API exceptions.

        Args:
            request: HTTP request object
            exception: Custom API exception

        Returns:
            JSON error response
        """
        return ErrorResponse.error(
            message=exception.message,
            error_code=exception.error_code,
            status_code=exception.status_code,
            details=exception.details if exception.details else None
        )

    def _handle_permission_denied(self, request: HttpRequest, exception: PermissionDenied) -> JsonResponse:
        """
        Handle permission denied exceptions.

        Args:
            request: HTTP request object
            exception: Permission denied exception

        Returns:
            JSON error response
        """
        return ErrorResponse.permission_denied(
            message=str(exception),
            required_permission=getattr(exception, 'required_permission', None)
        )

    def _handle_generic_exception(self, request: HttpRequest, exception: Exception) -> JsonResponse:
        """
        Handle generic exceptions.

        Args:
            request: HTTP request object
            exception: Generic exception

        Returns:
            JSON error response
        """
        # Generate unique error ID for debugging
        error_id = str(uuid.uuid4())[:8]

        # Log the exception
        import logging
        logger = logging.getLogger('api')
        logger.error(
            f"Unhandled exception in API request: {exception}",
            exc_info=True,
            extra={
                'error_id': error_id,
                'request_path': request.path,
                'request_method': request.method,
                'user_id': getattr(request.user, 'id', None) if hasattr(request, 'user') else None
            }
        )

        # Return generic error response
        if settings.DEBUG:
            # In debug mode, return more detailed error information
            return ErrorResponse.server_error(
                message=str(exception),
                error_id=error_id
            )
        else:
            # In production, return generic error message
            return ErrorResponse.server_error(
                message="An internal server error occurred",
                error_id=error_id
            )


class APIRequestLoggingMiddleware(MiddlewareMixin):
    """
    Middleware to log API requests for monitoring and debugging.

    Tracks request timing, response codes, and other metrics.
    """

    def process_request(self, request: HttpRequest) -> None:
        """
        Start request timing and store request info.

        Args:
            request: HTTP request object
        """
        if getattr(request, 'is_api_request', False):
            request.api_start_time = time.time()
            request.api_request_id = str(uuid.uuid4())[:8]

    def process_response(self, request: HttpRequest, response: HttpResponse) -> HttpResponse:
        """
        Log API request completion.

        Args:
            request: HTTP request object
            response: HTTP response object

        Returns:
            Original response
        """
        if getattr(request, 'is_api_request', False) and hasattr(request, 'api_start_time'):
            # Calculate request duration
            duration = time.time() - request.api_start_time

            # Log request
            import logging
            logger = logging.getLogger('api.requests')

            log_data = {
                'request_id': getattr(request, 'api_request_id', 'unknown'),
                'method': request.method,
                'path': request.path,
                'status_code': response.status_code,
                'duration_ms': round(duration * 1000, 2),
                'user_id': getattr(request.user, 'id', None) if hasattr(request, 'user') and request.user.is_authenticated else None,
                'user_agent': request.META.get('HTTP_USER_AGENT', ''),
                'ip_address': self._get_client_ip(request)
            }

            # Add API version if available
            try:
                version = get_api_version_from_request(request)
                log_data['api_version'] = version
            except Exception:
                pass

            # Log at appropriate level based on status code
            if response.status_code >= 500:
                logger.error(f"API request failed: {log_data}")
            elif response.status_code >= 400:
                logger.warning(f"API request error: {log_data}")
            else:
                logger.info(f"API request: {log_data}")

            # Add request ID to response headers
            response['X-Request-ID'] = getattr(request, 'api_request_id', 'unknown')

        return response

    def _get_client_ip(self, request: HttpRequest) -> str:
        """
        Get client IP address from request.

        Args:
            request: HTTP request object

        Returns:
            Client IP address
        """
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR', '')
        return ip


class APICacheMiddleware(MiddlewareMixin):
    """
    Middleware to add cache control headers to API responses.

    Helps clients understand caching behavior and optimize requests.
    """

    def process_response(self, request: HttpRequest, response: HttpResponse) -> HttpResponse:
        """
        Add cache control headers to API responses.

        Args:
            request: HTTP request object
            response: HTTP response object

        Returns:
            Response with cache headers
        """
        if getattr(request, 'is_api_request', False):
            # Set cache control headers based on response status and method
            self._set_cache_control_headers(request, response)

        return response

    def _set_cache_control_headers(self, request: HttpRequest, response: HttpResponse) -> None:
        """
        Set appropriate cache control headers.

        Args:
            request: HTTP request object
            response: HTTP response object
        """
        status_code = response.status_code
        method = request.method

        # Don't cache error responses
        if status_code >= 400:
            response['Cache-Control'] = 'no-store, no-cache, must-revalidate, max-age=0'
            response['Pragma'] = 'no-cache'
            response['Expires'] = '0'
            return

        # Set cache headers based on request method and status
        if method == 'GET':
            if status_code == 200:
                # Cache successful GET requests for a short time
                response['Cache-Control'] = 'public, max-age=300'  # 5 minutes
            else:
                # Don't cache other GET responses
                response['Cache-Control'] = 'no-store, no-cache, must-revalidate'
        else:
            # Don't cache non-GET requests
            response['Cache-Control'] = 'no-store, no-cache, must-revalidate'

        # Add ETag for GET requests if not already present
        if method == 'GET' and status_code == 200 and 'ETag' not in response:
            self._generate_etag(response)

    def _generate_etag(self, response: HttpResponse) -> None:
        """
        Generate ETag for response content.

        Args:
            response: HTTP response object
        """
        if hasattr(response, 'content'):
            try:
                # Only generate ETag if content is already rendered
                if hasattr(response, '_is_rendered') and response._is_rendered:
                    import hashlib
                    content_hash = hashlib.md5(response.content).hexdigest()
                    response['ETag'] = f'"{content_hash}"'
            except Exception:
                # If we can't generate ETag, just skip it
                pass