"""
Management command to create a test app submission for testing approval workflow.
"""
from django.core.management.base import BaseCommand
from submissions.models import AppSubmission, SubmissionStatus
from categories.models import Category


class Command(BaseCommand):
    help = 'Create a test app submission for testing the approval workflow'

    def add_arguments(self, parser):
        parser.add_argument(
            '--status',
            type=str,
            default='pending',
            choices=['pending', 'under_review'],
            help='Initial status of the submission'
        )

    def handle(self, *args, **options):
        # Create a test submission with sample data
        submission = AppSubmission.objects.create(
            status=options['status'],
            submitter_name='Test User',
            submitter_email='test@example.com',
            submitter_phone='+1234567890',
            submitter_organization='Test Organization',
            is_developer=True,
            app_name_en='Test Quran App',
            app_name_ar='تطبيق القرآن التجريبي',
            short_description_en='A test app for testing the approval workflow',
            short_description_ar='تطبيق تجريبي لاختبار سير عمل الموافقة',
            description_en='This is a test app submission created to verify the R2 image upload functionality during the approval process.',
            description_ar='هذا إرسال تطبيق تجريبي تم إنشاؤه للتحقق من وظيفة تحميل صور R2 أثناء عملية الموافقة.',
            google_play_link='https://play.google.com/store/apps/details?id=com.quran.labs.androidquran',
            app_store_link='https://apps.apple.com/app/quran-by-quran-com/id1118663303',
            developer_name_en='Quran.com',
            developer_name_ar='قرآن.كوم',
            developer_website='https://quran.com',
            developer_email='support@quran.com',
            # Use real image URLs from Google Play/App Store for testing R2 upload
            app_icon_url='https://play-lh.googleusercontent.com/uNHHzhnVc7j5C-d5bL9vNrLZomVBNuKmK5nOe_eSbClxqT2VhAHvqTuqTCaevXt2nVQ=w240-h480-rw',
            main_image_en='https://play-lh.googleusercontent.com/NcqzwZKpjBbCxlCOLLhU-OiHxnHdL5rquqYfj_8VLOLrHVMf0dLmYKqlxVzGVPOKjQ=w526-h296-rw',
            main_image_ar='https://play-lh.googleusercontent.com/NcqzwZKpjBbCxlCOLLhU-OiHxnHdL5rquqYfj_8VLOLrHVMf0dLmYKqlxVzGVPOKjQ=w526-h296-rw',
            screenshots_en=[
                'https://play-lh.googleusercontent.com/8o3dToMVHbWwqAFqiYFWVlZ-a0E1RQTbwILPvBPKqbYsXMJpBOWj7uPWVWKmQ7HfVP0=w526-h296-rw',
                'https://play-lh.googleusercontent.com/3NQz8HZNJyGsKn4H4v7y1Y6R_3vPY8WKZT7P_6BKC0VrQGQHgKB-zQ_4JgPBCQTYtQ=w526-h296-rw',
            ],
            screenshots_ar=[
                'https://play-lh.googleusercontent.com/8o3dToMVHbWwqAFqiYFWVlZ-a0E1RQTbwILPvBPKqbYsXMJpBOWj7uPWVWKmQ7HfVP0=w526-h296-rw',
            ],
            additional_notes='This is a test submission for verifying the R2 image upload fix.',
            content_confirmation=True,
        )

        # Add categories if they exist
        categories = Category.objects.filter(slug__in=['quran', 'reading'])[:2]
        if categories:
            submission.categories.set(categories)

        self.stdout.write(
            self.style.SUCCESS(
                f'Created test submission: {submission.tracking_id} (ID: {submission.id})\n'
                f'Admin URL: /admin/submissions/appsubmission/{submission.id}/'
            )
        )
