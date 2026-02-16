"""
Migration to create AppCrawledData table for storing crawled content per source.
"""
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('apps', '0006_add_crawled_content_cache'),
    ]

    operations = [
        migrations.CreateModel(
            name='AppCrawledData',
            fields=[
                ('id', models.BigAutoField(primary_key=True, serialize=False)),
                ('source', models.CharField(
                    choices=[
                        ('google_play', 'Google Play'),
                        ('app_store', 'App Store'),
                        ('app_gallery', 'AppGallery'),
                        ('website', 'Website')
                    ],
                    db_index=True,
                    max_length=20
                )),
                ('url', models.URLField(
                    help_text='The URL that was crawled',
                    max_length=500
                )),
                ('content', models.TextField(
                    blank=True,
                    default='',
                    help_text='Crawled text content'
                )),
                ('status', models.CharField(
                    choices=[
                        ('success', 'Success'),
                        ('failed', 'Failed'),
                        ('not_found', 'Not Found'),
                        ('pending', 'Pending')
                    ],
                    db_index=True,
                    default='pending',
                    max_length=20
                )),
                ('metadata', models.JSONField(
                    blank=True,
                    default=dict,
                    help_text='Extra info: char_count, error_message, http_status, etc.'
                )),
                ('crawled_at', models.DateTimeField(
                    auto_now_add=True,
                    db_index=True,
                    help_text='Timestamp when this URL was crawled'
                )),
                ('app', models.ForeignKey(
                    db_index=True,
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='crawled_data',
                    to='apps.app'
                )),
            ],
            options={
                'verbose_name': 'App Crawled Data',
                'verbose_name_plural': 'App Crawled Data',
                'db_table': 'app_crawled_data',
                'ordering': ['-crawled_at'],
            },
        ),
        migrations.AddIndex(
            model_name='appcrawleddata',
            index=models.Index(fields=['app', 'source'], name='app_crawled_app_id_0d5c8c_idx'),
        ),
        migrations.AddIndex(
            model_name='appcrawleddata',
            index=models.Index(fields=['status'], name='app_crawled_status_5e6e5a_idx'),
        ),
        migrations.AddIndex(
            model_name='appcrawleddata',
            index=models.Index(fields=['crawled_at'], name='app_crawled_crawled_6f7c2e_idx'),
        ),
        migrations.AddConstraint(
            model_name='appcrawleddata',
            constraint=models.UniqueConstraint(fields=('app', 'source'), name='unique_app_source'),
        ),
    ]
