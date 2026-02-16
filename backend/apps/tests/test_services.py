"""
Test cases for App service layer.

Tests business logic, caching, and service methods.
"""

from decimal import Decimal
from django.test import TestCase, override_settings
from django.core.cache import cache
from unittest.mock import patch, MagicMock

from apps.models import App
from apps.services.app_service import AppService
from developers.models import Developer
from categories.models import Category


class AppServiceTest(TestCase):
    """Test cases for AppService."""

    def setUp(self):
        """Set up test data."""
        self.app_service = AppService()
        cache.clear()

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

        self.app3 = App.objects.create(
            name_en="Draft App",
            name_ar="تطبيق مسودة",
            slug="draft-app",
            short_description_en="Draft app",
            short_description_ar="تطبيق مسودة",
            description_en="Description",
            description_ar="وصف",
            developer=self.developer,
            platform="web",
            status='draft'  # Not published
        )

    def tearDown(self):
        """Clean up after tests."""
        cache.clear()

    def test_get_featured_apps_all(self):
        """Test getting all featured apps."""
        featured_apps = self.app_service.get_featured_apps()

        self.assertEqual(len(featured_apps), 1)
        self.assertEqual(featured_apps[0].slug, "test-app-1")
        self.assertTrue(featured_apps[0].featured)

    def test_get_featured_apps_by_category(self):
        """Test getting featured apps filtered by category."""
        featured_apps = self.app_service.get_featured_apps(
            category_slug="test-category"
        )

        self.assertEqual(len(featured_apps), 1)
        self.assertEqual(featured_apps[0].slug, "test-app-1")

    def test_get_featured_apps_caching(self):
        """Test that featured apps are cached."""
        # First call should populate cache
        apps1 = self.app_service.get_featured_apps()
        cache_key = self.app_service.get_cache_key('featured_apps', category='all')

        # Verify cache is populated
        cached_apps = self.app_service.get_from_cache(cache_key)
        self.assertIsNotNone(cached_apps)
        self.assertEqual(len(cached_apps), 1)

        # Second call should use cache
        apps2 = self.app_service.get_featured_apps()
        self.assertEqual(len(apps1), len(apps2))
        self.assertEqual(apps1[0].slug, apps2[0].slug)

    def test_search_apps_by_query(self):
        """Test searching apps by query."""
        results = self.app_service.search_apps("Test App 1")

        self.assertEqual(results['count'], 1)
        self.assertEqual(results['results'][0].slug, "test-app-1")

    def test_search_apps_by_category(self):
        """Test searching apps by category filter."""
        results = self.app_service.search_apps(
            query="",
            filters={'category_slug': 'test-category'}
        )

        self.assertEqual(results['count'], 2)  # Both published apps are in this category

    def test_search_apps_by_platform(self):
        """Test searching apps by platform filter."""
        results = self.app_service.search_apps(
            query="",
            filters={'platform': 'android'}
        )

        self.assertEqual(results['count'], 1)
        self.assertEqual(results['results'][0].slug, "test-app-1")

    def test_search_apps_featured_filter(self):
        """Test searching apps with featured filter."""
        results = self.app_service.search_apps(
            query="",
            filters={'featured': True}
        )

        self.assertEqual(results['count'], 1)
        self.assertTrue(results['results'][0].featured)

    def test_search_apps_ordering(self):
        """Test search results ordering."""
        results = self.app_service.search_apps(
            query="",
            ordering='-avg_rating'
        )

        self.assertEqual(results['count'], 2)
        self.assertEqual(results['results'][0].slug, "test-app-1")  # Higher rating

    def test_search_apps_pagination(self):
        """Test search results pagination."""
        results = self.app_service.search_apps(
            query="",
            page=1,
            page_size=1
        )

        self.assertEqual(results['count'], 2)
        self.assertEqual(len(results['results']), 1)
        self.assertTrue(results['has_next'])
        self.assertFalse(results['has_previous'])
        self.assertEqual(results['current_page'], 1)

    def test_get_apps_by_category(self):
        """Test getting apps by category."""
        results = self.app_service.get_apps_by_category("test-category")

        self.assertEqual(results['count'], 2)
        self.assertEqual(results['category']['slug'], "test-category")
        self.assertIn('test-app-1', [app.slug for app in results['results']])
        self.assertIn('test-app-2', [app.slug for app in results['results']])

    def test_get_apps_by_nonexistent_category(self):
        """Test getting apps by nonexistent category."""
        results = self.app_service.get_apps_by_category("nonexistent")

        self.assertEqual(results['count'], 0)
        self.assertEqual(len(results['results']), 0)

    def test_get_apps_by_platform(self):
        """Test getting apps by platform."""
        results = self.app_service.get_apps_by_platform("android")

        self.assertEqual(results['count'], 1)
        self.assertEqual(results['platform'], "android")
        self.assertEqual(results['results'][0].slug, "test-app-1")

    def test_get_apps_by_invalid_platform(self):
        """Test getting apps by invalid platform."""
        results = self.app_service.get_apps_by_platform("invalid")

        self.assertEqual(results['count'], 0)
        self.assertEqual(len(results['results']), 0)

    def test_get_app_detail_by_id(self):
        """Test getting app detail by ID."""
        app = self.app_service.get_app_detail(str(self.app1.id))

        self.assertIsNotNone(app)
        self.assertEqual(app.slug, "test-app-1")
        self.assertEqual(app.view_count, 1001)  # Should increment

    def test_get_app_detail_by_slug(self):
        """Test getting app detail by slug."""
        app = self.app_service.get_app_detail("test-app-1")

        self.assertIsNotNone(app)
        self.assertEqual(app.slug, "test-app-1")
        self.assertEqual(app.view_count, 1001)  # Should increment

    def test_get_app_detail_not_found(self):
        """Test getting app detail for nonexistent app."""
        app = self.app_service.get_app_detail("nonexistent")

        self.assertIsNone(app)

    def test_get_app_detail_draft_not_returned(self):
        """Test that draft apps are not returned."""
        app = self.app_service.get_app_detail("draft-app")

        self.assertIsNone(app)  # Draft app should not be found

    def test_increment_view_count(self):
        """Test incrementing view count."""
        initial_count = self.app1.view_count

        result = self.app_service.increment_view_count(self.app1)

        self.assertTrue(result)
        self.app1.refresh_from_db()
        self.assertEqual(self.app1.view_count, initial_count + 1)

    def test_get_popular_apps(self):
        """Test getting popular apps."""
        popular_apps = self.app_service.get_popular_apps(min_reviews=10)

        self.assertEqual(len(popular_apps), 2)
        # Should be ordered by rating and review count
        self.assertEqual(popular_apps[0].slug, "test-app-1")  # Higher rating

    def test_get_popular_apps_min_reviews_filter(self):
        """Test getting popular apps with minimum reviews filter."""
        popular_apps = self.app_service.get_popular_apps(min_reviews=75)

        self.assertEqual(len(popular_apps), 1)
        self.assertEqual(popular_apps[0].slug, "test-app-1")  # Only one has 75+ reviews

    def test_get_apps_by_developer(self):
        """Test getting apps by developer."""
        results = self.app_service.get_apps_by_developer(self.developer.id)

        self.assertEqual(results['count'], 2)  # Only published apps
        self.assertEqual(results['developer']['id'], self.developer.id)
        self.assertIn('test-app-1', [app.slug for app in results['results']])
        self.assertIn('test-app-2', [app.slug for app in results['results']])

    def test_get_apps_by_nonexistent_developer(self):
        """Test getting apps by nonexistent developer."""
        results = self.app_service.get_apps_by_developer(999)

        self.assertEqual(results['count'], 0)
        self.assertEqual(len(results['results']), 0)

    @patch('apps.services.app_service.cache')
    def test_cache_error_handling(self, mock_cache):
        """Test graceful handling of cache errors."""
        mock_cache.get.side_effect = Exception("Cache error")
        mock_cache.set.side_effect = Exception("Cache error")

        # Should still work even if cache fails
        featured_apps = self.app_service.get_featured_apps()
        self.assertEqual(len(featured_apps), 1)

    def test_get_cache_key_generation(self):
        """Test cache key generation."""
        key1 = self.app_service.get_cache_key('test', param1='value1', param2='value2')
        key2 = self.app_service.get_cache_key('test', param2='value2', param1='value1')
        key3 = self.app_service.get_cache_key('test', param1='different')

        self.assertEqual(key1, key2)  # Order shouldn't matter
        self.assertNotEqual(key1, key3)  # Different values should give different keys

    def test_get_queryset_optimized(self):
        """Test optimized queryset generation."""
        queryset = self.app_service.get_queryset_optimized()
        apps = list(queryset)

        self.assertEqual(len(apps), 2)  # Only published apps
        self.assertIn('test-app-1', [app.slug for app in apps])
        self.assertIn('test-app-2', [app.slug for app in apps])
        self.assertNotIn('draft-app', [app.slug for app in apps])