# Generated migration for changing application_icon from URLField to ImageField

from django.db import migrations, models
import apps.validators
import core.storage.r2_storage


def app_icon_upload_path(instance, filename):
    """Upload path function for the migration."""
    ext = filename.split('.')[-1].lower()
    if ext not in ['png', 'jpg', 'jpeg', 'webp']:
        ext = 'png'
    slug = instance.slug or 'unknown'
    return f"app-icons/{slug}/icon.{ext}"


class Migration(migrations.Migration):

    dependencies = [
        ('apps', '0013_appviewevent'),
    ]

    operations = [
        migrations.AlterField(
            model_name='app',
            name='application_icon',
            field=models.ImageField(
                blank=True,
                help_text='App icon (PNG, JPG, or WebP, max 512KB)',
                null=True,
                storage=core.storage.r2_storage.R2Storage(),
                upload_to=app_icon_upload_path,
                validators=[apps.validators.validate_icon_file],
            ),
        ),
    ]
