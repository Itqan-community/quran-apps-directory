"""
Ninja API schemas for app submissions.

Defines request and response schemas for the submission API.
"""
from typing import List, Optional
from ninja import Schema
from datetime import datetime


class CategorySchema(Schema):
    """Category response schema."""
    id: int
    name_en: str
    name_ar: str
    slug: str


class SubmissionCreateSchema(Schema):
    """Schema for creating a new submission."""
    # Contact Information
    submitter_name: str
    submitter_email: str
    submitter_phone: Optional[str] = ''
    submitter_organization: Optional[str] = ''
    is_developer: bool = False

    # App Details (Bilingual)
    app_name_en: str
    app_name_ar: str
    short_description_en: str
    short_description_ar: str
    description_en: Optional[str] = ''
    description_ar: Optional[str] = ''

    # Store Links (at least one required)
    google_play_link: Optional[str] = ''
    app_store_link: Optional[str] = ''
    app_gallery_link: Optional[str] = ''
    website_link: Optional[str] = ''

    # Categories (list of category IDs)
    categories: List[int]

    # Developer Info
    developer_name_en: str
    developer_name_ar: Optional[str] = ''
    developer_website: Optional[str] = ''
    developer_email: Optional[str] = ''

    # Media URLs (after upload)
    app_icon_url: Optional[str] = ''
    screenshots_en: Optional[List[str]] = []
    screenshots_ar: Optional[List[str]] = []

    # Additional
    additional_notes: Optional[str] = ''
    content_confirmation: bool = False

    # Crawled content (from auto-fill)
    crawled_content: Optional[str] = ''


class SubmissionResponseSchema(Schema):
    """Schema for submission creation response."""
    tracking_id: str
    status: str
    message: str


class SubmissionStatusSchema(Schema):
    """Schema for submission status tracking."""
    tracking_id: str
    status: str
    status_display: str
    app_name_en: str
    app_name_ar: str
    app_icon_url: Optional[str] = None
    submitted_at: datetime
    reviewed_at: Optional[datetime] = None
    message: Optional[str] = None
    app_url: Optional[str] = None


class SubmissionListItemSchema(Schema):
    """Schema for listing submissions by email."""
    tracking_id: str
    app_name_en: str
    app_name_ar: str
    status: str
    status_display: str
    submitted_at: datetime


class MediaUploadResponseSchema(Schema):
    """Schema for media upload response."""
    url: str
    filename: str
    size: int


class ErrorSchema(Schema):
    """Schema for error responses."""
    error: str
    detail: Optional[str] = None


class AutoFillRequestSchema(Schema):
    """Schema for auto-fill request."""
    google_play_url: Optional[str] = None
    app_store_url: Optional[str] = None
    app_gallery_url: Optional[str] = None
    website_url: Optional[str] = None


class AutoFillResponseSchema(Schema):
    """Schema for auto-fill response with extracted app data."""
    app_name_en: str
    app_name_ar: str
    short_description_en: str
    short_description_ar: str
    description_en: str
    description_ar: str
    developer_name_en: str
    developer_name_ar: Optional[str] = None
    developer_website: Optional[str] = None
    developer_email: Optional[str] = None
    app_icon_url: Optional[str] = None
    screenshots: List[str] = []
    category_suggestion: Optional[str] = None
    crawled_content: str
    google_play_url: Optional[str] = None
    app_store_url: Optional[str] = None
    app_gallery_url: Optional[str] = None
    website_url: Optional[str] = None
