"""
Test cases for App model.

Tests model validation, methods, and database constraints.
"""

from decimal import Decimal
from django.test import TestCase
from django.core.exceptions import ValidationError
from django.db.utils import IntegrityError

from apps.models import App
from developers.models import Developer
from categories.models import Category


class AppModelTest(TestCase):
    """Test cases for App model."""

    def setUp(self):
        """Set up test data."""
        self.developer = Developer.objects.create(
            name_en="Test Developer",
            name_ar="مطور اختبار",
            email="test@example.com",
            is_verified=True
        )
        self.category = Category.objects.create(
            name_en="Test Category",
            name_ar="فئة اختبار",
            slug="test-category",
            is_active=True
        )

    def test_app_creation(self):
        """Test successful app creation."""
        app = App.objects.create(
            name_en="Test App",
            name_ar="تطبيق اختبار",
            slug="test-app",
            short_description_en="A test application",
            short_description_ar="تطبيق اختبار",
            description_en="Detailed description",
            description_ar="وصف مفصل",
            developer=self.developer,
            platform="android",
            avg_rating=Decimal('4.5'),
            review_count=100,
            view_count=1000,
            featured=True
        )
        app.categories.add(self.category)

        self.assertEqual(app.name_en, "Test App")
        self.assertEqual(app.name_ar, "تطبيق اختبار")
        self.assertEqual(app.slug, "test-app")
        self.assertEqual(app.developer, self.developer)
        self.assertEqual(app.platform, "android")
        self.assertTrue(app.featured)
        self.assertEqual(str(app), "Test App / تطبيق اختبار")

    def test_slug_auto_generation(self):
        """Test automatic slug generation."""
        app = App.objects.create(
            name_en="Auto Slug Test App",
            name_ar="تطبيق اختبار السلق التلقائي",
            short_description_en="Test auto slug",
            short_description_ar="اختبار السلق التلقائي",
            description_en="Description",
            description_ar="وصف",
            developer=self.developer,
            platform="ios"
        )

        self.assertEqual(app.slug, "auto-slug-test-app")

    def test_unique_slug_constraint(self):
        """Test unique slug constraint."""
        App.objects.create(
            name_en="Same Name App",
            name_ar="تطبيق نفس الاسم",
            slug="same-slug",
            short_description_en="First app",
            short_description_ar="التطبيق الأول",
            description_en="Description",
            description_ar="وصف",
            developer=self.developer,
            platform="android"
        )

        # Creating another app with same slug should auto-increment
        app2 = App.objects.create(
            name_en="Same Name App",
            name_ar="تطبيق نفس الاسم",
            short_description_en="Second app",
            short_description_ar="التطبيق الثاني",
            description_en="Description",
            description_ar="وصف",
            developer=self.developer,
            platform="ios"
        )

        self.assertEqual(app2.slug, "same-slug-1")

    def test_rating_validation(self):
        """Test rating validation constraints."""
        app = App.objects.create(
            name_en="Rating Test App",
            name_ar="تطبيق اختبار التقييم",
            slug="rating-test-app",
            short_description_en="Test rating validation",
            short_description_ar="اختبار التحقق من التقييم",
            description_en="Description",
            description_ar="وصف",
            developer=self.developer,
            platform="web"
        )

        # Valid ratings
        valid_ratings = [Decimal('0.00'), Decimal('2.50'), Decimal('5.00')]
        for rating in valid_ratings:
            app.avg_rating = rating
            app.save()
            app.refresh_from_db()
            self.assertEqual(app.avg_rating, rating)

    def test_rating_display_property(self):
        """Test rating_display property."""
        app = App.objects.create(
            name_en="Rating Display Test",
            name_ar="اختبار عرض التقييم",
            slug="rating-display-test",
            short_description_en="Test rating display",
            short_description_ar="اختبار عرض التقييم",
            description_en="Description",
            description_ar="وصف",
            developer=self.developer,
            platform="cross_platform",
            avg_rating=Decimal('4.75')
        )

        self.assertEqual(app.rating_display, "4.8")

    def test_increment_view_count(self):
        """Test view count increment."""
        app = App.objects.create(
            name_en="View Count Test",
            name_ar="اختبار عدد المشاهدات",
            slug="view-count-test",
            short_description_en="Test view count",
            short_description_ar="اختبار عدد المشاهدات",
            description_en="Description",
            description_ar="وصف",
            developer=self.developer,
            platform="android",
            view_count=100
        )

        initial_count = app.view_count
        app.increment_view_count()
        app.refresh_from_db()

        self.assertEqual(app.view_count, initial_count + 1)

    def test_default_values(self):
        """Test default field values."""
        app = App.objects.create(
            name_en="Default Values Test",
            name_ar="اختبار القيم الافتراضية",
            slug="default-values-test",
            short_description_en="Test defaults",
            short_description_ar="اختبار الافتراضيات",
            description_en="Description",
            description_ar="وصف",
            developer=self.developer,
            platform="android"
        )

        self.assertEqual(app.avg_rating, Decimal('0.00'))
        self.assertEqual(app.review_count, 0)
        self.assertEqual(app.view_count, 0)
        self.assertEqual(app.sort_order, 0)
        self.assertFalse(app.featured)
        self.assertEqual(app.platform, 'cross_platform')  # Default from model

    def test_platform_choices(self):
        """Test platform field choices."""
        valid_platforms = ['android', 'ios', 'web', 'cross_platform']

        for platform in valid_platforms:
            app = App.objects.create(
                name_en=f"Platform Test {platform}",
                name_ar=f"اختبار المنصة {platform}",
                slug=f"platform-test-{platform}",
                short_description_en=f"Test {platform} platform",
                short_description_ar=f"اختبار منصة {platform}",
                description_en="Description",
                description_ar="وصف",
                developer=self.developer,
                platform=platform
            )
            self.assertEqual(app.platform, platform)

    def test_app_status_inheritance(self):
        """Test that App inherits status from PublishedModel."""
        app = App.objects.create(
            name_en="Status Test App",
            name_ar="تطبيق اختبار الحالة",
            slug="status-test-app",
            short_description_en="Test status",
            short_description_ar="اختبار الحالة",
            description_en="Description",
            description_ar="وصف",
            developer=self.developer,
            platform="android"
        )

        # Test default status
        self.assertEqual(app.status, 'draft')

        # Test status change
        app.status = 'published'
        app.save()
        app.refresh_from_db()
        self.assertEqual(app.status, 'published')

    def test_string_representation(self):
        """Test __str__ method."""
        app = App.objects.create(
            name_en="String Test App",
            name_ar="تطبيق اختبار السلسلة",
            slug="string-test-app",
            short_description_en="Test string representation",
            short_description_ar="اختبار التمثيل النصي",
            description_en="Description",
            description_ar="وصف",
            developer=self.developer,
            platform="android"
        )

        expected_str = "String Test App / تطبيق اختبار السلسلة"
        self.assertEqual(str(app), expected_str)