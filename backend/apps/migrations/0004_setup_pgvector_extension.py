from django.db import migrations
from pgvector.django import VectorExtension, VectorField

class Migration(migrations.Migration):

    dependencies = [
        ('apps', '0003_sync_app_categories_from_frontend'),
    ]

    operations = [
        VectorExtension(),
        migrations.AddField(
            model_name='app',
            name='embedding',
            field=VectorField(blank=True, dimensions=1536, null=True),
        ),
    ]
