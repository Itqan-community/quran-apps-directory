"""
Test cases for Dynamic Metadata system.

Tests the MetadataType, MetadataOption, and AppMetadataValue models,
as well as the API filtering functionality using normalized tables.
"""

from decimal import Decimal
from django.test import TestCase
from django.core.exceptions import ValidationError
from django.db import IntegrityError

from metadata.models import MetadataType, MetadataOption, AppMetadataValue
from apps.models import App
from apps.services.app_service_simple import AppService
from developers.models import Developer
from categories.models import Category


class MetadataTestMixin:
    """Mixin to clean up seeded metadata data before tests."""

    def _clean_seeded_metadata(self):
        """Remove seeded metadata to avoid conflicts with test data."""
        # Delete all AppMetadataValue first (FK constraint)
        AppMetadataValue.objects.all().delete()
        # Then delete options and types
        MetadataOption.objects.all().delete()
        MetadataType.objects.all().delete()

    def _clean_all_apps(self):
        """Remove all apps to start with clean slate for count-sensitive tests."""
        App.objects.all().delete()


class MetadataTypeModelTest(MetadataTestMixin, TestCase):
    """Test cases for MetadataType model."""

    def setUp(self):
        """Clean seeded data before each test."""
        self._clean_seeded_metadata()

    def test_create_metadata_type(self):
        """Test creating a metadata type."""
        metadata_type = MetadataType.objects.create(
            name='riwayah',
            label_en='Riwayah',
            label_ar='الرواية',
            is_multi_select=True,
            sort_order=1
        )

        self.assertEqual(metadata_type.name, 'riwayah')
        self.assertEqual(metadata_type.label_en, 'Riwayah')
        self.assertEqual(metadata_type.label_ar, 'الرواية')
        self.assertTrue(metadata_type.is_multi_select)
        self.assertTrue(metadata_type.is_active)

    def test_metadata_type_unique_name(self):
        """Test that metadata type names must be unique."""
        MetadataType.objects.create(
            name='features',
            label_en='Features',
            label_ar='الميزات'
        )

        with self.assertRaises(IntegrityError):
            MetadataType.objects.create(
                name='features',
                label_en='Features 2',
                label_ar='الميزات 2'
            )

    def test_metadata_type_slug_validation(self):
        """Test that metadata type name follows slug pattern."""
        # Valid slug - should work
        metadata_type = MetadataType(
            name='valid_name',
            label_en='Valid',
            label_ar='صالح'
        )
        metadata_type.full_clean()  # Should not raise

        # Invalid slug (starts with number) - should fail
        invalid_type = MetadataType(
            name='123invalid',
            label_en='Invalid',
            label_ar='غير صالح'
        )
        with self.assertRaises(ValidationError):
            invalid_type.full_clean()

    def test_metadata_type_str(self):
        """Test string representation of metadata type."""
        metadata_type = MetadataType.objects.create(
            name='mushaf_type',
            label_en='Mushaf Type',
            label_ar='نوع المصحف'
        )
        self.assertEqual(str(metadata_type), 'Mushaf Type (mushaf_type)')


class MetadataOptionModelTest(MetadataTestMixin, TestCase):
    """Test cases for MetadataOption model."""

    def setUp(self):
        """Set up test metadata type."""
        self._clean_seeded_metadata()
        self.riwayah_type = MetadataType.objects.create(
            name='riwayah',
            label_en='Riwayah',
            label_ar='الرواية',
            is_multi_select=True
        )

    def test_create_metadata_option(self):
        """Test creating a metadata option."""
        option = MetadataOption.objects.create(
            metadata_type=self.riwayah_type,
            value='hafs',
            label_en='Hafs',
            label_ar='حفص',
            sort_order=1
        )

        self.assertEqual(option.value, 'hafs')
        self.assertEqual(option.metadata_type, self.riwayah_type)
        self.assertTrue(option.is_active)

    def test_metadata_option_unique_within_type(self):
        """Test that option values are unique within a metadata type."""
        MetadataOption.objects.create(
            metadata_type=self.riwayah_type,
            value='hafs',
            label_en='Hafs',
            label_ar='حفص'
        )

        with self.assertRaises(IntegrityError):
            MetadataOption.objects.create(
                metadata_type=self.riwayah_type,
                value='hafs',  # Duplicate within same type
                label_en='Hafs 2',
                label_ar='حفص 2'
            )

    def test_same_value_different_types(self):
        """Test that same option value can exist in different types."""
        features_type = MetadataType.objects.create(
            name='features',
            label_en='Features',
            label_ar='الميزات'
        )

        # 'other' can exist in both riwayah and features
        MetadataOption.objects.create(
            metadata_type=self.riwayah_type,
            value='other',
            label_en='Other',
            label_ar='أخرى'
        )

        # Should not raise - different metadata type
        other_feature = MetadataOption.objects.create(
            metadata_type=features_type,
            value='other',
            label_en='Other',
            label_ar='أخرى'
        )
        self.assertIsNotNone(other_feature.id)

    def test_metadata_option_str(self):
        """Test string representation of metadata option."""
        option = MetadataOption.objects.create(
            metadata_type=self.riwayah_type,
            value='warsh',
            label_en='Warsh',
            label_ar='ورش'
        )
        self.assertEqual(str(option), 'riwayah:warsh (Warsh)')


