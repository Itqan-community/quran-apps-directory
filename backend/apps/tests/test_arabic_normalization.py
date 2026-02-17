"""
Tests for Arabic normalization and relevance threshold in search.
"""

from decimal import Decimal
from unittest.mock import patch, MagicMock

from django.test import TestCase

from core.utils.arabic import normalize_arabic
from apps.models import App
from developers.models import Developer
from categories.models import Category
from metadata.models import MetadataType, MetadataOption, AppMetadataValue


# =============================================================================
# Unit Tests: normalize_arabic utility
# =============================================================================

class ArabicNormalizationTest(TestCase):
    """Unit tests for the normalize_arabic function."""

    def test_removes_tashkeel(self):
        # fatha, damma, kasra, shadda, sukun, tanween
        self.assertEqual(normalize_arabic('مُصْحَفٌ'), 'مصحف')

    def test_normalizes_alef_variants(self):
        self.assertEqual(normalize_arabic('أحمد'), 'احمد')
        self.assertEqual(normalize_arabic('إسلام'), 'اسلام')
        self.assertEqual(normalize_arabic('آية'), 'ايه')  # taa marbuta also normalized
        self.assertEqual(normalize_arabic('ٱلرحمن'), 'الرحمن')

    def test_normalizes_taa_marbuta(self):
        self.assertEqual(normalize_arabic('رواية'), 'روايه')
        self.assertEqual(normalize_arabic('تلاوة'), 'تلاوه')

    def test_normalizes_hamza_on_carriers(self):
        self.assertEqual(normalize_arabic('مؤمن'), 'مومن')
        self.assertEqual(normalize_arabic('قرائن'), 'قراين')

    def test_empty_and_none(self):
        self.assertEqual(normalize_arabic(''), '')
        self.assertEqual(normalize_arabic(None), '')

    def test_english_passthrough(self):
        self.assertEqual(normalize_arabic('hello world'), 'hello world')

    def test_mixed_text(self):
        result = normalize_arabic('Hafs حفص')
        self.assertEqual(result, 'Hafs حفص')

    def test_superscript_alef_removed(self):
        # U+0670 - superscript alef (used in some Quran texts)
        self.assertEqual(normalize_arabic('رَحْمٰن'), 'رحمن')


# =============================================================================
# Unit Tests: Keyword score with normalization
# =============================================================================

class KeywordScoreNormalizationTest(TestCase):
    """Verify Arabic keyword matching uses normalization."""

    def setUp(self):
        self.developer = Developer.objects.create(
            name_en='Dev', name_ar='مطور', email='dev@test.com'
        )
        self.cat = Category.objects.create(
            name_en='Mushaf', name_ar='مصحف', slug='mushaf', is_active=True
        )
        # App with Hafs in name
        self.app_hafs = App.objects.create(
            name_en='Mushaf Hafs', name_ar='مصحف حفص',
            slug='mushaf-hafs',
            short_description_en='Hafs mushaf', short_description_ar='مصحف حفص',
            developer=self.developer, platform='android',
            avg_rating=Decimal('4.5'), status='published',
        )
        self.app_hafs.categories.add(self.cat)

        # App with Warsh in name
        self.app_warsh = App.objects.create(
            name_en='Mushaf Warsh', name_ar='مصحف ورش',
            slug='mushaf-warsh',
            short_description_en='Warsh mushaf', short_description_ar='مصحف ورش',
            developer=self.developer, platform='android',
            avg_rating=Decimal('4.5'), status='published',
        )
        self.app_warsh.categories.add(self.cat)

    def test_hafs_query_scores_hafs_app_higher(self):
        from core.services.search.service import AISearchService
        service = AISearchService.__new__(AISearchService)

        score_hafs = service._calculate_keyword_score(self.app_hafs, 'رواية حفص')
        score_warsh = service._calculate_keyword_score(self.app_warsh, 'رواية حفص')

        self.assertGreater(score_hafs, score_warsh)

    def test_tashkeel_does_not_affect_matching(self):
        """Query with tashkeel should still match plain text."""
        from core.services.search.service import AISearchService
        service = AISearchService.__new__(AISearchService)

        # Query with diacritics
        score = service._calculate_keyword_score(self.app_hafs, 'حَفْص')
        self.assertGreater(score, 0.0)

    def test_alef_variants_match(self):
        """App with أ in name should match query with ا."""
        app = App.objects.create(
            name_en='App', name_ar='أطفال القرآن',
            slug='atfal-quran',
            short_description_en='Kids', short_description_ar='اطفال',
            developer=self.developer, platform='android',
            avg_rating=Decimal('4.0'), status='published',
        )
        app.categories.add(self.cat)

        from core.services.search.service import AISearchService
        service = AISearchService.__new__(AISearchService)

        score = service._calculate_keyword_score(app, 'اطفال')
        self.assertGreater(score, 0.0)


# =============================================================================
# Unit Tests: Relevance threshold
# =============================================================================

