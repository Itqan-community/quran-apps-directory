from django.core.management.base import BaseCommand
from django.db import transaction
from apps.models import App
from categories.models import Category
from developers.models import Developer


class Command(BaseCommand):
    help = 'Export current data and recreate with integer IDs'

    def handle(self, *args, **options):
        self.stdout.write('Exporting current data...')

        # Export developers
        developers_data = []
        for dev in Developer.objects.all():
            developers_data.append({
                'name_en': dev.name_en,
                'name_ar': dev.name_ar,
                'logo_url': dev.logo_url,
                'is_verified': dev.is_verified,
                'website': dev.website,
                'email': dev.email,
                'description_en': dev.description_en,
                'description_ar': dev.description_ar,
                'contact_info': dev.contact_info,
                'social_links': dev.social_links,
            })

        # Export categories
        categories_data = []
        for cat in Category.objects.all():
            categories_data.append({
                'name_en': cat.name_en,
                'name_ar': cat.name_ar,
                'slug': cat.slug,
                'icon': cat.icon,
                'color': cat.color,
                'description_en': cat.description_en,
                'description_ar': cat.description_ar,
                'sort_order': cat.sort_order,
                'is_active': cat.is_active,
            })

        # Export apps with relationships
        apps_data = []
        for app in App.objects.select_related('developer').prefetch_related('categories').all():
            apps_data.append({
                'name_en': app.name_en,
                'name_ar': app.name_ar,
                'slug': app.slug,
                'short_description_en': app.short_description_en,
                'short_description_ar': app.short_description_ar,
                'description_en': app.description_en,
                'description_ar': app.description_ar,
                'application_icon': app.application_icon,
                'main_image_en': app.main_image_en,
                'main_image_ar': app.main_image_ar,
                'google_play_link': app.google_play_link,
                'app_store_link': app.app_store_link,
                'app_gallery_link': app.app_gallery_link,
                'screenshots_en': app.screenshots_en,
                'screenshots_ar': app.screenshots_ar,
                'avg_rating': app.avg_rating,
                'review_count': app.review_count,
                'view_count': app.view_count,
                'sort_order': app.sort_order,
                'platform': app.platform,
                'featured': app.featured,
                'status': app.status,
                'developer_name_en': app.developer.name_en if app.developer else None,
                'developer_name_ar': app.developer.name_ar if app.developer else None,
                'category_slugs': [cat.slug for cat in app.categories.all()],
            })

        self.stdout.write(f'Exported {len(developers_data)} developers')
        self.stdout.write(f'Exported {len(categories_data)} categories')
        self.stdout.write(f'Exported {len(apps_data)} apps')

        # Now clear all data and recreate with integer IDs
        with transaction.atomic():
            self.stdout.write('Clearing existing data...')
            App.objects.all().delete()
            Developer.objects.all().delete()
            Category.objects.all().delete()

            # Create developers
            developer_map = {}
            for i, dev_data in enumerate(developers_data, 1):
                dev = Developer.objects.create(**dev_data)
                developer_map[dev_data['name_en']] = dev
                self.stdout.write(f'Created developer: {dev.name_en} (ID: {dev.id})')

            # Create categories
            category_map = {}
            for cat_data in categories_data:
                cat = Category.objects.create(**cat_data)
                category_map[cat.slug] = cat
                self.stdout.write(f'Created category: {cat.name_en} (ID: {cat.id})')

            # Create apps
            for app_data in apps_data:
                # Remove developer name and category slugs from app_data
                developer_name_en = app_data.pop('developer_name_en')
                developer_name_ar = app_data.pop('developer_name_ar')
                category_slugs = app_data.pop('category_slugs')

                # Find developer
                developer = None
                if developer_name_en:
                    developer = developer_map.get(developer_name_en)

                # Create app
                app = App.objects.create(**app_data, developer=developer)

                # Add categories
                for cat_slug in category_slugs:
                    if cat_slug in category_map:
                        app.categories.add(category_map[cat_slug])

                self.stdout.write(f'Created app: {app.name_en} (ID: {app.id})')

        self.stdout.write(self.style.SUCCESS('Successfully recreated all data with integer IDs!'))