"""
Test cases for Category service layer.

Tests business logic, caching, and service methods.
"""

from django.test import TestCase
from django.core.cache import cache
from unittest.mock import patch

from categories.models import Category
from categories.services.category_service import CategoryService
from apps.models import App
from developers.models import Developer


class CategoryServiceTest(TestCase):
    """Test cases for CategoryService."""

    def setUp(self):
        """Set up test data."""
        self.category_service = CategoryService()
        cache.clear()

        # Create test developer
        self.developer = Developer.objects.create(
            name_en="Test Developer",
            name_ar="مطور اختبار",
            email="test@example.com",
            is_verified=True
        )

        # Create test categories
        self.category1 = Category.objects.create(
            name_en="Quran Reading",
            name_ar="قراءة القرآن",
            slug="quran-reading",
            description_en="Apps for reading Quran",
            description_ar="تطبيقات لقراءة القرآن",
            icon="https://example.com/icon1.png",
            color="#FF5722",
            sort_order=1,
            is_active=True
        )

        self.category2 = Category.objects.create(
            name_en="Prayer Times",
            name_ar="مواقيت الصلاة",
            slug="prayer-times",
            description_en="Prayer times applications",
            description_ar="تطبيقات مواقيت الصلاة",
            icon="https://example.com/icon2.png",
            color="#2196F3",
            sort_order=2,
            is_active=True
        )

        self.inactive_category = Category.objects.create(
            name_en="Inactive Category",
            name_ar="فئة غير نشطة",
            slug="inactive-category",
            is_active=False
        )

        # Create test apps
        self.app1 = App.objects.create(
            name_en="Quran App 1",
            name_ar="تطبيق قرآن 1",
            slug="quran-app-1",
            short_description_en="First Quran app",
            short_description_ar="تطبيق قرآن أول",
            description_en="Description",
            description_ar="وصف",
            developer=self.developer,
            platform="android",
            avg_rating=4.5,
            review_count=100,
            featured=True,
            status='published'
        )
        self.app1.categories.add(self.category1, self.category2)

        self.app2 = App.objects.create(
            name_en="Quran App 2",
            name_ar="تطبيق قرآن 2",
            slug="quran-app-2",
            short_description_en="Second Quran app",
            short_description_ar="تطبيق قرآن ثان",
            description_en="Description",
            description_ar="وصف",
            developer=self.developer,
            platform="ios",
            avg_rating=3.8,
            review_count=50,
            featured=False,
            status='published'
        )
        self.app2.categories.add(self.category1)

    def tearDown(self):
        """Clean up after tests."""
        cache.clear()

    def test_get_all_categories_active_only(self):
        """Test getting all active categories."""
        categories = self.category_service.get_all_categories(include_inactive=False)

        self.assertEqual(len(categories), 2)
        category_slugs = [cat.slug for cat in categories]
        self.assertIn('quran-reading', category_slugs)
        self.assertIn('prayer-times', category_slugs)
        self.assertNotIn('inactive-category', category_slugs)

    def test_get_all_categories_include_inactive(self):
        """Test getting all categories including inactive."""
        categories = self.category_service.get_all_categories(include_inactive=True)

        self.assertEqual(len(categories), 3)
        category_slugs = [cat.slug for cat in categories]
        self.assertIn('quran-reading', category_slugs)
        self.assertIn('prayer-times', category_slugs)
        self.assertIn('inactive-category', category_slugs)

    def test_get_all_categories_with_app_counts(self):
        """Test getting categories with app count annotations."""
        categories = self.category_service.get_all_categories(include_app_counts=True)

        self.assertEqual(len(categories), 2)

        # Find Quran Reading category (should have 2 apps)
        quran_category = next((cat for cat in categories if cat.slug == 'quran-reading'), None)
        self.assertIsNotNone(quran_category)
        self.assertEqual(quran_category.app_count, 2)
        self.assertEqual(quran_category.featured_app_count, 1)

        # Find Prayer Times category (should have 1 app)
        prayer_category = next((cat for cat in categories if cat.slug == 'prayer-times'), None)
        self.assertIsNotNone(prayer_category)
        self.assertEqual(prayer_category.app_count, 1)
        self.assertEqual(prayer_category.featured_app_count, 1)

    def test_get_category_by_slug(self):
        """Test getting category by slug."""
        category = self.category_service.get_category_by_slug('quran-reading')

        self.assertIsNotNone(category)
        self.assertEqual(category.slug, 'quran-reading')
        self.assertEqual(category.name_en, 'Quran Reading')
        self.assertTrue(category.is_active)

    def test_get_category_by_slug_inactive(self):
        """Test getting inactive category by slug."""
        category = self.category_service.get_category_by_slug('inactive-category')

        self.assertIsNone(category)  # Inactive categories should not be returned

    def test_get_category_by_slug_not_found(self):
        """Test getting nonexistent category by slug."""
        category = self.category_service.get_category_by_slug('nonexistent')

        self.assertIsNone(category)

    def test_get_category_with_stats(self):
        """Test getting category with detailed statistics."""
        stats = self.category_service.get_category_with_stats('quran-reading')

        self.assertIsNotNone(stats)
        self.assertEqual(stats['category']['slug'], 'quran-reading')
        self.assertEqual(stats['stats']['total_apps'], 2)
        self.assertEqual(stats['stats']['featured_apps'], 1)
        self.assertEqual(stats['stats']['platforms'], ['android', 'ios'])
        self.assertGreater(stats['stats']['average_rating'], 0)

    def test_get_category_with_stats_not_found(self):
        """Test getting stats for nonexistent category."""
        stats = self.category_service.get_category_with_stats('nonexistent')

        self.assertIsNone(stats)

    def test_get_popular_categories(self):
        """Test getting popular categories."""
        popular = self.category_service.get_popular_categories(limit=10, min_apps=1)

        self.assertEqual(len(popular), 2)
        # Should be ordered by app count
        self.assertEqual(popular[0]['slug'], 'quran-reading')  # 2 apps
        self.assertEqual(popular[1]['slug'], 'prayer-times')  # 1 app

    def test_get_popular_categories_min_apps_filter(self):
        """Test getting popular categories with minimum apps filter."""
        popular = self.category_service.get_popular_categories(limit=10, min_apps=2)

        self.assertEqual(len(popular), 1)
        self.assertEqual(popular[0]['slug'], 'quran-reading')  # Only category with 2+ apps

    def test_get_categories_by_platform(self):
        """Test getting categories by platform."""
        categories = self.category_service.get_categories_by_platform('android')

        self.assertEqual(len(categories), 2)
        category_slugs = [cat.slug for cat in categories]
        self.assertIn('quran-reading', category_slugs)
        self.assertIn('prayer-times', category_slugs)

    def test_get_categories_by_platform_ios(self):
        """Test getting categories by iOS platform."""
        categories = self.category_service.get_categories_by_platform('ios')

        self.assertEqual(len(categories), 1)
        self.assertEqual(categories[0].slug, 'quran-reading')

    def test_search_categories_by_name(self):
        """Test searching categories by name."""
        categories = self.category_service.search_categories('Quran')

        self.assertEqual(len(categories), 1)
        self.assertEqual(categories[0].slug, 'quran-reading')

    def test_search_categories_by_description(self):
        """Test searching categories by description."""
        categories = self.category_service.search_categories('Prayer')

        self.assertEqual(len(categories), 1)
        self.assertEqual(categories[0].slug, 'prayer-times')

    def test_search_categories_empty_query(self):
        """Test searching with empty query."""
        categories = self.category_service.search_categories('')

        self.assertEqual(len(categories), 0)

    def test_search_categories_short_query(self):
        """Test searching with very short query."""
        categories = self.category_service.search_categories('Q')

        self.assertEqual(len(categories), 0)

    def test_get_category_hierarchy(self):
        """Test getting category hierarchy with statistics."""
        hierarchy = self.category_service.get_category_hierarchy()

        self.assertEqual(hierarchy['total_categories'], 2)
        self.assertEqual(len(hierarchy['categories']), 2)

        # Check that each category has required fields
        for category_data in hierarchy['categories']:
            self.assertIn('id', category_data)
            self.assertIn('slug', category_data)
            self.assertIn('statistics', category_data)
            self.assertIn('total_apps', category_data['statistics'])
            self.assertIn('platform_breakdown', category_data['statistics'])

    def test_get_category_navigation_data(self):
        """Test getting category data for navigation."""
        nav_data = self.category_service.get_category_navigation_data()

        self.assertEqual(len(nav_data), 2)

        # Check structure
        for item in nav_data:
            self.assertIn('id', item)
            self.assertIn('slug', item)
            self.assertIn('name_en', item)
            self.assertIn('name_ar', item)
            self.assertIn('app_count', item)
            self.assertGreater(item['app_count'], 0)  # Should only include categories with apps

    def test_caching_functionality(self):
        """Test that caching works properly."""
        # First call should populate cache
        categories1 = self.category_service.get_all_categories()

        # Verify cache key is generated
        cache_key = self.category_service.get_cache_key(
            'all_categories',
            active='active',
            counts='with_counts'
        )

        # Verify cache is populated
        cached_categories = self.category_service.get_from_cache(cache_key)
        self.assertIsNotNone(cached_categories)

        # Second call should use cache
        categories2 = self.category_service.get_all_categories()
        self.assertEqual(len(categories1), len(categories2))

    def test_invalidate_category_cache(self):
        """Test cache invalidation for specific category."""
        # Populate cache
        self.category_service.get_category_by_slug('quran-reading')
        cache_key = self.category_service.get_cache_key('category_by_slug', slug='quran-reading')

        # Verify cache exists
        cached_category = self.category_service.get_from_cache(cache_key)
        self.assertIsNotNone(cached_category)

        # Invalidate cache
        self.category_service.invalidate_category_cache(self.category1)

        # Verify cache is cleared
        cached_category = self.category_service.get_from_cache(cache_key)
        self.assertIsNone(cached_category)

    def test_invalidate_all_category_cache(self):
        """Test cache invalidation for all categories."""
        # Populate cache
        self.category_service.get_all_categories()
        self.category_service.get_category_by_slug('quran-reading')

        # Invalidate all category cache
        self.category_service.invalidate_category_cache()

        # Mock pattern deletion for testing
        with patch.object(self.category_service, 'delete_cache_pattern') as mock_delete:
            self.category_service.invalidate_category_cache()
            mock_delete.assert_called_with("*categories*")

    @patch('categories.services.category_service.cache')
    def test_cache_error_handling(self, mock_cache):
        """Test graceful handling of cache errors."""
        mock_cache.get.side_effect = Exception("Cache error")
        mock_cache.set.side_effect = Exception("Cache error")

        # Should still work even if cache fails
        categories = self.category_service.get_all_categories()
        self.assertEqual(len(categories), 2)

    def test_get_cache_key_generation(self):
        """Test cache key generation."""
        key1 = self.category_service.get_cache_key('test', param1='value1', param2='value2')
        key2 = self.category_service.get_cache_key('test', param2='value2', param1='value1')
        key3 = self.category_service.get_cache_key('test', param1='different')

        self.assertEqual(key1, key2)  # Order shouldn't matter
        self.assertNotEqual(key1, key3)  # Different values should give different keys