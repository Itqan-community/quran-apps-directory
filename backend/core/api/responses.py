"""
Standardized API response utilities.

Provides consistent response formats across all API endpoints.
"""

from typing import Any, Dict, List, Optional, Union
from rest_framework.response import Response
from rest_framework import status


class APIResponse:
    """
    Standardized API response formatter.

    Provides consistent response structure across all endpoints.
    """

    @staticmethod
    def success(
        data: Any = None,
        message: Optional[str] = None,
        status_code: int = status.HTTP_200_OK,
        meta: Optional[Dict[str, Any]] = None
    ) -> Response:
        """
        Create a successful API response.

        Args:
            data: Response data payload
            message: Optional success message
            status_code: HTTP status code
            meta: Optional metadata (pagination, counts, etc.)

        Returns:
            DRF Response with standardized format
        """
        response_data = {
            'success': True,
            'data': data,
            'message': message
        }

        if meta:
            response_data['meta'] = meta

        return Response(response_data, status=status_code)

    @staticmethod
    def paginated_success(
        data: List[Any],
        total_count: int,
        page: int,
        page_size: int,
        message: Optional[str] = None,
        status_code: int = status.HTTP_200_OK,
        additional_meta: Optional[Dict[str, Any]] = None
    ) -> Response:
        """
        Create a paginated successful API response.

        Args:
            data: Response data payload (list)
            total_count: Total number of items
            page: Current page number
            page_size: Items per page
            message: Optional success message
            status_code: HTTP status code
            additional_meta: Additional metadata

        Returns:
            DRF Response with pagination metadata
        """
        from django.core.paginator import Paginator
        from rest_framework.pagination import PageNumberPagination

        paginator = PageNumberPagination()
        paginator.page_size = page_size
        paginator.page = page

        # Calculate pagination info
        total_pages = (total_count + page_size - 1) // page_size
        has_next = page < total_pages
        has_previous = page > 1

        pagination_meta = {
            'pagination': {
                'total_count': total_count,
                'total_pages': total_pages,
                'current_page': page,
                'page_size': page_size,
                'has_next': has_next,
                'has_previous': has_previous,
                'next': paginator.get_next_link() if has_next else None,
                'previous': paginator.get_previous_link() if has_previous else None
            }
        }

        # Merge with additional metadata
        if additional_meta:
            pagination_meta.update(additional_meta)

        return APIResponse.success(
            data=data,
            message=message,
            status_code=status_code,
            meta=pagination_meta
        )

    @staticmethod
    def created(
        data: Any = None,
        message: str = "Resource created successfully",
        meta: Optional[Dict[str, Any]] = None
    ) -> Response:
        """
        Create a resource creation response.

        Args:
            data: Created resource data
            message: Success message
            meta: Optional metadata

        Returns:
            DRF Response with 201 status
        """
        return APIResponse.success(
            data=data,
            message=message,
            status_code=status.HTTP_201_CREATED,
            meta=meta
        )

    @staticmethod
    def no_content(
        message: str = "Operation completed successfully"
    ) -> Response:
        """
        Create a no content response.

        Args:
            message: Success message

        Returns:
            DRF Response with 204 status
        """
        response_data = {
            'success': True,
            'message': message
        }
        return Response(response_data, status=status.HTTP_204_NO_CONTENT)


