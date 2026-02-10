"""
Test cases for Hybrid Semantic Search (Story 1.7).

Tests the hybrid search service, metadata boosting, facet calculation,
API endpoint, and prepare_app_text metadata sections.
"""

from decimal import Decimal
from unittest.mock import patch, MagicMock, PropertyMock

from django.test import TestCase, override_settings

from apps.models import App
from developers.models import Developer
from categories.models import Category
from metadata.models import MetadataType, MetadataOption, AppMetadataValue


# =============================================================================
# Shared Test Mixin
# =============================================================================

class HybridSearchTestMixin:
    """Shared test data setup for hybrid search tests."""

    def create_test_data(self):
        """Create test metadata types, options, apps, and link them.

        Uses get_or_create for metadata since migrations already seed these records.
        """
        # --- Metadata Types (seeded by migration 0002_seed_metadata) ---
        self.mt_riwayah, _ = MetadataType.objects.get_or_create(
            name='riwayah',
            defaults={'label_en': 'Riwayah', 'label_ar': 'الرواية', 'is_active': True},
        )
        self.mt_riwayah.is_active = True
        self.mt_riwayah.save(update_fields=['is_active'])

        self.mt_features, _ = MetadataType.objects.get_or_create(
            name='features',
            defaults={'label_en': 'Features', 'label_ar': 'المميزات', 'is_active': True},
        )
        self.mt_features.is_active = True
        self.mt_features.save(update_fields=['is_active'])

        self.mt_mushaf_type, _ = MetadataType.objects.get_or_create(
            name='mushaf_type',
            defaults={'label_en': 'Mushaf Type', 'label_ar': 'نوع المصحف', 'is_active': True},
        )
        self.mt_mushaf_type.is_active = True
        self.mt_mushaf_type.save(update_fields=['is_active'])

        # --- Metadata Options (seeded by migration 0002_seed_metadata) ---
        self.opt_hafs, _ = MetadataOption.objects.get_or_create(
            metadata_type=self.mt_riwayah, value='hafs',
            defaults={'label_en': 'Hafs', 'label_ar': 'حفص'},
        )
        self.opt_warsh, _ = MetadataOption.objects.get_or_create(
            metadata_type=self.mt_riwayah, value='warsh',
            defaults={'label_en': 'Warsh', 'label_ar': 'ورش'},
        )
        self.opt_offline, _ = MetadataOption.objects.get_or_create(
            metadata_type=self.mt_features, value='offline',
            defaults={'label_en': 'Offline Mode', 'label_ar': 'بدون إنترنت'},
        )
        self.opt_audio, _ = MetadataOption.objects.get_or_create(
            metadata_type=self.mt_features, value='audio',
            defaults={'label_en': 'Audio Recitation', 'label_ar': 'تلاوة صوتية'},
        )
        self.opt_dark_mode, _ = MetadataOption.objects.get_or_create(
            metadata_type=self.mt_features, value='dark_mode',
            defaults={'label_en': 'Dark Mode', 'label_ar': 'الوضع الداكن'},
        )
        self.opt_madani, _ = MetadataOption.objects.get_or_create(
            metadata_type=self.mt_mushaf_type, value='madani',
            defaults={'label_en': 'Madani', 'label_ar': 'مدني'},
        )
        self.opt_uthmani, _ = MetadataOption.objects.get_or_create(
            metadata_type=self.mt_mushaf_type, value='uthmani',
            defaults={'label_en': 'Uthmani', 'label_ar': 'عثماني'},
        )

        # --- Developer ---
        self.developer = Developer.objects.create(
            name_en='Test Developer',
            name_ar='مطور اختبار',
            email='test@example.com',
            is_verified=True,
        )

        # --- Categories ---
        self.cat_mushaf = Category.objects.create(
            name_en='Mushaf', name_ar='مصحف', slug='mushaf', is_active=True
        )
        self.cat_tafsir = Category.objects.create(
            name_en='Tafsir', name_ar='تفسير', slug='tafsir', is_active=True
        )

        # --- Apps ---
        # App 1: hafs, offline+audio, madani, android
        self.app1 = App.objects.create(
            name_en='Quran Hafs Offline',
            name_ar='قرآن حفص بدون نت',
            slug='quran-hafs-offline',
            short_description_en='Offline quran with hafs',
            short_description_ar='قرآن حفص بدون نت',
            description_en='Full offline quran app',
            description_ar='تطبيق قرآن كامل بدون نت',
            developer=self.developer,
            platform='android',
            avg_rating=Decimal('4.5'),
            status='published',
        )
        self.app1.categories.add(self.cat_mushaf)

        # App 2: warsh, offline, uthmani, ios
        self.app2 = App.objects.create(
            name_en='Quran Warsh',
            name_ar='قرآن ورش',
            slug='quran-warsh',
            short_description_en='Warsh recitation app',
            short_description_ar='تطبيق رواية ورش',
            description_en='Quran with warsh recitation',
            description_ar='قرآن برواية ورش',
            developer=self.developer,
            platform='ios',
            avg_rating=Decimal('4.2'),
            status='published',
        )
        self.app2.categories.add(self.cat_mushaf)

        # App 3: hafs+warsh, audio+dark_mode, madani, cross_platform
        self.app3 = App.objects.create(
            name_en='Multi Riwayah App',
            name_ar='تطبيق متعدد الروايات',
            slug='multi-riwayah-app',
            short_description_en='Supports multiple riwayat',
            short_description_ar='يدعم روايات متعددة',
            description_en='A comprehensive quran app',
            description_ar='تطبيق قرآن شامل',
            developer=self.developer,
            platform='cross_platform',
            avg_rating=Decimal('4.8'),
            status='published',
        )
        self.app3.categories.add(self.cat_mushaf, self.cat_tafsir)

        # App 4: no metadata, android, tafsir category
        self.app4 = App.objects.create(
            name_en='Tafsir Only App',
            name_ar='تطبيق تفسير فقط',
            slug='tafsir-only-app',
            short_description_en='Tafsir app',
            short_description_ar='تطبيق تفسير',
            description_en='Simple tafsir app',
            description_ar='تطبيق تفسير بسيط',
            developer=self.developer,
            platform='android',
            avg_rating=Decimal('4.0'),
            status='published',
        )
        self.app4.categories.add(self.cat_tafsir)

        # App 5: Draft (should never appear)
        self.app_draft = App.objects.create(
            name_en='Draft App',
            name_ar='تطبيق مسودة',
            slug='draft-app',
            short_description_en='Draft',
            short_description_ar='مسودة',
            description_en='Draft app',
            description_ar='تطبيق مسودة',
            developer=self.developer,
            platform='android',
            status='draft',
        )

        # --- Link Apps to Metadata (AppMetadataValue) ---
        # App 1: hafs, offline, audio, madani
        AppMetadataValue.objects.create(app=self.app1, metadata_option=self.opt_hafs)
        AppMetadataValue.objects.create(app=self.app1, metadata_option=self.opt_offline)
        AppMetadataValue.objects.create(app=self.app1, metadata_option=self.opt_audio)
        AppMetadataValue.objects.create(app=self.app1, metadata_option=self.opt_madani)

        # App 2: warsh, offline, uthmani
        AppMetadataValue.objects.create(app=self.app2, metadata_option=self.opt_warsh)
        AppMetadataValue.objects.create(app=self.app2, metadata_option=self.opt_offline)
        AppMetadataValue.objects.create(app=self.app2, metadata_option=self.opt_uthmani)

        # App 3: hafs, warsh, audio, dark_mode, madani
        AppMetadataValue.objects.create(app=self.app3, metadata_option=self.opt_hafs)
        AppMetadataValue.objects.create(app=self.app3, metadata_option=self.opt_warsh)
        AppMetadataValue.objects.create(app=self.app3, metadata_option=self.opt_audio)
        AppMetadataValue.objects.create(app=self.app3, metadata_option=self.opt_dark_mode)
        AppMetadataValue.objects.create(app=self.app3, metadata_option=self.opt_madani)

        # App 4: no metadata
        # Draft app: hafs (should not appear)
        AppMetadataValue.objects.create(app=self.app_draft, metadata_option=self.opt_hafs)


