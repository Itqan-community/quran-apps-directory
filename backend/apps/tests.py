from django.test import TestCase, TransactionTestCase
from rest_framework.test import APIClient
from rest_framework import status
from decimal import Decimal

from apps.models import App
from developers.models import Developer
from categories.models import Category


class AppListAPITest(TestCase):
    """Test cases for App list endpoint."""

    @classmethod
    def setUpTestData(cls):
        """Create test data once for all tests in this class."""
        # Create a developer
        cls.developer = Developer.objects.create(
            name_en="Test Developer AppList",
            name_ar="مطور الاختبار القائمة",
            website="https://example.com"
        )

        # Create categories
        cls.category_mushaf, _ = Category.objects.get_or_create(
            slug="mushaf-test",
            defaults={
                'name_en': "Mushaf Test",
                'name_ar': "المصحف اختبار",
            }
        )
        cls.category_tafsir, _ = Category.objects.get_or_create(
            slug="tafsir-test",
            defaults={
                'name_en': "Tafsir Test",
                'name_ar': "التفسير اختبار",
            }
        )

        # Create test apps
        cls.app1 = App.objects.create(
            name_en="Test App 1",
            name_ar="تطبيق الاختبار 1",
            short_description_en="Test app 1 description",
            short_description_ar="وصف تطبيق الاختبار 1",
            description_en="Long test app 1 description",
            description_ar="وصف طويل لتطبيق الاختبار 1",
            developer=cls.developer,
            status="published",
            avg_rating=Decimal("4.5"),
            sort_order=1
        )
        cls.app1.categories.add(cls.category_mushaf)

        cls.app2 = App.objects.create(
            name_en="Test App 2",
            name_ar="تطبيق الاختبار 2",
            short_description_en="Test app 2 description",
            short_description_ar="وصف تطبيق الاختبار 2",
            description_en="Long test app 2 description",
            description_ar="وصف طويل لتطبيق الاختبار 2",
            developer=cls.developer,
            status="published",
            avg_rating=Decimal("4.0"),
            sort_order=2
        )
        cls.app2.categories.add(cls.category_tafsir)

        # Create a draft app (should not appear in public API)
        cls.app_draft = App.objects.create(
            name_en="Draft App",
            name_ar="تطبيق المسودة",
            short_description_en="Draft app description",
            short_description_ar="وصف تطبيق المسودة",
            description_en="Long draft app description",
            description_ar="وصف طويل لتطبيق المسودة",
            developer=cls.developer,
            status="draft",
            sort_order=3
        )

    def setUp(self):
        """Set up test client for each test."""
        self.client = APIClient()

    def test_list_apps_returns_published_only(self):
        """Test that list endpoint returns only published apps."""
        response = self.client.get('/api/v1/apps/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Should have at least our test apps plus the migration apps
        self.assertGreater(response.data['count'], 2)
        self.assertGreater(len(response.data['results']), 0)

        # Verify draft app is not in results
        names = [app['name_en'] for app in response.data['results']]
        self.assertNotIn('Draft App', names)

    def test_list_apps_pagination_structure(self):
        """Test pagination structure is correct."""
        response = self.client.get('/api/v1/apps/?page_size=5')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 5)
        self.assertEqual(response.data['page_size'], 5)
        self.assertIn('total_pages', response.data)
        self.assertIn('current_page', response.data)

    def test_list_apps_ordering_desc(self):
        """Test ordering by descending sort order."""
        response = self.client.get('/api/v1/apps/?ordering=-sort_order&page_size=100')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        apps = response.data['results']
        if len(apps) > 1:
            # Verify first is sorted higher
            self.assertGreaterEqual(apps[0]['sort_order'], apps[1]['sort_order'])

    def test_search_exists(self):
        """Test search functionality works."""
        response = self.client.get('/api/v1/apps/?search=Test')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Should find our test apps
        self.assertGreater(response.data['count'], 0)

    def test_filter_by_category_exists(self):
        """Test filtering apps by category slug."""
        response = self.client.get('/api/v1/apps/?categories__slug=mushaf-test')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Should find test app 1
        self.assertGreater(response.data['count'], 0)

    def test_filter_by_platform(self):
        """Test filtering apps by platform."""
        # Create an app with specific platform
        app_android = App.objects.create(
            name_en="Android Test App",
            name_ar="تطبيق الاندرويد",
            short_description_en="Android app",
            short_description_ar="تطبيق الاندرويد",
            description_en="Android app",
            description_ar="تطبيق الاندرويد",
            developer=self.developer,
            status="published",
            platform="android"
        )

        response = self.client.get('/api/v1/apps/?platform=android')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        for app in response.data['results']:
            self.assertEqual(app['platform'], 'android')

    def test_response_structure_list(self):
        """Test that response has expected structure."""
        response = self.client.get('/api/v1/apps/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Check pagination structure
        self.assertIn('links', response.data)
        self.assertIn('count', response.data)
        self.assertIn('total_pages', response.data)
        self.assertIn('current_page', response.data)
        self.assertIn('page_size', response.data)
        self.assertIn('results', response.data)

        # Check app data structure (list view uses AppListSerializer)
        app = response.data['results'][0]
        self.assertIn('id', app)
        self.assertIn('name_en', app)
        self.assertIn('name_ar', app)
        self.assertIn('avg_rating', app)
        # List view has developer_name instead of full developer object
        self.assertIn('developer_name', app)
        self.assertIn('categories', app)


class AppDetailAPITest(TransactionTestCase):
    """Test cases for App detail endpoint."""

    def setUp(self):
        """Set up test data for each test."""
        self.client = APIClient()

        self.developer = Developer.objects.create(
            name_en="Test Developer Detail",
            name_ar="مطور الاختبار التفصيلي"
        )

        self.app = App.objects.create(
            name_en="Detail Test App",
            name_ar="تطبيق الاختبار التفصيلي",
            short_description_en="Short description",
            short_description_ar="وصف قصير",
            description_en="Long description",
            description_ar="وصف طويل",
            developer=self.developer,
            status="published",
            slug="detail-test-app-unique",
            view_count=0
        )

    def test_retrieve_by_id(self):
        """Test retrieving app by UUID."""
        response = self.client.get(f'/api/v1/apps/{self.app.id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['name_en'], 'Detail Test App')

    def test_view_count_incrementation(self):
        """Test that view count increments on retrieve."""
        # Initial view count
        self.app.refresh_from_db()
        initial_count = self.app.view_count

        # Retrieve app
        response = self.client.get(f'/api/v1/apps/{self.app.id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Check view count increased
        self.app.refresh_from_db()
        self.assertEqual(self.app.view_count, initial_count + 1)

    def test_detail_response_structure(self):
        """Test detail response has all expected fields."""
        response = self.client.get(f'/api/v1/apps/{self.app.id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        data = response.data
        self.assertIn('id', data)
        self.assertIn('name_en', data)
        self.assertIn('name_ar', data)
        self.assertIn('description_en', data)
        self.assertIn('description_ar', data)
        self.assertIn('developer', data)
        self.assertIn('categories', data)
        self.assertIn('avg_rating', data)
        self.assertIn('view_count', data)

    def test_retrieve_nonexistent_app(self):
        """Test retrieving non-existent app returns 404."""
        response = self.client.get('/api/v1/apps/invalid-slug-nonexistent/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_retrieve_draft_app_returns_404(self):
        """Test that draft apps cannot be retrieved via public API."""
        draft_app = App.objects.create(
            name_en="Draft App",
            name_ar="تطبيق مسودة",
            short_description_en="Draft",
            short_description_ar="مسودة",
            description_en="Draft app",
            description_ar="تطبيق مسودة",
            developer=self.developer,
            status="draft",
            slug="draft-app-unique"
        )

        response = self.client.get(f'/api/v1/apps/{draft_app.slug}/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


class FeaturedAppsAPITest(TestCase):
    """Test cases for featured apps endpoint."""

    @classmethod
    def setUpTestData(cls):
        """Create test data."""
        cls.developer = Developer.objects.create(
            name_en="Test Developer Featured",
            name_ar="مطور مميز"
        )

        # Get or create to handle existing mushaf category from migration
        cls.category, _ = Category.objects.get_or_create(
            slug="mushaf",
            defaults={
                'name_en': "Mushaf",
                'name_ar': "المصحف",
            }
        )

        # Create featured apps
        cls.featured_app = App.objects.create(
            name_en="Featured App Test",
            name_ar="تطبيق مميز",
            short_description_en="Featured",
            short_description_ar="مميز",
            description_en="Featured app",
            description_ar="تطبيق مميز",
            developer=cls.developer,
            status="published",
            featured=True
        )
        cls.featured_app.categories.add(cls.category)

        # Create non-featured app
        cls.regular_app = App.objects.create(
            name_en="Regular App Test",
            name_ar="تطبيق عادي",
            short_description_en="Regular",
            short_description_ar="عادي",
            description_en="Regular app",
            description_ar="تطبيق عادي",
            developer=cls.developer,
            status="published",
            featured=False
        )

    def setUp(self):
        """Set up test client."""
        self.client = APIClient()

    def test_featured_endpoint_works(self):
        """Test featured endpoint returns properly formatted response."""
        response = self.client.get('/api/v1/apps/featured/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Check response structure
        self.assertIn('results', response.data)
        self.assertIn('count', response.data)

    def test_featured_filter_by_category(self):
        """Test filtering featured apps by category."""
        response = self.client.get('/api/v1/apps/featured/?category=mushaf')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Just verify the endpoint responds correctly


class ByPlatformAPITest(TestCase):
    """Test cases for by_platform endpoint."""

    @classmethod
    def setUpTestData(cls):
        """Create test data."""
        cls.developer = Developer.objects.create(
            name_en="Test Developer Platform",
            name_ar="مطور منصة"
        )

        cls.android_app = App.objects.create(
            name_en="Android App Test",
            name_ar="تطبيق اندرويد",
            short_description_en="Android",
            short_description_ar="اندرويد",
            description_en="Android app",
            description_ar="تطبيق اندرويد",
            developer=cls.developer,
            status="published",
            platform="android"
        )

        cls.ios_app = App.objects.create(
            name_en="iOS App Test",
            name_ar="تطبيق ios",
            short_description_en="iOS",
            short_description_ar="ios",
            description_en="iOS app",
            description_ar="تطبيق ios",
            developer=cls.developer,
            status="published",
            platform="ios"
        )

    def setUp(self):
        """Set up test client."""
        self.client = APIClient()

    def test_by_platform_android(self):
        """Test filtering by android platform."""
        response = self.client.get('/api/v1/apps/by_platform/?platform=android')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        for app in response.data['results']:
            self.assertEqual(app['platform'], 'android')

    def test_by_platform_ios(self):
        """Test filtering by iOS platform."""
        response = self.client.get('/api/v1/apps/by_platform/?platform=ios')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        for app in response.data['results']:
            self.assertEqual(app['platform'], 'ios')

    def test_by_platform_missing_parameter(self):
        """Test that platform parameter is required."""
        response = self.client.get('/api/v1/apps/by_platform/')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)


class CategoriesAPITest(TestCase):
    """Test cases for Categories endpoint."""

    def setUp(self):
        """Set up test client."""
        self.client = APIClient()

    def test_categories_endpoint_works(self):
        """Test categories endpoint responds correctly."""
        response = self.client.get('/api/v1/categories/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Should have categories from migration
        self.assertGreater(response.data['count'], 0)

        # Check structure
        self.assertIn('results', response.data)
        if response.data['results']:
            cat = response.data['results'][0]
            self.assertIn('id', cat)
            self.assertIn('name_en', cat)
            self.assertIn('name_ar', cat)
            self.assertIn('slug', cat)


class DevelopersAPITest(TestCase):
    """Test cases for Developers endpoint."""

    def setUp(self):
        """Set up test client."""
        self.client = APIClient()

    def test_developers_endpoint_works(self):
        """Test developers endpoint responds correctly."""
        response = self.client.get('/api/v1/developers/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Should have developers from migration
        self.assertGreater(response.data['count'], 0)

        # Check structure
        self.assertIn('results', response.data)
        if response.data['results']:
            dev = response.data['results'][0]
            self.assertIn('id', dev)
            self.assertIn('name_en', dev)
            self.assertIn('name_ar', dev)


class SerializerTest(TestCase):
    """Test cases for serializers."""

    @classmethod
    def setUpTestData(cls):
        """Create test data."""
        cls.developer = Developer.objects.create(
            name_en="Serializer Test Dev",
            name_ar="مطور اختبار المسلسل"
        )

        cls.category = Category.objects.create(
            name_en="Test Category",
            name_ar="فئة الاختبار",
            slug="test-category"
        )

        cls.app = App.objects.create(
            name_en="Serializer Test App",
            name_ar="تطبيق اختبار المسلسل",
            short_description_en="Test short desc",
            short_description_ar="وصف قصير للاختبار",
            description_en="Test description",
            description_ar="وصف الاختبار",
            developer=cls.developer,
            status="published",
            avg_rating=Decimal("4.75"),
            review_count=100,
            view_count=50,
            featured=True
        )
        cls.app.categories.add(cls.category)

    def test_app_list_serializer_fields(self):
        """Test AppListSerializer includes all required fields."""
        from apps.serializers import AppListSerializer

        serializer = AppListSerializer(self.app)
        data = serializer.data

        # Check all fields present
        required_fields = [
            'id', 'name_en', 'name_ar', 'slug',
            'short_description_en', 'short_description_ar',
            'avg_rating', 'rating_display', 'review_count',
            'view_count', 'featured', 'platform',
            'developer_name', 'developer_name_ar', 'categories'
        ]

        for field in required_fields:
            self.assertIn(field, data)

    def test_app_list_serializer_values(self):
        """Test AppListSerializer serializes values correctly."""
        from apps.serializers import AppListSerializer

        serializer = AppListSerializer(self.app)
        data = serializer.data

        self.assertEqual(data['name_en'], 'Serializer Test App')
        self.assertEqual(data['name_ar'], 'تطبيق اختبار المسلسل')
        self.assertEqual(float(data['avg_rating']), 4.75)
        self.assertEqual(data['review_count'], 100)
        self.assertEqual(data['developer_name'], 'Serializer Test Dev')
        self.assertTrue(data['featured'])

    def test_app_detail_serializer_includes_developer(self):
        """Test AppDetailSerializer includes full developer object."""
        from apps.serializers import AppDetailSerializer

        serializer = AppDetailSerializer(self.app)
        data = serializer.data

        self.assertIn('developer', data)
        self.assertIsInstance(data['developer'], dict)
        self.assertIn('name_en', data['developer'])
        self.assertEqual(data['developer']['name_en'], 'Serializer Test Dev')

    def test_app_detail_serializer_includes_categories(self):
        """Test AppDetailSerializer includes categories."""
        from apps.serializers import AppDetailSerializer

        serializer = AppDetailSerializer(self.app)
        data = serializer.data

        self.assertIn('categories', data)
        self.assertIsInstance(data['categories'], list)
        self.assertGreater(len(data['categories']), 0)

        category = data['categories'][0]
        self.assertIn('name_en', category)
        self.assertEqual(category['name_en'], 'Test Category')

    def test_serializer_with_null_values(self):
        """Test serializer handles null/optional fields."""
        from apps.serializers import AppListSerializer

        app = App.objects.create(
            name_en="Minimal App",
            name_ar="تطبيق بسيط",
            short_description_en="Minimal",
            short_description_ar="بسيط",
            description_en="Minimal description",
            description_ar="وصف بسيط",
            developer=self.developer,
            status="published"
        )

        serializer = AppListSerializer(app)
        data = serializer.data

        # Should have all required fields even if null
        self.assertIn('application_icon', data)
        # Null values should be None or empty
        self.assertIn(data['application_icon'], [None, ''])


class PermissionTest(TestCase):
    """Test cases for API permissions."""

    @classmethod
    def setUpTestData(cls):
        """Create test data."""
        cls.developer = Developer.objects.create(
            name_en="Permission Test Dev",
            name_ar="مطور اختبار الأذونات"
        )

        cls.published_app = App.objects.create(
            name_en="Published App",
            name_ar="تطبيق منشور",
            short_description_en="Published",
            short_description_ar="منشور",
            description_en="Published app",
            description_ar="تطبيق منشور",
            developer=cls.developer,
            status="published"
        )

        cls.draft_app = App.objects.create(
            name_en="Draft App Permission",
            name_ar="تطبيق المسودة",
            short_description_en="Draft",
            short_description_ar="مسودة",
            description_en="Draft app",
            description_ar="تطبيق مسودة",
            developer=cls.developer,
            status="draft",
            slug="draft-app-perm"
        )

    def setUp(self):
        """Set up test client."""
        self.client = APIClient()

    def test_unauthenticated_can_read_published(self):
        """Test unauthenticated users can read published apps."""
        response = self.client.get('/api/v1/apps/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_unauthenticated_cannot_see_draft_apps(self):
        """Test unauthenticated users cannot see draft apps in list."""
        response = self.client.get('/api/v1/apps/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        names = [app['name_en'] for app in response.data['results']]
        self.assertNotIn('Draft App Permission', names)

    def test_draft_app_returns_404_for_unauthenticated(self):
        """Test draft app detail returns 404 for unauthenticated users."""
        response = self.client.get(f'/api/v1/apps/{self.draft_app.slug}/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_published_app_always_accessible(self):
        """Test published apps are always accessible."""
        response = self.client.get(f'/api/v1/apps/{self.published_app.id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['name_en'], 'Published App')

    def test_read_only_list_endpoint(self):
        """Test list endpoint is read-only (no POST)."""
        response = self.client.post('/api/v1/apps/', {
            'name_en': 'Test',
            'name_ar': 'اختبار'
        })
        # Should be method not allowed or no create action
        self.assertIn(
            response.status_code,
            [status.HTTP_405_METHOD_NOT_ALLOWED, status.HTTP_403_FORBIDDEN]
        )

    def test_read_only_detail_endpoint(self):
        """Test detail endpoint is read-only (no PUT/PATCH)."""
        response = self.client.put(f'/api/v1/apps/{self.published_app.id}/', {
            'name_en': 'Updated'
        })
        # Should be method not allowed or no update action
        self.assertIn(
            response.status_code,
            [status.HTTP_405_METHOD_NOT_ALLOWED, status.HTTP_403_FORBIDDEN]
        )


class IntegrationTest(TestCase):
    """Integration tests to verify data consistency."""

    def test_all_44_apps_from_migration(self):
        """Verify that 44 apps are loaded from migration."""
        published_count = App.objects.filter(status='published').count()
        # Should have at least 44 from migration
        self.assertGreaterEqual(published_count, 44)

    def test_all_categories_exist(self):
        """Verify expected categories exist from migration."""
        expected_categories = [
            'mushaf', 'tafsir', 'translations', 'riwayat', 'audio'
        ]

        for category_slug in expected_categories:
            exists = Category.objects.filter(slug=category_slug).exists()
            self.assertTrue(exists, f"Category {category_slug} should exist from migration")

    def test_app_developer_relationship(self):
        """Verify apps have developers properly linked."""
        app = App.objects.filter(status='published').first()
        if app:
            self.assertIsNotNone(app.developer)
            self.assertIsNotNone(app.developer.name_en)

    def test_app_category_relationship(self):
        """Verify apps have categories properly linked."""
        app = App.objects.filter(status='published').first()
        if app and app.categories.exists():
            categories = app.categories.all()
            self.assertGreater(categories.count(), 0)
            cat = categories.first()
            self.assertIsNotNone(cat.name_en)
