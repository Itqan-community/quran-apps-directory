from django.core.management.base import BaseCommand
from apps.models import App
from core.services.search import AISearchService
import time
import logging

# Configure logger
logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Reindex all apps with AI embeddings'

    def add_arguments(self, parser):
        parser.add_argument(
            '--crawl',
            action='store_true',
            help='Enable crawling of external links (Google Play / App Store) for richer context.',
        )
        parser.add_argument(
            '--batch-size',
            type=int,
            default=10,
            help='Number of apps to process before a slightly longer pause (to respect rate limits).',
        )

    def handle(self, *args, **options):
        self.stdout.write('Starting reindexing process...')
        
        crawl_enabled = options['crawl']
        batch_size = options['batch_size']
        
        search_service = AISearchService()
        if not search_service.provider:
             self.stdout.write(self.style.ERROR('AI Search Provider not initialized. Check AI_SEARCH_PROVIDER and API Key.'))
             return

        apps = App.objects.all().order_by('id') # Stable ordering
        total = apps.count()
        processed = 0
        skipped = 0
        errors = 0

        self.stdout.write(f"Found {total} apps. Crawling enabled: {crawl_enabled}")

        for i, app in enumerate(apps):
            try:
                self.stdout.write(f"[{i+1}/{total}] Processing: {app.name_en}...")
                
                # Prepare text (potentially crawling)
                text = search_service.prepare_app_text(app, crawl_links=crawl_enabled)
                
                # Generate embedding
                embedding = search_service.get_embedding(text)
                
                if embedding:
                    app.embedding = embedding
                    app.save(update_fields=['embedding'])
                    processed += 1
                    self.stdout.write(self.style.SUCCESS(f"  ✓ Updated embedding for {app.name_en}"))
                else:
                    skipped += 1
                    self.stdout.write(self.style.WARNING(f"  ⚠ Failed to generate embedding for {app.name_en} (Provider returned None)"))

                # Basic rate limiting
                time.sleep(0.5) 
                
                # Batch pause to be nice to APIs
                if (i + 1) % batch_size == 0:
                    self.stdout.write("  ...Pausing for 2 seconds to respect rate limits...")
                    time.sleep(2)

            except Exception as e:
                errors += 1
                logger.error(f"Error processing {app.name_en}: {e}")
                self.stdout.write(self.style.ERROR(f"  ✘ Error: {str(e)}"))

        self.stdout.write(self.style.SUCCESS(
            f"\nReindexing Complete!\n"
            f"Processed: {processed}\n"
            f"Skipped: {skipped}\n"
            f"Errors: {errors}"
        ))