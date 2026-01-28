"""
Tests for image processing utilities.
"""
from io import BytesIO
from PIL import Image
from django.test import TestCase
from django.core.files.uploadedfile import SimpleUploadedFile
from core.utils.image_processing import (
    process_image,
    process_screenshot,
    process_main_image,
    SCREENSHOT_MAX_WIDTH,
    SCREENSHOT_MAX_HEIGHT,
    MAIN_IMAGE_MAX_WIDTH,
    MAIN_IMAGE_MAX_HEIGHT,
)


def create_test_image(width, height, format='PNG', mode='RGB'):
    """Create a test image in memory."""
    img = Image.new(mode, (width, height), color='red')
    buffer = BytesIO()
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
