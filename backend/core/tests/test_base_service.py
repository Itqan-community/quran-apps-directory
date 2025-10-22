"""
Test cases for BaseService functionality.

Tests base service methods, caching, and common functionality.
"""

from django.test import TestCase
from django.core.cache import cache
from django.db import models
from unittest.mock import patch, MagicMock

from core.services.base_service import BaseService


class TestModel(models.Model):
    """Simple test model for testing base service."""
    name = models.CharField(max_length=100)
    value = models.IntegerField(default=0)

    class Meta:
        app_label = 'core'


class BaseServiceTest(TestCase):
    """Test cases for BaseService."""

    def setUp(self):
        """Set up test data."""
        self.base_service = BaseService()
        cache.clear()

    def tearDown(self):
        """Clean up after tests."""
        cache.clear()

    def test_get_cache_key_generation(self):
        """Test cache key generation."""
        key1 = self.base_service.get_cache_key('test', param1='value1', param2='value2')
        key2 = self.base_service.get_cache_key('test', param2='value2', param1='value1')
        key3 = self.base_service.get_cache_key('test', param1='different')
        key4 = self.base_service.get_cache_key('test', param1=None, param2='value2')

        self.assertEqual(key1, key2)  # Order shouldn't matter
        self.assertNotEqual(key1, key3)  # Different values should give different keys
        self.assertNotEqual(key1, key4)  # None values should be handled

    def test_get_cache_key_empty_parameters(self):
        """Test cache key generation with empty parameters."""
        key1 = self.base_service.get_cache_key('test')
        key2 = self.base_service.get_cache_key('test', param1=None)

        self.assertEqual(key1, key2)  # Should be equal when no/None parameters

    def test_get_from_cache_success(self):
        """Test successful cache retrieval."""
        # Set up cache
        cache.set('test_key', 'test_value')

        result = self.base_service.get_from_cache('test_key')
        self.assertEqual(result, 'test_value')

    def test_get_from_cache_miss(self):
        """Test cache miss."""
        result = self.base_service.get_from_cache('nonexistent_key')
        self.assertIsNone(result)

    def test_get_from_cache_error(self):
        """Test cache retrieval error handling."""
        with patch('core.services.base_service.cache.get', side_effect=Exception("Cache error")):
            result = self.base_service.get_from_cache('test_key')
            self.assertIsNone(result)

    def test_set_cache_success(self):
        """Test successful cache setting."""
        result = self.base_service.set_cache('test_key', 'test_value')
        self.assertTrue(result)

        # Verify value is set
        cached_value = cache.get('test_key')
        self.assertEqual(cached_value, 'test_value')

    def test_set_cache_with_timeout(self):
        """Test cache setting with custom timeout."""
        result = self.base_service.set_cache('test_key', 'test_value', timeout=60)
        self.assertTrue(result)

    def test_set_cache_error(self):
        """Test cache setting error handling."""
        with patch('core.services.base_service.cache.set', side_effect=Exception("Cache error")):
            result = self.base_service.set_cache('test_key', 'test_value')
            self.assertFalse(result)

    def test_delete_cache_success(self):
        """Test successful cache deletion."""
        # Set up cache
        cache.set('test_key', 'test_value')

        result = self.base_service.delete_cache('test_key')
        self.assertTrue(result)

        # Verify value is deleted
        cached_value = cache.get('test_key')
        self.assertIsNone(cached_value)

    def test_delete_cache_error(self):
        """Test cache deletion error handling."""
        with patch('core.services.base_service.cache.delete', side_effect=Exception("Cache error")):
            result = self.base_service.delete_cache('test_key')
            self.assertFalse(result)

    def test_delete_cache_pattern_supported(self):
        """Test cache pattern deletion when supported."""
        mock_cache = MagicMock()
        mock_cache.delete_pattern = MagicMock()

        with patch('core.services.base_service.cache', mock_cache):
            result = self.base_service.delete_cache_pattern('test_*')
            self.assertTrue(result)
            mock_cache.delete_pattern.assert_called_once_with('test_*')

    def test_delete_cache_pattern_not_supported(self):
        """Test cache pattern deletion when not supported."""
        # Remove delete_pattern method from cache
        if hasattr(cache, 'delete_pattern'):
            delattr(cache, 'delete_pattern')

        result = self.base_service.delete_cache_pattern('test_*')
        self.assertFalse(result)

    def test_delete_cache_pattern_error(self):
        """Test cache pattern deletion error handling."""
        mock_cache = MagicMock()
        mock_cache.delete_pattern = MagicMock(side_effect=Exception("Cache error"))

        with patch('core.services.base_service.cache', mock_cache):
            result = self.base_service.delete_cache_pattern('test_*')
            self.assertFalse(result)

    def test_validate_and_save_success(self):
        """Test successful model validation and save."""
        with patch('core.services.base_service.models.Model.full_clean') as mock_clean, \
             patch('core.services.base_service.models.Model.save') as mock_save:

            instance = MagicMock()
            mock_clean.return_value = None
            mock_save.return_value = None

            result = self.base_service.validate_and_save(instance)

            self.assertEqual(result, instance)
            mock_clean.assert_called_once()
            mock_save.assert_called_once()

    def test_validate_and_save_validation_error(self):
        """Test validation error during save."""
        from django.core.exceptions import ValidationError

        with patch('core.services.base_service.models.Model.full_clean',
                  side_effect=ValidationError("Invalid data")):
            instance = MagicMock()

            with self.assertRaises(ValidationError):
                self.base_service.validate_and_save(instance)

    def test_validate_and_save_save_error(self):
        """Test save error during validation and save."""
        with patch('core.services.base_service.models.Model.full_clean'), \
             patch('core.services.base_service.models.Model.save',
                  side_effect=Exception("Save error")):

            instance = MagicMock()

            with self.assertRaises(Exception):
                self.base_service.validate_and_save(instance)

    def test_log_operation(self):
        """Test operation logging."""
        with patch('core.services.base_service.logger') as mock_logger:
            self.base_service.log_operation('test_operation', {'param': 'value'})

            mock_logger.info.assert_called_once()
            args, kwargs = mock_logger.info.call_args
            self.assertIn('BaseService.test_operation', args[0])
            self.assertIn('"param": "value"', args[0])

    def test_log_error(self):
        """Test error logging."""
        test_error = ValueError("Test error")
        details = {'context': 'test'}

        with patch('core.services.base_service.logger') as mock_logger:
            self.base_service.log_error('test_operation', test_error, details)

            mock_logger.error.assert_called_once()
            args, kwargs = mock_logger.error.call_args
            self.assertIn('BaseService.test_operation failed', args[0])
            self.assertIn('"error": "Test error"', args[0])
            self.assertIn('"error_type": "ValueError"', args[0])
            self.assertIn('"context": "test"', args[0])

    def test_log_error_without_details(self):
        """Test error logging without additional details."""
        test_error = ValueError("Test error")

        with patch('core.services.base_service.logger') as mock_logger:
            self.base_service.log_error('test_operation', test_error)

            mock_logger.error.assert_called_once()
            args, kwargs = mock_logger.error.call_args
            self.assertIn('"error": "Test error"', args[0])
            self.assertIn('"error_type": "ValueError"', args[0])

    def test_get_queryset_optimized(self):
        """Test default optimized queryset."""
        result = self.base_service.get_queryset_optimized(TestModel)

        # Should return all objects by default
        self.assertEqual(list(result), list(TestModel.objects.all()))

    def test_paginate_results_success(self):
        """Test successful pagination."""
        # Create test data
        for i in range(5):
            TestModel.objects.create(name=f'Item {i}', value=i)

        result = self.base_service.paginate_results(
            TestModel.objects.all(),
            page=1,
            page_size=2
        )

        self.assertEqual(result['count'], 5)
        self.assertEqual(result['num_pages'], 3)
        self.assertEqual(result['current_page'], 1)
        self.assertTrue(result['has_next'])
        self.assertFalse(result['has_previous'])
        self.assertEqual(len(result['results']), 2)

    def test_paginate_results_last_page(self):
        """Test pagination to last page."""
        # Create test data
        for i in range(5):
            TestModel.objects.create(name=f'Item {i}', value=i)

        result = self.base_service.paginate_results(
            TestModel.objects.all(),
            page=3,
            page_size=2
        )

        self.assertEqual(result['count'], 5)
        self.assertEqual(result['num_pages'], 3)
        self.assertEqual(result['current_page'], 3)
        self.assertFalse(result['has_next'])
        self.assertTrue(result['has_previous'])
        self.assertEqual(len(result['results']), 1)

    def test_paginate_results_empty_queryset(self):
        """Test pagination with empty queryset."""
        result = self.base_service.paginate_results(
            TestModel.objects.none(),
            page=1,
            page_size=10
        )

        self.assertEqual(result['count'], 0)
        self.assertEqual(result['num_pages'], 0)
        self.assertEqual(result['current_page'], 1)
        self.assertFalse(result['has_next'])
        self.assertFalse(result['has_previous'])
        self.assertEqual(len(result['results']), 0)

    def test_paginate_results_invalid_page(self):
        """Test pagination with invalid page number."""
        # Create test data
        for i in range(5):
            TestModel.objects.create(name=f'Item {i}', value=i)

        result = self.base_service.paginate_results(
            TestModel.objects.all(),
            page=999,
            page_size=2
        )

        # Should return empty result for out-of-range page
        self.assertEqual(result['count'], 5)
        self.assertEqual(len(result['results']), 0)

    def test_paginate_results_error(self):
        """Test pagination error handling."""
        with patch('core.services.base_service.Paginator',
                  side_effect=Exception("Pagination error")):

            result = self.base_service.paginate_results(
                TestModel.objects.all(),
                page=1,
                page_size=10
            )

            # Should return empty result on error
            self.assertEqual(result['count'], 0)
            self.assertEqual(len(result['results']), 0)

    def test_initialization_with_cache_timeouts(self):
        """Test service initialization with cache timeouts."""
        with patch('core.services.base_service.settings',
                  {'CACHE_TIMEOUTS': {'TEST': 300}}):

            service = BaseService()
            self.assertEqual(service.cache_timeout.get('TEST'), 300)

    def test_initialization_without_cache_timeouts(self):
        """Test service initialization without cache timeouts."""
        with patch('core.services.base_service.settings', {}):
            service = BaseService()
            self.assertEqual(service.cache_timeout, {})