# Data migration: Convert R2 URLs to relative paths and populate AppScreenshot model
#
# This migration:
# 1. Converts application_icon, main_image_en, main_image_ar from full R2 URLs to relative paths
# 2. Populates AppScreenshot model from screenshots_en/screenshots_ar JSONFields
# 3. Preserves external URLs (non-R2) as-is

from django.db import migrations
from django.conf import settings


# R2 public URL to strip from full URLs
R2_PUBLIC_URL = 'https://pub-e11717db663c469fb51c65995892b449.r2.dev/'


def convert_to_relative_path(url):
    """
    Convert full R2 URL to relative path.

    Examples:
        'https://pub-e11717db663c469fb51c65995892b449.r2.dev/1_Wahy/icon.png' -> '1_Wahy/icon.png'
        'https://mzstatic.com/image/...' -> 'https://mzstatic.com/image/...' (unchanged)
        '1_Wahy/icon.png' -> '1_Wahy/icon.png' (unchanged)
        '' -> ''
        None -> ''
    """
    if not url:
        return ''

    # If it starts with our R2 URL, strip it to get relative path
    if url.startswith(R2_PUBLIC_URL):
        return url[len(R2_PUBLIC_URL):]

    # Return as-is (external URL or already relative)
    return url


def migrate_to_relative_paths(apps, schema_editor):
    """
    Forward migration:
    1. Convert image fields from full R2 URLs to relative paths
    2. Populate AppScreenshot from screenshots_en/ar JSONFields
    """
    App = apps.get_model('apps', 'App')
    AppScreenshot = apps.get_model('apps', 'AppScreenshot')

    apps_updated = 0
    screenshots_created = 0

    for app in App.objects.all():
        updated = False

        # Convert application_icon
        icon_name = app.application_icon.name if app.application_icon else ''
        new_icon = convert_to_relative_path(icon_name)
        if new_icon != icon_name:
            app.application_icon.name = new_icon
            updated = True

        # Convert main_image_en
        main_en_name = app.main_image_en.name if app.main_image_en else ''
        new_main_en = convert_to_relative_path(main_en_name)
        if new_main_en != main_en_name:
            app.main_image_en.name = new_main_en
            updated = True

        # Convert main_image_ar
        main_ar_name = app.main_image_ar.name if app.main_image_ar else ''
        new_main_ar = convert_to_relative_path(main_ar_name)
        if new_main_ar != main_ar_name:
            app.main_image_ar.name = new_main_ar
            updated = True

        if updated:
            app.save(update_fields=['application_icon', 'main_image_en', 'main_image_ar'])
            apps_updated += 1

        # Create AppScreenshot entries from screenshots_en
        screenshots_en = app.screenshots_en or []
        for idx, url in enumerate(screenshots_en):
            if url:  # Skip empty strings
                # Convert URL to relative path if it's an R2 URL
                image_path = convert_to_relative_path(url)
                AppScreenshot.objects.create(
                    app=app,
                    language='en',
                    image=image_path,
                    sort_order=idx
                )
                screenshots_created += 1

        # Create AppScreenshot entries from screenshots_ar
        screenshots_ar = app.screenshots_ar or []
        for idx, url in enumerate(screenshots_ar):
            if url:  # Skip empty strings
                # Convert URL to relative path if it's an R2 URL
                image_path = convert_to_relative_path(url)
                AppScreenshot.objects.create(
                    app=app,
                    language='ar',
                    image=image_path,
                    sort_order=idx
                )
                screenshots_created += 1

    print(f"  Migrated {apps_updated} apps to relative paths")
    print(f"  Created {screenshots_created} AppScreenshot entries")


def reverse_migration(apps, schema_editor):
    """
    Reverse migration:
    1. Delete all AppScreenshot entries (data goes back to JSONFields)
    2. Note: URL->path conversion is not reversed (paths still work with url())
    """
    AppScreenshot = apps.get_model('apps', 'AppScreenshot')
    count = AppScreenshot.objects.count()
    AppScreenshot.objects.all().delete()
    print(f"  Deleted {count} AppScreenshot entries")


class Migration(migrations.Migration):

    dependencies = [
        ('apps', '0016_convert_main_images_add_screenshots'),
    ]

    operations = [
        migrations.RunPython(migrate_to_relative_paths, reverse_migration),
    ]
