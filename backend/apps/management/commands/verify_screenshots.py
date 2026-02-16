"""
Management command to verify that all apps have screenshots loaded correctly.
Run: python manage.py verify_screenshots
"""
from django.core.management.base import BaseCommand
from django.db.models import Q
from apps.models import App


class Command(BaseCommand):
    help = 'Verify all apps have screenshots loaded correctly'

    def add_arguments(self, parser):
        parser.add_argument(
            '--verbose',
            action='store_true',
            help='Show detailed information for each app',
        )

    def handle(self, *args, **options):
        verbose = options.get('verbose', False)

        apps = App.objects.all()
        total_apps = apps.count()
        apps_with_screenshots = 0
        total_screenshots = 0

        self.stdout.write(self.style.SUCCESS(f'\n🔍 Verifying Screenshots for {total_apps} Apps\n'))

        for app in apps:
            en_count = len(app.screenshots_en) if app.screenshots_en else 0
            ar_count = len(app.screenshots_ar) if app.screenshots_ar else 0
            total_count = en_count + ar_count

            if total_count > 0:
                apps_with_screenshots += 1
                total_screenshots += total_count

                if verbose:
                    self.stdout.write(
                        self.style.SUCCESS(f'✅ {app.name_en}')
                    )
                    self.stdout.write(f'   ID: {app.id}, Slug: {app.slug}')
                    self.stdout.write(f'   Screenshots (EN): {en_count}, Screenshots (AR): {ar_count}')
                    if en_count > 0:
                        self.stdout.write(f'   First EN: {app.screenshots_en[0][:60]}...')
                    if ar_count > 0:
                        self.stdout.write(f'   First AR: {app.screenshots_ar[0][:60]}...')
                    self.stdout.write('')

        self.stdout.write(self.style.SUCCESS(f'\n📊 Summary:'))
        self.stdout.write(f'   Total Apps: {total_apps}')
        self.stdout.write(f'   Apps with Screenshots: {apps_with_screenshots}')
        self.stdout.write(f'   Total Screenshots: {total_screenshots}')
        self.stdout.write(f'   Percentage: {(apps_with_screenshots/total_apps*100):.1f}%')

        if apps_with_screenshots == total_apps:
            self.stdout.write(self.style.SUCCESS(f'\n✅ All apps have screenshots loaded!\n'))
        else:
            missing = total_apps - apps_with_screenshots
            self.stdout.write(self.style.WARNING(f'\n⚠️  {missing} apps missing screenshots\n'))
