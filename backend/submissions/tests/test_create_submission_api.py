"""
Tests for POST /api/submissions/ validation behavior.

Regression coverage for the simplified submission form: only app_name_en,
submitter_email, and a well-formed store link should be required.
"""
from unittest.mock import patch

from django.test import TestCase

MINIMAL_VALID_PAYLOAD = {
    "submitter_email": "dev@example.com",
    "app_name_en": "Test Quran App",
    "google_play_link": "https://play.google.com/store/apps/details?id=com.example",
}


class CreateSubmissionApiTest(TestCase):
    def setUp(self):
        # Avoid sending real emails during tests.
        patcher = patch("submissions.services.submission_service.get_email_service")
        self.addCleanup(patcher.stop)
        patcher.start()

    def test_minimal_payload_with_valid_store_link_succeeds(self):
        response = self.client.post(
            "/api/submissions/",
            data=MINIMAL_VALID_PAYLOAD,
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 201, response.content)
        self.assertIn("tracking_id", response.json())

    def test_missing_app_name_is_rejected(self):
        payload = {**MINIMAL_VALID_PAYLOAD, "app_name_en": ""}
        response = self.client.post(
            "/api/submissions/", data=payload, content_type="application/json"
        )
        self.assertEqual(response.status_code, 400, response.content)

    def test_malformed_store_link_is_rejected(self):
        payload = {**MINIMAL_VALID_PAYLOAD, "google_play_link": "not-a-url"}
        response = self.client.post(
            "/api/submissions/", data=payload, content_type="application/json"
        )
        self.assertEqual(response.status_code, 400, response.content)
        self.assertIn("valid Store Link", response.json().get("detail", ""))

    def test_missing_store_link_is_rejected(self):
        payload = {**MINIMAL_VALID_PAYLOAD, "google_play_link": ""}
        response = self.client.post(
            "/api/submissions/", data=payload, content_type="application/json"
        )
        self.assertEqual(response.status_code, 400, response.content)

    def test_app_gallery_link_alone_is_accepted(self):
        payload = {
            **MINIMAL_VALID_PAYLOAD,
            "google_play_link": "",
            "app_gallery_link": "https://appgallery.huawei.com/app/C123456",
        }
        response = self.client.post(
            "/api/submissions/", data=payload, content_type="application/json"
        )
        self.assertEqual(response.status_code, 201, response.content)

    def test_content_confirmation_no_longer_required(self):
        # Previously the API hard-required content_confirmation=True.
        response = self.client.post(
            "/api/submissions/", data=MINIMAL_VALID_PAYLOAD, content_type="application/json"
        )
        self.assertEqual(response.status_code, 201, response.content)

    def test_categories_no_longer_required(self):
        # Previously the API hard-required at least one category.
        response = self.client.post(
            "/api/submissions/", data=MINIMAL_VALID_PAYLOAD, content_type="application/json"
        )
        self.assertEqual(response.status_code, 201, response.content)
