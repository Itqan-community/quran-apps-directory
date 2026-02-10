"""
Test cases for Multi-Filter API Support.

Tests the filtering capabilities: riwayah, mushaf_type, features.
Includes tests for multi-select filtering with OR/AND logic.

Uses the dynamic AppMetadataValue M2M table for metadata filtering
(migrated from legacy JSONFields on App model).
"""

from decimal import Decimal
from django.test import TestCase

from apps.models import App
from apps.services.app_service_simple import AppService
from developers.models import Developer
from categories.models import Category
from metadata.models import MetadataType, MetadataOption, AppMetadataValue


class MultiFilterTestMixin:
    """Shared helper to set up metadata types and options via get_or_create."""

    def setup_metadata(self):
        """Get or create metadata types and options (seeded by migration 0002)."""
        self.mt_riwayah, _ = MetadataType.objects.get_or_create(
            name='riwayah',
            defaults={'label_en': 'Riwayah', 'label_ar': 'الرواية', 'is_active': True},
        )
        self.mt_mushaf_type, _ = MetadataType.objects.get_or_create(
            name='mushaf_type',
            defaults={'label_en': 'Mushaf Type', 'label_ar': 'نوع المصحف', 'is_active': True},
        )
        self.mt_features, _ = MetadataType.objects.get_or_create(
            name='features',
            defaults={'label_en': 'Features', 'label_ar': 'المميزات', 'is_active': True},
        )

        # Riwayah options
        self.opt_hafs, _ = MetadataOption.objects.get_or_create(
            metadata_type=self.mt_riwayah, value='hafs',
            defaults={'label_en': 'Hafs', 'label_ar': 'حفص'},
        )
        self.opt_warsh, _ = MetadataOption.objects.get_or_create(
            metadata_type=self.mt_riwayah, value='warsh',
            defaults={'label_en': 'Warsh', 'label_ar': 'ورش'},
        )
        self.opt_qalun, _ = MetadataOption.objects.get_or_create(
            metadata_type=self.mt_riwayah, value='qalun',
            defaults={'label_en': 'Qalun', 'label_ar': 'قالون'},
        )

        # Mushaf type options
        self.opt_madani, _ = MetadataOption.objects.get_or_create(
            metadata_type=self.mt_mushaf_type, value='madani',
            defaults={'label_en': 'Madani (Madinah)', 'label_ar': 'مصحف المدينة'},
        )
        self.opt_uthmani, _ = MetadataOption.objects.get_or_create(
            metadata_type=self.mt_mushaf_type, value='uthmani',
            defaults={'label_en': 'Uthmani', 'label_ar': 'عثماني'},
        )
        self.opt_moroccan, _ = MetadataOption.objects.get_or_create(
            metadata_type=self.mt_mushaf_type, value='moroccan',
            defaults={'label_en': 'Moroccan', 'label_ar': 'مغربي'},
        )

        # Feature options
        self.opt_offline, _ = MetadataOption.objects.get_or_create(
            metadata_type=self.mt_features, value='offline',
            defaults={'label_en': 'Offline Mode', 'label_ar': 'وضع بدون اتصال'},
        )
        self.opt_audio, _ = MetadataOption.objects.get_or_create(
            metadata_type=self.mt_features, value='audio',
            defaults={'label_en': 'Audio Recitation', 'label_ar': 'تلاوة صوتية'},
        )
        self.opt_translation, _ = MetadataOption.objects.get_or_create(
            metadata_type=self.mt_features, value='translation',
            defaults={'label_en': 'Translation', 'label_ar': 'ترجمة'},
        )
        self.opt_tafsir_feat, _ = MetadataOption.objects.get_or_create(
            metadata_type=self.mt_features, value='tafsir',
            defaults={'label_en': 'Tafsir', 'label_ar': 'تفسير'},
        )
        self.opt_bookmarks, _ = MetadataOption.objects.get_or_create(
            metadata_type=self.mt_features, value='bookmarks',
            defaults={'label_en': 'Bookmarks', 'label_ar': 'إشارات مرجعية'},
        )
        self.opt_search, _ = MetadataOption.objects.get_or_create(
            metadata_type=self.mt_features, value='search',
            defaults={'label_en': 'Search', 'label_ar': 'بحث'},
        )

    def link_metadata(self, app, options):
        """Create AppMetadataValue records linking an app to metadata options."""
        for option in options:
            AppMetadataValue.objects.get_or_create(app=app, metadata_option=option)