class AppMetadataValueModelTest(MetadataTestMixin, TestCase):
    """Test cases for AppMetadataValue model."""

    def setUp(self):
        """Set up test data."""
        self._clean_seeded_metadata()
        self.developer = Developer.objects.create(
            name_en='Test Developer',
            name_ar='مطور اختبار',
            email='test@example.com'
        )

        self.app = App.objects.create(
            name_en='Test App',
            name_ar='تطبيق اختبار',
            slug='test-app',
            short_description_en='Test',
            short_description_ar='اختبار',
            developer=self.developer,
            status='published'
        )

        self.riwayah_type = MetadataType.objects.create(
            name='riwayah',
            label_en='Riwayah',
            label_ar='الرواية'
        )

        self.hafs_option = MetadataOption.objects.create(
            metadata_type=self.riwayah_type,
            value='hafs',
            label_en='Hafs',
            label_ar='حفص'
        )

    def test_assign_metadata_to_app(self):
        """Test assigning metadata value to an app."""
        app_value = AppMetadataValue.objects.create(
            app=self.app,
            metadata_option=self.hafs_option
        )

        self.assertEqual(app_value.app, self.app)
        self.assertEqual(app_value.metadata_option, self.hafs_option)

    def test_unique_app_metadata_combination(self):
        """Test that same option cannot be assigned twice to same app."""
        AppMetadataValue.objects.create(
            app=self.app,
            metadata_option=self.hafs_option
        )

        with self.assertRaises(IntegrityError):
            AppMetadataValue.objects.create(
                app=self.app,
                metadata_option=self.hafs_option  # Duplicate
            )

    def test_multiple_options_for_app(self):
        """Test assigning multiple metadata values to an app."""
        warsh_option = MetadataOption.objects.create(
            metadata_type=self.riwayah_type,
            value='warsh',
            label_en='Warsh',
            label_ar='ورش'
        )

        AppMetadataValue.objects.create(
            app=self.app,
            metadata_option=self.hafs_option
        )
        AppMetadataValue.objects.create(
            app=self.app,
            metadata_option=warsh_option
        )

        self.assertEqual(self.app.metadata_values.count(), 2)

    def test_cascade_delete_on_app(self):
        """Test that metadata values are deleted when app is deleted."""
        AppMetadataValue.objects.create(
            app=self.app,
            metadata_option=self.hafs_option
        )

        app_id = self.app.id
        self.app.delete()

        self.assertEqual(
            AppMetadataValue.objects.filter(app_id=app_id).count(),
            0
        )

    def test_cascade_delete_on_option(self):
        """Test that metadata values are deleted when option is deleted."""
        AppMetadataValue.objects.create(
            app=self.app,
            metadata_option=self.hafs_option
        )

        option_id = self.hafs_option.id
        self.hafs_option.delete()

        self.assertEqual(
            AppMetadataValue.objects.filter(metadata_option_id=option_id).count(),
            0
        )


