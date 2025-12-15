"""
Data migration to migrate existing App.crawled_content to AppCrawledData table.

The existing crawled_content follows format:
[Google Play] content...
[App Store] content...
[App Gallery] content...
"""
from django.db import migrations
import re


def migrate_crawled_content(apps, schema_editor):
    """
    Migrate existing App.crawled_content to AppCrawledData entries.
    Parses the combined content and splits into individual source entries.
    """
    App = apps.get_model('apps', 'App')
    AppCrawledData = apps.get_model('apps', 'AppCrawledData')

    # Mapping from labels to source values
    label_to_source = {
        'google play': 'google_play',
        'app store': 'app_store',
        'app gallery': 'app_gallery',
        'website': 'website',
    }

    migrated_count = 0
    for app in App.objects.exclude(crawled_content__isnull=True).exclude(crawled_content=''):
        content = app.crawled_content
        crawled_at = app.crawled_at

        # Parse sections: [Source] content
        # Use regex to find all [Label] sections
        pattern = r'\[([^\]]+)\]\s*'
        sections = re.split(pattern, content)

        # sections will be: ['', 'Google Play', ' content...', 'App Store', ' content...', ...]
        i = 1
        while i < len(sections):
            if i + 1 >= len(sections):
                break

            label = sections[i].strip().lower()
            text = sections[i + 1].strip()

            source = label_to_source.get(label)
            if source and text:
                # Determine URL from app fields
                url = ''
                if source == 'google_play':
                    url = app.google_play_link or ''
                elif source == 'app_store':
                    url = app.app_store_link or ''
                elif source == 'app_gallery':
                    url = app.app_gallery_link or ''
                elif source == 'website':
                    # Try to get developer website
                    if hasattr(app, 'developer') and app.developer:
                        url = getattr(app.developer, 'website', '') or ''

                # Only create if we have content
                if text:
                    AppCrawledData.objects.update_or_create(
                        app=app,
                        source=source,
                        defaults={
                            'url': url,
                            'content': text,
                            'status': 'success',
                            'metadata': {
                                'char_count': len(text),
                                'migrated': True,
                                'migrated_from': 'App.crawled_content'
                            },
                        }
                    )
                    migrated_count += 1

            i += 2

    print(f"Migrated {migrated_count} crawled content entries to AppCrawledData")


def reverse_migration(apps, schema_editor):
    """Reverse: delete migrated data (but keep original App fields intact)."""
    AppCrawledData = apps.get_model('apps', 'AppCrawledData')
    deleted_count, _ = AppCrawledData.objects.filter(
        metadata__contains={'migrated': True}
    ).delete()
    print(f"Deleted {deleted_count} migrated AppCrawledData entries")


class Migration(migrations.Migration):

    dependencies = [
        ('apps', '0007_appcrawleddata'),
    ]

    operations = [
        migrations.RunPython(migrate_crawled_content, reverse_migration),
    ]
