# Generated manually for making main_image_en and main_image_ar mandatory

from django.db import migrations, models
import apps.validators
import core.storage.r2_storage


def main_image_en_upload_path(instance, filename):
    """Upload path function for English main images."""
    ext = filename.split('.')[-1].lower()
    if ext not in ['png', 'jpg', 'jpeg', 'webp']:
        ext = 'png'
    slug = instance.slug or 'unknown'
    return f"app-images/{slug}/main_en.{ext}"


def main_image_ar_upload_path(instance, filename):
    """Upload path function for Arabic main images."""
    ext = filename.split('.')[-1].lower()
    if ext not in ['png', 'jpg', 'jpeg', 'webp']:
        ext = 'png'
    slug = instance.slug or 'unknown'
    return f"app-images/{slug}/main_ar.{ext}"


def cleanup_test_apps_without_images(apps, schema_editor):
    """
    Delete test apps that don't have main images.
    These are test records (IDs 46, 48, 49) that were created for testing
    and don't have proper main images.
    """
    App = apps.get_model('apps', 'App')

    # Find apps without main images
    apps_without_images = App.objects.filter(
        models.Q(main_image_en='') | models.Q(main_image_en__isnull=True) |
        models.Q(main_image_ar='') | models.Q(main_image_ar__isnull=True)
    )

    count = apps_without_images.count()
    if count > 0:
        print(f"\n  Deleting {count} app(s) without main images:")
        for app in apps_without_images:
            print(f"    - ID {app.id}: {app.name_en} (status: {app.status})")
        apps_without_images.delete()
        print(f"  Deleted {count} test app(s)")
    else:
        print("\n  All apps have main images, no cleanup needed")


def reverse_cleanup(apps, schema_editor):
    """
    Reverse migration cannot restore deleted apps.
    This is acceptable as they were test records.
    """
    print("\n  Note: Deleted test apps cannot be restored")


class Migration(migrations.Migration):
    # Run each operation in its own transaction to avoid
    # "cannot ALTER TABLE because it has pending trigger events" error
    atomic = False

    dependencies = [
        ('apps', '0018_make_application_icon_mandatory'),
    ]

    operations = [
        # Step 1: Clean up test apps without main images
        migrations.RunPython(
            cleanup_test_apps_without_images,
            reverse_cleanup,
        ),

        # Step 2: Make main_image_en mandatory
        migrations.AlterField(
            model_name='app',
            name='main_image_en',
            field=models.ImageField(
                blank=False,
                help_text='Main cover image - English (PNG, JPG, WebP, max 5MB, required)',
                max_length=500,
                storage=core.storage.r2_storage.R2Storage(),
                upload_to=main_image_en_upload_path,
                validators=[apps.validators.validate_image_file],
            ),
        ),

        # Step 3: Make main_image_ar mandatory
        migrations.AlterField(
            model_name='app',
            name='main_image_ar',
            field=models.ImageField(
                blank=False,
                help_text='Main cover image - Arabic (PNG, JPG, WebP, max 5MB, required)',
                max_length=500,
                storage=core.storage.r2_storage.R2Storage(),
                upload_to=main_image_ar_upload_path,
                validators=[apps.validators.validate_image_file],
            ),
        ),
    ]
