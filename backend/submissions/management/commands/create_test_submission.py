"""
Management command to create a test copy of a submission.

Usage: python manage.py create_test_submission <source_id> <app_name>
"""
from django.core.management.base import BaseCommand
from submissions.models import AppSubmission


class Command(BaseCommand):
    help = 'Create a test copy of an existing submission'

    def add_arguments(self, parser):
        parser.add_argument(
            'source_id',
            type=int,
            help='ID of the submission to copy'
        )
        parser.add_argument(
            '--name',
            type=str,
            default=None,
            help='Name for the new submission (optional)'
        )

    def handle(self, *args, **options):
        source_id = options['source_id']
        custom_name = options.get('name')

        try:
            source_submission = AppSubmission.objects.get(id=source_id)
        except AppSubmission.DoesNotExist:
            self.stdout.write(
                self.style.ERROR(f'Submission with ID {source_id} not found')
            )
            return

        self.stdout.write(f'Source Submission:')
        self.stdout.write(f'  ID: {source_submission.id}')
        self.stdout.write(f'  Tracking ID: {source_submission.tracking_id}')
        self.stdout.write(f'  App Name: {source_submission.app_name_en}')
        self.stdout.write('')

        # Create new submission
        app_name_en = custom_name or f"{source_submission.app_name_en} - Test Copy"
        app_name_ar = f"{source_submission.app_name_ar} - نسخة اختبار"

        new_submission = AppSubmission(
            app_name_en=app_name_en,
            app_name_ar=app_name_ar,
            submitter_name=source_submission.submitter_name,
            submitter_email=source_submission.submitter_email,
            submitter_phone=source_submission.submitter_phone,
            submitter_organization=source_submission.submitter_organization,
            is_developer=source_submission.is_developer,
            short_description_en=source_submission.short_description_en,
            short_description_ar=source_submission.short_description_ar,
            description_en=source_submission.description_en,
            description_ar=source_submission.description_ar,
            google_play_link=source_submission.google_play_link,
            app_store_link=source_submission.app_store_link,
            app_gallery_link=source_submission.app_gallery_link,
            website_link=source_submission.website_link,
            developer_name_en=source_submission.developer_name_en,
            developer_name_ar=source_submission.developer_name_ar,
            developer_website=source_submission.developer_website,
            developer_email=source_submission.developer_email,
            app_icon_url=source_submission.app_icon_url,
            main_image_en=source_submission.main_image_en,
            main_image_ar=source_submission.main_image_ar,
            screenshots_en=source_submission.screenshots_en,
            screenshots_ar=source_submission.screenshots_ar,
            additional_notes=f'Test copy of submission {source_submission.tracking_id}',
            content_confirmation=source_submission.content_confirmation,
            status='pending'
        )

        new_submission.save()

        # Copy categories
        new_submission.categories.set(source_submission.categories.all())

        self.stdout.write(
            self.style.SUCCESS(f'✅ Created test submission copy:')
        )
        self.stdout.write(f'  ID: {new_submission.id}')
        self.stdout.write(f'  Tracking ID: {new_submission.tracking_id}')
        self.stdout.write(f'  App Name: {new_submission.app_name_en}')
        self.stdout.write(f'  Status: {new_submission.status}')
        self.stdout.write(f'  Submitter Email: {new_submission.submitter_email}')
        self.stdout.write('')
        self.stdout.write(f'Ready for testing at /admin/submissions/appsubmission/{new_submission.id}/change/')