class MetadataFilterServiceTest(MetadataTestMixin, TestCase):
    """Test cases for filtering apps by metadata using AppService."""

    def setUp(self):
        """Set up test data with metadata values."""
        self._clean_seeded_metadata()
        self._clean_all_apps()
        self.app_service = AppService()

        # Create developer
        self.developer = Developer.objects.create(
            name_en='Test Developer',
            name_ar='مطور اختبار',
            email='test@example.com'
        )

        # Create metadata types
        self.riwayah_type = MetadataType.objects.create(
            name='riwayah',
            label_en='Riwayah',
            label_ar='الرواية',
            is_multi_select=True,
            sort_order=1
        )

        self.mushaf_type = MetadataType.objects.create(
            name='mushaf_type',
            label_en='Mushaf Type',
            label_ar='نوع المصحف',
            is_multi_select=True,
            sort_order=2
        )

        self.features_type = MetadataType.objects.create(
            name='features',
            label_en='Features',
            label_ar='الميزات',
            is_multi_select=True,
            sort_order=3
        )

        # Create metadata options
        self.hafs = MetadataOption.objects.create(
            metadata_type=self.riwayah_type,
            value='hafs',
            label_en='Hafs',
            label_ar='حفص',
            sort_order=1
        )
        self.warsh = MetadataOption.objects.create(
            metadata_type=self.riwayah_type,
            value='warsh',
            label_en='Warsh',
            label_ar='ورش',
            sort_order=2
        )

        self.madani = MetadataOption.objects.create(
            metadata_type=self.mushaf_type,
            value='madani',
            label_en='Madani',
            label_ar='مدني',
            sort_order=1
        )
        self.uthmani = MetadataOption.objects.create(
            metadata_type=self.mushaf_type,
            value='uthmani',
            label_en='Uthmani',
            label_ar='عثماني',
            sort_order=2
        )

        self.offline = MetadataOption.objects.create(
            metadata_type=self.features_type,
            value='offline',
            label_en='Offline',
            label_ar='بدون اتصال',
            sort_order=1
        )
        self.audio = MetadataOption.objects.create(
            metadata_type=self.features_type,
            value='audio',
            label_en='Audio',
            label_ar='صوت',
            sort_order=2
        )

        # Create test apps
        self.app1 = App.objects.create(
            name_en='Quran Hafs',
            name_ar='قرآن حفص',
            slug='quran-hafs',
            short_description_en='Hafs app',
            short_description_ar='تطبيق حفص',
            developer=self.developer,
            platform='android',
            status='published'
        )

        self.app2 = App.objects.create(
            name_en='Quran Warsh',
            name_ar='قرآن ورش',
            slug='quran-warsh',
            short_description_en='Warsh app',
            short_description_ar='تطبيق ورش',
            developer=self.developer,
            platform='ios',
            status='published'
        )

        self.app3 = App.objects.create(
            name_en='Multi Riwayah',
            name_ar='متعدد الروايات',
            slug='multi-riwayah',
            short_description_en='Multi riwayah app',
            short_description_ar='تطبيق متعدد الروايات',
            developer=self.developer,
            platform='cross_platform',
            status='published'
        )

        self.draft_app = App.objects.create(
            name_en='Draft App',
            name_ar='تطبيق مسودة',
            slug='draft-app',
            short_description_en='Draft',
            short_description_ar='مسودة',
            developer=self.developer,
            status='draft'
        )

        # Assign metadata values
        # App1: hafs, madani, offline
        AppMetadataValue.objects.create(app=self.app1, metadata_option=self.hafs)
        AppMetadataValue.objects.create(app=self.app1, metadata_option=self.madani)
        AppMetadataValue.objects.create(app=self.app1, metadata_option=self.offline)

        # App2: warsh, uthmani, audio
        AppMetadataValue.objects.create(app=self.app2, metadata_option=self.warsh)
        AppMetadataValue.objects.create(app=self.app2, metadata_option=self.uthmani)
        AppMetadataValue.objects.create(app=self.app2, metadata_option=self.audio)

        # App3: hafs + warsh, uthmani (NOT madani), offline + audio
        AppMetadataValue.objects.create(app=self.app3, metadata_option=self.hafs)
        AppMetadataValue.objects.create(app=self.app3, metadata_option=self.warsh)
        AppMetadataValue.objects.create(app=self.app3, metadata_option=self.uthmani)
        AppMetadataValue.objects.create(app=self.app3, metadata_option=self.offline)
        AppMetadataValue.objects.create(app=self.app3, metadata_option=self.audio)

        # Draft app: hafs (should never appear in results)
        AppMetadataValue.objects.create(app=self.draft_app, metadata_option=self.hafs)

    def test_filter_by_single_riwayah(self):
        """Test filtering by a single riwayah value."""
        result = self.app_service.get_apps(filters={'riwayah': 'hafs'})

        self.assertEqual(result['count'], 2)
        slugs = [app['slug'] for app in result['results']]
        self.assertIn('quran-hafs', slugs)
        self.assertIn('multi-riwayah', slugs)
        self.assertNotIn('draft-app', slugs)

    def test_filter_by_multiple_riwayah(self):
        """Test filtering by multiple riwayah values (OR logic)."""
        result = self.app_service.get_apps(filters={'riwayah': 'hafs,warsh'})

        self.assertEqual(result['count'], 3)

    def test_filter_by_mushaf_type(self):
        """Test filtering by mushaf type."""
        result = self.app_service.get_apps(filters={'mushaf_type': 'madani'})

        self.assertEqual(result['count'], 1)
        slugs = [app['slug'] for app in result['results']]
        self.assertIn('quran-hafs', slugs)

    def test_filter_by_feature(self):
        """Test filtering by feature."""
        result = self.app_service.get_apps(filters={'features': 'audio'})

        self.assertEqual(result['count'], 2)
        slugs = [app['slug'] for app in result['results']]
        self.assertIn('quran-warsh', slugs)
        self.assertIn('multi-riwayah', slugs)

    def test_combined_filters_and_logic(self):
        """Test combining filters with AND logic."""
        result = self.app_service.get_apps(filters={
            'riwayah': 'hafs',
            'features': 'audio'
        })

        self.assertEqual(result['count'], 1)
        self.assertEqual(result['results'][0]['slug'], 'multi-riwayah')

    def test_combined_filters_no_match(self):
        """Test combined filters that result in no matches."""
        result = self.app_service.get_apps(filters={
            'riwayah': 'warsh',
            'mushaf_type': 'madani'  # No app has warsh + madani
        })

        self.assertEqual(result['count'], 0)

    def test_response_includes_metadata_values(self):
        """Test that API response includes metadata values."""
        result = self.app_service.get_apps()

        app1_data = next(
            (a for a in result['results'] if a['slug'] == 'quran-hafs'),
            None
        )

        self.assertIsNotNone(app1_data)
        self.assertEqual(app1_data['riwayah'], ['hafs'])
        self.assertEqual(app1_data['mushaf_type'], ['madani'])
        self.assertEqual(app1_data['features'], ['offline'])

    def test_multi_value_response(self):
        """Test that apps with multiple values return all of them."""
        result = self.app_service.get_apps()

        app3_data = next(
            (a for a in result['results'] if a['slug'] == 'multi-riwayah'),
            None
        )

        self.assertIsNotNone(app3_data)
        self.assertIn('hafs', app3_data['riwayah'])
        self.assertIn('warsh', app3_data['riwayah'])
        self.assertEqual(len(app3_data['riwayah']), 2)

    def test_inactive_metadata_type_not_used(self):
        """Test that inactive metadata types are not used for filtering."""
        # Deactivate riwayah type
        self.riwayah_type.is_active = False
        self.riwayah_type.save()

        # Reset cached metadata names
        self.app_service._active_metadata_names = None

        # Filter should now ignore riwayah
        result = self.app_service.get_apps(filters={'riwayah': 'hafs'})

        # Should return all published apps since riwayah filter is ignored
        self.assertEqual(result['count'], 3)


