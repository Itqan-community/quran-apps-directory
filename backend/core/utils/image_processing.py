"""
Image processing utilities for auto-compress and resize on upload.

Handles screenshots and main images with configurable dimensions and quality.
"""
import logging
from io import BytesIO
from PIL import Image
from django.core.files.base import ContentFile

logger = logging.getLogger(__name__)

# Screenshot configuration
SCREENSHOT_MAX_WIDTH = 1920
SCREENSHOT_MAX_HEIGHT = 1080
SCREENSHOT_QUALITY = 85

# Main image configuration (larger for hero display)
MAIN_IMAGE_MAX_WIDTH = 2560
MAIN_IMAGE_MAX_HEIGHT = 1440
MAIN_IMAGE_QUALITY = 90


def process_image(image_file, max_width, max_height, quality):
    """
    Process an uploaded image: resize, compress, convert to WebP.

    Args:
        image_file: Django UploadedFile or ImageFieldFile
        max_width: Maximum width in pixels
        max_height: Maximum height in pixels
        quality: Compression quality (1-100)

    Returns:
        ContentFile with processed image, or None if processing fails
    """
    try:
        img = Image.open(image_file)

        # Convert RGBA/P to RGB (WebP doesn't need transparency for screenshots)
        if img.mode in ('RGBA', 'P'):
            # Create white background for transparency
            background = Image.new('RGB', img.size, (255, 255, 255))
            if img.mode == 'P':
                img = img.convert('RGBA')
            background.paste(img, mask=img.split()[3] if img.mode == 'RGBA' else None)
            img = background
        elif img.mode != 'RGB':
            img = img.convert('RGB')

        # Resize if larger than max dimensions (preserve aspect ratio)
        if img.width > max_width or img.height > max_height:
            img.thumbnail((max_width, max_height), Image.Resampling.LANCZOS)
            logger.info(f"Resized image to {img.width}x{img.height}")

        # Save to buffer as WebP with compression
        buffer = BytesIO()
        img.save(buffer, format='WEBP', quality=quality, optimize=True)
        buffer.seek(0)

        logger.info(f"Processed image: {buffer.getbuffer().nbytes} bytes")
        return ContentFile(buffer.read())

    except Exception as e:
        logger.error(f"Image processing failed: {e}")
        return None


def process_screenshot(image_file):
    """
    Process a screenshot image for upload.

    Args:
        image_file: Django UploadedFile or ImageFieldFile

    Returns:
        ContentFile with processed image, or None if processing fails
    """
    return process_image(
        image_file,
        max_width=SCREENSHOT_MAX_WIDTH,
        max_height=SCREENSHOT_MAX_HEIGHT,
        quality=SCREENSHOT_QUALITY
    )


def process_main_image(image_file):
    """
    Process a main cover image for upload.

    Args:
        image_file: Django UploadedFile or ImageFieldFile

    Returns:
        ContentFile with processed image, or None if processing fails
    """
    return process_image(
        image_file,
        max_width=MAIN_IMAGE_MAX_WIDTH,
        max_height=MAIN_IMAGE_MAX_HEIGHT,
        quality=MAIN_IMAGE_QUALITY
    )
