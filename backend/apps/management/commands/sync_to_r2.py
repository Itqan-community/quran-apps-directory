"""
Sync apps to Cloudflare R2 for AI Search indexing.
Exports apps as JSON files that CF AI Search will automatically index.
"""
import json
import logging
from django.core.management.base import BaseCommand
from django.conf import settings
from apps.models import App

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Sync published apps to Cloudflare R2 for AI Search indexing'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be uploaded without actually uploading',
        )
        parser.add_argument(
            '--app-id',
            type=int,
            help='Sync only a specific app by ID',
        )

    def handle(self, *args, **options):
        dry_run = options.get('dry_run', False)
        app_id = options.get('app_id')

        # Check R2 configuration
        r2_account_id = getattr(settings, 'R2_ACCOUNT_ID', '')
        r2_access_key = getattr(settings, 'R2_ACCESS_KEY_ID', '')
        r2_secret_key = getattr(settings, 'R2_SECRET_ACCESS_KEY', '')
        r2_bucket = getattr(settings, 'R2_BUCKET_NAME', 'quran-apps-directory')

        if not all([r2_account_id, r2_access_key, r2_secret_key]):
            self.stdout.write(self.style.ERROR('R2 credentials not configured'))
            return

        try:
            import boto3
            from botocore.config import Config
        except ImportError:
            self.stdout.write(self.style.ERROR('boto3 not installed. Run: pip install boto3'))
            return

        # Initialize S3 client for R2
        s3_client = boto3.client(
            's3',
            endpoint_url=f'https://{r2_account_id}.r2.cloudflarestorage.com',
            aws_access_key_id=r2_access_key,
            aws_secret_access_key=r2_secret_key,
            config=Config(signature_version='s3v4'),
            region_name='auto'
        )

        # Get apps to sync
        apps_qs = App.objects.filter(status='published').select_related('developer').prefetch_related('categories')

        if app_id:
            apps_qs = apps_qs.filter(id=app_id)

        apps = list(apps_qs)

        if not apps:
            self.stdout.write(self.style.WARNING('No apps found to sync'))
            return

        self.stdout.write(f'Syncing {len(apps)} apps to R2 bucket: {r2_bucket}')

        synced = 0
        errors = 0

        for app in apps:
            try:
                # Build JSON document for AI Search
                app_json = self._build_app_document(app)
                json_content = json.dumps(app_json, ensure_ascii=False, indent=2)

                # Upload path: apps/{app_id}.json
                key = f'apps/{app.id}.json'

                if dry_run:
                    self.stdout.write(f'  [DRY RUN] Would upload: {key}')
                    self.stdout.write(f'    Content preview: {json_content[:200]}...')
                else:
                    s3_client.put_object(
                        Bucket=r2_bucket,
                        Key=key,
                        Body=json_content.encode('utf-8'),
                        ContentType='application/json'
                    )
                    self.stdout.write(self.style.SUCCESS(f'  ✓ {app.name_en} -> {key}'))

                synced += 1

            except Exception as e:
                errors += 1
                self.stdout.write(self.style.ERROR(f'  ✗ {app.name_en}: {e}'))
                logger.exception(f'Error syncing app {app.id}')

        # Summary
        self.stdout.write('')
        if dry_run:
            self.stdout.write(self.style.WARNING(f'[DRY RUN] Would sync {synced} apps'))
        else:
            self.stdout.write(self.style.SUCCESS(f'Successfully synced {synced} apps'))

        if errors:
            self.stdout.write(self.style.ERROR(f'Errors: {errors}'))

    def _build_app_document(self, app: App) -> dict:
        """Build a searchable JSON document for an app."""
        categories = list(app.categories.values_list('name_en', flat=True))
        categories_ar = list(app.categories.values_list('name_ar', flat=True))

        return {
            'id': app.id,
            'slug': app.slug,
            'name_en': app.name_en,
            'name_ar': app.name_ar,
            'short_description_en': app.short_description_en,
            'short_description_ar': app.short_description_ar,
            'description_en': app.description_en,
            'description_ar': app.description_ar,
            'developer_name_en': app.developer.name_en if app.developer else '',
            'developer_name_ar': app.developer.name_ar if app.developer else '',
            'categories_en': categories,
            'categories_ar': categories_ar,
            'platform': app.platform,
            'avg_rating': float(app.avg_rating),
            'featured': app.featured,
            'application_icon': app.application_icon or '',
            'google_play_link': app.google_play_link or '',
            'app_store_link': app.app_store_link or '',
            'app_gallery_link': app.app_gallery_link or '',
            'crawled_content': app.crawled_content or '',
            # Combined searchable text for better relevance
            'searchable_text': self._build_searchable_text(app, categories, categories_ar),
        }

    def _build_searchable_text(self, app: App, categories_en: list, categories_ar: list) -> str:
        """Build combined text for search indexing."""
        parts = [
            app.name_en,
            app.name_ar,
            app.short_description_en,
            app.short_description_ar,
            app.description_en,
            app.description_ar,
            app.developer.name_en if app.developer else '',
            app.developer.name_ar if app.developer else '',
            ' '.join(categories_en),
            ' '.join(categories_ar),
        ]

        if app.crawled_content:
            parts.append(app.crawled_content)

        return ' '.join(filter(None, parts))