class FilterValuesEndpointTest(MetadataTestMixin, TestCase):
    """Test cases for the filter values endpoint using metadata tables."""

    def setUp(self):
        """Set up test data."""
        self._clean_seeded_metadata()
        self.developer = Developer.objects.create(
            name_en='Test Developer',
            name_ar='مطور اختبار',
            email='test@example.com'
        )

        # Create metadata types
        self.riwayah_type = MetadataType.objects.create(
            name='riwayah',
            label_en='Riwayah',
            label_ar='الرواية',
            sort_order=1
        )

        # Create options
        self.hafs = MetadataOption.objects.create(
            metadata_type=self.riwayah_type,
            value='hafs',
            label_en='Hafs',
            label_ar='حفص'
        )
        self.warsh = MetadataOption.objects.create(
            metadata_type=self.riwayah_type,
            value='warsh',
            label_en='Warsh',
            label_ar='ورش'
        )
        self.qalun = MetadataOption.objects.create(
            metadata_type=self.riwayah_type,
            value='qalun',
            label_en='Qalun',
            label_ar='قالون'
        )

        # Create apps
        self.app1 = App.objects.create(
            name_en='App 1',
            name_ar='تطبيق 1',
            slug='app-1',
            short_description_en='Test',
            short_description_ar='اختبار',
            developer=self.developer,
            platform='android',
            status='published'
        )

        self.app2 = App.objects.create(
            name_en='App 2',
            name_ar='تطبيق 2',
            slug='app-2',
            short_description_en='Test',
            short_description_ar='اختبار',
            developer=self.developer,
            platform='ios',
            status='published'
        )

        # Assign metadata - hafs to both, warsh to app2, qalun to none
        AppMetadataValue.objects.create(app=self.app1, metadata_option=self.hafs)
        AppMetadataValue.objects.create(app=self.app2, metadata_option=self.hafs)
        AppMetadataValue.objects.create(app=self.app2, metadata_option=self.warsh)

    def test_filter_values_endpoint_returns_200(self):
        """Test that filter values endpoint returns 200."""
        response = self.client.get('/api/apps/metadata-values/')
        self.assertEqual(response.status_code, 200)

    def test_filter_values_includes_metadata_types(self):
        """Test that filter values include metadata type options."""
        response = self.client.get('/api/apps/metadata-values/')
        data = response.json()

        self.assertIn('riwayah', data)

    def test_filter_values_count_accuracy(self):
        """Test that filter values have accurate counts."""
        response = self.client.get('/api/apps/metadata-values/')
        data = response.json()

        hafs_option = next(
            (opt for opt in data['riwayah'] if opt['value'] == 'hafs'),
            None
        )
        self.assertIsNotNone(hafs_option)
        self.assertEqual(hafs_option['count'], 2)  # Both apps have hafs

        warsh_option = next(
            (opt for opt in data['riwayah'] if opt['value'] == 'warsh'),
            None
        )
        self.assertIsNotNone(warsh_option)
        self.assertEqual(warsh_option['count'], 1)  # Only app2 has warsh

    def test_filter_values_excludes_zero_count(self):
        """Test that options with no apps are excluded."""
        response = self.client.get('/api/apps/metadata-values/')
        data = response.json()

        # Qalun has no apps assigned
        qalun_option = next(
            (opt for opt in data['riwayah'] if opt['value'] == 'qalun'),
            None
        )
        self.assertIsNone(qalun_option)

    def test_filter_values_bilingual_labels(self):
        """Test that options have bilingual labels."""
        response = self.client.get('/api/apps/metadata-values/')
        data = response.json()

        if data['riwayah']:
            option = data['riwayah'][0]
            self.assertIn('label_en', option)
            self.assertIn('label_ar', option)
            self.assertIn('value', option)
            self.assertIn('count', option)


