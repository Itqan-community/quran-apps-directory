"""
Base service class for all business logic services.

Provides common functionality and patterns that all services should follow.
"""

from typing import Optional, Any, Dict, List
from django.core.cache import cache
from django.conf import settings
from django.db import models
from django.core.exceptions import ValidationError
import logging

logger = logging.getLogger(__name__)


class BaseService:
    """
    Base class for all service layer components.

    Provides common functionality for:
    - Caching
    - Logging
    - Error handling
    - Validation
    - Database operations
    """

    def __init__(self):
        self.cache_timeout = getattr(settings, 'CACHE_TIMEOUTS', {})

    def get_cache_key(self, prefix: str, **kwargs) -> str:
        """
        Generate a consistent cache key.

        Args:
            prefix: Cache key prefix
            **kwargs: Additional parameters for the key

        Returns:
            Formatted cache key string
        """
        key_parts = [prefix]
        for k, v in sorted(kwargs.items()):
            if v is not None:
                key_parts.append(f"{k}:{v}")
        return "_".join(key_parts)

    def get_from_cache(self, cache_key: str) -> Optional[Any]:
        """
        Get data from cache.

        Args:
            cache_key: The cache key to retrieve

        Returns:
            Cached data or None if not found
        """
        try:
            return cache.get(cache_key)
        except Exception as e:
            logger.warning(f"Cache get failed for key {cache_key}: {e}")
            return None

    def set_cache(self, cache_key: str, data: Any, timeout: Optional[int] = None) -> bool:
        """
        Set data in cache.

        Args:
            cache_key: The cache key to set
            data: Data to cache
            timeout: Cache timeout in seconds (optional)

        Returns:
            True if successful, False otherwise
        """
        try:
            cache.set(cache_key, data, timeout=timeout)
            return True
        except Exception as e:
            logger.warning(f"Cache set failed for key {cache_key}: {e}")
            return False

    def delete_cache(self, cache_key: str) -> bool:
        """
        Delete data from cache.

        Args:
            cache_key: The cache key to delete

        Returns:
            True if successful, False otherwise
        """
        try:
            cache.delete(cache_key)
            return True
        except Exception as e:
            logger.warning(f"Cache delete failed for key {cache_key}: {e}")
            return False

    def delete_cache_pattern(self, pattern: str) -> bool:
        """
        Delete cache keys matching a pattern.

        Args:
            pattern: Cache key pattern to match

        Returns:
            True if successful, False otherwise
        """
        try:
            # This requires django-redis-cache or similar
            if hasattr(cache, 'delete_pattern'):
                cache.delete_pattern(pattern)
                return True
            else:
                logger.warning("Cache backend doesn't support pattern deletion")
                return False
        except Exception as e:
            logger.warning(f"Cache pattern delete failed for {pattern}: {e}")
            return False

    def validate_and_save(self, instance: models.Model) -> models.Model:
        """
        Validate and save a model instance.

        Args:
            instance: Model instance to save

        Returns:
            Saved model instance

        Raises:
            ValidationError: If validation fails
        """
        try:
            instance.full_clean()
            instance.save()
            return instance
        except ValidationError as e:
            logger.error(f"Validation failed for {instance.__class__.__name__}: {e}")
            raise
        except Exception as e:
            logger.error(f"Save failed for {instance.__class__.__name__}: {e}")
            raise

    def log_operation(self, operation: str, details: Dict[str, Any]) -> None:
        """
        Log a service operation.

        Args:
            operation: Operation name
            details: Operation details to log
        """
        logger.info(f"{self.__class__.__name__}.{operation}: {details}")

    def log_error(self, operation: str, error: Exception, details: Dict[str, Any] = None) -> None:
        """
        Log a service error.

        Args:
            operation: Operation name
            error: Exception that occurred
            details: Additional error details
        """
        error_details = {
            'error': str(error),
            'error_type': type(error).__name__
        }
        if details:
            error_details.update(details)

        logger.error(
            f"{self.__class__.__name__}.{operation} failed: {error_details}",
            exc_info=True
        )

    def get_queryset_optimized(self, model_class: models.Model) -> models.QuerySet:
        """
        Get an optimized queryset with common select_related and prefetch_related.

        Args:
            model_class: Model class to get queryset for

        Returns:
            Optimized queryset
        """
        # Base implementation - override in subclasses for specific optimizations
        return model_class.objects.all()

    def paginate_results(self, queryset: models.QuerySet, page: int = 1,
                        page_size: int = 20) -> Dict[str, Any]:
        """
        Paginate queryset results.

        Args:
            queryset: QuerySet to paginate
            page: Page number (1-based)
            page_size: Number of items per page

        Returns:
            Dictionary with pagination info and results
        """
        from django.core.paginator import Paginator

        try:
            paginator = Paginator(queryset, page_size)
            page_obj = paginator.get_page(page)

            return {
                'count': paginator.count,
                'num_pages': paginator.num_pages,
                'current_page': page_obj.number,
                'has_next': page_obj.has_next(),
                'has_previous': page_obj.has_previous(),
                'results': list(page_obj.object_list)
            }
        except Exception as e:
            logger.error(f"Pagination failed: {e}")
            return {
                'count': 0,
                'num_pages': 0,
                'current_page': 1,
                'has_next': False,
                'has_previous': False,
                'results': []
            }