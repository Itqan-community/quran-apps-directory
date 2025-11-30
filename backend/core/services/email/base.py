"""
Abstract base class for email services.

Defines the interface that all email service implementations must follow.
"""
from abc import ABC, abstractmethod
from typing import Optional, List
from django.conf import settings
from django.template.loader import render_to_string
import logging

logger = logging.getLogger(__name__)


class EmailService(ABC):
    """
    Abstract base class for email services.

    All email providers (Mailjet, SendGrid, SES, etc.) should
    inherit from this class and implement the send_email method.
    """

    def __init__(self):
        self.from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', 'connect@itqan.dev')
        self.from_name = getattr(settings, 'DEFAULT_FROM_NAME', 'Quran Apps Directory')
        self.site_url = getattr(settings, 'SITE_URL', 'https://quran-apps.itqan.dev')

    @abstractmethod
    def send_email(
        self,
        to: str,
        subject: str,
        html_body: str,
        text_body: Optional[str] = None,
        reply_to: Optional[str] = None
    ) -> bool:
        """
        Send an email.

        Args:
            to: Recipient email address
            subject: Email subject
            html_body: HTML content of the email
            text_body: Plain text content (optional, will be derived from HTML if not provided)
            reply_to: Reply-to email address (optional)

        Returns:
            True if email was sent successfully, False otherwise
        """
        pass

    def _render_template(self, template_name: str, context: dict) -> str:
        """Render an email template with context."""
        context['site_url'] = self.site_url
        context['from_name'] = self.from_name
        return render_to_string(f'email/{template_name}', context)

    def send_submission_received(self, submission) -> bool:
        """
        Send confirmation email when a submission is received.

        Args:
            submission: AppSubmission instance

        Returns:
            True if email was sent successfully
        """
        context = {
            'submission': submission,
            'tracking_id': submission.tracking_id,
            'app_name_en': submission.app_name_en,
            'app_name_ar': submission.app_name_ar,
            'submitter_name': submission.submitter_name,
            'track_url': f"{self.site_url}/en/track-submission?id={submission.tracking_id}",
        }

        subject_en = f"Submission Received: {submission.app_name_en} ({submission.tracking_id})"
        html_body = self._render_template('submission_received.html', context)

        return self.send_email(
            to=submission.submitter_email,
            subject=subject_en,
            html_body=html_body
        )

    def send_submission_approved(self, submission) -> bool:
        """
        Send email when a submission is approved.

        Args:
            submission: AppSubmission instance with created_app set

        Returns:
            True if email was sent successfully
        """
        app_url = (
            f"{self.site_url}/en/app/{submission.created_app.slug}_{submission.created_app.id}"
            if submission.created_app else self.site_url
        )

        context = {
            'submission': submission,
            'tracking_id': submission.tracking_id,
            'app_name_en': submission.app_name_en,
            'app_name_ar': submission.app_name_ar,
            'submitter_name': submission.submitter_name,
            'app_url': app_url,
        }

        subject_en = f"Approved: {submission.app_name_en} is now listed!"
        html_body = self._render_template('submission_approved.html', context)

        return self.send_email(
            to=submission.submitter_email,
            subject=subject_en,
            html_body=html_body
        )

    def send_submission_rejected(self, submission, reason: str) -> bool:
        """
        Send email when a submission is rejected.

        Args:
            submission: AppSubmission instance
            reason: Rejection reason to include in email

        Returns:
            True if email was sent successfully
        """
        context = {
            'submission': submission,
            'tracking_id': submission.tracking_id,
            'app_name_en': submission.app_name_en,
            'app_name_ar': submission.app_name_ar,
            'submitter_name': submission.submitter_name,
            'rejection_reason': reason,
            'contact_email': self.from_email,
        }

        subject_en = f"Submission Update: {submission.app_name_en} ({submission.tracking_id})"
        html_body = self._render_template('submission_rejected.html', context)

        return self.send_email(
            to=submission.submitter_email,
            subject=subject_en,
            html_body=html_body,
            reply_to=self.from_email
        )

    def send_info_requested(self, submission, message: str) -> bool:
        """
        Send email requesting additional information.

        Args:
            submission: AppSubmission instance
            message: Message describing what information is needed

        Returns:
            True if email was sent successfully
        """
        context = {
            'submission': submission,
            'tracking_id': submission.tracking_id,
            'app_name_en': submission.app_name_en,
            'app_name_ar': submission.app_name_ar,
            'submitter_name': submission.submitter_name,
            'info_request_message': message,
            'contact_email': self.from_email,
        }

        subject_en = f"Information Needed: {submission.app_name_en} ({submission.tracking_id})"
        html_body = self._render_template('submission_info_requested.html', context)

        return self.send_email(
            to=submission.submitter_email,
            subject=subject_en,
            html_body=html_body,
            reply_to=self.from_email
        )

    def send_submission_under_review(self, submission) -> bool:
        """
        Send email when a submission is marked as under review.

        Args:
            submission: AppSubmission instance

        Returns:
            True if email was sent successfully
        """
        context = {
            'submission': submission,
            'tracking_id': submission.tracking_id,
            'app_name_en': submission.app_name_en,
            'app_name_ar': submission.app_name_ar,
            'submitter_name': submission.submitter_name,
            'track_url': f"{self.site_url}/en/track-submission?id={submission.tracking_id}",
        }

        subject_en = f"Status Update: {submission.app_name_en} ({submission.tracking_id})"
        html_body = self._render_template('submission_under_review.html', context)

        return self.send_email(
            to=submission.submitter_email,
            subject=subject_en,
            html_body=html_body
        )

    def send_admin_notification_new_submission(self, submission) -> bool:
        """
        Send email to admin when a new submission is received.

        Args:
            submission: AppSubmission instance

        Returns:
            True if email was sent successfully
        """
        context = {
            'submission': submission,
            'tracking_id': submission.tracking_id,
            'app_name_en': submission.app_name_en,
            'app_name_ar': submission.app_name_ar,
            'submitter_name': submission.submitter_name,
            'submitter_email': submission.submitter_email,
            'submitter_phone': submission.submitter_phone,
            'organization': submission.organization,
            'is_developer': submission.is_developer,
            'admin_url': f"{self.site_url}/admin/submissions/appsubmission/{submission.id}/change/",
            'track_url': f"{self.site_url}/en/track-submission?id={submission.tracking_id}",
        }

        subject_en = f"New Submission: {submission.app_name_en} ({submission.tracking_id})"
        html_body = self._render_template('admin_submission_received.html', context)

        return self.send_email(
            to=self.from_email,
            subject=subject_en,
            html_body=html_body
        )


def get_email_service() -> EmailService:
    """
    Factory function to get the configured email service instance.

    Returns:
        An instance of the configured EmailService implementation
    """
    backend_class = getattr(settings, 'EMAIL_BACKEND_CLASS', 'core.services.email.console.ConsoleEmailService')

    # Import the class dynamically
    module_path, class_name = backend_class.rsplit('.', 1)
    module = __import__(module_path, fromlist=[class_name])
    service_class = getattr(module, class_name)

    return service_class()
