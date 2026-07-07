"""
Tests for submission store-link URL validation.

Regression coverage for the "at least one store link" check in
create_submission accepting any non-empty string instead of a real URL.
"""
from django.test import TestCase

from submissions.validators import is_valid_url


class IsValidUrlTest(TestCase):
    def test_accepts_https_url(self):
        self.assertTrue(is_valid_url("https://play.google.com/store/apps/details?id=com.example"))

    def test_accepts_http_url(self):
        self.assertTrue(is_valid_url("http://apps.apple.com/app/id123456"))

    def test_rejects_plain_string(self):
        self.assertFalse(is_valid_url("not-a-url"))

    def test_rejects_empty_string(self):
        self.assertFalse(is_valid_url(""))

    def test_rejects_none(self):
        self.assertFalse(is_valid_url(None))

    def test_rejects_scheme_without_host(self):
        self.assertFalse(is_valid_url("https://"))

    def test_rejects_non_http_scheme(self):
        self.assertFalse(is_valid_url("ftp://example.com/app"))

    def test_rejects_javascript_scheme(self):
        self.assertFalse(is_valid_url("javascript:alert(1)"))
