"""
Test cases for Developer service layer.

Tests business logic, caching, and service methods.
"""

from django.test import TestCase
from django.core.cache import cache
from unittest.mock import patch

from developers.models import Developer
from developers.services.developer_service import DeveloperService
from apps.models import App
from categories.models import Category


class DeveloperServiceTest(TestCase):
    """Test cases for DeveloperService."""

    def setUp(self):
        """Set up test data."""
        self.developer_service = DeveloperService()
        cache.clear()

        # Create test categories
        self.category1 = Category.objects.create(
            name_en="Quran Reading",
            name_ar="قراءة القرآن",
            slug="quran-reading",
            is_active=True
        )

        self.category2 = Category.objects.create(
            name_en="Prayer Times",
            name_ar="مواقيت الصلاة",
            slug="prayer-times",
            is_active=True
        )

        # Create test developers
        self.verified_dev = Developer.objects.create(
            name_en="Verified Developer",
            name_ar="مطور موثق",
            slug="verified-developer",
            website="https://verified.com",
            email="verified@example.com",
            logo_url="https://example.com/logo.png",
            description_en="A verified developer",
            description_ar="مطور موثق",
            contact_info={"phone": "+1234567890"},
            is_verified=True,
            social_links={"twitter": "@verified"}
        )

        self.unverified_dev = Developer.objects.create(
            name_en="Unverified Developer",
            name_ar="مطور غير موثق",
            slug="unverified-developer",
            website="https://unverified.com",
            email="unverified@example.com",
            description_en="An unverified developer",
            description_ar="مطور غير موثق",
            is_verified=False
        )

        # Create test apps
        self.app1 = App.objects.create(
            name_en="App 1",
            name_ar="تطبيق 1",
            slug="app-1",
            short_description_en="First app",
            short_description_ar="التطبيق الأول",
            description_en="Description",
            description_ar="وصف",
            developer=self.verified_dev,
            platform="android",
            avg_rating=4.5,
            review_count=100,
            featured=True,
            status='published'
        )
        self.app1.categories.add(self.category1)

        self.app2 = App.objects.create(
            name_en="App 2",
            name_ar="تطبيق 2",
            slug="app-2",
            short_description_en="Second app",
            short_description_ar="التطبيق الثاني",
            description_en="Description",
            description_ar="وصف",
            developer=self.verified_dev,
            platform="ios",
            avg_rating=3.8,
            review_count=50,
            featured=False,
            status='published'
        )
        self.app2.categories.add(self.category2)

        self.app3 = App.objects.create(
            name_en="App 3",
            name_ar="تطبيق 3",
            slug="app-3",
            short_description_en="Third app",
            short_description_ar="التطبيق الثالث",
            description_en="Description",
            description_ar="وصف",
            developer=self.unverified_dev,
            platform="web",
            avg_rating=4.2,
            review_count=25,
            status='published'
        )

        # Create draft app (should not be counted in some stats)
        self.draft_app = App.objects.create(
            name_en="Draft App",
            name_ar="تطبيق مسودة",
            slug="draft-app",
            short_description_en="Draft app",
            short_description_ar="تطبيق مسودة",
            description_en="Description",
            description_ar="وصف",
            developer=self.verified_dev,
            platform="cross_platform",
            status='draft'
        )

    def tearDown(self):
        """Clean up after tests."""
        cache.clear()

    def test_get_all_developers_verified_only(self):
        """Test getting only verified developers."""
        developers = self.developer_service.get_all_developers(include_unverified=False)

        self.assertEqual(len(developers), 1)
        self.assertEqual(developers[0].slug, 'verified-developer')
        self.assertTrue(developers[0].is_verified)

    def test_get_all_developers_include_unverified(self):
        """Test getting all developers including unverified."""
        developers = self.developer_service.get_all_developers(include_unverified=True)

        self.assertEqual(len(developers), 2)
        developer_slugs = [dev.slug for dev in developers]
        self.assertIn('verified-developer', developer_slugs)
        self.assertIn('unverified-developer', developer_slugs)

    def test_get_all_developers_with_app_counts(self):
        """Test getting developers with app count annotations."""
        developers = self.developer_service.get_all_developers(
            include_unverified=True,
            include_app_counts=True
        )

        self.assertEqual(len(developers), 2)

        # Verified developer should have 3 total apps, 2 published, 1 featured
        verified_dev = next((dev for dev in developers if dev.slug == 'verified-developer'), None)
        self.assertIsNotNone(verified_dev)
        self.assertEqual(verified_dev.app_count, 2)  # Only published apps
        self.assertEqual(verified_dev.featured_app_count, 1)
        self.assertEqual(float(verified_dev.avg_rating), 4.15)  # Average of published apps

        # Unverified developer should have 1 published app
        unverified_dev = next((dev for dev in developers if dev.slug == 'unverified-developer'), None)
        self.assertIsNotNone(unverified_dev)
        self.assertEqual(unverified_dev.app_count, 1)
        self.assertEqual(unverified_dev.featured_app_count, 0)

    def test_get_developer_by_slug(self):
        """Test getting developer by slug."""
        developer = self.developer_service.get_developer_by_slug('verified-developer')

        self.assertIsNotNone(developer)
        self.assertEqual(developer.slug, 'verified-developer')
        self.assertEqual(developer.name_en, 'Verified Developer')
        self.assertTrue(developer.is_verified)

    def test_get_developer_by_slug_not_found(self):
        """Test getting nonexistent developer by slug."""
        developer = self.developer_service.get_developer_by_slug('nonexistent')

        self.assertIsNone(developer)

    def test_get_developer_with_stats(self):
        """Test getting developer with detailed statistics."""
        stats = self.developer_service.get_developer_with_stats('verified-developer')

        self.assertIsNotNone(stats)
        self.assertEqual(stats['developer']['slug'], 'verified-developer')
        self.assertEqual(stats['stats']['total_apps'], 2)  # Only published apps
        self.assertEqual(stats['stats']['featured_apps'], 1)
        self.assertIn('android', stats['stats']['platform_breakdown'])
        self.assertIn('ios', stats['stats']['platform_breakdown'])
        self.assertGreater(stats['stats']['average_rating'], 0)
        self.assertGreater(stats['stats']['total_downloads'], 0)

    def test_get_developer_with_stats_not_found(self):
        """Test getting stats for nonexistent developer."""
        stats = self.developer_service.get_developer_with_stats('nonexistent')

        self.assertIsNone(stats)

    def test_get_verified_developers(self):
        """Test getting verified developers with apps."""
        developers = self.developer_service.get_verified_developers()

        self.assertEqual(len(developers), 1)
        self.assertEqual(developers[0]['slug'], 'verified-developer')
        self.assertTrue(developers[0]['is_verified'])
        self.assertEqual(developers[0]['app_count'], 2)
        self.assertEqual(developers[0]['featured_app_count'], 1)

    def test_get_verified_developers_with_limit(self):
        """Test getting verified developers with limit."""
        # Create another verified developer
        another_verified = Developer.objects.create(
            name_en="Another Verified",
            name_ar="موثق آخر",
            slug="another-verified",
            is_verified=True
        )

        developers = self.developer_service.get_verified_developers(limit=1)

        self.assertEqual(len(developers), 1)
        # Should only return one due to limit

    def test_get_popular_developers(self):
        """Test getting popular developers."""
        popular = self.developer_service.get_popular_developers(limit=10, min_apps=1)

        self.assertEqual(len(popular), 2)
        # Verified developer should be first (more apps)
        self.assertEqual(popular[0]['slug'], 'verified-developer')
        self.assertEqual(popular[1]['slug'], 'unverified-developer')

    def test_get_popular_developers_min_apps_filter(self):
        """Test getting popular developers with minimum apps filter."""
        popular = self.developer_service.get_popular_developers(limit=10, min_apps=2)

        self.assertEqual(len(popular), 1)
        self.assertEqual(popular[0]['slug'], 'verified-developer')  # Only one with 2+ apps

    def test_search_developers_by_name(self):
        """Test searching developers by name."""
        developers = self.developer_service.search_developers('Verified')

        self.assertEqual(len(developers), 1)
        self.assertEqual(developers[0].slug, 'verified-developer')

    def test_search_developers_by_description(self):
        """Test searching developers by description."""
        developers = self.developer_service.search_developers('موثق')

        self.assertEqual(len(developers), 2)  # Both have "موثق" in Arabic name/description

    def test_search_developers_empty_query(self):
        """Test searching with empty query."""
        developers = self.developer_service.search_developers('')

        self.assertEqual(len(developers), 0)

    def test_search_developers_short_query(self):
        """Test searching with very short query."""
        developers = self.developer_service.search_developers('V')

        self.assertEqual(len(developers), 0)

    def test_get_developer_apps(self):
        """Test getting all apps by a developer."""
        apps = self.developer_service.get_developer_apps('verified-developer')

        self.assertEqual(len(apps), 2)  # Only published apps
        app_slugs = [app.slug for app in apps]
        self.assertIn('app-1', app_slugs)
        self.assertIn('app-2', app_slugs)
        self.assertNotIn('draft-app', app_slugs)

    def test_get_developer_apps_include_unpublished(self):
        """Test getting all apps including unpublished."""
        apps = self.developer_service.get_developer_apps(
            'verified-developer',
            include_unpublished=True
        )

        self.assertEqual(len(apps), 3)  # Includes draft app
        app_slugs = [app.slug for app in apps]
        self.assertIn('app-1', app_slugs)
        self.assertIn('app-2', app_slugs)
        self.assertIn('draft-app', app_slugs)

    def test_get_developer_apps_not_found(self):
        """Test getting apps for nonexistent developer."""
        apps = self.developer_service.get_developer_apps('nonexistent')

        self.assertEqual(len(apps), 0)

    def test_get_developer_analytics(self):
        """Test getting comprehensive analytics for a developer."""
        analytics = self.developer_service.get_developer_analytics('verified-developer')

        self.assertIsNotNone(analytics)
        self.assertEqual(analytics['developer_id'], self.verified_dev.id)
        self.assertEqual(analytics['slug'], 'verified-developer')

        # Check app statistics
        app_stats = analytics['app_statistics']
        self.assertEqual(app_stats['total_apps'], 3)  # Including draft
        self.assertEqual(app_stats['published_apps'], 2)
        self.assertEqual(app_stats['draft_apps'], 1)
        self.assertEqual(app_stats['featured_apps'], 1)

        # Check platform breakdown
        platform_breakdown = analytics['platform_breakdown']
        self.assertEqual(platform_breakdown['android'], 1)
        self.assertEqual(platform_breakdown['ios'], 1)
        self.assertEqual(platform_breakdown['cross_platform'], 1)

        # Check category breakdown
        category_breakdown = analytics['category_breakdown']
        self.assertEqual(category_breakdown['Quran Reading'], 1)
        self.assertEqual(category_breakdown['Prayer Times'], 1)

        # Check performance metrics
        performance = analytics['performance_metrics']
        self.assertGreater(performance['average_rating'], 0)
        self.assertGreater(performance['total_views'], 0)

    def test_get_developer_analytics_no_published_apps(self):
        """Test getting analytics for developer with no published apps."""
        # Create developer with only draft apps
        dev_no_apps = Developer.objects.create(
            name_en="No Apps Developer",
            name_ar="مطور بدون تطبيقات",
            slug="no-apps-developer"
        )

        analytics = self.developer_service.get_developer_analytics('no-apps-developer')

        self.assertIsNone(analytics)  # Should return None for developers with no published apps

    def test_get_developer_analytics_not_found(self):
        """Test getting analytics for nonexistent developer."""
        analytics = self.developer_service.get_developer_analytics('nonexistent')

        self.assertIsNone(analytics)

    def test_caching_functionality(self):
        """Test that caching works properly."""
        # First call should populate cache
        developers1 = self.developer_service.get_all_developers()

        # Verify cache key is generated
        cache_key = self.developer_service.get_cache_key(
            'all_developers',
            verified='verified',
            counts='with_counts'
        )

        # Verify cache is populated
        cached_developers = self.developer_service.get_from_cache(cache_key)
        self.assertIsNotNone(cached_developers)

        # Second call should use cache
        developers2 = self.developer_service.get_all_developers()
        self.assertEqual(len(developers1), len(developers2))

    def test_invalidate_developer_cache(self):
        """Test cache invalidation for specific developer."""
        # Populate cache
        self.developer_service.get_developer_by_slug('verified-developer')
        cache_key = self.developer_service.get_cache_key('developer_by_slug', slug='verified-developer')

        # Verify cache exists
        cached_developer = self.developer_service.get_from_cache(cache_key)
        self.assertIsNotNone(cached_developer)

        # Invalidate cache
        self.developer_service.invalidate_developer_cache(self.verified_dev)

        # Verify cache is cleared
        cached_developer = self.developer_service.get_from_cache(cache_key)
        self.assertIsNone(cached_developer)

    def test_invalidate_all_developer_cache(self):
        """Test cache invalidation for all developers."""
        # Populate cache
        self.developer_service.get_all_developers()
        self.developer_service.get_developer_by_slug('verified-developer')

        # Invalidate all developer cache
        self.developer_service.invalidate_developer_cache()

        # Mock pattern deletion for testing
        with patch.object(self.developer_service, 'delete_cache_pattern') as mock_delete:
            self.developer_service.invalidate_developer_cache()
            mock_delete.assert_called_with("*developers*")

    @patch('developers.services.developer_service.cache')
    def test_cache_error_handling(self, mock_cache):
        """Test graceful handling of cache errors."""
        mock_cache.get.side_effect = Exception("Cache error")
        mock_cache.set.side_effect = Exception("Cache error")

        # Should still work even if cache fails
        developers = self.developer_service.get_all_developers()
        self.assertEqual(len(developers), 1)  # Only verified by default

    def test_get_cache_key_generation(self):
        """Test cache key generation."""
        key1 = self.developer_service.get_cache_key('test', param1='value1', param2='value2')
        key2 = self.developer_service.get_cache_key('test', param2='value2', param1='value1')
        key3 = self.developer_service.get_cache_key('test', param1='different')

        self.assertEqual(key1, key2)  # Order shouldn't matter
        self.assertNotEqual(key1, key3)  # Different values should give different keys