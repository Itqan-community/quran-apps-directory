"""
Create a Django superuser for development purposes.

This command creates or updates a superuser with the specified credentials.
Perfect for development environments where you need quick admin access.
"""

from django.core.management.base import BaseCommand
from django.contrib.auth.models import User


class Command(BaseCommand):
    help = 'Create a Django superuser for development'

    def add_arguments(self, parser):
        parser.add_argument('--username', type=str, default='admin', help='Superuser username (default: admin)')
        parser.add_argument('--password', type=str, default='admin', help='Superuser password (default: admin)')
        parser.add_argument('--email', type=str, default='admin@example.com', help='Superuser email (default: admin@example.com)')

    def handle(self, *args, **options):
        username = options['username']
        password = options['password']
        email = options['email']

        # Check if user already exists
        if User.objects.filter(username=username).exists():
            user = User.objects.get(username=username)
            # Update password if user exists
            user.set_password(password)
            user.save()
            self.stdout.write(
                self.style.SUCCESS(f'✅ Updated superuser: {username}')
            )
        else:
            # Create new superuser
            User.objects.create_superuser(
                username=username,
                email=email,
                password=password
            )
            self.stdout.write(
                self.style.SUCCESS(f'✅ Created superuser: {username}')
            )

        self.stdout.write(f'   Email: {email}')
        self.stdout.write(f'   Password: {password}')
        self.stdout.write(self.style.WARNING(
            '⚠️  For production, use environment variables to set secure credentials!'
        ))
