from django.core.management.base import BaseCommand
from django.utils import timezone
from apps.models import App
from core.services.search import AISearchService
import time
import logging
from datetime import timedelta

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Reindex all apps with AI embeddings (enhanced with bilingual and external content)'

    def add_arguments(self, parser):
        parser.add_argument(
            '--crawl',
            action='store_true',
            help='Enable crawling of external links (Google Play / App Store / AppGallery)',
        )
        parser.add_argument(
            '--refresh-crawl',
            action='store_true',
            help='Force re-crawl even if cached content exists (ignores cache)',
        )
        parser.add_argument(
            '--quick',
            action='store_true',
            help='Quick mode: skip external content and full descriptions, use only essential fields',
        )
        parser.add_argument(
            '--batch-size',
            type=int,
            default=10,
            help='Number of apps to process before pausing (default: 10)',
        )
        parser.add_argument(
            '--app-id',
            type=int,
            help='Reindex a single app by ID',
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Preview generated text without saving embeddings',
        )
        parser.add_argument(
            '--stale-crawl-days',
            type=int,
            default=30,
            help='Re-crawl if cached content is older than N days (default: 30)',
        )

    def handle(self, *args, **options):
        self.stdout.write(self.style.HTTP_INFO('Starting enhanced reindexing process...'))

        crawl_enabled = options['crawl']
        refresh_crawl = options['refresh_crawl']
        quick_mode = options['quick']
        batch_size = options['batch_size']
        app_id = options['app_id']
        dry_run = options['dry_run']
        stale_days = options['stale_crawl_days']

        # Quick mode overrides crawl
        if quick_mode:
            crawl_enabled = False
            self.stdout.write(self.style.WARNING('Quick mode: skipping external content and full descriptions'))

        search_service = AISearchService()
        if not search_service.provider and not dry_run:
            self.stdout.write(self.style.ERROR(
                'AI Search Provider not initialized. Check AI_SEARCH_PROVIDER and API Key.'
            ))
            return

        # Get apps to process
        if app_id:
            apps = App.objects.filter(id=app_id)
            if not apps.exists():
                self.stdout.write(self.style.ERROR(f'App with ID {app_id} not found'))
                return
        else:
            apps = App.objects.all().select_related('developer').prefetch_related('categories')

        apps = apps.order_by('id')
        total = apps.count()
        processed = 0
        skipped = 0
        errors = 0
        crawl_count = 0

        self.stdout.write(f"Found {total} apps")
        self.stdout.write(f"Mode: {'Quick' if quick_mode else 'Full (bilingual + ratings + developer)'}")
        self.stdout.write(f"Crawling: {'Enabled' if crawl_enabled else 'Disabled'}")
        if crawl_enabled:
            self.stdout.write(f"Refresh crawl: {'Yes (ignore cache)' if refresh_crawl else f'No (use cache if < {stale_days} days)'}")
        if dry_run:
            self.stdout.write(self.style.WARNING('DRY RUN MODE - No embeddings will be saved'))

        for i, app in enumerate(apps):
            try:
                self.stdout.write(f"\n[{i+1}/{total}] Processing: {app.name_en}...")

                # Determine if we should crawl for this app
                should_crawl = crawl_enabled
                if crawl_enabled and not refresh_crawl:
                    # Check if we have fresh cached content
                    if app.crawled_content and app.crawled_at:
                        cache_age = timezone.now() - app.crawled_at
                        if cache_age < timedelta(days=stale_days):
                            should_crawl = False
                            self.stdout.write(f"  Using cached crawl ({cache_age.days} days old)")

                if should_crawl:
                    crawl_count += 1
                    self.stdout.write("  Crawling external sources...")

                # Prepare text with new enhanced method
                text = search_service.prepare_app_text(
                    app,
                    crawl_links=should_crawl,
                    use_cached_crawl=not refresh_crawl,
                    include_full_descriptions=not quick_mode
                )

                if dry_run:
                    self.stdout.write(self.style.SUCCESS("  --- Generated Text Preview ---"))
                    # Show first 1500 chars with structure visible
                    preview_lines = text.split('\n')
                    for line in preview_lines[:15]:  # Show first 15 sections
                        self.stdout.write(f"  {line[:100]}{'...' if len(line) > 100 else ''}")
                    if len(preview_lines) > 15:
                        self.stdout.write(f"  ... ({len(preview_lines) - 15} more sections)")
                    self.stdout.write(f"  Total length: {len(text)} chars")
                    processed += 1
                    continue

                # Generate embedding
                embedding = search_service.get_embedding(text)

                if embedding:
                    app.embedding = embedding
                    app.save(update_fields=['embedding'])
                    processed += 1
                    self.stdout.write(self.style.SUCCESS(
                        f"  ✓ Updated embedding ({len(text)} chars -> {len(embedding)} dims)"
                    ))
                else:
                    skipped += 1
                    self.stdout.write(self.style.WARNING(
                        f"  ⚠ Failed to generate embedding (provider returned None)"
                    ))

                # Rate limiting
                time.sleep(0.5)

                if (i + 1) % batch_size == 0:
                    self.stdout.write("  ...Pausing for rate limits...")
                    time.sleep(2)

            except Exception as e:
                errors += 1
                logger.error(f"Error processing {app.name_en}: {e}", exc_info=True)
                self.stdout.write(self.style.ERROR(f"  ✘ Error: {str(e)}"))

        self.stdout.write(self.style.SUCCESS(
            f"\n{'DRY RUN ' if dry_run else ''}Reindexing Complete!\n"
            f"Processed: {processed}\n"
            f"Skipped: {skipped}\n"
            f"Errors: {errors}\n"
            f"Crawled: {crawl_count} apps"
        ))
