# Add desktop app store link fields (Microsoft Store, Mac App Store, Flathub).

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('apps', '0025_populate_app_metadata'),
    ]

    operations = [
        migrations.AddField(
            model_name='app',
            name='microsoft_store_link',
            field=models.URLField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='app',
            name='mac_app_store_link',
            field=models.URLField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='app',
            name='flathub_link',
            field=models.URLField(blank=True, null=True),
        ),
    ]
