"""
Migration to add crawled_content field to AppSubmission model.

Stores cached content from store pages/website for embedding generation.
"""
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('submissions', '0002_add_main_image_fields'),
    ]

    operations = [
        migrations.AddField(
            model_name='appsubmission',
            name='crawled_content',
            field=models.TextField(
                blank=True,
                null=True,
                help_text='Cached content crawled from store pages/website for embedding'
            ),
        ),
    ]
