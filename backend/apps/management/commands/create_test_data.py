from django.core.management.base import BaseCommand
from django.db import transaction
from apps.models import App
from categories.models import Category
from developers.models import Developer


class Command(BaseCommand):
    help = 'Create test data with integer IDs'

    def handle(self, *args, **options):
        self.stdout.write('Creating test data...')

        with transaction.atomic():
            # Create developers
            dev1 = Developer.objects.create(
                name_en='Wahy Foundation',
                name_ar='مؤسسة الوحي',
                website='https://wahy.com',
                email='contact@wahy.com',
                logo_url='https://example.com/logo1.png',
                description_en='Foundation behind the Wahy app',
                description_ar='المؤسسة وراء تطبيق الوحي',
                is_verified=True,
            )

            dev2 = Developer.objects.create(
                name_en='Ayat Studio',
                name_ar='استوديو الآيات',
                website='https://ayah.com',
                email='info@ayah.com',
                logo_url='https://example.com/logo2.png',
                description_en='Creators of Ayat app',
                description_ar='مبدئو تطبيق الآيات',
                is_verified=True,
            )

            # Create categories
            cat1 = Category.objects.create(
                name_en='Quran Reading',
                name_ar='قراءة القرآن',
                slug='quran-reading',
                icon='https://example.com/icon1.png',
                color='#1e88e5',
                description_en='Apps for reading Quran',
                description_ar='تطبيقات لقراءة القرآن',
                sort_order=1,
                is_active=True,
            )

            cat2 = Category.objects.create(
                name_en='Quran Study',
                name_ar='دراسة القرآن',
                slug='quran-study',
                icon='https://example.com/icon2.png',
                color='#43a047',
                description_en='Apps for studying Quran',
                description_ar='تطبيقات لدراسة القرآن',
                sort_order=2,
                is_active=True,
            )

            # Create apps
            app1 = App.objects.create(
                name_en='Wahy',
                name_ar='وحي',
                slug='wahy',
                short_description_en='Modern Quran reading app',
                short_description_ar='تطبيق حديث لقراءة القرآن',
                description_en='A beautiful and modern Quran reading application with multiple translations and recitations.',
                description_ar='تطبيق قراءة قرآن جميل وحديث مع ترجمات وترجمات صوتية متعددة.',
                application_icon='https://example.com/wahy-icon.png',
                main_image_en='https://example.com/wahy-cover-en.png',
                main_image_ar='https://example.com/wahy-cover-ar.png',
                google_play_link='https://play.google.com/store/apps/details?id=com.wahy.quran',
                app_store_link='https://apps.apple.com/app/wahy-quran/id123456789',
                screenshots_en=[
                    'https://example.com/wahy-screenshot1-en.png',
                    'https://example.com/wahy-screenshot2-en.png',
                ],
                screenshots_ar=[
                    'https://example.com/wahy-screenshot1-ar.png',
                    'https://example.com/wahy-screenshot2-ar.png',
                ],
                avg_rating=4.8,
                review_count=1250,
                view_count=5000,
                sort_order=1,
                platform='cross_platform',
                featured=True,
                status='published',
                developer=dev1,
            )
            app1.categories.add(cat1, cat2)

            app2 = App.objects.create(
                name_en='Ayah',
                name_ar='آية',
                slug='ayah',
                short_description_en='Quran study companion',
                short_description_ar='رفيق دراسة القرآن',
                description_en='Comprehensive Quran study app with tafsir and word analysis.',
                description_ar='تطبيق شامل لدراسة القرآن مع التفسير وتحليل الكلمات.',
                application_icon='https://example.com/ayah-icon.png',
                main_image_en='https://example.com/ayah-cover-en.png',
                main_image_ar='https://example.com/ayah-cover-ar.png',
                google_play_link='https://play.google.com/store/apps/details?id=com.ayah.quran',
                screenshots_en=[
                    'https://example.com/ayah-screenshot1-en.png',
                ],
                screenshots_ar=[
                    'https://example.com/ayah-screenshot1-ar.png',
                ],
                avg_rating=4.6,
                review_count=890,
                view_count=3200,
                sort_order=2,
                platform='android',
                featured=True,
                status='published',
                developer=dev2,
            )
            app2.categories.add(cat2)

            self.stdout.write(f'Created developer: {dev1.name_en} (ID: {dev1.id})')
            self.stdout.write(f'Created developer: {dev2.name_en} (ID: {dev2.id})')
            self.stdout.write(f'Created category: {cat1.name_en} (ID: {cat1.id})')
            self.stdout.write(f'Created category: {cat2.name_en} (ID: {cat2.id})')
            self.stdout.write(f'Created app: {app1.name_en} (ID: {app1.id})')
            self.stdout.write(f'Created app: {app2.name_en} (ID: {app2.id})')

        self.stdout.write(self.style.SUCCESS('Successfully created test data with integer IDs!'))