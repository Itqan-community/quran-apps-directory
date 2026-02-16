# Migration: Make application_icon field mandatory
#
# This migration:
# 1. Sets a default icon for any apps that don't have one
# 2. Alters the field to be non-nullable (blank=False, null=False)

from django.db import migrations, models
import apps.validators
import core.storage.r2_storage


DEFAULT_ICON_PATH = 'defaults/app-icon.png'


def app_icon_upload_path(instance, filename):
    """Upload path function for the migration."""
    ext = filename.split('.')[-1].lower()
    if ext not in ['png', 'jpg', 'jpeg', 'webp']:
        ext = 'png'
    slug = instance.slug or 'unknown'
    return f"app-icons/{slug}/icon.{ext}"


def set_default_icons(apps, schema_editor):
    """
    Set default icon for any apps that don't have one.
    """
    App = apps.get_model('apps', 'App')

    # Find apps with no icon
    apps_without_icon = []
    for app in App.objects.all():
        icon_name = app.application_icon.name if app.application_icon else ''
        if not icon_name:
            apps_without_icon.append(app)

    if not apps_without_icon:
        print("  All apps already have icons")
        return

    # Set default icon for apps without one
    for app in apps_without_icon:
        app.application_icon = DEFAULT_ICON_PATH
        app.save(update_fields=['application_icon'])
        print(f"  Set default icon for: {app.name_en}")

    print(f"  Updated {len(apps_without_icon)} apps with default icon")


def reverse_set_default_icons(apps, schema_editor):
    """
    Reverse migration: No action needed, icons can remain.
    """
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('apps', '0017_migrate_to_relative_paths'),
    ]

    operations = [
        # First, ensure all apps have an icon
        migrations.RunPython(set_default_icons, reverse_set_default_icons),

        # Then alter the field to be non-nullable
        migrations.AlterField(
            model_name='app',
            name='application_icon',
            field=models.ImageField(
                help_text='App icon (PNG, JPG, or WebP, max 512KB, required)',
                storage=core.storage.r2_storage.R2Storage(),
                upload_to=app_icon_upload_path,
                validators=[apps.validators.validate_icon_file],
            ),
        ),
    ]
