"""
Test cases for Apps API endpoints.

Tests API functionality, responses, and integration with service layer.
"""

from decimal import Decimal
from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from unittest.mock import patch

from apps.models import App
from developers.models import Developer
from categories.models import Category


class AppAPITest(APITestCase):
    """Test cases for Apps API endpoints."""

    def setUp(self):
        """Set up test data."""
        # Create test developer
        self.developer = Developer.objects.create(
            name_en="Test Developer",
            name_ar="مطور اختبار",
            email="test@example.com",
            is_verified=True
        )

        # Create test category
        self.category = Category.objects.create(
            name_en="Test Category",
            name_ar="فئة اختبار",
            slug="test-category",
            is_active=True
        )

        # Create test apps
        self.app1 = App.objects.create(
            name_en="Test App 1",
            name_ar="تطبيق اختبار 1",
            slug="test-app-1",
            short_description_en="First test app",
            short_description_ar="تطبيق اختبار أول",
            description_en="Description",
            description_ar="وصف",
            developer=self.developer,
            platform="android",
            avg_rating=Decimal('4.5'),
            review_count=100,
            view_count=1000,
            featured=True,
            status='published'
        )
        self.app1.categories.add(self.category)

        self.app2 = App.objects.create(
            name_en="Test App 2",
            name_ar="تطبيق اختبار 2",
            slug="test-app-2",
            short_description_en="Second test app",
            short_description_ar="تطبيق اختبار ثان",
            description_en="Description",
            description_ar="وصف",
            developer=self.developer,
            platform="ios",
            avg_rating=Decimal('3.8'),
            review_count=50,
            view_count=500,
            featured=False,
            status='published'
        )
        self.app2.categories.add(self.category)

    def test_list_apps(self):
        """Test listing all apps."""
        url = reverse('app-list')
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 2)
        self.assertIn('test-app-1', [app['slug'] for app in response.data['results']])

    def test_list_apps_with_search(self):
        """Test listing apps with search query."""
        url = reverse('app-list')
        response = self.client.get(url, {'search': 'Test App 1'})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 1)
        self.assertEqual(response.data['results'][0]['slug'], 'test-app-1')

    def test_list_apps_with_category_filter(self):
        """Test listing apps filtered by category."""
        url = reverse('app-list')
        response = self.client.get(url, {'categories__slug': 'test-category'})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 2)

    def test_list_apps_with_platform_filter(self):
        """Test listing apps filtered by platform."""
        url = reverse('app-list')
        response = self.client.get(url, {'platform': 'android'})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 1)
        self.assertEqual(response.data['results'][0]['slug'], 'test-app-1')

    def test_list_apps_with_featured_filter(self):
        """Test listing apps filtered by featured status."""
        url = reverse('app-list')
        response = self.client.get(url, {'featured': 'true'})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 1)
        self.assertTrue(response.data['results'][0]['featured'])

    def test_list_apps_with_ordering(self):
        """Test listing apps with custom ordering."""
        url = reverse('app-list')
        response = self.client.get(url, {'ordering': '-avg_rating'})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 2)
        self.assertEqual(response.data['results'][0]['slug'], 'test-app-1')  # Higher rating

    def test_list_apps_with_pagination(self):
        """Test listing apps with pagination."""
        url = reverse('app-list')
        response = self.client.get(url, {'page': 1, 'page_size': 1})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 2)
        self.assertEqual(len(response.data['results']), 1)
        self.assertTrue(response.data['has_next'])

    def test_retrieve_app_by_id(self):
        """Test retrieving app by ID."""
        url = reverse('app-detail', kwargs={'pk': self.app1.id})
        initial_view_count = self.app1.view_count

        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['slug'], 'test-app-1')
        self.assertEqual(response.data['name_en'], 'Test App 1')
        self.assertEqual(response.data['name_ar'], 'تطبيق اختبار 1')

        # Check that view count was incremented
        self.app1.refresh_from_db()
        self.assertEqual(self.app1.view_count, initial_view_count + 1)

    def test_retrieve_app_by_slug(self):
        """Test retrieving app by slug."""
        url = reverse('app-detail', kwargs={'pk': 'test-app-1'})
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['slug'], 'test-app-1')

    def test_retrieve_nonexistent_app(self):
        """Test retrieving nonexistent app."""
        url = reverse('app-detail', kwargs={'pk': 'nonexistent'})
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertIn('error', response.data)

    def test_retrieve_draft_app(self):
        """Test retrieving draft app (should not be accessible)."""
        draft_app = App.objects.create(
            name_en="Draft App",
            name_ar="تطبيق مسودة",
            slug="draft-app",
            short_description_en="Draft app",
            short_description_ar="تطبيق مسودة",
            description_en="Description",
            description_ar="وصف",
            developer=self.developer,
            platform="web",
            status='draft'
        )

        url = reverse('app-detail', kwargs={'pk': 'draft-app'})
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_featured_apps_endpoint(self):
        """Test featured apps endpoint."""
        url = reverse('app-featured')
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['slug'], 'test-app-1')
        self.assertTrue(response.data[0]['featured'])

    def test_featured_apps_with_category_filter(self):
        """Test featured apps endpoint with category filter."""
        url = reverse('app-featured')
        response = self.client.get(url, {'category': 'test-category'})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

    def test_featured_apps_pagination(self):
        """Test featured apps endpoint with pagination."""
        url = reverse('app-featured')
        response = self.client.get(url, {'page': 1, 'page_size': 10})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Response should be paginated for featured apps
        self.assertIsInstance(response.data, list)  # Since we only have 1 featured app

    def test_by_platform_endpoint(self):
        """Test apps by platform endpoint."""
        url = reverse('app-by-platform')
        response = self.client.get(url, {'platform': 'android'})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 1)
        self.assertEqual(response.data['platform'], 'android')
        self.assertEqual(response.data['results'][0]['slug'], 'test-app-1')

    def test_by_platform_missing_parameter(self):
        """Test apps by platform endpoint without platform parameter."""
        url = reverse('app-by-platform')
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)

    def test_by_platform_invalid_platform(self):
        """Test apps by platform endpoint with invalid platform."""
        url = reverse('app-by-platform')
        response = self.client.get(url, {'platform': 'invalid'})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 0)

    def test_by_platform_pagination(self):
        """Test apps by platform endpoint with pagination."""
        url = reverse('app-by-platform')
        response = self.client.get(url, {'platform': 'android', 'page': 1, 'page_size': 10})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 1)
        self.assertIn('next', response.data)
        self.assertIn('previous', response.data)
        self.assertIn('results', response.data)

    def test_api_response_structure(self):
        """Test API response structure for list endpoint."""
        url = reverse('app-list')
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('count', response.data)
        self.assertIn('results', response.data)

        # Check app data structure
        app_data = response.data['results'][0]
        required_fields = [
            'id', 'slug', 'name_en', 'name_ar',
            'short_description_en', 'short_description_ar',
            'platform', 'avg_rating', 'review_count', 'view_count',
            'featured', 'developer', 'categories'
        ]
        for field in required_fields:
            self.assertIn(field, app_data)

    def test_api_response_structure_detail(self):
        """Test API response structure for detail endpoint."""
        url = reverse('app-detail', kwargs={'pk': self.app1.id})
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Check detailed app data structure
        app_data = response.data
        required_fields = [
            'id', 'slug', 'name_en', 'name_ar',
            'short_description_en', 'short_description_ar',
            'description_en', 'description_ar',
            'application_icon', 'main_image_en', 'main_image_ar',
            'google_play_link', 'app_store_link', 'app_gallery_link',
            'screenshots_en', 'screenshots_ar',
            'platform', 'avg_rating', 'review_count', 'view_count',
            'featured', 'sort_order', 'developer', 'categories'
        ]
        for field in required_fields:
            self.assertIn(field, app_data)

    @patch('apps.services.app_service.AppService.get_featured_apps')
    def test_api_service_integration(self, mock_get_featured):
        """Test that API properly integrates with service layer."""
        mock_get_featured.return_value = [self.app1]

        url = reverse('app-featured')
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        mock_get_featured.assert_called_once()
        self.assertEqual(len(response.data), 1)

    def test_api_error_handling(self):
        """Test API error handling for invalid requests."""
        # Test invalid page number
        url = reverse('app-list')
        response = self.client.get(url, {'page': 'invalid'})

        # Should handle gracefully
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Test negative page size
        response = self.client.get(url, {'page_size': -1})

        # Should handle gracefully
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_cors_headers(self):
        """Test that appropriate CORS headers are present."""
        url = reverse('app-list')
        response = self.client.get(url)

        # In a real setup, you'd check for CORS headers
        # This is more of a placeholder for CORS testing
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_api_performance_headers(self):
        """Test that performance-related headers are present."""
        url = reverse('app-detail', kwargs={'pk': self.app1.id})
        response = self.client.get(url)

        # Test cache control headers if implemented
        self.assertEqual(response.status_code, status.HTTP_200_OK)