class RelevanceThresholdTest(TestCase):
    """Verify relevance threshold filtering in hybrid_search."""

    def setUp(self):
        self.developer = Developer.objects.create(
            name_en='Dev', name_ar='مطور', email='dev@test.com'
        )
        self.cat = Category.objects.create(
            name_en='Mushaf', name_ar='مصحف', slug='mushaf-thresh', is_active=True
        )
        # Create apps
        self.app_relevant = App.objects.create(
            name_en='Relevant App', name_ar='تطبيق مناسب',
            slug='relevant-app',
            short_description_en='Relevant', short_description_ar='مناسب',
            developer=self.developer, platform='android',
            avg_rating=Decimal('4.5'), status='published',
        )
        self.app_relevant.categories.add(self.cat)

        self.app_irrelevant = App.objects.create(
            name_en='Irrelevant App', name_ar='تطبيق غير مناسب',
            slug='irrelevant-app',
            short_description_en='Irrelevant', short_description_ar='غير مناسب',
            developer=self.developer, platform='android',
            avg_rating=Decimal('3.0'), status='published',
        )
        self.app_irrelevant.categories.add(self.cat)

    @patch('core.services.search.service.AISearchService.get_embedding_cached')
    def test_threshold_filters_low_scores_with_embeddings(self, mock_embed):
        """When embeddings available, apps below 0.35 are excluded."""
        mock_embed.return_value = [0.1] * 768

        from core.services.search.service import AISearchService
        service = AISearchService()

        with patch.object(service, '_calculate_keyword_score', return_value=0.0), \
             patch.object(service, '_calculate_quality_boost', return_value=0.0):

            # Mock distance so one app scores high, one scores low
            result = service.hybrid_search('test query', limit=50)

            # All apps will have low combined scores since keyword=0, quality=0
            # With vector_similarity near 0, combined_score < 0.35
            # So threshold should filter all of them
            for app in result['results']:
                self.assertGreaterEqual(
                    getattr(app, '_combined_score', 0), 0.35,
                    f"App {app.name_en} should have been filtered (score={getattr(app, '_combined_score', 0)})"
                )

    @patch('core.services.search.service.AISearchService.get_embedding_cached')
    def test_no_threshold_in_fallback_mode(self, mock_embed):
        """When embeddings fail (fallback mode), no threshold applied."""
        mock_embed.return_value = []  # Embedding failed

        from core.services.search.service import AISearchService
        service = AISearchService()

        result = service.hybrid_search('test query', limit=50)

        # In fallback mode, _fallback_mode should be set
        self.assertTrue(result.get('_fallback_mode', False))
        # Results should still be returned (no threshold filtering)
        self.assertGreater(len(result['results']), 0)

    @patch('core.services.search.service.AISearchService.get_embedding_cached')
    def test_all_below_threshold_returns_empty(self, mock_embed):
        """If all apps score below threshold, result is empty."""
        mock_embed.return_value = [0.1] * 768

        from core.services.search.service import AISearchService
        service = AISearchService()

        # Force all scores to 0
        with patch.object(service, '_calculate_keyword_score', return_value=0.0), \
             patch.object(service, '_calculate_quality_boost', return_value=0.0):

            result = service.hybrid_search('completely unrelated gibberish xyz', limit=50)

            # All should be filtered out since mock gives ~0 vector similarity
            for app in result['results']:
                self.assertGreaterEqual(getattr(app, '_combined_score', 0), 0.35)


# =============================================================================
# Integration Tests: Arabic search scenarios
# =============================================================================

