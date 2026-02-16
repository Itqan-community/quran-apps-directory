"""
Management command to load applications data from extracted JSON file
This creates a fresh database from scratch with clean data from applicationsData.ts
"""
import json
import os
from django.core.management.base import BaseCommand
from django.db import transaction
from apps.models import App
from categories.models import Category
from developers.models import Developer


class Command(BaseCommand):
    help = 'Load applications data from applications_data_python.json file'

    def add_arguments(self, parser):
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Clear all existing data before loading',
        )

    @transaction.atomic
    def handle(self, *args, **options):
        if options['clear']:
            self.stdout.write('Clearing existing data...')
            App.objects.all().delete()
            Category.objects.all().delete()
            Developer.objects.all().delete()
            self.stdout.write(self.style.SUCCESS('Data cleared'))

        # Find and load the JSON file
        # Management command is at: backend/apps/management/commands/
        # JSON file is at: backend/
        backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
        json_file_path = os.path.join(backend_dir, 'applications_data_python.json')

        if not os.path.exists(json_file_path):
            self.stdout.write(self.style.ERROR(f'JSON file not found at {json_file_path}'))
            return

        self.stdout.write(f'Loading applications data from: {json_file_path}')

        # Load JSON data
        with open(json_file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)

        applications_data = data.get('apps', [])
        self.stdout.write(f'Found {len(applications_data)} applications to load')

        # Create a mapping of category names to Category objects
        categories_map = {}
        all_categories = set()

        # Collect all unique categories
        for app_data in applications_data:
            for cat in app_data.get('categories', []):
                all_categories.add(cat)

        # Create Category objects
        for cat_name in sorted(all_categories):
            category, created = Category.objects.get_or_create(
                name_en=cat_name.capitalize(),
                defaults={
                    'name_ar': cat_name,
                    'slug': cat_name.lower(),
                }
            )
            categories_map[cat_name] = category
            status = 'Created' if created else 'Exists'
            self.stdout.write(f'  Category {status}: {cat_name}')

        # Create App objects
        apps_created = 0
        for app_data in applications_data:
            try:
                # Create or get Developer
                developer, dev_created = Developer.objects.get_or_create(
                    name_en=app_data['Developer_Name_En'],
                    defaults={
                        'name_ar': app_data['Developer_Name_Ar'],
                        'website': app_data.get('Developer_Website', ''),
                        'logo_url': app_data.get('Developer_Logo', ''),
                    }
                )

                # Create App
                app, created = App.objects.get_or_create(
                    slug=f"{app_data['id']}".lower().replace(' ', '_'),
                    defaults={
                        'name_en': app_data['Name_En'],
                        'name_ar': app_data['Name_Ar'],
                        'short_description_en': app_data.get('Short_Description_En', ''),
                        'short_description_ar': app_data.get('Short_Description_Ar', ''),
                        'description_en': app_data.get('Description_En', ''),
                        'description_ar': app_data.get('Description_Ar', ''),
                        'application_icon': app_data.get('applicationIcon', ''),
                        'main_image_en': app_data.get('mainImage_en', ''),
                        'main_image_ar': app_data.get('mainImage_ar', ''),
                        'google_play_link': app_data.get('Google_Play_Link', ''),
                        'app_store_link': app_data.get('AppStore_Link', ''),
                        'app_gallery_link': app_data.get('App_Gallery_Link', ''),
                        'screenshots_en': app_data.get('screenshots_en', []),
                        'screenshots_ar': app_data.get('screenshots_ar', []),
                        'avg_rating': float(app_data.get('Apps_Avg_Rating', 0)),
                        'sort_order': app_data.get('sort', 0),
                        'status': 'published',  # Always set to published
                        'developer': developer,
                    }
                )

                # Add categories to the app
                for cat_name in app_data.get('categories', []):
                    if cat_name in categories_map:
                        app.categories.add(categories_map[cat_name])

                if created:
                    apps_created += 1
                    self.stdout.write(f'  ✓ App Created: {app.name_en} (ID: {app.id}, Slug: {app.slug})')
                else:
                    self.stdout.write(f'  ~ App Already Exists: {app.name_en} (ID: {app.id})')

            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(f'  ✗ Error loading app {app_data.get("Name_En", "Unknown")}: {str(e)}')
                )

        # Print summary
        self.stdout.write(self.style.SUCCESS('\n✅ Data loading completed!'))
        self.stdout.write(f'  Total Developers: {Developer.objects.count()}')
        self.stdout.write(f'  Total Categories: {Category.objects.count()}')
        self.stdout.write(f'  Total Apps: {App.objects.count()}')
        self.stdout.write(f'  Apps Created: {apps_created}')

        # Verify data integrity
        total_screenshots = sum(len(app.screenshots_en) + len(app.screenshots_ar) for app in App.objects.all())
        self.stdout.write(f'  Total Screenshots: {total_screenshots}')