class ErrorResponse:
    """
    Standardized API error response formatter.
    """

    @staticmethod
    def error(
        message: str,
        error_code: Optional[str] = None,
        status_code: int = status.HTTP_400_BAD_REQUEST,
        details: Optional[Dict[str, Any]] = None,
        field_errors: Optional[Dict[str, List[str]]] = None
    ) -> Response:
        """
        Create an error response.

        Args:
            message: Error message
            error_code: Machine-readable error code
            status_code: HTTP status code
            details: Additional error details
            field_errors: Validation field errors

        Returns:
            DRF Response with standardized error format
        """
        response_data = {
            'success': False,
            'error': {
                'message': message,
                'status_code': status_code
            }
        }

        if error_code:
            response_data['error']['code'] = error_code

        if details:
            response_data['error']['details'] = details

        if field_errors:
            response_data['error']['field_errors'] = field_errors

        return Response(response_data, status=status_code)

    @staticmethod
    def not_found(
        message: str = "Resource not found",
        resource_type: Optional[str] = None,
        resource_id: Optional[str] = None
    ) -> Response:
        """
        Create a not found error response.

        Args:
            message: Error message
            resource_type: Type of resource that wasn't found
            resource_id: ID/identifier of the resource

        Returns:
            DRF Response with 404 status
        """
        details = {}
        if resource_type:
            details['resource_type'] = resource_type
        if resource_id:
            details['resource_id'] = resource_id

        return ErrorResponse.error(
            message=message,
            error_code='NOT_FOUND',
            status_code=status.HTTP_404_NOT_FOUND,
            details=details if details else None
        )

    @staticmethod
    def validation_error(
        message: str = "Validation failed",
        field_errors: Optional[Dict[str, List[str]]] = None
    ) -> Response:
        """
        Create a validation error response.

        Args:
            message: Error message
            field_errors: Field-specific validation errors

        Returns:
            DRF Response with 400 status
        """
        return ErrorResponse.error(
            message=message,
            error_code='VALIDATION_ERROR',
            status_code=status.HTTP_400_BAD_REQUEST,
            field_errors=field_errors
        )

    @staticmethod
    def permission_denied(
        message: str = "Permission denied",
        required_permission: Optional[str] = None
    ) -> Response:
        """
        Create a permission denied error response.

        Args:
            message: Error message
            required_permission: Required permission that was missing

        Returns:
            DRF Response with 403 status
        """
        details = {}
        if required_permission:
            details['required_permission'] = required_permission

        return ErrorResponse.error(
            message=message,
            error_code='PERMISSION_DENIED',
            status_code=status.HTTP_403_FORBIDDEN,
            details=details if details else None
        )

    @staticmethod
    def server_error(
        message: str = "Internal server error",
        error_id: Optional[str] = None
    ) -> Response:
        """
        Create a server error response.

        Args:
            message: Error message
            error_id: Unique error identifier for debugging

        Returns:
            DRF Response with 500 status
        """
        details = {}
        if error_id:
            details['error_id'] = error_id

        return ErrorResponse.error(
            message=message,
            error_code='INTERNAL_SERVER_ERROR',
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            details=details if details else None
        )

    @staticmethod
    def method_not_allowed(
        message: str = "Method not allowed",
        allowed_methods: Optional[List[str]] = None
    ) -> Response:
        """
        Create a method not allowed error response.

        Args:
            message: Error message
            allowed_methods: List of allowed HTTP methods

        Returns:
            DRF Response with 405 status
        """
        details = {}
        if allowed_methods:
            details['allowed_methods'] = allowed_methods

        return ErrorResponse.error(
            message=message,
            error_code='METHOD_NOT_ALLOWED',
            status_code=status.HTTP_405_METHOD_NOT_ALLOWED,
            details=details if details else None
        )

    @staticmethod
    def rate_limited(
        message: str = "Rate limit exceeded",
        retry_after: Optional[int] = None
    ) -> Response:
        """
        Create a rate limited error response.

        Args:
            message: Error message
            retry_after: Seconds until client can retry

        Returns:
            DRF Response with 429 status
        """
        response = ErrorResponse.error(
            message=message,
            error_code='RATE_LIMITED',
            status_code=status.HTTP_429_TOO_MANY_REQUESTS
        )

        if retry_after:
            response['Retry-After'] = str(retry_after)

        return response

    @staticmethod
    def service_unavailable(
        message: str = "Service temporarily unavailable",
        retry_after: Optional[int] = None
    ) -> Response:
        """
        Create a service unavailable error response.

        Args:
            message: Error message
            retry_after: Seconds until client can retry

        Returns:
            DRF Response with 503 status
        """
        response = ErrorResponse.error(
            message=message,
            error_code='SERVICE_UNAVAILABLE',
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE
        )

        if retry_after:
            response['Retry-After'] = str(retry_after)

        return response