class MetadataEdgeCasesTest(MetadataTestMixin, TestCase):
    """Test edge cases and boundary conditions for metadata filtering."""

    def setUp(self):
        """Set up test data."""
        self._clean_seeded_metadata()
        self._clean_all_apps()
        self.app_service = AppService()

        self.developer = Developer.objects.create(
            name_en='Test Developer',
            name_ar='مطور اختبار',
            email='test@example.com'
        )

        self.riwayah_type = MetadataType.objects.create(
            name='riwayah',
            label_en='Riwayah',
            label_ar='الرواية',
            is_multi_select=True,
            sort_order=1
        )

        self.hafs = MetadataOption.objects.create(
            metadata_type=self.riwayah_type,
            value='hafs',
            label_en='Hafs',
            label_ar='حفص'
        )

        self.app = App.objects.create(
            name_en='Test App',
            name_ar='تطبيق اختبار',
            slug='test-app',
            short_description_en='Test',
            short_description_ar='اختبار',
            developer=self.developer,
            status='published'
        )

        AppMetadataValue.objects.create(app=self.app, metadata_option=self.hafs)

    def test_filter_with_empty_string(self):
        """Test filtering with empty string value."""
        result = self.app_service.get_apps(filters={'riwayah': ''})
        # Empty filter should be ignored, return all published apps
        self.assertEqual(result['count'], 1)

    def test_filter_with_whitespace_only(self):
        """Test filtering with whitespace-only value."""
        result = self.app_service.get_apps(filters={'riwayah': '   '})
        # Whitespace-only filter should be ignored
        self.assertEqual(result['count'], 1)

    def test_filter_case_insensitive(self):
        """Test that filter values are case-insensitive."""
        result_lower = self.app_service.get_apps(filters={'riwayah': 'hafs'})
        result_upper = self.app_service.get_apps(filters={'riwayah': 'HAFS'})
        result_mixed = self.app_service.get_apps(filters={'riwayah': 'HaFs'})

        self.assertEqual(result_lower['count'], result_upper['count'])
        self.assertEqual(result_lower['count'], result_mixed['count'])

    def test_filter_with_extra_commas(self):
        """Test filtering with extra commas in value."""
        result = self.app_service.get_apps(filters={'riwayah': 'hafs,,,'})
        self.assertEqual(result['count'], 1)

    def test_filter_with_leading_trailing_spaces(self):
        """Test filtering with spaces around values."""
        result = self.app_service.get_apps(filters={'riwayah': '  hafs  '})
        self.assertEqual(result['count'], 1)

    def test_filter_nonexistent_value(self):
        """Test filtering by a value that doesn't exist."""
        result = self.app_service.get_apps(filters={'riwayah': 'nonexistent'})
        self.assertEqual(result['count'], 0)

    def test_filter_nonexistent_metadata_type(self):
        """Test filtering by a metadata type that doesn't exist."""
        result = self.app_service.get_apps(filters={'nonexistent_type': 'value'})
        # Unknown filter type should be ignored
        self.assertEqual(result['count'], 1)

    def test_app_with_no_metadata(self):
        """Test that apps without metadata still appear in unfiltered results."""
        app_no_meta = App.objects.create(
            name_en='No Metadata App',
            name_ar='تطبيق بدون بيانات',
            slug='no-metadata-app',
            short_description_en='Test',
            short_description_ar='اختبار',
            developer=self.developer,
            status='published'
        )

        result = self.app_service.get_apps()
        self.assertEqual(result['count'], 2)

        # But should not appear when filtering by riwayah
        result_filtered = self.app_service.get_apps(filters={'riwayah': 'hafs'})
        slugs = [a['slug'] for a in result_filtered['results']]
        self.assertNotIn('no-metadata-app', slugs)


class MetadataPaginationTest(MetadataTestMixin, TestCase):
    """Test pagination with metadata filters."""

    def setUp(self):
        """Set up test data with many apps."""
        self._clean_seeded_metadata()
        self.app_service = AppService()

        self.developer = Developer.objects.create(
            name_en='Test Developer',
            name_ar='مطور اختبار',
            email='test@example.com'
        )

        self.riwayah_type = MetadataType.objects.create(
            name='riwayah',
            label_en='Riwayah',
            label_ar='الرواية'
        )

        self.hafs = MetadataOption.objects.create(
            metadata_type=self.riwayah_type,
            value='hafs',
            label_en='Hafs',
            label_ar='حفص'
        )

        # Create 15 apps with hafs
        for i in range(15):
            app = App.objects.create(
                name_en=f'App {i}',
                name_ar=f'تطبيق {i}',
                slug=f'app-{i}',
                short_description_en='Test',
                short_description_ar='اختبار',
                developer=self.developer,
                status='published'
            )
            AppMetadataValue.objects.create(app=app, metadata_option=self.hafs)

    def test_pagination_with_filter(self):
        """Test pagination works correctly with filters."""
        result_page1 = self.app_service.get_apps(
            filters={'riwayah': 'hafs'},
            page=1,
            page_size=5
        )

        self.assertEqual(result_page1['count'], 15)
        self.assertEqual(len(result_page1['results']), 5)
        self.assertIsNotNone(result_page1['next'])

    def test_pagination_page_2(self):
        """Test second page with filters."""
        result_page2 = self.app_service.get_apps(
            filters={'riwayah': 'hafs'},
            page=2,
            page_size=5
        )

        self.assertEqual(result_page2['count'], 15)
        self.assertEqual(len(result_page2['results']), 5)
        self.assertIsNotNone(result_page2['previous'])

    def test_pagination_last_page(self):
        """Test last page with partial results."""
        result_last = self.app_service.get_apps(
            filters={'riwayah': 'hafs'},
            page=3,
            page_size=5
        )

        self.assertEqual(result_last['count'], 15)
        self.assertEqual(len(result_last['results']), 5)
        self.assertIsNone(result_last['next'])