class MultiFilterServiceTest(MultiFilterTestMixin, TestCase):
    """Test cases for multi-filter functionality in AppService."""

    def setUp(self):
        """Set up test data with metadata via AppMetadataValue M2M."""
        # Clear migration-seeded apps to isolate test data
        AppMetadataValue.objects.all().delete()
        App.objects.all().delete()

        self.app_service = AppService()
        self.setup_metadata()

        # Create test developer
        self.developer = Developer.objects.create(
            name_en="Test Developer",
            name_ar="مطور اختبار",
            email="test@example.com",
            is_verified=True
        )

        # Create test categories
        self.category_mushaf = Category.objects.create(
            name_en="Mushaf",
            name_ar="مصحف",
            slug="mushaf",
            is_active=True
        )
        self.category_tafsir = Category.objects.create(
            name_en="Tafsir",
            name_ar="تفسير",
            slug="tafsir",
            is_active=True
        )

        # App 1: Hafs, Madani, offline+audio features, Android
        self.app1 = App.objects.create(
            name_en="Quran Hafs App",
            name_ar="تطبيق قرآن حفص",
            slug="quran-hafs-app",
            short_description_en="Hafs recitation app",
            short_description_ar="تطبيق تلاوة حفص",
            description_en="Description",
            description_ar="وصف",
            developer=self.developer,
            platform="android",
            avg_rating=Decimal('4.5'),
            status='published'
        )
        self.app1.categories.add(self.category_mushaf)
        self.link_metadata(self.app1, [
            self.opt_hafs, self.opt_madani, self.opt_offline, self.opt_audio
        ])

        # App 2: Warsh, Moroccan, offline+translation features, iOS
        self.app2 = App.objects.create(
            name_en="Quran Warsh App",
            name_ar="تطبيق قرآن ورش",
            slug="quran-warsh-app",
            short_description_en="Warsh recitation app",
            short_description_ar="تطبيق تلاوة ورش",
            description_en="Description",
            description_ar="وصف",
            developer=self.developer,
            platform="ios",
            avg_rating=Decimal('4.2'),
            status='published'
        )
        self.app2.categories.add(self.category_mushaf)
        self.link_metadata(self.app2, [
            self.opt_warsh, self.opt_moroccan, self.opt_offline, self.opt_translation
        ])

        # App 3: Hafs+Warsh (multi), Uthmani, audio+tafsir features, Cross-platform
        self.app3 = App.objects.create(
            name_en="Multi Riwayah App",
            name_ar="تطبيق متعدد الروايات",
            slug="multi-riwayah-app",
            short_description_en="Supports multiple riwayat",
            short_description_ar="يدعم روايات متعددة",
            description_en="Description",
            description_ar="وصف",
            developer=self.developer,
            platform="cross_platform",
            avg_rating=Decimal('4.8'),
            status='published'
        )
        self.app3.categories.add(self.category_mushaf)
        self.app3.categories.add(self.category_tafsir)
        self.link_metadata(self.app3, [
            self.opt_hafs, self.opt_warsh, self.opt_uthmani,
            self.opt_audio, self.opt_tafsir_feat
        ])

        # App 4: No riwayah, no mushaf type, bookmarks+search features
        self.app4 = App.objects.create(
            name_en="Tafsir App",
            name_ar="تطبيق تفسير",
            slug="tafsir-app",
            short_description_en="Tafsir only app",
            short_description_ar="تطبيق تفسير فقط",
            description_en="Description",
            description_ar="وصف",
            developer=self.developer,
            platform="android",
            avg_rating=Decimal('4.0'),
            status='published'
        )
        self.app4.categories.add(self.category_tafsir)
        self.link_metadata(self.app4, [self.opt_bookmarks, self.opt_search])

        # App 5: Draft app (should not appear in any results)
        self.app5 = App.objects.create(
            name_en="Draft App",
            name_ar="تطبيق مسودة",
            slug="draft-app",
            short_description_en="Draft app",
            short_description_ar="تطبيق مسودة",
            description_en="Description",
            description_ar="وصف",
            developer=self.developer,
            platform="android",
            status='draft'
        )
        self.link_metadata(self.app5, [
            self.opt_hafs, self.opt_madani, self.opt_offline
        ])

    # ==================== Riwayah Filter Tests ====================

    def test_filter_by_single_riwayah(self):
        """Test filtering by a single riwayah value."""
        result = self.app_service.get_apps(filters={'riwayah': 'hafs'})

        self.assertEqual(result['count'], 2)
        slugs = [app['slug'] for app in result['results']]
        self.assertIn('quran-hafs-app', slugs)
        self.assertIn('multi-riwayah-app', slugs)

    def test_filter_by_multiple_riwayah_or_logic(self):
        """Test filtering by multiple riwayah values (OR logic)."""
        result = self.app_service.get_apps(filters={'riwayah': 'hafs,warsh'})

        self.assertEqual(result['count'], 3)
        slugs = [app['slug'] for app in result['results']]
        self.assertIn('quran-hafs-app', slugs)
        self.assertIn('quran-warsh-app', slugs)
        self.assertIn('multi-riwayah-app', slugs)

    def test_filter_by_nonexistent_riwayah(self):
        """Test filtering by a riwayah that no app has."""
        result = self.app_service.get_apps(filters={'riwayah': 'qalun'})

        self.assertEqual(result['count'], 0)

    # ==================== Mushaf Type Filter Tests ====================

    def test_filter_by_single_mushaf_type(self):
        """Test filtering by a single mushaf type."""
        result = self.app_service.get_apps(filters={'mushaf_type': 'madani'})

        self.assertEqual(result['count'], 1)
        self.assertEqual(result['results'][0]['slug'], 'quran-hafs-app')

    def test_filter_by_multiple_mushaf_types_or_logic(self):
        """Test filtering by multiple mushaf types (OR logic)."""
        result = self.app_service.get_apps(filters={'mushaf_type': 'madani,moroccan'})

        self.assertEqual(result['count'], 2)
        slugs = [app['slug'] for app in result['results']]
        self.assertIn('quran-hafs-app', slugs)
        self.assertIn('quran-warsh-app', slugs)

    # ==================== Features Filter Tests ====================

    def test_filter_by_single_feature(self):
        """Test filtering by a single feature."""
        result = self.app_service.get_apps(filters={'features': 'offline'})

        self.assertEqual(result['count'], 2)
        slugs = [app['slug'] for app in result['results']]
        self.assertIn('quran-hafs-app', slugs)
        self.assertIn('quran-warsh-app', slugs)

    def test_filter_by_multiple_features_or_logic(self):
        """Test filtering by multiple features (OR logic)."""
        result = self.app_service.get_apps(filters={'features': 'audio,bookmarks'})

        self.assertEqual(result['count'], 3)
        slugs = [app['slug'] for app in result['results']]
        self.assertIn('quran-hafs-app', slugs)  # Has audio
        self.assertIn('multi-riwayah-app', slugs)  # Has audio
        self.assertIn('tafsir-app', slugs)  # Has bookmarks

    # ==================== Combined Filter Tests (AND Logic) ====================

    def test_combined_riwayah_and_mushaf_type(self):
        """Test combining riwayah and mushaf_type filters (AND logic)."""
        result = self.app_service.get_apps(filters={
            'riwayah': 'hafs',
            'mushaf_type': 'madani'
        })

        self.assertEqual(result['count'], 1)
        self.assertEqual(result['results'][0]['slug'], 'quran-hafs-app')

    def test_combined_riwayah_and_features(self):
        """Test combining riwayah and features filters (AND logic)."""
        result = self.app_service.get_apps(filters={
            'riwayah': 'hafs',
            'features': 'audio'
        })

        self.assertEqual(result['count'], 2)
        slugs = [app['slug'] for app in result['results']]
        self.assertIn('quran-hafs-app', slugs)
        self.assertIn('multi-riwayah-app', slugs)

    def test_combined_all_three_filters(self):
        """Test combining all three new filters (AND logic)."""
        result = self.app_service.get_apps(filters={
            'riwayah': 'hafs,warsh',
            'mushaf_type': 'uthmani',
            'features': 'tafsir'
        })

        self.assertEqual(result['count'], 1)
        self.assertEqual(result['results'][0]['slug'], 'multi-riwayah-app')

    def test_combined_with_existing_filters(self):
        """Test combining new filters with existing filters (platform, category)."""
        result = self.app_service.get_apps(filters={
            'platform': 'android',
            'riwayah': 'hafs'
        })

        self.assertEqual(result['count'], 1)
        self.assertEqual(result['results'][0]['slug'], 'quran-hafs-app')

    def test_combined_with_category_filter(self):
        """Test combining new filters with category filter."""
        result = self.app_service.get_apps(filters={
            'category': 'tafsir',
            'features': 'bookmarks'
        })

        self.assertEqual(result['count'], 1)
        self.assertEqual(result['results'][0]['slug'], 'tafsir-app')

    # ==================== Multi-Select Platform Filter Tests ====================

    def test_filter_by_multiple_platforms(self):
        """Test filtering by multiple platforms (OR logic)."""
        result = self.app_service.get_apps(filters={'platform': 'android,ios'})

        self.assertEqual(result['count'], 3)
        slugs = [app['slug'] for app in result['results']]
        self.assertIn('quran-hafs-app', slugs)
        self.assertIn('quran-warsh-app', slugs)
        self.assertIn('tafsir-app', slugs)

    # ==================== Multi-Select Category Filter Tests ====================

    def test_filter_by_multiple_categories(self):
        """Test filtering by multiple categories (OR logic)."""
        result = self.app_service.get_apps(filters={'category': 'mushaf,tafsir'})

        self.assertEqual(result['count'], 4)  # All published apps except draft

    # ==================== Response Schema Tests ====================

    def test_response_includes_new_fields(self):
        """Test that API response includes new filter fields."""
        result = self.app_service.get_apps()

        # Check first app in results
        app = result['results'][0]
        self.assertIn('riwayah', app)
        self.assertIn('mushaf_type', app)
        self.assertIn('features', app)

    def test_new_fields_are_lists(self):
        """Test that new fields are always lists."""
        result = self.app_service.get_apps()

        for app in result['results']:
            self.assertIsInstance(app['riwayah'], list)
            self.assertIsInstance(app['mushaf_type'], list)
            self.assertIsInstance(app['features'], list)

    # ==================== Edge Cases ====================

    def test_empty_filter_returns_all(self):
        """Test that empty filters return all published apps."""
        result = self.app_service.get_apps(filters={})

        self.assertEqual(result['count'], 4)

    def test_filter_with_extra_spaces(self):
        """Test that filters with extra spaces are handled correctly."""
        result = self.app_service.get_apps(filters={'riwayah': ' hafs , warsh '})

        self.assertEqual(result['count'], 3)

    def test_filter_case_insensitive(self):
        """Test that filter values are case-insensitive."""
        result = self.app_service.get_apps(filters={'riwayah': 'HAFS'})

        # Metadata option values are lowercase slugs, _parse_multi_value lowercases input
        self.assertEqual(result['count'], 2)

    def test_draft_apps_not_included(self):
        """Test that draft apps are never included in results."""
        result = self.app_service.get_apps(filters={'riwayah': 'hafs'})

        slugs = [app['slug'] for app in result['results']]
        self.assertNotIn('draft-app', slugs)

    def test_no_matching_combination(self):
        """Test that impossible filter combinations return empty results."""
        result = self.app_service.get_apps(filters={
            'riwayah': 'warsh',
            'mushaf_type': 'madani'  # No app has both
        })

        self.assertEqual(result['count'], 0)


