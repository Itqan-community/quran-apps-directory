"""
Setup command to prepare the project for a new developer.
Creates fresh migrations and loads initial data.
"""

from django.core.management.base import BaseCommand
from django.core.management import call_command


class Command(BaseCommand):
    help = 'Setup project for new developer - create migrations and load data'

    def handle(self, *args, **options):
        self.stdout.write('🚀 Setting up Quran Apps Directory for development...')

        # Create migrations for all apps
        self.stdout.write('\n📝 Creating fresh migrations...')
        try:
            call_command('makemigrations', 'core', 'apps', 'categories', 'developers')
            self.stdout.write(self.style.SUCCESS('✅ Migrations created successfully'))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'❌ Error creating migrations: {e}'))
            return

        # Apply migrations
        self.stdout.write('\n🏗️  Applying migrations...')
        try:
            call_command('migrate')
            self.stdout.write(self.style.SUCCESS('✅ Migrations applied successfully'))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'❌ Error applying migrations: {e}'))
            return

        # Load initial data
        self.stdout.write('\n📦 Loading initial data...')
        try:
            call_command('load_from_frontend')
            self.stdout.write(self.style.SUCCESS('✅ Initial data loaded successfully'))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'❌ Error loading data: {e}'))
            return

        # Create superuser prompt (optional)
        self.stdout.write('\n👤 Setup complete!')
        self.stdout.write(self.style.SUCCESS('✅ Project is ready for development'))
        self.stdout.write('\nTo create a superuser, run: python manage.py createsuperuser')
        self.stdout.write('To start the server, run: python manage.py runserver')