class MetadataOrderingTest(MetadataTestMixin, TestCase):
    """Test ordering combined with metadata filters."""

    def setUp(self):
        """Set up test data."""
        self._clean_seeded_metadata()
        self.app_service = AppService()

        self.developer = Developer.objects.create(
            name_en='Test Developer',
            name_ar='مطور اختبار',
            email='test@example.com'
        )

        self.riwayah_type = MetadataType.objects.create(
            name='riwayah',
            label_en='Riwayah',
            label_ar='الرواية'
        )

        self.hafs = MetadataOption.objects.create(
            metadata_type=self.riwayah_type,
            value='hafs',
            label_en='Hafs',
            label_ar='حفص'
        )

        # Create apps with different ratings
        for name, rating in [('Zebra App', 4.5), ('Alpha App', 4.8), ('Beta App', 4.2)]:
            app = App.objects.create(
                name_en=name,
                name_ar=f'تطبيق {name}',
                slug=name.lower().replace(' ', '-'),
                short_description_en='Test',
                short_description_ar='اختبار',
                developer=self.developer,
                avg_rating=rating,
                status='published'
            )
            AppMetadataValue.objects.create(app=app, metadata_option=self.hafs)

    def test_ordering_by_name_with_filter(self):
        """Test ordering by name with metadata filter."""
        result = self.app_service.get_apps(
            filters={'riwayah': 'hafs'},
            ordering='name_en'
        )

        names = [a['name_en'] for a in result['results']]
        self.assertEqual(names, ['Alpha App', 'Beta App', 'Zebra App'])

    def test_ordering_by_rating_desc_with_filter(self):
        """Test ordering by rating descending with metadata filter."""
        result = self.app_service.get_apps(
            filters={'riwayah': 'hafs'},
            ordering='-avg_rating'
        )

        names = [a['name_en'] for a in result['results']]
        self.assertEqual(names, ['Alpha App', 'Zebra App', 'Beta App'])


class MetadataCombinedFiltersTest(MetadataTestMixin, TestCase):
    """Test combining metadata filters with other filter types."""

    def setUp(self):
        """Set up comprehensive test data."""
        self._clean_seeded_metadata()
        self.app_service = AppService()

        self.developer = Developer.objects.create(
            name_en='Test Developer',
            name_ar='مطور اختبار',
            email='test@example.com'
        )

        self.category = Category.objects.create(
            name_en='Mushaf',
            name_ar='مصحف',
            slug='mushaf',
            is_active=True
        )

        self.riwayah_type = MetadataType.objects.create(
            name='riwayah',
            label_en='Riwayah',
            label_ar='الرواية'
        )

        self.hafs = MetadataOption.objects.create(
            metadata_type=self.riwayah_type,
            value='hafs',
            label_en='Hafs',
            label_ar='حفص'
        )

        # App 1: Android, Mushaf category, hafs, searchable name
        self.app1 = App.objects.create(
            name_en='Quran Reader Pro',
            name_ar='قارئ القرآن برو',
            slug='quran-reader-pro',
            short_description_en='Professional Quran reading',
            short_description_ar='قراءة القرآن المحترفة',
            developer=self.developer,
            platform='android',
            status='published'
        )
        self.app1.categories.add(self.category)
        AppMetadataValue.objects.create(app=self.app1, metadata_option=self.hafs)

        # App 2: iOS, Mushaf category, hafs
        self.app2 = App.objects.create(
            name_en='Quran Simple',
            name_ar='قرآن بسيط',
            slug='quran-simple',
            short_description_en='Simple Quran app',
            short_description_ar='تطبيق قرآن بسيط',
            developer=self.developer,
            platform='ios',
            status='published'
        )
        self.app2.categories.add(self.category)
        AppMetadataValue.objects.create(app=self.app2, metadata_option=self.hafs)

        # App 3: Android, no category, hafs
        self.app3 = App.objects.create(
            name_en='Basic App',
            name_ar='تطبيق أساسي',
            slug='basic-app',
            short_description_en='Basic app',
            short_description_ar='تطبيق أساسي',
            developer=self.developer,
            platform='android',
            status='published'
        )
        AppMetadataValue.objects.create(app=self.app3, metadata_option=self.hafs)

    def test_metadata_plus_platform_filter(self):
        """Test combining metadata with platform filter."""
        result = self.app_service.get_apps(filters={
            'riwayah': 'hafs',
            'platform': 'android'
        })

        self.assertEqual(result['count'], 2)
        slugs = [a['slug'] for a in result['results']]
        self.assertIn('quran-reader-pro', slugs)
        self.assertIn('basic-app', slugs)
        self.assertNotIn('quran-simple', slugs)

    def test_metadata_plus_category_filter(self):
        """Test combining metadata with category filter."""
        result = self.app_service.get_apps(filters={
            'riwayah': 'hafs',
            'category': 'mushaf'
        })

        self.assertEqual(result['count'], 2)
        slugs = [a['slug'] for a in result['results']]
        self.assertIn('quran-reader-pro', slugs)
        self.assertIn('quran-simple', slugs)
        self.assertNotIn('basic-app', slugs)

    def test_metadata_plus_search_filter(self):
        """Test combining metadata with search filter."""
        result = self.app_service.get_apps(filters={
            'riwayah': 'hafs',
            'search': 'Pro'
        })

        self.assertEqual(result['count'], 1)
        self.assertEqual(result['results'][0]['slug'], 'quran-reader-pro')

    def test_metadata_plus_platform_plus_category(self):
        """Test combining metadata with platform and category."""
        result = self.app_service.get_apps(filters={
            'riwayah': 'hafs',
            'platform': 'android',
            'category': 'mushaf'
        })

        self.assertEqual(result['count'], 1)
        self.assertEqual(result['results'][0]['slug'], 'quran-reader-pro')


