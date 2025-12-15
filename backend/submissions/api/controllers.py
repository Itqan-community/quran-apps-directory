"""
Ninja API controllers for app submissions.

Handles public endpoints for submitting apps and tracking submissions.
"""
from typing import List, Optional
from ninja import Router, File, UploadedFile
from ninja.errors import HttpError
from django.conf import settings
import logging

from submissions.models import AppSubmission, SubmissionStatus
from submissions.services.submission_service import SubmissionService
from submissions.services.storage_service import get_storage_service, StorageError
from .schemas import (
    SubmissionCreateSchema,
    SubmissionResponseSchema,
    SubmissionStatusSchema,
    SubmissionListItemSchema,
    MediaUploadResponseSchema,
    ErrorSchema,
    AutoFillRequestSchema,
    AutoFillResponseSchema,
)
from submissions.services.autofill_service import AutoFillService

logger = logging.getLogger(__name__)
router = Router(tags=["Submissions"])


def get_status_message(status: str, submission: AppSubmission) -> str:
    """Get appropriate status message for display."""
    messages = {
        SubmissionStatus.PENDING: "Your submission is pending review. We will review it within 1-3 business days.",
        SubmissionStatus.UNDER_REVIEW: "Your submission is currently being reviewed by our team.",
        SubmissionStatus.INFO_REQUESTED: f"We need additional information. Please check your email for details.",
        SubmissionStatus.APPROVED: "Congratulations! Your app has been approved and is now live.",
        SubmissionStatus.REJECTED: "Unfortunately, your submission was not approved. Please check your email for details.",
    }
    return messages.get(status, "Status unknown")


@router.post("/", response={201: SubmissionResponseSchema, 400: ErrorSchema})
def create_submission(request, data: SubmissionCreateSchema):
    """
    Submit a new app for review.

    Creates a new submission and sends a confirmation email to the submitter.
    Returns a tracking ID that can be used to check the submission status.
    """
    # Validate at least one store link
    if not (data.google_play_link or data.app_store_link):
        raise HttpError(400, "At least one store link (Google Play or App Store) is required")

    # Validate content confirmation
    if not data.content_confirmation:
        raise HttpError(400, "You must confirm that the content doesn't violate guidelines")

    # Validate categories
    if not data.categories:
        raise HttpError(400, "Please select at least one category")

    try:
        service = SubmissionService()
        submission = service.create_submission(data.dict())

        return 201, SubmissionResponseSchema(
            tracking_id=submission.tracking_id,
            status=submission.status,
            message="Your submission has been received. Check your email for confirmation."
        )
    except Exception as e:
        logger.error(f"Failed to create submission: {e}")
        raise HttpError(400, str(e))


@router.get("/track/{tracking_id}", response={200: SubmissionStatusSchema, 404: ErrorSchema})
def track_submission(request, tracking_id: str):
    """
    Track a submission by its tracking ID.

    Returns the current status and relevant information about the submission.
    """
    service = SubmissionService()
    submission = service.get_submission_by_tracking_id(tracking_id.upper())

    if not submission:
        raise HttpError(404, "Submission not found. Please check your tracking ID.")

    # Get app URL if approved
    app_url = None
    if submission.status == SubmissionStatus.APPROVED and submission.created_app:
        site_url = getattr(settings, 'SITE_URL', 'https://quran-apps.itqan.dev')
        app_url = f"{site_url}/en/app/{submission.created_app.slug}_{submission.created_app.id}"

    return SubmissionStatusSchema(
        tracking_id=submission.tracking_id,
        status=submission.status,
        status_display=submission.get_status_display(),
        app_name_en=submission.app_name_en,
        app_name_ar=submission.app_name_ar,
        app_icon_url=submission.app_icon_url or None,
        submitted_at=submission.created_at,
        reviewed_at=submission.reviewed_at,
        message=get_status_message(submission.status, submission),
        app_url=app_url,
    )


@router.get("/track/", response={200: List[SubmissionListItemSchema], 400: ErrorSchema})
def track_by_email(request, email: str):
    """
    Track all submissions by email address.

    Returns a list of all submissions made with the given email.
    """
    if not email or '@' not in email:
        raise HttpError(400, "Please provide a valid email address")

    service = SubmissionService()
    submissions = service.get_submissions_by_email(email)

    return [
        SubmissionListItemSchema(
            tracking_id=s.tracking_id,
            app_name_en=s.app_name_en,
            app_name_ar=s.app_name_ar,
            status=s.status,
            status_display=s.get_status_display(),
            submitted_at=s.created_at,
        )
        for s in submissions
    ]


