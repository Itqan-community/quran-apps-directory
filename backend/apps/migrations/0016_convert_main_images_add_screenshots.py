# Schema migration to convert main_image fields to ImageField and create AppScreenshot model

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


def screenshot_upload_path(instance, filename):
    """Upload path function for screenshots."""
    ext = filename.split('.')[-1].lower()
    if ext not in ['png', 'jpg', 'jpeg', 'webp']:
        ext = 'png'
    slug = instance.app.slug or 'unknown'
    return f"app-images/{slug}/screenshots/{instance.language}_{instance.sort_order}.{ext}"


class Migration(migrations.Migration):

    dependencies = [
        ('apps', '0015_migrate_icon_urls_to_paths'),
    ]

    operations = [
        # Convert main_image_en from URLField to ImageField
        migrations.AlterField(
            model_name='app',
            name='main_image_en',
            field=models.ImageField(
                blank=True,
                help_text='Main cover image - English (PNG, JPG, WebP, max 5MB)',
                max_length=500,  # Full URLs can be long
                null=True,
                storage=core.storage.r2_storage.R2Storage(),
                upload_to=main_image_en_upload_path,
                validators=[apps.validators.validate_image_file],
            ),
        ),
        # Convert main_image_ar from URLField to ImageField
        migrations.AlterField(
            model_name='app',
            name='main_image_ar',
            field=models.ImageField(
                blank=True,
                help_text='Main cover image - Arabic (PNG, JPG, WebP, max 5MB)',
                max_length=500,  # Full URLs can be long
                null=True,
                storage=core.storage.r2_storage.R2Storage(),
                upload_to=main_image_ar_upload_path,
                validators=[apps.validators.validate_image_file],
            ),
        ),
        # Create AppScreenshot model
        migrations.CreateModel(
            name='AppScreenshot',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('language', models.CharField(
                    choices=[('en', 'English'), ('ar', 'Arabic')],
                    db_index=True,
                    default='en',
                    max_length=2
                )),
                ('image', models.ImageField(
                    help_text='Screenshot image (PNG, JPG, WebP, max 5MB)',
                    max_length=500,  # Full URLs can be long
                    storage=core.storage.r2_storage.R2Storage(),
                    upload_to=screenshot_upload_path,
                    validators=[apps.validators.validate_image_file]
                )),
                ('sort_order', models.PositiveIntegerField(default=0)),
                ('app', models.ForeignKey(
                    on_delete=models.deletion.CASCADE,
                    related_name='screenshot_files',
                    to='apps.app'
                )),
            ],
            options={
                'verbose_name': 'App Screenshot',
                'verbose_name_plural': 'App Screenshots',
                'db_table': 'app_screenshots',
                'ordering': ['language', 'sort_order'],
            },
        ),
        # Add indexes for AppScreenshot
        migrations.AddIndex(
            model_name='appscreenshot',
            index=models.Index(fields=['app', 'language'], name='app_screens_app_id_c1d1f4_idx'),
        ),
        migrations.AddIndex(
            model_name='appscreenshot',
            index=models.Index(fields=['app', 'language', 'sort_order'], name='app_screens_app_id_3d8b9e_idx'),
        ),
    ]
