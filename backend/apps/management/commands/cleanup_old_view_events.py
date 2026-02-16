"""
Management command to cleanup old view events for data retention.

Usage:
    python manage.py cleanup_old_view_events --days=365 --batch-size=10000
    python manage.py cleanup_old_view_events --dry-run
"""

from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.models import AppViewEvent


class Command(BaseCommand):
    help = 'Delete view events older than specified retention period'

    def add_arguments(self, parser):
        parser.add_argument(
            '--days',
            type=int,
            default=365,
            help='Delete events older than this many days (default: 365)',
        )
        parser.add_argument(
            '--batch-size',
            type=int,
            default=10000,
            help='Number of records to delete per batch (default: 10000)',
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be deleted without actually deleting',
        )

    def handle(self, *args, **options):
        days = options['days']
        batch_size = options['batch_size']
        dry_run = options['dry_run']

        cutoff_date = timezone.now() - timedelta(days=days)

        # Count events to delete
        events_to_delete = AppViewEvent.objects.filter(viewed_at__lt=cutoff_date)
        total_count = events_to_delete.count()

        if total_count == 0:
            self.stdout.write(
                self.style.SUCCESS(f'No view events older than {days} days found.')
            )
            return

        if dry_run:
            self.stdout.write(
                self.style.WARNING(
                    f'DRY RUN: Would delete {total_count:,} view events '
                    f'older than {cutoff_date.strftime("%Y-%m-%d %H:%M:%S")}'
                )
            )
            return

        self.stdout.write(
            f'Deleting {total_count:,} view events older than '
            f'{cutoff_date.strftime("%Y-%m-%d %H:%M:%S")}...'
        )

        # Batch deletion to avoid locking issues
        deleted_total = 0
        while True:
            # Get batch of IDs to delete
            batch_ids = list(
                AppViewEvent.objects.filter(viewed_at__lt=cutoff_date)
                .values_list('id', flat=True)[:batch_size]
            )

            if not batch_ids:
                break

            # Delete batch
            deleted_count, _ = AppViewEvent.objects.filter(id__in=batch_ids).delete()
            deleted_total += deleted_count

            self.stdout.write(f'  Deleted {deleted_total:,} of {total_count:,}...')

        self.stdout.write(
            self.style.SUCCESS(
                f'Successfully deleted {deleted_total:,} view events.'
            )
        )