def _mock_embedding():
    """Return a fake 768-dim embedding vector."""
    return [0.1] * 768


# =============================================================================
# Class 1: HybridSearchServiceTest
# =============================================================================

class HybridSearchServiceTest(HybridSearchTestMixin, TestCase):
    """Tests AISearchService.hybrid_search() directly."""

    def setUp(self):
        self.create_test_data()

        # Patch the AI provider so we never call real APIs
        self.provider_patcher = patch(
            'core.services.search.service.AISearchFactory.get_provider'
        )
        self.mock_get_provider = self.provider_patcher.start()
        self.mock_provider = MagicMock()
        self.mock_provider.get_embedding.return_value = _mock_embedding()
        self.mock_provider.rerank.side_effect = lambda q, docs: docs  # passthrough
        self.mock_get_provider.return_value = self.mock_provider

        # Generate embeddings for test apps so vector search works
        from core.services.search import AISearchService
        embedding = _mock_embedding()
        App.objects.filter(status='published').update(embedding=embedding)

        self.service = AISearchService()

    def tearDown(self):
        self.provider_patcher.stop()

    def test_hybrid_search_returns_results(self):
        """Basic query returns results dict with 'results' and 'facets' keys."""
        result = self.service.hybrid_search(query='quran')

        self.assertIn('results', result)
        self.assertIn('facets', result)
        self.assertGreater(len(result['results']), 0)

    def test_hybrid_search_no_embedding_returns_empty(self):
        """When provider returns empty embedding, returns empty results."""
        self.mock_provider.get_embedding.return_value = []

        result = self.service.hybrid_search(query='quran')

        self.assertEqual(result['results'], [])
        self.assertEqual(result['facets'], {})

    def test_hybrid_search_with_riwayah_prefilter(self):
        """Filtering by riwayah=hafs returns only apps with hafs assigned."""
        result = self.service.hybrid_search(
            query='quran',
            filters={'riwayah': ['hafs']},
            include_facets=False,
        )

        app_ids = [app.id for app in result['results']]
        self.assertIn(self.app1.id, app_ids)
        self.assertIn(self.app3.id, app_ids)
        self.assertNotIn(self.app2.id, app_ids)
        self.assertNotIn(self.app4.id, app_ids)

    def test_hybrid_search_with_features_prefilter(self):
        """Filtering by features=offline returns only apps with offline."""
        result = self.service.hybrid_search(
            query='quran',
            filters={'features': ['offline']},
            include_facets=False,
        )

        app_ids = [app.id for app in result['results']]
        self.assertIn(self.app1.id, app_ids)
        self.assertIn(self.app2.id, app_ids)
        self.assertNotIn(self.app3.id, app_ids)  # no offline
        self.assertNotIn(self.app4.id, app_ids)

    def test_hybrid_search_combined_filters_and_logic(self):
        """riwayah=hafs AND features=audio returns intersection."""
        result = self.service.hybrid_search(
            query='quran',
            filters={'riwayah': ['hafs'], 'features': ['audio']},
            include_facets=False,
        )

        app_ids = [app.id for app in result['results']]
        # App1 has hafs+audio, App3 has hafs+audio
        self.assertIn(self.app1.id, app_ids)
        self.assertIn(self.app3.id, app_ids)
        # App2 has warsh (no hafs), App4 has nothing
        self.assertNotIn(self.app2.id, app_ids)
        self.assertNotIn(self.app4.id, app_ids)

    def test_hybrid_search_platform_filter(self):
        """platform=android filters correctly."""
        result = self.service.hybrid_search(
            query='quran',
            filters={'platform': ['android']},
            include_facets=False,
        )

        for app in result['results']:
            self.assertEqual(app.platform, 'android')

    def test_hybrid_search_category_filter(self):
        """category=mushaf filters correctly."""
        result = self.service.hybrid_search(
            query='quran',
            filters={'category': ['mushaf']},
            include_facets=False,
        )

        app_ids = [app.id for app in result['results']]
        self.assertIn(self.app1.id, app_ids)
        self.assertIn(self.app2.id, app_ids)
        self.assertIn(self.app3.id, app_ids)
        self.assertNotIn(self.app4.id, app_ids)  # tafsir only

    def test_hybrid_search_no_filters_returns_all_published(self):
        """No filters returns all published apps."""
        result = self.service.hybrid_search(
            query='quran',
            filters=None,
            include_facets=False,
        )

        app_ids = [app.id for app in result['results']]
        self.assertIn(self.app1.id, app_ids)
        self.assertIn(self.app2.id, app_ids)
        self.assertIn(self.app3.id, app_ids)
        self.assertIn(self.app4.id, app_ids)

    def test_hybrid_search_excludes_draft_apps(self):
        """Draft apps never in results."""
        # Give draft app an embedding too
        App.objects.filter(id=self.app_draft.id).update(embedding=_mock_embedding())

        result = self.service.hybrid_search(query='quran')

        app_ids = [app.id for app in result['results']]
        self.assertNotIn(self.app_draft.id, app_ids)

    def test_hybrid_search_nonexistent_filter_returns_empty(self):
        """Invalid filter value returns 0 results."""
        result = self.service.hybrid_search(
            query='quran',
            filters={'riwayah': ['qalun']},
            include_facets=False,
        )

        self.assertEqual(len(result['results']), 0)


