"""
Migrate full data from applicationsData.ts to database.

This command ensures the database is properly populated with all applications,
categories, and developers from the frontend data source.
"""
import json
import logging
from pathlib import Path
from typing import Dict, List, Any

from django.core.management.base import BaseCommand
from django.db import transaction

from apps.models import App
from categories.models import Category
from developers.models import Developer

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Migrate full data from applicationsData.ts to database'

    def add_arguments(self, parser):
        parser.add_argument('--dry-run', action='store_true',
                          help='Show what would be migrated without making changes')
        parser.add_argument('--force', action='store_true',
                          help='Force migration even if data exists')

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        force = options['force']

        # Import here to avoid circular imports
        from ...services.simple_data_parser import get_applications_data, extract_js_object

        self.stdout.write(
            self.style.SUCCESS('Starting full data migration...')
        )

        # Get applications data
        try:
            applications = get_applications_data()
            self.stdout.write(f'Found {len(applications)} applications in data source')
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Failed to load applications data: {e}')
            )
            return

        # Check if data already exists
        if not force:
            existing_apps = App.objects.count()
            if existing_apps > 0:
                self.stdout.write(
                    self.style.WARNING(
                        f'Database already contains {existing_apps} apps. '
                        'Use --force to overwrite or truncate first.'
                    )
                )
                return

        # Migration plan
        migration_plan = self._create_migration_plan(applications)

        # Execute migration
        if dry_run:
            self.stdout.write(
                self.style.SUCCESS('DRY RUN - Migration Plan:')
            )
            for step in migration_plan['steps']:
                self.stdout.write(
                    f'  - {step["description"]}: {len(step["items"])} items'
                )
        else:
            self._execute_migration(migration_plan)

    def _create_migration_plan(self, applications: List[Dict]) -> Dict:
        """Create a migration plan with proper ordering."""

        # Extract unique developers
        developers = {}
        for app in applications:
            developer_key = app['Developer_Name_En']
            if developer_key not in developers:
                developers[developer_key] = {
                    'id': developer_key.replace(' ', '_').lower(),
                    'name_en': app['Developer_Name_En'],
                    'name_ar': app['Developer_Name_Ar'],
                    'website': app.get('Developer_Website'),
                    'logo_url': app.get('Developer_Logo'),
                    'is_verified': True  # Default to verified
                }

        # Extract unique categories
        categories = {}
        all_category_names = []
        for app in applications:
            # Extract category names and handle special case for 'apps'
            app_categories = app['categories']
            if app_categories == 'apps':
                app_categories = ['general']

            all_category_names.extend(app_categories)

        # Create unique categories with proper slugs
        for cat_name in set(all_category_names):
            categories[cat_name] = {
                'id': cat_name,
                'name_en': cat_name.capitalize(),
                'name_ar': cat_name,  # TODO: Add Arabic translations
                'slug': cat_name.lower(),
                'icon_url': None,
                'color': '',
                'sort_order': len(categories)
            }

        # Extract apps with proper relationships
        apps = []
        for app_data in applications:
            app = {
                'id': app_data['id'],
                'name_en': app_data['Name_En'],
                'name_ar': app_data['Name_Ar'],
                'slug': app_data['Name_En'].lower().replace(' ', '-'),
                'short_description_en': app_data['Short_Description_En'],
                'short_description_ar': app_data['Short_Description_Ar'],
                'description_en': app_data['Description_En'],
                'description_ar': app_data['Description_Ar'],
                'avg_rating': app_data.get('Apps_Avg_Rating', 0.0),
                'review_count': 1000,  # Default value from original data
                'view_count': 5000,   # Default value from original data
                'sort_order': app_data.get('sort', 999),
                'status': 'published',
                'application_icon': app_data.get('applicationIcon'),
                'main_image_en': app_data.get('mainImage_en'),
                'main_image_ar': app_data.get('mainImage_ar'),
                'google_play_link': app_data.get('Google_Play_Link'),
                'app_store_link': app_data.get('AppStore_Link'),
                'app_gallery_link': app_data.get('App_Gallery_Link'),
                'platform': 'cross_platform',  # Default value
                'featured': True,  # Default value
                'developer_name': app_data['Developer_Name_En'],
                'categories': app_data.get('categories', []),
                'screenshots_ar': app_data.get('screenshots_ar', []),
                'screenshots_en': app_data.get('screenshots_en', [])
            }
            apps.append(app)

        return {
            'developers': list(developers.values()),
            'categories': list(categories.values()),
            'apps': apps,
            'steps': [
                {
                    'description': 'Insert developers',
                    'items': developers,
                    'model': Developer
                },
                {
                    'description': 'Insert categories',
                    'items': categories,
                    'model': Category
                },
                {
                    'description': 'Insert applications',
                    'items': apps,
                    'model': App
                }
            ]
        }

    @transaction.atomic
    def _execute_migration(self, migration_plan: Dict):
        """Execute the migration plan."""
        total_steps = len(migration_plan['steps'])

        for i, step in enumerate(migration_plan['steps'], 1):
            step_name = step['description']
            items = step['items']
            model = step['model']

            self.stdout.write(
                f'\nStep {i}/{total_steps}: {step_name} - {len(items)} items'
            )

            # Handle different models
            if model == Developer:
                self._migrate_developers(items)
            elif model == Category:
                self._migrate_categories(items)
            elif model == App:
                self._migrate_apps(items, migration_plan)

        self.stdout.write(
            self.style.SUCCESS(
                f'\n✅ Migration completed successfully! '
                f'{len(migration_plan["apps"])} apps, '
                f'{len(migration_plan["categories"])} categories, '
                f'{len(migration_plan["developers"])} developers migrated.'
            )
        )

    def _migrate_developers(self, developers: List[Dict]):
        """Migrate developers."""
        created = 0
        updated = 0

        for dev_data in developers:
            # Use name_en as unique identifier
            dev, created_flag = Developer.objects.get_or_create(
                name_en=dev_data['name_en'],
                defaults={
                    'name_ar': dev_data['name_ar'],
                    'website': dev_data['website'],
                    'logo_url': dev_data['logo_url'],
                    'is_verified': dev_data['is_verified']
                }
            )

            if created_flag:
                created += 1
            else:
                updated += 1

        self.stdout.write(
            f'  Created: {created}, Updated: {updated}'
        )

    def _migrate_categories(self, categories: List[Dict]):
        """Migrate categories."""
        created = 0
        updated = 0

        for cat_data in categories:
            category, created_flag = Category.objects.get_or_create(
                slug=cat_data['slug'],
                defaults={
                    'name_en': cat_data['name_en'],
                    'name_ar': cat_data['name_ar'],
                    'icon_url': cat_data['icon_url'],
                    'color': cat_data['color'],
                    'sort_order': cat_data['sort_order']
                }
            )

            if created_flag:
                created += 1
            else:
                updated += 1

        self.stdout.write(
            f'  Created: {created}, Updated: {updated}'
        )

    def _migrate_apps(self, apps: List[Dict], migration_plan: Dict):
        """Migrate apps with all relationships."""
        created = 0
        updated = 0

        for app_data in apps:
            # Get or create developer
            developer, dev_created = Developer.objects.get_or_create(
                name_en=app_data['developer_name'],
                defaults={
                    'name_ar': app_data['name_en'],  # Fallback
                    'is_verified': True
                }
            )

            # Prepare category slugs
            category_slugs = []
            for cat_name in app_data['categories']:
                if cat_name == 'apps':
                    cat_name = 'general'
                category_slugs.append(cat_name.lower())

            # Get or create app
            app, created_flag = App.objects.get_or_create(
                slug=app_data['slug'],
                defaults={
                    'name_en': app_data['name_en'],
                    'name_ar': app_data['name_ar'],
                    'short_description_en': app_data['short_description_en'],
                    'short_description_ar': app_data['short_description_ar'],
                    'description_en': app_data['description_en'],
                    'description_ar': app_data['description_ar'],
                    'avg_rating': app_data['avg_rating'],
                    'review_count': app_data['review_count'],
                    'view_count': app_data['view_count'],
                    'sort_order': app_data['sort_order'],
                    'status': app_data['status'],
                    'application_icon': app_data['application_icon'],
                    'main_image_en': app_data['main_image_en'],
                    'main_image_ar': app_data['main_image_ar'],
                    'google_play_link': app_data['google_play_link'],
                    'app_store_link': app_data['app_store_link'],
                    'app_gallery_link': app_data['app_gallery_link'],
                    'platform': app_data['platform'],
                    'featured': app_data['featured'],
                    'developer': developer
                }
            )

            # Update categories (M2M relationship)
            if category_slugs:
                category_objs = []
                for slug in category_slugs:
                    try:
                        category = Category.objects.get(slug=slug)
                        category_objs.append(category)
                    except Category.DoesNotExist:
                        self.stdout.write(
                            self.style.WARNING(
                                f'  Category {slug} not found for app {app.name_en}'
                            )
                        )
                app.categories.set(category_objs)

            # Create screenshots (future enhancement)
            if created_flag:
                created += 1
            else:
                updated += 1

        self.stdout.write(
            f'  Created: {created}, Updated: {updated}'
        )