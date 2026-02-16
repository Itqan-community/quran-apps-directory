# Data migration to convert existing icon URLs to relative paths
# Files already exist in R2, we just need to store paths instead of full URLs

from django.db import migrations


# R2 public URL base - icons are already stored here
R2_BASE_URL = 'https://pub-e11717db663c469fb51c65995892b449.r2.dev/'


def migrate_urls_to_paths(apps, schema_editor):
    """
    Convert existing full URLs to relative paths for ImageField.

    Existing icons are stored as full URLs like:
    https://pub-e11717db663c469fb51c65995892b449.r2.dev/AppName/app_icon.png

    We need to store just the path:
    AppName/app_icon.png

    The R2Storage.url() method will reconstruct the full URL.
    """
    App = apps.get_model('apps', 'App')

    updated_count = 0
    for app in App.objects.exclude(application_icon='').exclude(application_icon__isnull=True):
        # Get the raw string value (ImageFieldFile.name gives the stored string)
        icon_value = app.application_icon.name if hasattr(app.application_icon, 'name') else str(app.application_icon)

        # Skip if empty or already a relative path (no http)
        if not icon_value or not icon_value.startswith('http'):
            continue

        # Extract path from full R2 URL only
        if icon_value.startswith(R2_BASE_URL):
            relative_path = icon_value.replace(R2_BASE_URL, '')
            app.application_icon = relative_path
            app.save(update_fields=['application_icon'])
            updated_count += 1
            print(f"  Migrated: {app.name_en} -> {relative_path}")

    print(f"  Total icons migrated: {updated_count}")


def reverse_migration(apps, schema_editor):
    """
    Reverse the migration by converting paths back to full URLs.
    """
    App = apps.get_model('apps', 'App')

    for app in App.objects.exclude(application_icon='').exclude(application_icon__isnull=True):
        # Get the raw string value
        icon_value = app.application_icon.name if hasattr(app.application_icon, 'name') else str(app.application_icon)

        # Skip if empty or already a full URL
        if not icon_value or icon_value.startswith('http'):
            continue

        # Convert path back to full URL
        full_url = f"{R2_BASE_URL}{icon_value}"
        app.application_icon = full_url
        app.save(update_fields=['application_icon'])


class Migration(migrations.Migration):

    dependencies = [
        ('apps', '0014_alter_application_icon_to_imagefield'),
    ]

    operations = [
        migrations.RunPython(migrate_urls_to_paths, reverse_migration),
    ]
