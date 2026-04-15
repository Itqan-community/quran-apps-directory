from django.db import migrations


def fix_zuolfa_images(apps, schema_editor):
    App = apps.get_model('apps', 'App')
    try:
        app = App.objects.get(id=45)
        app.main_image_en = 'app-images/zuolfa/main_en.webp'
        app.main_image_ar = 'app-images/zuolfa/main_ar.webp'
        app.save(update_fields=['main_image_en', 'main_image_ar'])
        print(f"  Updated zuolfa image paths")
    except App.DoesNotExist:
        print("  App 45 (zuolfa) not found, skipping")


class Migration(migrations.Migration):
    dependencies = [
        ('apps', '0021_resync_app_categories_v2'),
    ]

    operations = [
        migrations.RunPython(fix_zuolfa_images, migrations.RunPython.noop),
    ]
