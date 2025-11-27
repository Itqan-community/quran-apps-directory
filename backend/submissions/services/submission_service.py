"""
Submission Service for handling app submission workflow.

Manages the approval, rejection, and information request process
for app submissions.
"""
from typing import Optional, Dict, Any
from django.utils import timezone
from django.db import transaction
import logging

from submissions.models import AppSubmission, SubmissionStatus, SubmissionStatusLog
from apps.models import App
from developers.models import Developer
from core.services.email import get_email_service
from submissions.services.storage_service import get_storage_service, StorageError

logger = logging.getLogger(__name__)


class SubmissionService:
    """
    Service for managing app submissions.

    Handles the complete lifecycle of a submission from creation
    through approval/rejection.
    """

    def __init__(self):
        self.email_service = get_email_service()

    def create_submission(self, data: dict) -> AppSubmission:
        """
        Create a new app submission.

        Args:
            data: Dictionary with submission data

        Returns:
            Created AppSubmission instance
        """
        # Extract categories (handled separately due to M2M)
        category_ids = data.pop('categories', [])

        # Create submission
        submission = AppSubmission.objects.create(**data)

        # Add categories
        if category_ids:
            submission.categories.set(category_ids)

        # Log status
        SubmissionStatusLog.objects.create(
            submission=submission,
            from_status='',
            to_status=SubmissionStatus.PENDING,
            notes='Submission received'
        )

        # Send confirmation email
        try:
            self.email_service.send_submission_received(submission)
        except Exception as e:
            logger.error(f"Failed to send confirmation email for {submission.tracking_id}: {e}")

        return submission

    def get_submission_by_tracking_id(self, tracking_id: str) -> Optional[AppSubmission]:
        """Get a submission by its tracking ID."""
        try:
            return AppSubmission.objects.get(tracking_id=tracking_id)
        except AppSubmission.DoesNotExist:
            return None

    def get_submissions_by_email(self, email: str) -> list:
        """Get all submissions for an email address."""
        return list(AppSubmission.objects.filter(submitter_email__iexact=email))

    def upload_submission_images_to_r2(self, submission: AppSubmission) -> Dict[str, Any]:
        """
        Upload all submission images to R2 storage.

        Downloads images from submission URLs and uploads them to Cloudflare R2,
        returning a dict with the new R2 URLs and upload status tracking.

        Args:
            submission: AppSubmission with image URLs

        Returns:
            Dictionary with:
            - 'urls': dict with R2 URLs for 'app_icon_url', 'main_image_en', 'main_image_ar',
              'screenshots_en', 'screenshots_ar'
            - 'upload_status': dict tracking which images were actually uploaded to R2 vs fallback

        Raises:
            StorageError: If any critical image upload fails (icon or main images)
        """
        storage = get_storage_service()
        uploaded_urls = {
            'app_icon_url': submission.app_icon_url,
            'main_image_en': submission.main_image_en,
            'main_image_ar': submission.main_image_ar,
            'screenshots_en': submission.screenshots_en or [],
            'screenshots_ar': submission.screenshots_ar or [],
        }

        upload_status = {
            'icon': False,
            'main_en': False,
            'main_ar': False,
            'screenshots_en': [],
            'screenshots_ar': [],
        }

        try:
            # Upload app icon
            if submission.app_icon_url:
                uploaded_urls['app_icon_url'] = storage.upload_from_url(
                    submission.app_icon_url,
                    submission.tracking_id,
                    prefix='icon',
                    is_icon=True
                )
                # Mark as uploaded if URL changed from original
                upload_status['icon'] = uploaded_urls['app_icon_url'] != submission.app_icon_url

            # Upload English main image
            if submission.main_image_en:
                uploaded_urls['main_image_en'] = storage.upload_from_url(
                    submission.main_image_en,
                    submission.tracking_id,
                    prefix='main_en',
                    is_icon=False
                )
                upload_status['main_en'] = uploaded_urls['main_image_en'] != submission.main_image_en

            # Upload Arabic main image
            if submission.main_image_ar:
                uploaded_urls['main_image_ar'] = storage.upload_from_url(
                    submission.main_image_ar,
                    submission.tracking_id,
                    prefix='main_ar',
                    is_icon=False
                )
                upload_status['main_ar'] = uploaded_urls['main_image_ar'] != submission.main_image_ar

            # Upload English screenshots
            if submission.screenshots_en:
                uploaded_screenshots_en = []
                for idx, url in enumerate(submission.screenshots_en):
                    try:
                        r2_url = storage.upload_from_url(
                            url,
                            submission.tracking_id,
                            prefix=f'screenshot_en_{idx}',
                            is_icon=False
                        )
                        uploaded_screenshots_en.append(r2_url)
                        # Track if this screenshot was actually uploaded to R2
                        upload_status['screenshots_en'].append(r2_url != url)
                    except StorageError as e:
                        logger.warning(
                            f"Failed to upload English screenshot {idx} for {submission.tracking_id}: {e}. "
                            f"Using original URL."
                        )
                        uploaded_screenshots_en.append(url)
                        upload_status['screenshots_en'].append(False)

                uploaded_urls['screenshots_en'] = uploaded_screenshots_en

            # Upload Arabic screenshots
            if submission.screenshots_ar:
                uploaded_screenshots_ar = []
                for idx, url in enumerate(submission.screenshots_ar):
                    try:
                        r2_url = storage.upload_from_url(
                            url,
                            submission.tracking_id,
                            prefix=f'screenshot_ar_{idx}',
                            is_icon=False
                        )
                        uploaded_screenshots_ar.append(r2_url)
                        upload_status['screenshots_ar'].append(r2_url != url)
                    except StorageError as e:
                        logger.warning(
                            f"Failed to upload Arabic screenshot {idx} for {submission.tracking_id}: {e}. "
                            f"Using original URL."
                        )
                        uploaded_screenshots_ar.append(url)
                        upload_status['screenshots_ar'].append(False)

                uploaded_urls['screenshots_ar'] = uploaded_screenshots_ar

            logger.info(
                f"Successfully processed all images for submission {submission.tracking_id}"
            )
            return {
                'urls': uploaded_urls,
                'upload_status': upload_status,
            }

        except StorageError as e:
            logger.error(f"Failed to upload images for {submission.tracking_id}: {e}")
            raise

    @transaction.atomic
    def approve_submission(self, submission: AppSubmission, user) -> App:
        """
        Approve a submission and create the App record.

        Args:
            submission: AppSubmission to approve
            user: User who approved the submission

        Returns:
            Created App instance

        Raises:
            ValueError: If submission is already approved
            StorageError: If image upload to R2 fails
        """
        if submission.status == SubmissionStatus.APPROVED:
            raise ValueError("Submission is already approved")

        old_status = submission.status

        # Find or create developer
        developer = self._get_or_create_developer(submission)

        # Validate R2 is configured before attempting uploads
        storage = get_storage_service()
        if not storage.is_configured():
            raise ValueError(
                "R2 storage is not properly configured. "
                "Please set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, and R2_SECRET_ACCESS_KEY "
                "environment variables before approving submissions with images."
            )

        # Upload all submission images to R2
        logger.info(f"Uploading images for submission {submission.tracking_id} to R2...")
        try:
            upload_result = self.upload_submission_images_to_r2(submission)
            r2_urls = upload_result['urls']
            upload_status = upload_result.get('upload_status', {})

            # Log upload status for debugging
            logger.info(
                f"Image upload results for {submission.tracking_id}: "
                f"icon={upload_status.get('icon', False)}, "
                f"main_en={upload_status.get('main_en', False)}, "
                f"main_ar={upload_status.get('main_ar', False)}, "
                f"screenshots_en={upload_status.get('screenshots_en', [])}, "
                f"screenshots_ar={upload_status.get('screenshots_ar', [])}"
            )
        except StorageError as e:
            logger.error(f"Failed to upload images for {submission.tracking_id}: {e}")
            raise ValueError(f"Failed to upload images to R2: {str(e)}")

        # Create the App with R2 image URLs and default rating of 2.5
        app = App.objects.create(
            name_en=submission.app_name_en,
            name_ar=submission.app_name_ar,
            short_description_en=submission.short_description_en,
            short_description_ar=submission.short_description_ar,
            description_en=submission.description_en or submission.short_description_en,
            description_ar=submission.description_ar or submission.short_description_ar,
            application_icon=r2_urls['app_icon_url'],
            main_image_en=r2_urls['main_image_en'] or '',
            main_image_ar=r2_urls['main_image_ar'] or '',
            google_play_link=submission.google_play_link,
            app_store_link=submission.app_store_link,
            app_gallery_link=submission.app_gallery_link,
            screenshots_en=r2_urls['screenshots_en'] or [],
            screenshots_ar=r2_urls['screenshots_ar'] or [],
            developer=developer,
            status='published',
            platform=self._detect_platform(submission),
            avg_rating=2.5,  # Default rating for newly approved apps
        )

        # Set categories
        app.categories.set(submission.categories.all())

        # Update submission
        submission.status = SubmissionStatus.APPROVED
        submission.created_app = app
        submission.reviewed_by = user
        submission.reviewed_at = timezone.now()
        submission.save()

        # Log status change
        SubmissionStatusLog.objects.create(
            submission=submission,
            from_status=old_status,
            to_status=SubmissionStatus.APPROVED,
            changed_by=user,
            notes=f'Approved. Created app: {app.name_en}'
        )

        # Send approval email
        try:
            self.email_service.send_submission_approved(submission)
        except Exception as e:
            logger.error(f"Failed to send approval email for {submission.tracking_id}: {e}")

        logger.info(f"Approved submission {submission.tracking_id}, created app {app.id}")
        return app

    @transaction.atomic
    def reject_submission(
        self,
        submission: AppSubmission,
        user,
        reason: str
    ) -> AppSubmission:
        """
        Reject a submission.

        Args:
            submission: AppSubmission to reject
            user: User who rejected the submission
            reason: Rejection reason

        Returns:
            Updated AppSubmission instance
        """
        old_status = submission.status

        submission.status = SubmissionStatus.REJECTED
        submission.rejection_reason = reason
        submission.reviewed_by = user
        submission.reviewed_at = timezone.now()
        submission.save()

        # Log status change
        SubmissionStatusLog.objects.create(
            submission=submission,
            from_status=old_status,
            to_status=SubmissionStatus.REJECTED,
            changed_by=user,
            notes=f'Rejected: {reason[:200]}'
        )

        # Send rejection email
        try:
            self.email_service.send_submission_rejected(submission, reason)
        except Exception as e:
            logger.error(f"Failed to send rejection email for {submission.tracking_id}: {e}")

        logger.info(f"Rejected submission {submission.tracking_id}")
        return submission

    @transaction.atomic
    def request_info(
        self,
        submission: AppSubmission,
        user,
        message: str
    ) -> AppSubmission:
        """
        Request additional information from submitter.

        Args:
            submission: AppSubmission
            user: User who requested info
            message: Message describing what info is needed

        Returns:
            Updated AppSubmission instance
        """
        old_status = submission.status

        submission.status = SubmissionStatus.INFO_REQUESTED
        submission.info_request_message = message
        submission.reviewed_by = user
        submission.reviewed_at = timezone.now()
        submission.save()

        # Log status change
        SubmissionStatusLog.objects.create(
            submission=submission,
            from_status=old_status,
            to_status=SubmissionStatus.INFO_REQUESTED,
            changed_by=user,
            notes=f'Information requested: {message[:200]}'
        )

        # Send info request email
        try:
            self.email_service.send_info_requested(submission, message)
        except Exception as e:
            logger.error(f"Failed to send info request email for {submission.tracking_id}: {e}")

        logger.info(f"Requested info for submission {submission.tracking_id}")
        return submission

    def mark_under_review(self, submission: AppSubmission, user) -> AppSubmission:
        """Mark a submission as under review."""
        old_status = submission.status

        submission.status = SubmissionStatus.UNDER_REVIEW
        submission.save()

        SubmissionStatusLog.objects.create(
            submission=submission,
            from_status=old_status,
            to_status=SubmissionStatus.UNDER_REVIEW,
            changed_by=user,
            notes='Marked as under review'
        )

        return submission

    def _get_or_create_developer(self, submission: AppSubmission) -> Developer:
        """
        Find existing developer or create new one from submission data.

        Args:
            submission: AppSubmission with developer info

        Returns:
            Developer instance
        """
        # Try to find by exact name match
        try:
            return Developer.objects.get(name_en__iexact=submission.developer_name_en)
        except Developer.DoesNotExist:
            pass

        # Try by email if provided
        if submission.developer_email:
            try:
                return Developer.objects.get(email__iexact=submission.developer_email)
            except Developer.DoesNotExist:
                pass

        # Create new developer
        developer = Developer.objects.create(
            name_en=submission.developer_name_en,
            name_ar=submission.developer_name_ar or submission.developer_name_en,
            website=submission.developer_website,
            email=submission.developer_email,
        )

        logger.info(f"Created new developer: {developer.name_en}")
        return developer

    def _detect_platform(self, submission: AppSubmission) -> str:
        """
        Detect platform based on store links.

        Returns:
            Platform string: 'android', 'ios', 'cross_platform', or 'web'
        """
        has_android = bool(submission.google_play_link or submission.app_gallery_link)
        has_ios = bool(submission.app_store_link)

        if has_android and has_ios:
            return 'cross_platform'
        elif has_android:
            return 'android'
        elif has_ios:
            return 'ios'
        else:
            return 'web'