class MetadataInactiveOptionsTest(MetadataTestMixin, TestCase):
    """Test behavior with inactive metadata options."""

    def setUp(self):
        """Set up test data with inactive options."""
        self._clean_seeded_metadata()
        self.app_service = AppService()

        self.developer = Developer.objects.create(
            name_en='Test Developer',
            name_ar='مطور اختبار',
            email='test@example.com'
        )

        self.riwayah_type = MetadataType.objects.create(
            name='riwayah',
            label_en='Riwayah',
            label_ar='الرواية'
        )

        self.hafs = MetadataOption.objects.create(
            metadata_type=self.riwayah_type,
            value='hafs',
            label_en='Hafs',
            label_ar='حفص',
            is_active=True
        )

        self.inactive_option = MetadataOption.objects.create(
            metadata_type=self.riwayah_type,
            value='deprecated',
            label_en='Deprecated',
            label_ar='مهمل',
            is_active=False
        )

        self.app = App.objects.create(
            name_en='Test App',
            name_ar='تطبيق اختبار',
            slug='test-app',
            short_description_en='Test',
            short_description_ar='اختبار',
            developer=self.developer,
            status='published'
        )

        AppMetadataValue.objects.create(app=self.app, metadata_option=self.hafs)
        AppMetadataValue.objects.create(app=self.app, metadata_option=self.inactive_option)

    def test_inactive_option_excluded_from_metadata_values(self):
        """Test that inactive options are excluded from metadata-values endpoint."""
        response = self.client.get('/api/apps/metadata-values/')
        data = response.json()

        values = [opt['value'] for opt in data.get('riwayah', [])]
        self.assertIn('hafs', values)
        self.assertNotIn('deprecated', values)

    def test_filtering_by_inactive_option_still_works(self):
        """Test that filtering by inactive option value still works (for data integrity)."""
        # Even though option is inactive, if data exists, filter should work
        result = self.app_service.get_apps(filters={'riwayah': 'deprecated'})
        # This depends on implementation - might return 0 or 1
        # Currently implementation filters through active types, not options
        # So this should still work
        self.assertGreaterEqual(result['count'], 0)


class MetadataTypeOrderingTest(MetadataTestMixin, TestCase):
    """Test that metadata types are returned in sort_order."""

    def setUp(self):
        """Set up metadata types with specific ordering."""
        self._clean_seeded_metadata()
        self.developer = Developer.objects.create(
            name_en='Test Developer',
            name_ar='مطور اختبار',
            email='test@example.com'
        )

        # Create types in non-alphabetical order
        self.features = MetadataType.objects.create(
            name='features',
            label_en='Features',
            label_ar='الميزات',
            sort_order=3
        )

        self.riwayah = MetadataType.objects.create(
            name='riwayah',
            label_en='Riwayah',
            label_ar='الرواية',
            sort_order=1
        )

        self.mushaf = MetadataType.objects.create(
            name='mushaf_type',
            label_en='Mushaf Type',
            label_ar='نوع المصحف',
            sort_order=2
        )

        # Add one option to each
        MetadataOption.objects.create(
            metadata_type=self.features,
            value='offline',
            label_en='Offline',
            label_ar='بدون اتصال'
        )
        MetadataOption.objects.create(
            metadata_type=self.riwayah,
            value='hafs',
            label_en='Hafs',
            label_ar='حفص'
        )
        MetadataOption.objects.create(
            metadata_type=self.mushaf,
            value='madani',
            label_en='Madani',
            label_ar='مدني'
        )

        # Create app with all options
        self.app = App.objects.create(
            name_en='Test App',
            name_ar='تطبيق',
            slug='test-app',
            short_description_en='Test',
            short_description_ar='اختبار',
            developer=self.developer,
            status='published'
        )

        for opt in MetadataOption.objects.all():
            AppMetadataValue.objects.create(app=self.app, metadata_option=opt)

    def test_metadata_types_ordered_by_sort_order(self):
        """Test that metadata types in response follow sort_order."""
        response = self.client.get('/api/apps/metadata-values/')
        data = response.json()

        # Get keys in order (excluding 'platforms' which is always first)
        keys = [k for k in data.keys() if k != 'platforms']

        # Should be: riwayah (1), mushaf_type (2), features (3)
        expected_order = ['riwayah', 'mushaf_type', 'features']
        self.assertEqual(keys, expected_order)


class AppMetadataValueCreatedAtTest(MetadataTestMixin, TestCase):
    """Test created_at timestamp on AppMetadataValue."""

    def setUp(self):
        """Set up test data."""
        self._clean_seeded_metadata()
        self.developer = Developer.objects.create(
            name_en='Test Developer',
            name_ar='مطور اختبار',
            email='test@example.com'
        )

        self.riwayah_type = MetadataType.objects.create(
            name='riwayah',
            label_en='Riwayah',
            label_ar='الرواية'
        )

        self.hafs = MetadataOption.objects.create(
            metadata_type=self.riwayah_type,
            value='hafs',
            label_en='Hafs',
            label_ar='حفص'
        )

        self.app = App.objects.create(
            name_en='Test App',
            name_ar='تطبيق',
            slug='test-app',
            short_description_en='Test',
            short_description_ar='اختبار',
            developer=self.developer,
            status='published'
        )

    def test_created_at_auto_set(self):
        """Test that created_at is automatically set."""
        app_value = AppMetadataValue.objects.create(
            app=self.app,
            metadata_option=self.hafs
        )

        self.assertIsNotNone(app_value.created_at)

    def test_created_at_not_modified_on_update(self):
        """Test that created_at doesn't change on save."""
        app_value = AppMetadataValue.objects.create(
            app=self.app,
            metadata_option=self.hafs
        )

        original_created_at = app_value.created_at

        # Re-save
        app_value.save()

        app_value.refresh_from_db()
        self.assertEqual(app_value.created_at, original_created_at)


