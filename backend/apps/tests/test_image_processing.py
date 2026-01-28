"""
Tests for image processing utilities and model integration.
"""
from io import BytesIO
from unittest.mock import Mock, patch, MagicMock
from PIL import Image
from django.test import TestCase
from django.core.files.base import ContentFile
from django.core.files.uploadedfile import SimpleUploadedFile
from core.utils.image_processing import (
    process_image,
    process_screenshot,
    process_main_image,
    SCREENSHOT_MAX_WIDTH,
    SCREENSHOT_MAX_HEIGHT,
    SCREENSHOT_QUALITY,
    MAIN_IMAGE_MAX_WIDTH,
    MAIN_IMAGE_MAX_HEIGHT,
    MAIN_IMAGE_QUALITY,
)
from apps.models import (
    app_icon_upload_path,
    main_image_en_upload_path,
    main_image_ar_upload_path,
    screenshot_upload_path,
)


def create_test_image(width, height, format='PNG', mode='RGB'):
    """Create a test image in memory."""
    if mode == 'P':
        # Palette mode needs special handling
        img = Image.new('P', (width, height))
        img.putpalette([i for i in range(256)] * 3)
    else:
        img = Image.new(mode, (width, height), color='red')
    buffer = BytesIO()
    if format == 'JPEG' and mode in ('RGBA', 'P', 'LA'):
        # JPEG doesn't support transparency, convert first
        img = img.convert('RGB')
    img.save(buffer, format=format)
    buffer.seek(0)
    return buffer