class MultiFilterAPITest(MultiFilterTestMixin, TestCase):
    """Test cases for multi-filter API endpoints."""

    def setUp(self):
        """Set up test data with AppMetadataValue M2M records."""
        AppMetadataValue.objects.all().delete()
        App.objects.all().delete()

        self.setup_metadata()

        self.developer = Developer.objects.create(
            name_en="Test Developer",
            name_ar="مطور اختبار",
            email="test@example.com",
            is_verified=True
        )

        self.app = App.objects.create(
            name_en="Test App",
            name_ar="تطبيق اختبار",
            slug="test-app",
            short_description_en="Test",
            short_description_ar="اختبار",
            description_en="Description",
            description_ar="وصف",
            developer=self.developer,
            platform="android",
            status='published'
        )
        self.link_metadata(self.app, [
            self.opt_hafs, self.opt_warsh, self.opt_madani,
            self.opt_offline, self.opt_audio
        ])

    def test_api_filter_by_riwayah(self):
        """Test API endpoint with riwayah filter."""
        response = self.client.get('/api/apps/', {'riwayah': 'hafs'})

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data['count'], 1)

    def test_api_filter_by_multiple_values(self):
        """Test API endpoint with comma-separated filter values."""
        response = self.client.get('/api/apps/', {'riwayah': 'hafs,warsh'})

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data['count'], 1)

    def test_api_combined_filters(self):
        """Test API endpoint with multiple filter parameters."""
        response = self.client.get('/api/apps/', {
            'riwayah': 'hafs',
            'features': 'offline'
        })

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data['count'], 1)

    def test_api_response_includes_new_fields(self):
        """Test that API response includes the new fields from AppMetadataValue."""
        response = self.client.get('/api/apps/')

        self.assertEqual(response.status_code, 200)
        data = response.json()

        app = data['results'][0]
        self.assertIn('riwayah', app)
        self.assertIn('mushaf_type', app)
        self.assertIn('features', app)
        self.assertEqual(sorted(app['riwayah']), ['hafs', 'warsh'])
        self.assertEqual(app['mushaf_type'], ['madani'])
        self.assertEqual(sorted(app['features']), ['audio', 'offline'])


