from django.core.management.base import BaseCommand
from django.db import connection
from django.core.management import call_command
from time import sleep
import os


class Command(BaseCommand):
    help = 'Waits for database to be available'

    def add_arguments(self, parser):
        parser.add_argument('--timeout', type=int, default=30, help='Timeout in seconds')

    def handle(self, *args, **options):
        timeout = options['timeout']
        self.stdout.write('Waiting for database...')

        for i in range(timeout):
            try:
                connection.ensure_connection()
                self.stdout.write(self.style.SUCCESS('Database is ready!'))

                # Run any pending migrations
                call_command('migrate', '--noinput')
                break
            except Exception as e:
                self.stdout.write(f'Database unavailable, retrying in 1 second... ({i+1}/{timeout})')
                sleep(1)
        else:
            self.stdout.write(self.style.ERROR('Could not connect to database'))
            exit(1)