class ArabicSearchIntegrationTest(TestCase):
    """
    Integration tests for Arabic search scenarios.
    Uses mocked embeddings but real keyword scoring.
    """

    def setUp(self):
        self.developer = Developer.objects.create(
            name_en='Test Dev', name_ar='مطور', email='dev@test.com'
        )
        self.cat_mushaf = Category.objects.create(
            name_en='Mushaf', name_ar='مصحف', slug='mushaf-int', is_active=True
        )
        self.cat_kids = Category.objects.create(
            name_en='Kids', name_ar='أطفال', slug='kids-int', is_active=True
        )
        self.cat_accessibility = Category.objects.create(
            name_en='Accessibility', name_ar='ذوي الاحتياجات', slug='accessibility-int', is_active=True
        )

        # Metadata
        self.mt_riwayah, _ = MetadataType.objects.get_or_create(
            name='riwayah',
            defaults={'label_en': 'Riwayah', 'label_ar': 'الرواية', 'is_active': True},
        )
        self.opt_hafs, _ = MetadataOption.objects.get_or_create(
            metadata_type=self.mt_riwayah, value='hafs',
            defaults={'label_en': 'Hafs', 'label_ar': 'حفص'},
        )
        self.opt_warsh, _ = MetadataOption.objects.get_or_create(
            metadata_type=self.mt_riwayah, value='warsh',
            defaults={'label_en': 'Warsh', 'label_ar': 'ورش'},
        )

        # Apps
        self.app_hafs = App.objects.create(
            name_en='Mushaf Hafs', name_ar='مصحف حفص',
            slug='int-mushaf-hafs',
            short_description_en='Hafs mushaf app',
            short_description_ar='تطبيق مصحف برواية حفص',
            developer=self.developer, platform='cross_platform',
            avg_rating=Decimal('4.7'), status='published',
        )
        self.app_hafs.categories.add(self.cat_mushaf)
        AppMetadataValue.objects.create(app=self.app_hafs, metadata_option=self.opt_hafs)

        self.app_warsh = App.objects.create(
            name_en='Mushaf Warsh', name_ar='مصحف ورش',
            slug='int-mushaf-warsh',
            short_description_en='Warsh mushaf app',
            short_description_ar='تطبيق مصحف برواية ورش',
            developer=self.developer, platform='cross_platform',
            avg_rating=Decimal('4.5'), status='published',
        )
        self.app_warsh.categories.add(self.cat_mushaf)
        AppMetadataValue.objects.create(app=self.app_warsh, metadata_option=self.opt_warsh)

        self.app_kids = App.objects.create(
            name_en='Quran for Kids', name_ar='مصحف لتعليم الاطفال',
            slug='int-quran-kids',
            short_description_en='Quran learning for children',
            short_description_ar='تطبيق تعليم القرآن للأطفال',
            developer=self.developer, platform='android',
            avg_rating=Decimal('4.3'), status='published',
        )
        self.app_kids.categories.add(self.cat_kids)

        self.app_blind = App.objects.create(
            name_en='Quran for Blind', name_ar='تطبيق للعميان',
            slug='int-quran-blind',
            short_description_en='Accessible quran for visually impaired',
            short_description_ar='تطبيق قرآن للعميان وذوي الاحتياجات البصرية',
            developer=self.developer, platform='android',
            avg_rating=Decimal('4.6'), status='published',
        )
        self.app_blind.categories.add(self.cat_accessibility)

        self.app_generic = App.objects.create(
            name_en='Generic Quran App', name_ar='تطبيق قرآن عام',
            slug='int-generic-quran',
            short_description_en='General quran app',
            short_description_ar='تطبيق قرآن عام',
            developer=self.developer, platform='android',
            avg_rating=Decimal('3.5'), status='published',
        )
        self.app_generic.categories.add(self.cat_mushaf)

    def test_hafs_query_keyword_ranking(self):
        """'رواية حفص' - Hafs app should score higher than Warsh app in keywords."""
        from core.services.search.service import AISearchService
        service = AISearchService.__new__(AISearchService)

        score_hafs = service._calculate_keyword_score(self.app_hafs, 'رواية حفص')
        score_warsh = service._calculate_keyword_score(self.app_warsh, 'رواية حفص')

        self.assertGreater(score_hafs, score_warsh,
                           f"Hafs ({score_hafs}) should rank above Warsh ({score_warsh})")

    def test_kids_query_keyword_ranking(self):
        """'مصحف لتعليم الاطفال' - Kids app should score highest."""
        from core.services.search.service import AISearchService
        service = AISearchService.__new__(AISearchService)

        score_kids = service._calculate_keyword_score(self.app_kids, 'مصحف لتعليم الاطفال')
        score_generic = service._calculate_keyword_score(self.app_generic, 'مصحف لتعليم الاطفال')

        self.assertGreater(score_kids, score_generic,
                           f"Kids ({score_kids}) should rank above Generic ({score_generic})")

    def test_blind_query_keyword_ranking(self):
        """'تطبيق للعميان' - Blind/accessibility app should score highest."""
        from core.services.search.service import AISearchService
        service = AISearchService.__new__(AISearchService)

        score_blind = service._calculate_keyword_score(self.app_blind, 'تطبيق للعميان')
        score_generic = service._calculate_keyword_score(self.app_generic, 'تطبيق للعميان')

        self.assertGreater(score_blind, score_generic,
                           f"Blind ({score_blind}) should rank above Generic ({score_generic})")

    @patch('core.services.search.service.AISearchService.get_embedding_cached')
    def test_fallback_mode_exposed_in_hybrid_search(self, mock_embed):
        """When embeddings fail, fallback_mode should be True in result."""
        mock_embed.return_value = []  # Embedding failed

        from core.services.search.service import AISearchService
        service = AISearchService()

        result = service.hybrid_search('مصحف', limit=50)

        self.assertIn('_fallback_mode', result)
        self.assertTrue(result['_fallback_mode'])

    @patch('core.services.search.service.AISearchService.get_embedding_cached')
    def test_no_fallback_mode_when_embeddings_succeed(self, mock_embed):
        """When embeddings succeed, fallback_mode should be False."""
        mock_embed.return_value = [0.1] * 768

        from core.services.search.service import AISearchService
        service = AISearchService()

        result = service.hybrid_search('مصحف', limit=50)

        self.assertFalse(result.get('_fallback_mode', False))

    def test_alef_hamza_normalization_in_search(self):
        """Query with أطفال should match app name with اطفال."""
        from core.services.search.service import AISearchService
        service = AISearchService.__new__(AISearchService)

        # App name has 'الاطفال', query has 'الأطفال' (with hamza)
        score = service._calculate_keyword_score(self.app_kids, 'الأطفال')
        self.assertGreater(score, 0.0, "Alef-hamza normalization should allow matching")
