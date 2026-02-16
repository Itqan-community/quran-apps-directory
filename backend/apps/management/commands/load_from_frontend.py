"""
Load apps data directly from frontend applicationsData.ts file.
This ensures the database matches the frontend exactly.
"""

import json
import re
from django.core.management.base import BaseCommand
from apps.models import App
from categories.models import Category
from developers.models import Developer


class Command(BaseCommand):
    help = 'Load apps from frontend applicationsData.ts file'

    def handle(self, *args, **options):
        # Read the TypeScript file
        ts_file_path = '/Users/baka/zItqaan/Projects/quran-apps-directory/src/app/services/applicationsData.ts'

        with open(ts_file_path, 'r', encoding='utf-8') as f:
            content = f.read()

        # Find the start of the applicationsData array
        start_match = re.search(r'export const applicationsData\s*=\s*\[', content)
        if not start_match:
            self.stdout.write(self.style.ERROR('Could not find applicationsData array start'))
            return

        start_pos = start_match.end() - 1  # Include the opening [

        # Find the end - look for the first ];  after "// categories definition" comment
        # which marks the end of applicationsData array
        categories_comment_pos = content.find('// categories definition', start_pos)
        if categories_comment_pos == -1:
            self.stdout.write(self.style.ERROR('Could not find categories definition comment'))
            return

        # Find the ] before the categories comment (work backwards from comment)
        end_pos = content.rfind(']', start_pos, categories_comment_pos)
        if end_pos == -1:
            self.stdout.write(self.style.ERROR('Could not find applicationsData array end'))
            return

        # Extract just the array content
        array_content = content[start_pos:end_pos + 1]

        # Remove trailing commas (TypeScript allows them, JSON doesn't)
        # Replace },] with }] to fix the last element
        json_content = re.sub(r',(\s*])', r'\1', array_content)

        # Parse JSON
        try:
            apps_data = json.loads(json_content)
        except json.JSONDecodeError as e:
            self.stdout.write(self.style.ERROR(f'JSON parse error: {e}'))
            self.stdout.write(self.style.ERROR(f'Near position {e.pos}:'))
            # Show context around error
            start = max(0, e.pos - 100)
            end = min(len(array_content), e.pos + 100)
            self.stdout.write(array_content[start:end])
            return

        self.stdout.write(f'Found {len(apps_data)} apps in frontend data')

        # Process each app
        created_count = 0
        updated_count = 0

        for app_data in apps_data:
            try:
                # Get or create developer
                dev_name_en = app_data.get('Developer_Name_En', 'Unknown')
                dev_name_ar = app_data.get('Developer_Name_Ar', 'غير معروف')

                developer, _ = Developer.objects.get_or_create(
                    name_en=dev_name_en,
                    defaults={
                        'name_ar': dev_name_ar,
                        'logo_url': app_data.get('Developer_Logo'),
                        'website': app_data.get('Developer_Website'),
                    }
                )

                # Generate slug from frontend ID
                frontend_id = app_data.get('id', '')
                slug = frontend_id.lower().replace(' ', '_').replace('-', '_')

                # Prepare app defaults
                defaults = {
                    'slug': slug,
                    'name_en': app_data.get('Name_En', ''),
                    'name_ar': app_data.get('Name_Ar', ''),
                    'short_description_en': app_data.get('Short_Description_En', ''),
                    'short_description_ar': app_data.get('Short_Description_Ar', ''),
                    'description_en': app_data.get('Description_En', ''),
                    'description_ar': app_data.get('Description_Ar', ''),
                    'application_icon': app_data.get('applicationIcon'),
                    'main_image_en': app_data.get('mainImage_en'),
                    'main_image_ar': app_data.get('mainImage_ar'),
                    'screenshots_en': app_data.get('screenshots_en', []),
                    'screenshots_ar': app_data.get('screenshots_ar', []),
                    'google_play_link': app_data.get('Google_Play_Link', ''),
                    'app_store_link': app_data.get('AppStore_Link', ''),
                    'app_gallery_link': app_data.get('App_Gallery_Link', ''),
                    'avg_rating': float(app_data.get('Apps_Avg_Rating', 0)),
                    'review_count': 0,
                    'view_count': 0,
                    'featured': False,
                    'platform': 'cross_platform',
                    'sort_order': app_data.get('sort', 0),
                    'status': 'published',
                    'developer': developer,
                }

                # Get or create app by slug (frontend ID)
                app, created = App.objects.update_or_create(
                    slug=slug,
                    defaults=defaults
                )

                # Add categories
                if 'categories' in app_data:
                    category_objs = []
                    for cat_slug in app_data['categories']:
                        category, _ = Category.objects.get_or_create(
                            slug=cat_slug.lower(),
                            defaults={
                                'name_en': cat_slug.title(),
                                'name_ar': cat_slug,
                            }
                        )
                        category_objs.append(category)
                    app.categories.set(category_objs)

                if created:
                    created_count += 1
                    self.stdout.write(f'  Created: {app.name_en}')
                else:
                    updated_count += 1
                    self.stdout.write(f'  Updated: {app.name_en}')

            except Exception as e:
                self.stdout.write(self.style.ERROR(f'Error processing app: {e}'))
                continue

        self.stdout.write(self.style.SUCCESS(
            f'\n✅ Completed! Created: {created_count}, Updated: {updated_count}'
        ))