@router.post("/upload-media", response={200: MediaUploadResponseSchema, 400: ErrorSchema})
def upload_media(
    request,
    file: UploadedFile = File(...),
    tracking_id: Optional[str] = None,
    media_type: str = "screenshot",
):
    """
    Upload a media file (icon or screenshot) for a submission.

    Args:
        file: The image file to upload
        tracking_id: Optional tracking ID (for existing submissions)
        media_type: Type of media - 'icon', 'screenshot_en', or 'screenshot_ar'

    Returns:
        Public URL of the uploaded file
    """
    # Use a temporary ID if no tracking ID provided
    temp_id = tracking_id or f"temp-{request.session.session_key or 'anon'}"

    # Validate media type
    valid_types = ['icon', 'screenshot_en', 'screenshot_ar']
    if media_type not in valid_types:
        raise HttpError(400, f"Invalid media_type. Must be one of: {', '.join(valid_types)}")

    is_icon = media_type == 'icon'

    try:
        storage = get_storage_service()
        url = storage.upload_file(
            file=file,
            tracking_id=temp_id,
            prefix=media_type,
            is_icon=is_icon
        )

        return MediaUploadResponseSchema(
            url=url,
            filename=file.name,
            size=file.size
        )
    except StorageError as e:
        raise HttpError(400, str(e))
    except Exception as e:
        logger.error(f"Failed to upload media: {e}")
        raise HttpError(400, "Failed to upload file. Please try again.")


@router.post("/upload-from-url", response={200: MediaUploadResponseSchema, 400: ErrorSchema})
def upload_from_url(
    request,
    url: str,
    tracking_id: Optional[str] = None,
    media_type: str = "screenshot",
):
    """
    Download an image from URL and upload to storage.

    Args:
        url: URL of the image to download
        tracking_id: Optional tracking ID (for existing submissions)
        media_type: Type of media - 'icon', 'screenshot_en', or 'screenshot_ar'

    Returns:
        Public URL of the uploaded file in our storage
    """
    temp_id = tracking_id or f"temp-url-upload"

    valid_types = ['icon', 'screenshot_en', 'screenshot_ar']
    if media_type not in valid_types:
        raise HttpError(400, f"Invalid media_type. Must be one of: {', '.join(valid_types)}")

    is_icon = media_type == 'icon'

    try:
        storage = get_storage_service()
        new_url = storage.upload_from_url(
            url=url,
            tracking_id=temp_id,
            prefix=media_type,
            is_icon=is_icon
        )

        return MediaUploadResponseSchema(
            url=new_url,
            filename=url.split('/')[-1],
            size=0  # Size not easily available for URL uploads
        )
    except StorageError as e:
        raise HttpError(400, str(e))
    except Exception as e:
        logger.error(f"Failed to upload from URL: {e}")
        raise HttpError(400, "Failed to download and upload image. Please try again.")


@router.post("/auto-fill", response={200: AutoFillResponseSchema, 400: ErrorSchema})
def auto_fill_from_urls(request, data: AutoFillRequestSchema):
    """
    Extract app data from store links and/or website using AI.

    Provide at least one URL (Google Play, App Store, AppGallery, or Website).
    The service will crawl the URLs and use AI to extract bilingual app data.

    Returns pre-filled form data including:
    - App names (English and Arabic)
    - Descriptions (short and full, bilingual)
    - Developer information
    - App icon URL and screenshots
    - Category suggestion
    - Raw crawled content (for embedding generation)
    """
    # Validate at least one URL is provided
    if not any([data.google_play_url, data.app_store_url, data.app_gallery_url, data.website_url]):
        raise HttpError(400, "At least one URL must be provided")

    try:
        service = AutoFillService()
        extracted_data = service.extract_from_urls(
            google_play_url=data.google_play_url,
            app_store_url=data.app_store_url,
            app_gallery_url=data.app_gallery_url,
            website_url=data.website_url
        )

        return AutoFillResponseSchema(**extracted_data)

    except ValueError as e:
        raise HttpError(400, str(e))
    except Exception as e:
        logger.error(f"Auto-fill failed: {e}")
        raise HttpError(400, f"Failed to extract app data: {str(e)}")