class ImageProcessingTestCase(TestCase):
    """Tests for the image processing utility functions."""

    def test_process_image_resizes_large_image(self):
        """Test that large images are resized."""
        # Create an image larger than max dimensions
        large_image = create_test_image(3000, 2000)
        result = process_image(large_image, max_width=1920, max_height=1080, quality=85)

        self.assertIsNotNone(result)

        # Verify the result is valid WebP
        result_img = Image.open(BytesIO(result.read()))
        self.assertEqual(result_img.format, 'WEBP')

        # Verify dimensions are within limits (aspect ratio preserved)
        self.assertLessEqual(result_img.width, 1920)
        self.assertLessEqual(result_img.height, 1080)

    def test_process_image_preserves_small_image(self):
        """Test that small images are not upscaled."""
        small_image = create_test_image(800, 600)
        result = process_image(small_image, max_width=1920, max_height=1080, quality=85)

        self.assertIsNotNone(result)

        result_img = Image.open(BytesIO(result.read()))
        self.assertEqual(result_img.width, 800)
        self.assertEqual(result_img.height, 600)

    def test_process_image_converts_png_to_webp(self):
        """Test that PNG images are converted to WebP."""
        png_image = create_test_image(800, 600, format='PNG')
        result = process_image(png_image, max_width=1920, max_height=1080, quality=85)

        self.assertIsNotNone(result)

        result_img = Image.open(BytesIO(result.read()))
        self.assertEqual(result_img.format, 'WEBP')

    def test_process_image_converts_jpeg_to_webp(self):
        """Test that JPEG images are converted to WebP."""
        jpeg_image = create_test_image(800, 600, format='JPEG')
        result = process_image(jpeg_image, max_width=1920, max_height=1080, quality=85)

        self.assertIsNotNone(result)

        result_img = Image.open(BytesIO(result.read()))
        self.assertEqual(result_img.format, 'WEBP')

    def test_process_image_handles_rgba(self):
        """Test that RGBA images (with transparency) are handled."""
        rgba_image = create_test_image(800, 600, format='PNG', mode='RGBA')
        result = process_image(rgba_image, max_width=1920, max_height=1080, quality=85)

        self.assertIsNotNone(result)

        result_img = Image.open(BytesIO(result.read()))
        self.assertEqual(result_img.format, 'WEBP')

    def test_process_screenshot_uses_correct_dimensions(self):
        """Test that process_screenshot uses screenshot dimensions."""
        large_image = create_test_image(4000, 3000)
        result = process_screenshot(large_image)

        self.assertIsNotNone(result)

        result_img = Image.open(BytesIO(result.read()))
        self.assertLessEqual(result_img.width, SCREENSHOT_MAX_WIDTH)
        self.assertLessEqual(result_img.height, SCREENSHOT_MAX_HEIGHT)

    def test_process_main_image_uses_correct_dimensions(self):
        """Test that process_main_image uses main image dimensions."""
        large_image = create_test_image(4000, 3000)
        result = process_main_image(large_image)

        self.assertIsNotNone(result)

        result_img = Image.open(BytesIO(result.read()))
        self.assertLessEqual(result_img.width, MAIN_IMAGE_MAX_WIDTH)
        self.assertLessEqual(result_img.height, MAIN_IMAGE_MAX_HEIGHT)

    def test_process_image_returns_none_on_invalid_input(self):
        """Test that invalid input returns None."""
        invalid_buffer = BytesIO(b'not an image')
        result = process_image(invalid_buffer, max_width=1920, max_height=1080, quality=85)

        self.assertIsNone(result)

    def test_process_image_preserves_aspect_ratio(self):
        """Test that aspect ratio is preserved when resizing."""
        # Create a 4:3 aspect ratio image that's too large
        wide_image = create_test_image(4000, 3000)  # 4:3 ratio
        result = process_image(wide_image, max_width=1920, max_height=1080, quality=85)

        self.assertIsNotNone(result)

        result_img = Image.open(BytesIO(result.read()))
        # With 4:3 ratio and max 1920x1080, height will be the constraint
        # 1080 height with 4:3 ratio = 1440 width
        self.assertEqual(result_img.width, 1440)
        self.assertEqual(result_img.height, 1080)

    def test_output_is_valid_webp(self):
        """Test that output is a valid WebP image."""
        # Create a standard test image
        img = Image.new('RGB', (1920, 1080), color='red')
        for x in range(0, 1920, 10):
            for y in range(0, 1080, 10):
                img.putpixel((x, y), (0, 255, 0))  # Add some variation

        original_buffer = BytesIO()
        img.save(original_buffer, format='PNG')
        original_buffer.seek(0)

        result = process_image(original_buffer, max_width=1920, max_height=1080, quality=85)

        self.assertIsNotNone(result)

        # Verify output is valid WebP
        result_img = Image.open(BytesIO(result.read()))
        self.assertEqual(result_img.format, 'WEBP')
        self.assertEqual(result_img.width, 1920)
        self.assertEqual(result_img.height, 1080)

    def test_process_image_handles_palette_mode(self):
        """Test that palette mode (P) images are handled correctly."""
        palette_image = create_test_image(800, 600, format='PNG', mode='P')
        result = process_image(palette_image, max_width=1920, max_height=1080, quality=85)

        self.assertIsNotNone(result)

        result_img = Image.open(BytesIO(result.read()))
        self.assertEqual(result_img.format, 'WEBP')
        self.assertEqual(result_img.width, 800)
        self.assertEqual(result_img.height, 600)

    def test_process_image_handles_grayscale(self):
        """Test that grayscale (L) images are converted to RGB."""
        grayscale_image = create_test_image(800, 600, format='PNG', mode='L')
        result = process_image(grayscale_image, max_width=1920, max_height=1080, quality=85)

        self.assertIsNotNone(result)

        result_img = Image.open(BytesIO(result.read()))
        self.assertEqual(result_img.format, 'WEBP')

    def test_process_image_portrait_orientation(self):
        """Test that portrait orientation images are handled correctly."""
        # Create a tall image (portrait)
        portrait_image = create_test_image(1080, 1920)
        result = process_image(portrait_image, max_width=1920, max_height=1080, quality=85)

        self.assertIsNotNone(result)

        result_img = Image.open(BytesIO(result.read()))
        # Height is the constraint, should resize to fit
        self.assertLessEqual(result_img.height, 1080)
        self.assertLessEqual(result_img.width, 1920)
        # Aspect ratio preserved: 1080:1920 = 9:16
        # Max height 1080, so width = 1080 * (1080/1920) = 607.5 -> 607
        self.assertEqual(result_img.height, 1080)
        self.assertEqual(result_img.width, 607)

    def test_process_image_exact_boundary_dimensions(self):
        """Test images exactly at max dimensions are not resized."""
        exact_image = create_test_image(1920, 1080)
        result = process_image(exact_image, max_width=1920, max_height=1080, quality=85)

        self.assertIsNotNone(result)

        result_img = Image.open(BytesIO(result.read()))
        self.assertEqual(result_img.width, 1920)
        self.assertEqual(result_img.height, 1080)

    def test_process_image_very_small_image(self):
        """Test that very small images are not upscaled."""
        tiny_image = create_test_image(50, 50)
        result = process_image(tiny_image, max_width=1920, max_height=1080, quality=85)

        self.assertIsNotNone(result)

        result_img = Image.open(BytesIO(result.read()))
        # Should remain 50x50, not upscaled
        self.assertEqual(result_img.width, 50)
        self.assertEqual(result_img.height, 50)

    def test_process_image_returns_content_file(self):
        """Test that the return type is ContentFile."""
        test_image = create_test_image(800, 600)
        result = process_image(test_image, max_width=1920, max_height=1080, quality=85)

        self.assertIsNotNone(result)
        self.assertIsInstance(result, ContentFile)

    def test_process_image_width_constrained(self):
        """Test resizing when width is the constraint."""
        # Wide image: 4000x1000 (4:1 ratio)
        wide_image = create_test_image(4000, 1000)
        result = process_image(wide_image, max_width=1920, max_height=1080, quality=85)

        self.assertIsNotNone(result)

        result_img = Image.open(BytesIO(result.read()))
        # Width is constraint: 1920 wide, height = 1920 * (1000/4000) = 480
        self.assertEqual(result_img.width, 1920)
        self.assertEqual(result_img.height, 480)

    def test_screenshot_quality_setting(self):
        """Test that screenshot uses correct quality setting."""
        # Verify the constant is set correctly
        self.assertEqual(SCREENSHOT_QUALITY, 85)
        self.assertEqual(SCREENSHOT_MAX_WIDTH, 1920)
        self.assertEqual(SCREENSHOT_MAX_HEIGHT, 1080)

    def test_main_image_quality_setting(self):
        """Test that main image uses correct quality setting."""
        # Verify the constant is set correctly
        self.assertEqual(MAIN_IMAGE_QUALITY, 90)
        self.assertEqual(MAIN_IMAGE_MAX_WIDTH, 2560)
        self.assertEqual(MAIN_IMAGE_MAX_HEIGHT, 1440)