# =============================================================================
# Class 2: MetadataBoostTest
# =============================================================================

class MetadataBoostTest(HybridSearchTestMixin, TestCase):
    """Tests _calculate_metadata_boost()."""

    def setUp(self):
        self.create_test_data()

        # We need a service instance but don't need a real provider for boost calc
        with patch('core.services.search.service.AISearchFactory.get_provider'):
            from core.services.search import AISearchService
            self.service = AISearchService()

    def test_boost_increases_when_query_matches_metadata(self):
        """Query 'offline quran' boosts apps with features=offline."""
        boost, reasons = self.service._calculate_metadata_boost(self.app1, 'offline quran')

        self.assertGreater(boost, 1.0)

    def test_boost_matches_arabic_keywords(self):
        """Arabic query matches Arabic metadata labels."""
        # 'حفص' is the Arabic label for hafs
        boost, reasons = self.service._calculate_metadata_boost(self.app1, 'قرآن حفص')

        self.assertGreater(boost, 1.0)
        values = [r['value'] for r in reasons]
        self.assertIn('hafs', values)

    def test_boost_matches_label_words(self):
        """Query 'dark' matches 'Dark Mode' label."""
        boost, reasons = self.service._calculate_metadata_boost(self.app3, 'dark theme')

        self.assertGreater(boost, 1.0)
        values = [r['value'] for r in reasons]
        self.assertIn('dark_mode', values)

    def test_boost_capped_at_2_0(self):
        """Boost never exceeds 2.0."""
        # App3 has hafs, warsh, audio, dark_mode, madani - many potential matches
        # Use a query that matches many keywords
        boost, reasons = self.service._calculate_metadata_boost(
            self.app3, 'hafs warsh audio dark madani'
        )

        self.assertLessEqual(boost, 2.0)

    def test_no_boost_when_no_match(self):
        """Unrelated query gives boost=1.0."""
        boost, reasons = self.service._calculate_metadata_boost(self.app1, 'completely unrelated xyz')

        self.assertEqual(boost, 1.0)
        self.assertEqual(len(reasons), 0)

    def test_match_reasons_populated(self):
        """match_reasons list has correct type/value/label fields."""
        boost, reasons = self.service._calculate_metadata_boost(self.app1, 'offline quran')

        self.assertGreater(len(reasons), 0)
        reason = reasons[0]
        self.assertIn('type', reason)
        self.assertIn('value', reason)
        self.assertIn('label_en', reason)
        self.assertIn('label_ar', reason)

    def test_multiple_matches_stack_boost(self):
        """Each match adds 0.15 to the boost."""
        # App1 has hafs, offline, audio, madani
        # Query 'offline audio' should match at least 2 metadata options
        boost, reasons = self.service._calculate_metadata_boost(self.app1, 'offline audio')

        self.assertGreaterEqual(len(reasons), 2)
        # Each match adds 0.15, so boost should be approximately 1.0 + (n * 0.15)
        self.assertAlmostEqual(boost, 1.0 + (len(reasons) * 0.15), places=5)

    def test_no_boost_for_app_without_metadata(self):
        """App with no metadata returns boost=1.0."""
        boost, reasons = self.service._calculate_metadata_boost(self.app4, 'offline quran')

        self.assertEqual(boost, 1.0)
        self.assertEqual(len(reasons), 0)


