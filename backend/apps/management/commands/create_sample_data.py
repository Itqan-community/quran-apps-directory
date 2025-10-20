from django.core.management.base import BaseCommand
from django.db import transaction
from apps.models import App
from categories.models import Category
from developers.models import Developer
from pathlib import Path
import re


class Command(BaseCommand):
    help = 'Create sample app data for testing'

    def handle(self, *args, **options):
        with transaction.atomic():
            # Create categories
            self.stdout.write('Creating categories...')
            categories_data = [
                {'slug': 'mushaf', 'name_en': 'Quran Mushaf', 'name_ar': 'مصحف القرآن'},
                {'slug': 'tafsir', 'name_en': 'Tafsir', 'name_ar': 'تفسير'},
                {'slug': 'audio', 'name_en': 'Audio Recitation', 'name_ar': 'التلاوة الصوتية'},
                {'slug': 'prayer-times', 'name_en': 'Prayer Times', 'name_ar': 'مواقيت الصلاة'},
                {'slug': 'azkar', 'name_en': 'Azkar & Dua', 'name_ar': 'أذكار ودعاء'},
            ]

            categories_map = {}
            for i, cat_data in enumerate(categories_data):
                category, created = Category.objects.get_or_create(
                    slug=cat_data['slug'],
                    defaults={
                        'name_en': cat_data['name_en'],
                        'name_ar': cat_data['name_ar'],
                        'description_en': f'{cat_data["name_en"]} applications',
                        'description_ar': f'تطبيقات {cat_data["name_ar"]}',
                        'sort_order': i,
                        'is_active': True,
                    }
                )
                categories_map[cat_data['slug']] = category
                if created:
                    self.stdout.write(f'  Created category: {cat_data["name_en"]}')

            # Create developers
            self.stdout.write('Creating developers...')
            developers_data = [
                {
                    'name_en': 'Tafsir Center for Qur\'anic Studies',
                    'name_ar': 'مركز تفسير للدراسات القرآنية',
                    'website': 'https://tafsir.net',
                    'is_verified': True,
                },
                {
                    'name_en': 'Muslim Pro',
                    'name_ar': 'مسلم برو',
                    'website': 'https://muslimpro.com',
                    'is_verified': True,
                },
                {
                    'name_en': 'Quran.com',
                    'name_ar': 'قرآن.كوم',
                    'website': 'https://quran.com',
                    'is_verified': True,
                },
            ]

            developers_map = {}
            for dev_data in developers_data:
                developer, created = Developer.objects.get_or_create(
                    name_en=dev_data['name_en'],
                    defaults={
                        'name_ar': dev_data['name_ar'],
                        'website': dev_data['website'],
                        'description_en': 'Developer of Islamic applications',
                        'description_ar': 'مطور تطبيقات إسلامية',
                        'is_verified': dev_data['is_verified'],
                    }
                )
                developers_map[dev_data['name_en']] = developer
                if created:
                    self.stdout.write(f'  Created developer: {dev_data["name_en"]}')

            # Create sample apps
            self.stdout.write('Creating sample applications...')
            apps_data = [
                {
                    'id': 'wahy',
                    'name_en': 'Wahy',
                    'name_ar': 'وَحي',
                    'slug': 'wahy',
                    'short_description_en': 'Learn Holy Quran word-by-word',
                    'short_description_ar': 'القرآن تلاوة وتفسير كلمة بكلمة',
                    'description_en': 'Holy Quran app with unique features like Highlight the word being recited, word-translation, repeating ayah in recitation (to help in memorization) and many translations/tafsirs.',
                    'description_ar': 'القرآن الكريم تطبيق مع ميزات فريدة مثل إبراز الكلمة التي يتلوها القارئ، ترجمة الكلمة، تكرار الآية في التلاوة (لمساعدة الحفظ) والعديد من الترجمات والتفاسير.',
                    'developer': 'Tafsir Center for Qur\'anic Studies',
                    'categories': ['mushaf', 'tafsir', 'audio'],
                    'avg_rating': 4.9,
                    'featured': True,
                    'sort_order': 1,
                },
                {
                    'id': 'muslim-pro',
                    'name_en': 'Muslim Pro',
                    'name_ar': 'مسلم برو',
                    'slug': 'muslim-pro',
                    'short_description_en': 'Prayer times, Quran, Azkar & Qibla',
                    'short_description_ar': 'مواقيت الصلاة، القرآن، الأذكار والقبلة',
                    'description_en': 'Recognized by millions of Islam followers around the world as the most accurate Prayer Times & Adzan application on mobile devices.',
                    'description_ar': 'تطبيق يتعرف عليه ملايين أتباع الإسلام حول العالم باعتباره تطبيق مواقيت الصلاة والأذان الأكثر دقة على الأجهزة المحمولة.',
                    'developer': 'Muslim Pro',
                    'categories': ['prayer-times', 'azkar'],
                    'avg_rating': 4.7,
                    'featured': True,
                    'sort_order': 2,
                },
                {
                    'id': 'quran-com',
                    'name_en': 'Quran.com',
                    'name_ar': 'قرآن.كوم',
                    'slug': 'quran-com',
                    'short_description_en': 'The Holy Quran with translations and recitations',
                    'short_description_ar': 'القرآن الكريم مع الترجمات والتلاوات',
                    'description_en': 'Beautiful Quran app with multiple translations, recitations, and features for learning and understanding the Quran.',
                    'description_ar': 'تطبيق قرآن جميل مع ترجمات متعددة وتلاوات وميزات للتعلم وفهم القرآن.',
                    'developer': 'Quran.com',
                    'categories': ['mushaf', 'tafsir', 'audio'],
                    'avg_rating': 4.8,
                    'featured': True,
                    'sort_order': 3,
                },
                {
                    'id': 'prayer-now',
                    'name_en': 'Prayer Now',
                    'name_ar': 'الصلاة الآن',
                    'slug': 'prayer-now',
                    'short_description_en': 'Accurate prayer times and Azkar',
                    'short_description_ar': 'مواقيت صلاة دقيقة وأذكار',
                    'description_en': 'Application for accurate prayer times with Azkar and other Islamic features.',
                    'description_ar': 'تطبيق لمواقيت الصلاة الدقيقة مع الأذكار وميزات إسلامية أخرى.',
                    'developer': 'Muslim Pro',
                    'categories': ['prayer-times', 'azkar'],
                    'avg_rating': 4.5,
                    'featured': False,
                    'sort_order': 4,
                },
                {
                    'id': 'quran-mp3',
                    'name_en': 'Quran MP3',
                    'name_ar': 'قرآن MP3',
                    'slug': 'quran-mp3',
                    'short_description_en': 'Listen to Quran recitations offline',
                    'short_description_ar': 'استمع إلى تلاوات القرآن بدون إنترنت',
                    'description_en': 'Offline Quran MP3 player with multiple reciters and high-quality audio.',
                    'description_ar': 'مشغل قرآن MP3 بدون إنترنت مع مقرئين متعددين وجودة صوت عالية.',
                    'developer': 'Quran.com',
                    'categories': ['audio'],
                    'avg_rating': 4.6,
                    'featured': False,
                    'sort_order': 5,
                },
            ]

            apps_created = 0
            for app_data in apps_data:
                developer = developers_map[app_data['developer']]

                app, created = App.objects.get_or_create(
                    slug=app_data['slug'],
                    defaults={
                        'name_en': app_data['name_en'],
                        'name_ar': app_data['name_ar'],
                        'short_description_en': app_data['short_description_en'],
                        'short_description_ar': app_data['short_description_ar'],
                        'description_en': app_data['description_en'],
                        'description_ar': app_data['description_ar'],
                        'platform': 'cross_platform',
                        'sort_order': app_data['sort_order'],
                        'status': 'published',
                        'featured': app_data['featured'],
                        'avg_rating': app_data['avg_rating'],
                        'review_count': 1000,  # Sample data
                        'view_count': 5000,   # Sample data
                        'developer': developer,
                    }
                )

                if created:
                    apps_created += 1

                    # Add categories
                    app_categories = []
                    for category_slug in app_data['categories']:
                        if category_slug in categories_map:
                            app_categories.append(categories_map[category_slug])

                    app.categories.set(app_categories)
                    self.stdout.write(f'  Created app: {app.name_en}')

        self.stdout.write(self.style.SUCCESS(f'Successfully created {apps_created} sample apps'))