"""
Tests for SubmissionService.approve_submission's icon/main-image guard.

Regression coverage: once icon collection is no longer required on the
public form, approving a submission with no icon/main images must fail
loudly instead of silently publishing a broken listing (empty
application_icon on the live App).
"""
from unittest.mock import patch, MagicMock

from django.contrib.auth import get_user_model
from django.test import TestCase

from submissions.models import AppSubmission
from submissions.services.submission_service import SubmissionService

User = get_user_model()


def _make_submission(**overrides):
    defaults = dict(
        submitter_name="Jane Dev",
        submitter_email="jane@example.com",
        app_name_en="Test App",
        app_name_ar="تطبيق اختبار",
        short_description_en="Short desc",
        short_description_ar="وصف قصير",
        google_play_link="https://play.google.com/store/apps/details?id=com.example",
        developer_name_en="Jane Studio",
    )
    defaults.update(overrides)
    return AppSubmission.objects.create(**defaults)


class ApproveSubmissionIconGuardTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="admin", password="pw")

        email_patcher = patch("submissions.services.submission_service.get_email_service")
        self.addCleanup(email_patcher.stop)
        email_patcher.start()

        storage_patcher = patch("submissions.services.submission_service.get_storage_service")
        self.mock_get_storage = storage_patcher.start()
        self.addCleanup(storage_patcher.stop)

        self.mock_storage = MagicMock()
        self.mock_storage.is_configured.return_value = True
        self.mock_storage.get_config_status.return_value = {"is_configured": True}
        self.mock_get_storage.return_value = self.mock_storage

        self.service = SubmissionService()

    def test_approval_blocked_when_no_icon(self):
        submission = _make_submission(app_icon_url="", main_image_en="", main_image_ar="")

        with self.assertRaises(ValueError) as ctx:
            self.service.approve_submission(submission, self.user)

        self.assertIn("icon", str(ctx.exception).lower())
        submission.refresh_from_db()
        self.assertNotEqual(submission.status, "approved")
        self.assertIsNone(submission.created_app)

    def test_approval_blocked_when_no_main_images(self):
        submission = _make_submission(
            app_icon_url="https://example.com/icon.png",
            main_image_en="",
            main_image_ar="",
        )
        self.mock_storage.upload_from_url.return_value = "https://r2.example.com/icon.png"

        with self.assertRaises(ValueError) as ctx:
            self.service.approve_submission(submission, self.user)

        self.assertIn("main image", str(ctx.exception).lower())

    def test_approval_succeeds_when_icon_and_main_images_present(self):
        submission = _make_submission(
            app_icon_url="https://example.com/icon.png",
            main_image_en="https://example.com/main_en.png",
            main_image_ar="https://example.com/main_ar.png",
        )
        self.mock_storage.upload_from_url.side_effect = lambda url, *a, **k: url.replace(
            "example.com", "r2.example.com"
        )

        app = self.service.approve_submission(submission, self.user)

        self.assertEqual(app.application_icon.name, "https://r2.example.com/icon.png")