# =============================================================================
# Class 3: FacetCalculationTest
# =============================================================================

class FacetCalculationTest(HybridSearchTestMixin, TestCase):
    """Tests _calculate_facets()."""

    def setUp(self):
        self.create_test_data()

        with patch('core.services.search.service.AISearchFactory.get_provider'):
            from core.services.search import AISearchService
            self.service = AISearchService()

    def test_facets_include_all_active_metadata_types(self):
        """All active MetadataTypes appear in facets."""
        queryset = App.objects.filter(status='published')
        facets = self.service._calculate_facets(queryset)

        self.assertIn('riwayah', facets)
        self.assertIn('features', facets)
        self.assertIn('mushaf_type', facets)
        self.assertIn('platform', facets)

    def test_facet_counts_are_correct(self):
        """Counts match actual app-metadata assignments for test apps."""
        # Filter to only our test apps to avoid migration-seeded data interference
        test_app_ids = [self.app1.id, self.app2.id, self.app3.id, self.app4.id]
        queryset = App.objects.filter(status='published', id__in=test_app_ids)
        facets = self.service._calculate_facets(queryset)

        # hafs: app1, app3 = 2 test apps
        hafs_facet = next(
            (f for f in facets['riwayah'] if f['value'] == 'hafs'), None
        )
        self.assertIsNotNone(hafs_facet)
        self.assertEqual(hafs_facet['count'], 2)

        # warsh: app2, app3 = 2 test apps
        warsh_facet = next(
            (f for f in facets['riwayah'] if f['value'] == 'warsh'), None
        )
        self.assertIsNotNone(warsh_facet)
        self.assertEqual(warsh_facet['count'], 2)

        # offline: app1, app2 = 2 test apps
        offline_facet = next(
            (f for f in facets['features'] if f['value'] == 'offline'), None
        )
        self.assertIsNotNone(offline_facet)
        self.assertEqual(offline_facet['count'], 2)

    def test_facets_include_platform_counts(self):
        """Platform facet has correct labels and counts."""
        test_app_ids = [self.app1.id, self.app2.id, self.app3.id, self.app4.id]
        queryset = App.objects.filter(status='published', id__in=test_app_ids)
        facets = self.service._calculate_facets(queryset)

        self.assertIn('platform', facets)

        android_facet = next(
            (f for f in facets['platform'] if f['value'] == 'android'), None
        )
        self.assertIsNotNone(android_facet)
        self.assertEqual(android_facet['label_en'], 'Android')
        self.assertEqual(android_facet['label_ar'], 'أندرويد')
        # app1 + app4 = 2 android apps
        self.assertEqual(android_facet['count'], 2)

    def test_facets_only_count_filtered_queryset(self):
        """When pre-filtered, facets reflect the filtered set."""
        # Only our test android apps
        test_app_ids = [self.app1.id, self.app2.id, self.app3.id, self.app4.id]
        queryset = App.objects.filter(
            status='published', platform='android', id__in=test_app_ids
        )
        facets = self.service._calculate_facets(queryset)

        # Only app1 has hafs among our test android apps
        hafs_facet = next(
            (f for f in facets['riwayah'] if f['value'] == 'hafs'), None
        )
        self.assertIsNotNone(hafs_facet)
        self.assertEqual(hafs_facet['count'], 1)

    def test_facets_exclude_inactive_options(self):
        """Inactive MetadataOptions not in facets."""
        # Deactivate the hafs option
        self.opt_hafs.is_active = False
        self.opt_hafs.save()

        queryset = App.objects.filter(status='published')
        facets = self.service._calculate_facets(queryset)

        hafs_facet = next(
            (f for f in facets['riwayah'] if f['value'] == 'hafs'), None
        )
        self.assertIsNone(hafs_facet)

    def test_facets_exclude_inactive_metadata_type(self):
        """Inactive MetadataType does not appear in facets."""
        self.mt_mushaf_type.is_active = False
        self.mt_mushaf_type.save()

        queryset = App.objects.filter(status='published')
        facets = self.service._calculate_facets(queryset)

        self.assertNotIn('mushaf_type', facets)


