"""
Custom API exceptions.

Provides specific exception types for different API error scenarios.
"""

from typing import Any, Dict, Optional
from rest_framework.exceptions import APIException as DRFAPIException
from rest_framework import status


class APIException(DRFAPIException):
    """
    Base API exception class.

    Provides standardized error handling for API-specific exceptions.
    """

    def __init__(
        self,
        message: str,
        error_code: Optional[str] = None,
        status_code: int = status.HTTP_400_BAD_REQUEST,
        details: Optional[Dict[str, Any]] = None
    ):
        """
        Initialize API exception.

        Args:
            message: Human-readable error message
            error_code: Machine-readable error code
            status_code: HTTP status code
            details: Additional error details
        """
        self.message = message
        self.error_code = error_code
        self.status_code = status_code
        self.details = details or {}
        super().__init__(message)

    def __str__(self) -> str:
        """String representation of the exception."""
        return f"{self.error_code or 'ERROR'}: {self.message}"


class ValidationException(APIException):
    """
    Exception raised for validation errors.

    Used when request data fails validation rules.
    """

    def __init__(
        self,
        message: str = "Validation failed",
        field_errors: Optional[Dict[str, list]] = None,
        **kwargs
    ):
        """
        Initialize validation exception.

        Args:
            message: Error message
            field_errors: Field-specific validation errors
            **kwargs: Additional arguments for APIException
        """
        details = kwargs.get('details', {})
        if field_errors:
            details['field_errors'] = field_errors

        super().__init__(
            message=message,
            error_code='VALIDATION_ERROR',
            status_code=status.HTTP_400_BAD_REQUEST,
            details=details,
            **kwargs
        )


class NotFoundException(APIException):
    """
    Exception raised when a resource is not found.

    Used when requested resource does not exist.
    """

    def __init__(
        self,
        message: str = "Resource not found",
        resource_type: Optional[str] = None,
        resource_id: Optional[str] = None,
        **kwargs
    ):
        """
        Initialize not found exception.

        Args:
            message: Error message
            resource_type: Type of resource that wasn't found
            resource_id: ID/identifier of the resource
            **kwargs: Additional arguments for APIException
        """
        details = kwargs.get('details', {})
        if resource_type:
            details['resource_type'] = resource_type
        if resource_id:
            details['resource_id'] = resource_id

        super().__init__(
            message=message,
            error_code='NOT_FOUND',
            status_code=status.HTTP_404_NOT_FOUND,
            details=details,
            **kwargs
        )


class PermissionDeniedException(APIException):
    """
    Exception raised when permission is denied.

    Used when user doesn't have required permissions.
    """

    def __init__(
        self,
        message: str = "Permission denied",
        required_permission: Optional[str] = None,
        **kwargs
    ):
        """
        Initialize permission denied exception.

        Args:
            message: Error message
            required_permission: Required permission that was missing
            **kwargs: Additional arguments for APIException
        """
        details = kwargs.get('details', {})
        if required_permission:
            details['required_permission'] = required_permission

        super().__init__(
            message=message,
            error_code='PERMISSION_DENIED',
            status_code=status.HTTP_403_FORBIDDEN,
            details=details,
            **kwargs
        )


class RateLimitException(APIException):
    """
    Exception raised when rate limit is exceeded.

    Used when client exceeds rate limiting thresholds.
    """

    def __init__(
        self,
        message: str = "Rate limit exceeded",
        retry_after: Optional[int] = None,
        limit_type: Optional[str] = None,
        **kwargs
    ):
        """
        Initialize rate limit exception.

        Args:
            message: Error message
            retry_after: Seconds until client can retry
            limit_type: Type of rate limit exceeded
            **kwargs: Additional arguments for APIException
        """
        details = kwargs.get('details', {})
        if retry_after:
            details['retry_after'] = retry_after
        if limit_type:
            details['limit_type'] = limit_type

        super().__init__(
            message=message,
            error_code='RATE_LIMITED',
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            details=details,
            **kwargs
        )