class UploadPathTestCase(TestCase):
    """Tests for upload path functions."""

    def test_app_icon_upload_path_returns_webp(self):
        """Test app icon upload path uses .webp extension."""
        mock_instance = Mock()
        mock_instance.slug = 'test-app'

        path = app_icon_upload_path(mock_instance, 'icon.png')

        self.assertEqual(path, 'app-icons/test-app/icon.webp')

    def test_app_icon_upload_path_with_jpeg(self):
        """Test app icon upload path converts jpeg to webp."""
        mock_instance = Mock()
        mock_instance.slug = 'test-app'

        path = app_icon_upload_path(mock_instance, 'icon.jpeg')

        self.assertEqual(path, 'app-icons/test-app/icon.webp')

    def test_app_icon_upload_path_unknown_slug(self):
        """Test app icon upload path handles missing slug."""
        mock_instance = Mock()
        mock_instance.slug = None

        path = app_icon_upload_path(mock_instance, 'icon.png')

        self.assertEqual(path, 'app-icons/unknown/icon.webp')

    def test_main_image_en_upload_path_returns_webp(self):
        """Test English main image upload path uses .webp extension."""
        mock_instance = Mock()
        mock_instance.slug = 'test-app'

        path = main_image_en_upload_path(mock_instance, 'cover.png')

        self.assertEqual(path, 'app-images/test-app/main_en.webp')

    def test_main_image_ar_upload_path_returns_webp(self):
        """Test Arabic main image upload path uses .webp extension."""
        mock_instance = Mock()
        mock_instance.slug = 'test-app'

        path = main_image_ar_upload_path(mock_instance, 'cover.jpg')

        self.assertEqual(path, 'app-images/test-app/main_ar.webp')

    def test_screenshot_upload_path_returns_webp(self):
        """Test screenshot upload path uses .webp extension."""
        mock_app = Mock()
        mock_app.slug = 'test-app'

        mock_instance = Mock()
        mock_instance.app = mock_app
        mock_instance.language = 'en'
        mock_instance.sort_order = 0

        path = screenshot_upload_path(mock_instance, 'screenshot.png')

        self.assertEqual(path, 'app-images/test-app/screenshots/en_0.webp')

    def test_screenshot_upload_path_arabic(self):
        """Test screenshot upload path for Arabic screenshots."""
        mock_app = Mock()
        mock_app.slug = 'quran-app'

        mock_instance = Mock()
        mock_instance.app = mock_app
        mock_instance.language = 'ar'
        mock_instance.sort_order = 3

        path = screenshot_upload_path(mock_instance, 'screen.jpg')

        self.assertEqual(path, 'app-images/quran-app/screenshots/ar_3.webp')