# =============================================================================
# Class 4: HybridSearchAPITest
# =============================================================================

class HybridSearchAPITest(HybridSearchTestMixin, TestCase):
    """Tests the /api/search/hybrid/ endpoint."""

    def setUp(self):
        self.create_test_data()

        # Patch AISearchService at the module level where it is used in search.py
        self.service_patcher = patch('apps.api.search.AISearchService')
        self.MockServiceClass = self.service_patcher.start()

        # Create a mock service instance
        self.mock_service = MagicMock()
        self.MockServiceClass.return_value = self.mock_service

        # Default: return app1, app3 as results
        self._set_mock_results([self.app1, self.app3])

    def tearDown(self):
        self.service_patcher.stop()

    def _set_mock_results(self, apps, facets=None):
        """Helper to configure mock hybrid_search return value."""
        for app in apps:
            app._match_reasons = []
            app._combined_score = 0.85
            app.ai_reasoning = None
        self.mock_service.hybrid_search.return_value = {
            'results': apps,
            'facets': facets or {},
        }

    def test_hybrid_endpoint_returns_200(self):
        """Basic GET returns 200."""
        response = self.client.get('/api/search/hybrid/', {'q': 'quran'})

        self.assertEqual(response.status_code, 200)

    def test_hybrid_endpoint_requires_query(self):
        """Missing q param returns 422."""
        response = self.client.get('/api/search/hybrid/')

        self.assertEqual(response.status_code, 422)

    def test_hybrid_endpoint_with_filters(self):
        """?q=quran&features=offline passes filters to service."""
        self._set_mock_results([self.app1])
        response = self.client.get('/api/search/hybrid/', {
            'q': 'quran',
            'features': 'offline',
        })

        self.assertEqual(response.status_code, 200)
        # Verify hybrid_search was called with the right filters
        call_kwargs = self.mock_service.hybrid_search.call_args[1]
        self.assertIn('features', call_kwargs['filters'])
        self.assertEqual(call_kwargs['filters']['features'], ['offline'])

    def test_hybrid_endpoint_response_schema(self):
        """Response has count, results, facets, next, previous."""
        response = self.client.get('/api/search/hybrid/', {'q': 'quran'})
        data = response.json()

        self.assertIn('count', data)
        self.assertIn('results', data)
        self.assertIn('facets', data)
        self.assertIn('next', data)
        self.assertIn('previous', data)

    def test_hybrid_result_includes_match_reasons(self):
        """Each result has match_reasons array."""
        self.app1._match_reasons = [
            {'type': 'features', 'value': 'offline', 'label_en': 'Offline Mode', 'label_ar': 'بدون إنترنت'}
        ]
        self._set_mock_results([self.app1])

        response = self.client.get('/api/search/hybrid/', {'q': 'offline quran'})
        data = response.json()

        self.assertGreater(len(data['results']), 0)
        self.assertIn('match_reasons', data['results'][0])

    def test_hybrid_result_includes_relevance_score(self):
        """Each result has relevance_score."""
        response = self.client.get('/api/search/hybrid/', {'q': 'quran'})
        data = response.json()

        self.assertGreater(len(data['results']), 0)
        self.assertIn('relevance_score', data['results'][0])

    def test_hybrid_endpoint_pagination(self):
        """page/page_size params work."""
        # Return 3 apps to test pagination
        self._set_mock_results([self.app1, self.app2, self.app3])

        response = self.client.get('/api/search/hybrid/', {
            'q': 'quran',
            'page': 1,
            'page_size': 2,
        })
        data = response.json()

        self.assertEqual(data['count'], 3)
        self.assertEqual(len(data['results']), 2)
        self.assertIsNotNone(data['next'])

    def test_hybrid_endpoint_facets_included(self):
        """include_facets=true returns facets dict."""
        self._set_mock_results(
            [self.app1],
            facets={'riwayah': [{'value': 'hafs', 'label_en': 'Hafs', 'label_ar': 'حفص', 'count': 2}]}
        )

        response = self.client.get('/api/search/hybrid/', {
            'q': 'quran',
            'include_facets': 'true',
        })
        data = response.json()

        self.assertIn('riwayah', data['facets'])

    def test_hybrid_endpoint_facets_excluded(self):
        """include_facets=false returns empty facets."""
        response = self.client.get('/api/search/hybrid/', {
            'q': 'quran',
            'include_facets': 'false',
        })

        # Verify service was called with include_facets=False
        call_kwargs = self.mock_service.hybrid_search.call_args[1]
        self.assertFalse(call_kwargs['include_facets'])

    def test_hybrid_endpoint_comma_separated_filters(self):
        """?features=offline,audio parses correctly."""
        response = self.client.get('/api/search/hybrid/', {
            'q': 'quran',
            'features': 'offline,audio',
        })

        self.assertEqual(response.status_code, 200)
        call_kwargs = self.mock_service.hybrid_search.call_args[1]
        self.assertEqual(
            sorted(call_kwargs['filters']['features']),
            ['audio', 'offline']
        )