class ServiceUnavailableException(APIException):
    """
    Exception raised when service is temporarily unavailable.

    Used when dependent services are down or maintenance is in progress.
    """

    def __init__(
        self,
        message: str = "Service temporarily unavailable",
        retry_after: Optional[int] = None,
        service_name: Optional[str] = None,
        **kwargs
    ):
        """
        Initialize service unavailable exception.

        Args:
            message: Error message
            retry_after: Seconds until client can retry
            service_name: Name of the unavailable service
            **kwargs: Additional arguments for APIException
        """
        details = kwargs.get('details', {})
        if retry_after:
            details['retry_after'] = retry_after
        if service_name:
            details['service_name'] = service_name

        super().__init__(
            message=message,
            error_code='SERVICE_UNAVAILABLE',
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            details=details,
            **kwargs
        )


class UnsupportedVersionException(APIException):
    """
    Exception raised when API version is not supported.

    Used when client requests unsupported API version.
    """

    def __init__(
        self,
        message: str = "API version not supported",
        requested_version: Optional[str] = None,
        supported_versions: Optional[list] = None,
        **kwargs
    ):
        """
        Initialize unsupported version exception.

        Args:
            message: Error message
            requested_version: Version requested by client
            supported_versions: List of supported versions
            **kwargs: Additional arguments for APIException
        """
        details = kwargs.get('details', {})
        if requested_version:
            details['requested_version'] = requested_version
        if supported_versions:
            details['supported_versions'] = supported_versions

        super().__init__(
            message=message,
            error_code='UNSUPPORTED_VERSION',
            status_code=status.HTTP_404_NOT_FOUND,
            details=details,
            **kwargs
        )


class ConflictException(APIException):
    """
    Exception raised when there's a conflict with current resource state.

    Used for concurrent modification conflicts and similar scenarios.
    """

    def __init__(
        self,
        message: str = "Resource conflict",
        conflict_type: Optional[str] = None,
        **kwargs
    ):
        """
        Initialize conflict exception.

        Args:
            message: Error message
            conflict_type: Type of conflict (e.g., 'concurrent_modification')
            **kwargs: Additional arguments for APIException
        """
        details = kwargs.get('details', {})
        if conflict_type:
            details['conflict_type'] = conflict_type

        super().__init__(
            message=message,
            error_code='CONFLICT',
            status_code=status.HTTP_409_CONFLICT,
            details=details,
            **kwargs
        )


class UnprocessableEntityException(APIException):
    """
    Exception raised when request is well-formed but semantically incorrect.

    Used for business logic validation that can't be handled by standard validation.
    """

    def __init__(
        self,
        message: str = "Unprocessable entity",
        business_rule: Optional[str] = None,
        **kwargs
    ):
        """
        Initialize unprocessable entity exception.

        Args:
            message: Error message
            business_rule: Business rule that was violated
            **kwargs: Additional arguments for APIException
        """
        details = kwargs.get('details', {})
        if business_rule:
            details['business_rule'] = business_rule

        super().__init__(
            message=message,
            error_code='UNPROCESSABLE_ENTITY',
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            details=details,
            **kwargs
        )


class CacheException(APIException):
    """
    Exception raised when caching operations fail.

    Used when cache is unavailable or operations fail.
    """

    def __init__(
        self,
        message: str = "Cache operation failed",
        cache_operation: Optional[str] = None,
        cache_key: Optional[str] = None,
        **kwargs
    ):
        """
        Initialize cache exception.

        Args:
            message: Error message
            cache_operation: Type of cache operation (get, set, delete)
            cache_key: Cache key that caused the error
            **kwargs: Additional arguments for APIException
        """
        details = kwargs.get('details', {})
        if cache_operation:
            details['cache_operation'] = cache_operation
        if cache_key:
            details['cache_key'] = cache_key

        super().__init__(
            message=message,
            error_code='CACHE_ERROR',
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            details=details,
            **kwargs
        )


class DatabaseException(APIException):
    """
    Exception raised when database operations fail.

    Used for database connection issues, constraint violations, etc.
    """

    def __init__(
        self,
        message: str = "Database operation failed",
        database_operation: Optional[str] = None,
        **kwargs
    ):
        """
        Initialize database exception.

        Args:
            message: Error message
            database_operation: Type of database operation
            **kwargs: Additional arguments for APIException
        """
        details = kwargs.get('details', {})
        if database_operation:
            details['database_operation'] = database_operation

        super().__init__(
            message=message,
            error_code='DATABASE_ERROR',
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            details=details,
            **kwargs
        )