class FilterValuesEndpointTest(MultiFilterTestMixin, TestCase):
    """Test cases for the filter values endpoint."""

    def setUp(self):
        """Set up test data with AppMetadataValue M2M records."""
        AppMetadataValue.objects.all().delete()
        App.objects.all().delete()

        self.setup_metadata()

        self.developer = Developer.objects.create(
            name_en="Test Developer",
            name_ar="مطور اختبار",
            email="test@example.com",
            is_verified=True
        )

        # App 1: hafs, madani, offline
        self.app1 = App.objects.create(
            name_en="App 1",
            name_ar="تطبيق 1",
            slug="app-1",
            short_description_en="Test",
            short_description_ar="اختبار",
            description_en="Description",
            description_ar="وصف",
            developer=self.developer,
            platform="android",
            status='published'
        )
        self.link_metadata(self.app1, [
            self.opt_hafs, self.opt_madani, self.opt_offline
        ])

        # App 2: hafs+warsh, uthmani, audio
        self.app2 = App.objects.create(
            name_en="App 2",
            name_ar="تطبيق 2",
            slug="app-2",
            short_description_en="Test",
            short_description_ar="اختبار",
            description_en="Description",
            description_ar="وصف",
            developer=self.developer,
            platform="ios",
            status='published'
        )
        self.link_metadata(self.app2, [
            self.opt_hafs, self.opt_warsh, self.opt_uthmani, self.opt_audio
        ])

    def test_filter_values_endpoint_returns_200(self):
        """Test that filter values endpoint returns 200."""
        response = self.client.get('/api/apps/metadata-values/')

        self.assertEqual(response.status_code, 200)

    def test_filter_values_structure(self):
        """Test the structure of filter values response."""
        response = self.client.get('/api/apps/metadata-values/')
        data = response.json()

        self.assertIn('platforms', data)
        self.assertIn('riwayah', data)
        self.assertIn('mushaf_type', data)
        self.assertIn('features', data)

    def test_filter_values_count(self):
        """Test that filter values include correct counts."""
        response = self.client.get('/api/apps/metadata-values/')
        data = response.json()

        # Find hafs in riwayah options
        hafs_option = next(
            (opt for opt in data['riwayah'] if opt['value'] == 'hafs'),
            None
        )
        self.assertIsNotNone(hafs_option)
        # Both test apps have hafs, but migration-seeded apps may also have hafs
        # So count >= 2
        self.assertGreaterEqual(hafs_option['count'], 2)

    def test_filter_values_labels(self):
        """Test that filter values include bilingual labels."""
        response = self.client.get('/api/apps/metadata-values/')
        data = response.json()

        # Check that options have both English and Arabic labels
        if data['riwayah']:
            option = data['riwayah'][0]
            self.assertIn('label_en', option)
            self.assertIn('label_ar', option)
            self.assertIn('value', option)
            self.assertIn('count', option)

    def test_filter_values_excludes_zero_count(self):
        """Test that filter values only include options with apps."""
        response = self.client.get('/api/apps/metadata-values/')
        data = response.json()

        # All options should have count > 0
        for option in data['riwayah']:
            self.assertGreater(option['count'], 0)

        for option in data['mushaf_type']:
            self.assertGreater(option['count'], 0)

        for option in data['features']:
            self.assertGreater(option['count'], 0)
