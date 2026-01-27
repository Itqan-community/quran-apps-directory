"""
Validators for the apps module.
"""
from django.core.exceptions import ValidationError

# Maximum icon file size (512 KB)
MAX_ICON_SIZE = 512 * 1024

# Allowed MIME types for icons
ALLOWED_ICON_TYPES = [
    'image/png',
    'image/jpeg',
    'image/webp',
]


def validate_icon_file(file):
    """
    Validate an app icon file.

    Checks:
    - File type is PNG, JPG, or WebP
    - File size is less than 512KB

    Args:
        file: UploadedFile or ImageFieldFile

    Raises:
        ValidationError: If validation fails
    """
    # Check content type if available
    if hasattr(file, 'content_type'):
        if file.content_type not in ALLOWED_ICON_TYPES:
            raise ValidationError(
                'Icon must be PNG, JPG, or WebP format.',
                code='invalid_type'
            )

    # Check file size
    if hasattr(file, 'size') and file.size is not None:
        if file.size > MAX_ICON_SIZE:
            max_kb = MAX_ICON_SIZE // 1024
            raise ValidationError(
                f'Icon must be less than {max_kb}KB. Current size: {file.size // 1024}KB.',
                code='file_too_large'
            )


def validate_icon_magic_bytes(file):
    """
    Validate icon file content using magic bytes.

    This is a deeper validation that checks the actual file content
    matches the expected format.

    Args:
        file: File-like object with read capability

    Raises:
        ValidationError: If file content doesn't match expected format
    """
    # Read first 12 bytes for magic number detection
    if hasattr(file, 'read'):
        header = file.read(12)
        if hasattr(file, 'seek'):
            file.seek(0)

        if len(header) < 8:
            raise ValidationError(
                'Invalid image file.',
                code='invalid_content'
            )

        # Check for PNG: \x89PNG\r\n\x1a\n
        is_png = header[:8] == b'\x89PNG\r\n\x1a\n'

        # Check for JPEG: \xff\xd8\xff
        is_jpeg = header[:3] == b'\xff\xd8\xff'

        # Check for WebP: RIFF....WEBP
        is_webp = header[:4] == b'RIFF' and len(header) >= 12 and header[8:12] == b'WEBP'

        if not (is_png or is_jpeg or is_webp):
            raise ValidationError(
                'Invalid image content. File must be a valid PNG, JPG, or WebP.',
                code='invalid_magic_bytes'
            )
