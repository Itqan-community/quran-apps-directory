"""
App Submission models for the Quran Apps Directory.

Handles user-submitted app requests for review and approval.
"""
import secrets
import string
from django.db import models
from django.contrib.auth import get_user_model
from core.models import BaseModel

User = get_user_model()


class SubmissionStatus(models.TextChoices):
    """Status choices for app submissions."""
    PENDING = 'pending', 'Pending Review'
    UNDER_REVIEW = 'under_review', 'Under Review'
    INFO_REQUESTED = 'info_requested', 'Information Requested'
    APPROVED = 'approved', 'Approved'
    REJECTED = 'rejected', 'Rejected'


def generate_tracking_id():
    """Generate a unique tracking ID in format QAD-XXXXXX."""
    chars = string.ascii_uppercase + string.digits
    suffix = ''.join(secrets.choice(chars) for _ in range(6))
    return f"QAD-{suffix}"


class AppSubmission(BaseModel):
    """
    Model for app submissions from public users.

    Stores all information needed to review and potentially
    create a new App listing upon approval.
    """

    # Tracking
    tracking_id = models.CharField(
        max_length=12,
        unique=True,
        db_index=True,
        default=generate_tracking_id,
        help_text="Unique tracking ID for the submission (e.g., QAD-ABC123)"
    )
    status = models.CharField(
        max_length=20,
        choices=SubmissionStatus.choices,
        default=SubmissionStatus.PENDING,
        db_index=True
    )

    # Contact Information
    submitter_name = models.CharField(max_length=200)
    submitter_email = models.EmailField(db_index=True)
    submitter_phone = models.CharField(max_length=50, blank=True)
    submitter_organization = models.CharField(max_length=200, blank=True)
    is_developer = models.BooleanField(
        default=False,
        help_text="Whether the submitter is the developer/owner of the app"
    )

    # App Details (Bilingual)
    app_name_en = models.CharField(max_length=200, db_index=True)
    app_name_ar = models.CharField(max_length=200, db_index=True)
    short_description_en = models.TextField(
        max_length=150,
        help_text="Brief description in English (max 150 chars)"
    )
    short_description_ar = models.TextField(
        max_length=150,
        help_text="Brief description in Arabic (max 150 chars)"
    )
    description_en = models.TextField(
        blank=True,
        help_text="Full description in English"
    )
    description_ar = models.TextField(
        blank=True,
        help_text="Full description in Arabic"
    )

    # Store Links
    google_play_link = models.URLField(blank=True)
    app_store_link = models.URLField(blank=True)
    app_gallery_link = models.URLField(blank=True)
    website_link = models.URLField(blank=True)

    # Categories (ManyToMany to existing Category model)
    categories = models.ManyToManyField(
        'categories.Category',
        related_name='submissions',
        blank=True
    )

    # Developer Info
    developer_name_en = models.CharField(max_length=200)
    developer_name_ar = models.CharField(max_length=200, blank=True)
    developer_website = models.URLField(blank=True)
    developer_email = models.EmailField(blank=True)

    # Crawled Content (for embedding generation)
    crawled_content = models.TextField(
        blank=True,
        null=True,
        help_text="Cached content crawled from store pages/website for embedding"
    )

    # Media (URLs after R2 upload)
    app_icon_url = models.URLField(blank=True)
    main_image_en = models.URLField(
        blank=True,
        help_text="Main cover image URL for English listing"
    )
    main_image_ar = models.URLField(
        blank=True,
        help_text="Main cover image URL for Arabic listing"
    )
    screenshots_en = models.JSONField(
        default=list,
        blank=True,
        help_text="List of English screenshot URLs"
    )
    screenshots_ar = models.JSONField(
        default=list,
        blank=True,
        help_text="List of Arabic screenshot URLs"
    )

    # Additional
    additional_notes = models.TextField(
        blank=True,
        help_text="Additional information from the submitter"
    )
    content_confirmation = models.BooleanField(
        default=False,
        help_text="Submitter confirmed content doesn't violate guidelines"
    )

    # Admin fields
    admin_notes = models.TextField(
        blank=True,
        help_text="Internal notes (not visible to submitter)"
    )
    rejection_reason = models.TextField(
        blank=True,
        help_text="Reason for rejection (sent to submitter)"
    )
    info_request_message = models.TextField(
        blank=True,
        help_text="Message requesting additional information"
    )
    reviewed_by = models.ForeignKey(
        User,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='reviewed_submissions'
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)

    # Created App reference (after approval)
    created_app = models.OneToOneField(
        'apps.App',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='submission'
    )

    class Meta:
        db_table = 'app_submissions'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['tracking_id']),
            models.Index(fields=['status']),
            models.Index(fields=['submitter_email']),
            models.Index(fields=['status', 'created_at']),
        ]
        verbose_name = 'App Submission'
        verbose_name_plural = 'App Submissions'

    def __str__(self):
        return f"{self.tracking_id} - {self.app_name_en}"

    def save(self, *args, **kwargs):
        # Ensure tracking_id is unique
        if not self.tracking_id:
            self.tracking_id = generate_tracking_id()
            while AppSubmission.objects.filter(tracking_id=self.tracking_id).exists():
                self.tracking_id = generate_tracking_id()
        super().save(*args, **kwargs)

    @property
    def has_store_link(self):
        """Check if at least one store link is provided."""
        return bool(self.google_play_link or self.app_store_link)

    @property
    def status_display_color(self):
        """Return color for status badge display."""
        colors = {
            SubmissionStatus.PENDING: '#faad14',      # Yellow
            SubmissionStatus.UNDER_REVIEW: '#1890ff',  # Blue
            SubmissionStatus.INFO_REQUESTED: '#fa8c16', # Orange
            SubmissionStatus.APPROVED: '#52c41a',      # Green
            SubmissionStatus.REJECTED: '#ff4d4f',      # Red
        }
        return colors.get(self.status, '#d9d9d9')


class SubmissionStatusLog(BaseModel):
    """
    Log of status changes for a submission.
    Tracks the history of review actions.
    """
    submission = models.ForeignKey(
        AppSubmission,
        on_delete=models.CASCADE,
        related_name='status_logs'
    )
    from_status = models.CharField(
        max_length=20,
        choices=SubmissionStatus.choices,
        blank=True
    )
    to_status = models.CharField(
        max_length=20,
        choices=SubmissionStatus.choices
    )
    changed_by = models.ForeignKey(
        User,
        null=True,
        blank=True,
        on_delete=models.SET_NULL
    )
    notes = models.TextField(blank=True)

    class Meta:
        db_table = 'submission_status_logs'
        ordering = ['-created_at']
        verbose_name = 'Status Log'
        verbose_name_plural = 'Status Logs'

    def __str__(self):
        return f"{self.submission.tracking_id}: {self.from_status} -> {self.to_status}"
