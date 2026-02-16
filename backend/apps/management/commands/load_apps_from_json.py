"""
Load 44 real Quran apps from applications_data_python.json
"""
from django.core.management.base import BaseCommand
from django.db import transaction
from apps.models import App
from categories.models import Category
from developers.models import Developer
import json
from pathlib import Path


class Command(BaseCommand):
    help = 'Load 44 real Quran applications from applications_data_python.json'

    def handle(self, *args, **options):
        # Find the JSON file
        json_file = Path(__file__).parent.parent.parent.parent / 'applications_data_python.json'
        
        if not json_file.exists():
            self.stdout.write(self.style.ERROR(f'JSON file not found: {json_file}'))
            return
        
        with transaction.atomic():
            # Load JSON data
            self.stdout.write('Loading applications data from JSON...')
            with open(json_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            total_apps = data['meta']['total_apps']
            apps_data = data['apps']
            
            self.stdout.write(f'Found {len(apps_data)} apps in JSON file (expected {total_apps})')
            
            # Get or create categories
            categories_map = {}
            all_category_slugs = set()
            for app in apps_data:
                for cat_slug in app.get('categories', []):
                    all_category_slugs.add(cat_slug)
            
            self.stdout.write(f'Creating {len(all_category_slugs)} categories...')
            for cat_slug in sorted(all_category_slugs):
                # Convert slug to human readable name
                name_en = ' '.join(word.capitalize() for word in cat_slug.split('_'))
                name_ar = cat_slug  # Use slug as placeholder for Arabic
                
                category, created = Category.objects.get_or_create(
                    slug=cat_slug,
                    defaults={
                        'name_en': name_en,
                        'name_ar': name_ar,
                        'description_en': f'{name_en} applications',
                        'description_ar': f'تطبيقات {name_ar}',
                        'is_active': True,
                    }
                )
                categories_map[cat_slug] = category
            
            # Get or create developers
            developers_map = {}
            all_developers = set()
            for app in apps_data:
                dev_name = app.get('Developer_Name_En', 'Unknown')
                if dev_name and dev_name != 'Unknown':
                    all_developers.add(dev_name)
            
            self.stdout.write(f'Creating {len(all_developers)} developers...')
            for dev_name in sorted(all_developers):
                developer, created = Developer.objects.get_or_create(
                    name_en=dev_name,
                    defaults={
                        'name_ar': dev_name,  # Use English name as placeholder
                        'website': '',
                        'description_en': 'Islamic application developer',
                        'description_ar': 'مطور تطبيقات إسلامية',
                        'is_verified': True,
                    }
                )
                developers_map[dev_name] = developer
            
            # Create apps
            self.stdout.write('Creating applications...')
            created_count = 0
            for app_data in apps_data:
                slug = app_data['id'].lower().replace('_', '-')
                
                # Get developer
                dev_name = app_data.get('Developer_Name_En', 'Unknown')
                developer = developers_map.get(dev_name)
                
                app, created = App.objects.get_or_create(
                    slug=slug,
                    defaults={
                        'name_en': app_data.get('Name_En', ''),
                        'name_ar': app_data.get('Name_Ar', ''),
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
                        'avg_rating': app_data.get('Apps_Avg_Rating', 4.0),
                        'review_count': 0,
                        'view_count': 0,
                        'sort_order': app_data.get('sort', 999),
                        'status': 'published',
                        'featured': False,
                        'platform': 'cross_platform',
                        'developer': developer,
                    }
                )
                
                if created:
                    created_count += 1
                    
                    # Add categories
                    app_categories = []
                    for cat_slug in app_data.get('categories', []):
                        if cat_slug in categories_map:
                            app_categories.append(categories_map[cat_slug])
                    
                    app.categories.set(app_categories)
                    self.stdout.write(f'  ✓ {app_data.get("Name_En")}')
            
            self.stdout.write(
                self.style.SUCCESS(f'\nSuccessfully loaded {created_count} apps from JSON')
            )