class ModelImageProcessingTestCase(TestCase):
    """Tests for model save() image processing integration."""

    @patch('core.utils.image_processing.process_main_image')
    def test_app_process_main_images_called(self, mock_process):
        """Test that _process_main_images calls process_main_image."""
        from apps.models import App

        # Setup mock
        mock_processed = ContentFile(b'processed image data')
        mock_process.return_value = mock_processed

        # Create mock file that looks like a new upload
        mock_file = MagicMock()
        mock_file.file = MagicMock()
        mock_file.file.read = MagicMock(return_value=b'image data')
        mock_file.name = 'test.png'
        mock_file.save = MagicMock()

        # Create App instance without saving
        app = App(
            name_en='Test App',
            name_ar='تطبيق اختبار',
            slug='test-app',
            short_description_en='Test',
            short_description_ar='اختبار',
            description_en='Test description',
            description_ar='وصف الاختبار',
        )

        # Manually set the file fields to mock
        app.main_image_en = mock_file
        app.main_image_ar = mock_file

        # Call the processing method
        app._process_main_images()

        # Verify process_main_image was called for both fields
        self.assertEqual(mock_process.call_count, 2)

    @patch('core.utils.image_processing.process_screenshot')
    def test_app_screenshot_save_processes_image(self, mock_process):
        """Test that AppScreenshot.save() calls process_screenshot."""
        from apps.models import AppScreenshot

        # Setup mock
        mock_processed = ContentFile(b'processed screenshot data')
        mock_process.return_value = mock_processed

        # Create mock file that looks like a new upload
        mock_file = MagicMock()
        mock_file.file = MagicMock()
        mock_file.file.read = MagicMock(return_value=b'image data')
        mock_file.name = 'screenshot.png'
        mock_file.save = MagicMock()

        # Create screenshot instance without app (we'll mock the save)
        screenshot = AppScreenshot.__new__(AppScreenshot)
        screenshot.language = 'en'
        screenshot.sort_order = 0
        screenshot.image = mock_file

        # Call save method but mock the parent save to avoid database operations
        with patch.object(AppScreenshot.__bases__[0], 'save'):
            screenshot.save()

        # Verify process_screenshot was called
        mock_process.assert_called_once()

    def test_process_main_images_handles_no_file(self):
        """Test _process_main_images handles missing files gracefully."""
        from apps.models import App

        app = App(
            name_en='Test App',
            name_ar='تطبيق اختبار',
            slug='test-app',
            short_description_en='Test',
            short_description_ar='اختبار',
            description_en='Test description',
            description_ar='وصف الاختبار',
        )

        # Fields are empty/None - should not raise
        app._process_main_images()

    @patch('core.utils.image_processing.process_main_image')
    def test_process_main_images_handles_processing_failure(self, mock_process):
        """Test _process_main_images handles processing failure gracefully."""
        from apps.models import App

        # Mock returns None (processing failed)
        mock_process.return_value = None

        # Create mock file
        mock_file = MagicMock()
        mock_file.file = MagicMock()
        mock_file.file.read = MagicMock(return_value=b'invalid image')
        mock_file.name = 'test.png'

        app = App(
            name_en='Test App',
            name_ar='تطبيق اختبار',
            slug='test-app',
            short_description_en='Test',
            short_description_ar='اختبار',
            description_en='Test description',
            description_ar='وصف الاختبار',
        )
        app.main_image_en = mock_file

        # Should not raise even when processing returns None
        app._process_main_images()

        # Verify it was called but didn't crash
        mock_process.assert_called_once()