# =============================================================================
# Class 5: PrepareAppTextMetadataTest
# =============================================================================

class PrepareAppTextMetadataTest(HybridSearchTestMixin, TestCase):
    """Tests metadata sections in prepare_app_text()."""

    def setUp(self):
        self.create_test_data()

        with patch('core.services.search.service.AISearchFactory.get_provider'):
            from core.services.search import AISearchService
            self.service = AISearchService()

    def test_prepare_text_includes_riwayah_section(self):
        """Output contains [RIWAYAH] with bilingual labels."""
        text = self.service.prepare_app_text(self.app1)

        self.assertIn('[RIWAYAH]', text)
        self.assertIn('Hafs', text)
        self.assertIn('حفص', text)

    def test_prepare_text_includes_features_section(self):
        """Output contains [FEATURES] with bilingual labels."""
        text = self.service.prepare_app_text(self.app1)

        self.assertIn('[FEATURES]', text)
        self.assertIn('Offline', text)

    def test_prepare_text_includes_mushaf_type_section(self):
        """Output contains [MUSHAF TYPE] with bilingual labels."""
        text = self.service.prepare_app_text(self.app1)

        self.assertIn('[MUSHAF TYPE]', text)
        self.assertIn('Madani', text)
        # Arabic label comes from migration seed data
        self.assertIn(self.opt_madani.label_ar, text)

    def test_prepare_text_no_metadata_no_section(self):
        """App with no metadata has no metadata tags."""
        text = self.service.prepare_app_text(self.app4)

        self.assertNotIn('[RIWAYAH]', text)
        self.assertNotIn('[FEATURES]', text)
        self.assertNotIn('[MUSHAF TYPE]', text)

    def test_prepare_text_bilingual_labels(self):
        """Labels include both English and Arabic."""
        text = self.service.prepare_app_text(self.app3)

        # App3 has dark_mode metadata - Arabic label comes from migration seed
        self.assertIn('Dark Mode', text)
        self.assertIn(self.opt_dark_mode.label_ar, text)