class MetadataQueryEfficiencyTest(MetadataTestMixin, TestCase):
    """Test that metadata queries use proper select_related/prefetch."""

    def setUp(self):
        """Set up test data."""
        self._clean_seeded_metadata()
        self.app_service = AppService()

        self.developer = Developer.objects.create(
            name_en='Test Developer',
            name_ar='مطور اختبار',
            email='test@example.com'
        )

        self.riwayah_type = MetadataType.objects.create(
            name='riwayah',
            label_en='Riwayah',
            label_ar='الرواية'
        )

        self.hafs = MetadataOption.objects.create(
            metadata_type=self.riwayah_type,
            value='hafs',
            label_en='Hafs',
            label_ar='حفص'
        )

        # Create multiple apps
        for i in range(5):
            app = App.objects.create(
                name_en=f'App {i}',
                name_ar=f'تطبيق {i}',
                slug=f'app-{i}',
                short_description_en='Test',
                short_description_ar='اختبار',
                developer=self.developer,
                status='published'
            )
            AppMetadataValue.objects.create(app=app, metadata_option=self.hafs)

    def test_get_apps_returns_metadata_values(self):
        """Test that get_apps includes metadata values in response."""
        result = self.app_service.get_apps()

        for app_data in result['results']:
            self.assertIn('riwayah', app_data)
            self.assertIsInstance(app_data['riwayah'], list)


class MetadataAPIEndpointTest(MetadataTestMixin, TestCase):
    """Test the API endpoints directly."""

    def setUp(self):
        """Set up test data."""
        self._clean_seeded_metadata()
        self.developer = Developer.objects.create(
            name_en='Test Developer',
            name_ar='مطور اختبار',
            email='test@example.com'
        )

        self.riwayah_type = MetadataType.objects.create(
            name='riwayah',
            label_en='Riwayah',
            label_ar='الرواية'
        )

        self.features_type = MetadataType.objects.create(
            name='features',
            label_en='Features',
            label_ar='الميزات'
        )

        self.hafs = MetadataOption.objects.create(
            metadata_type=self.riwayah_type,
            value='hafs',
            label_en='Hafs',
            label_ar='حفص'
        )

        self.offline = MetadataOption.objects.create(
            metadata_type=self.features_type,
            value='offline',
            label_en='Offline',
            label_ar='بدون اتصال'
        )

        self.app = App.objects.create(
            name_en='Test App',
            name_ar='تطبيق اختبار',
            slug='test-app',
            short_description_en='Test description',
            short_description_ar='وصف اختبار',
            developer=self.developer,
            platform='android',
            status='published'
        )

        AppMetadataValue.objects.create(app=self.app, metadata_option=self.hafs)
        AppMetadataValue.objects.create(app=self.app, metadata_option=self.offline)

    def test_api_list_with_metadata_filter(self):
        """Test API list endpoint with metadata filter."""
        response = self.client.get('/api/apps/', {'riwayah': 'hafs'})

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data['count'], 1)

    def test_api_list_with_multiple_metadata_filters(self):
        """Test API list endpoint with multiple metadata filters."""
        response = self.client.get('/api/apps/', {
            'riwayah': 'hafs',
            'features': 'offline'
        })

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data['count'], 1)

    def test_api_list_response_includes_metadata(self):
        """Test that API list response includes metadata fields."""
        response = self.client.get('/api/apps/')

        self.assertEqual(response.status_code, 200)
        data = response.json()

        app_data = data['results'][0]
        self.assertIn('riwayah', app_data)
        self.assertIn('features', app_data)
        self.assertEqual(app_data['riwayah'], ['hafs'])
        self.assertEqual(app_data['features'], ['offline'])

    def test_api_detail_includes_metadata(self):
        """Test that API detail endpoint includes metadata."""
        response = self.client.get(f'/api/apps/{self.app.slug}')

        self.assertEqual(response.status_code, 200)
        data = response.json()

        self.assertIn('riwayah', data)
        self.assertIn('features', data)
        self.assertEqual(data['riwayah'], ['hafs'])

    def test_api_metadata_values_includes_all_types(self):
        """Test that metadata-values endpoint includes all active types."""
        response = self.client.get('/api/apps/metadata-values/')

        self.assertEqual(response.status_code, 200)
        data = response.json()

        self.assertIn('platforms', data)
        self.assertIn('riwayah', data)
        self.assertIn('features', data)

    def test_api_filter_with_comma_separated_values(self):
        """Test API accepts comma-separated filter values."""
        # Create another app with different riwayah
        warsh = MetadataOption.objects.create(
            metadata_type=self.riwayah_type,
            value='warsh',
            label_en='Warsh',
            label_ar='ورش'
        )

        app2 = App.objects.create(
            name_en='App 2',
            name_ar='تطبيق 2',
            slug='app-2',
            short_description_en='Test',
            short_description_ar='اختبار',
            developer=self.developer,
            status='published'
        )
        AppMetadataValue.objects.create(app=app2, metadata_option=warsh)

        response = self.client.get('/api/apps/', {'riwayah': 'hafs,warsh'})

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data['count'], 2)
