"""
Cloudflare R2 Storage Service for media uploads.

Handles uploading images (app icons, screenshots) to Cloudflare R2
and returning public URLs.
"""
import uuid
import mimetypes
import requests
from typing import Optional, Tuple
from io import BytesIO
import logging

from django.conf import settings
from django.core.files.uploadedfile import UploadedFile

logger = logging.getLogger(__name__)


# Maximum file sizes
MAX_ICON_SIZE = 512 * 1024  # 512 KB
MAX_SCREENSHOT_SIZE = 5 * 1024 * 1024  # 5 MB

# Allowed image types
ALLOWED_IMAGE_TYPES = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
}


class StorageError(Exception):
    """Custom exception for storage operations."""
    pass


class R2StorageService:
    """
    Service for uploading files to Cloudflare R2.

    Uses boto3 with S3-compatible API to interact with R2.
    """

    def __init__(self):
        self.account_id = getattr(settings, 'R2_ACCOUNT_ID', '')
        self.access_key_id = getattr(settings, 'R2_ACCESS_KEY_ID', '')
        self.secret_access_key = getattr(settings, 'R2_SECRET_ACCESS_KEY', '')
        self.bucket_name = getattr(settings, 'R2_BUCKET_NAME', 'quran-apps-directory')
        self.public_url = getattr(settings, 'R2_PUBLIC_URL', '').rstrip('/')
        self.endpoint_url = f"https://{self.account_id}.r2.cloudflarestorage.com"

        self._client = None

    @property
    def client(self):
        """Lazy initialization of boto3 S3 client."""
        if self._client is None:
            try:
                import boto3
                from botocore.config import Config

                self._client = boto3.client(
                    's3',
                    endpoint_url=self.endpoint_url,
                    aws_access_key_id=self.access_key_id,
                    aws_secret_access_key=self.secret_access_key,
                    config=Config(
                        signature_version='s3v4',
                        s3={'addressing_style': 'path'}
                    ),
                    region_name='auto'
                )
            except ImportError:
                logger.error("boto3 not installed. Install with: pip install boto3")
                raise StorageError("boto3 library not available")

        return self._client

    def is_configured(self) -> bool:
        """Check if R2 storage is properly configured."""
        return bool(self.access_key_id and self.secret_access_key and self.account_id)

    def get_config_status(self) -> dict:
        """Get detailed config status for debugging (without exposing secrets)."""
        return {
            'account_id_set': bool(self.account_id),
            'access_key_set': bool(self.access_key_id),
            'secret_key_set': bool(self.secret_access_key),
            'bucket_name': self.bucket_name,
            'public_url': self.public_url,
            'is_configured': self.is_configured(),
        }

    def refresh_config(self):
        """Refresh config from current Django settings to handle stale singleton."""
        self.account_id = getattr(settings, 'R2_ACCOUNT_ID', '')
        self.access_key_id = getattr(settings, 'R2_ACCESS_KEY_ID', '')
        self.secret_access_key = getattr(settings, 'R2_SECRET_ACCESS_KEY', '')
        self.bucket_name = getattr(settings, 'R2_BUCKET_NAME', 'quran-apps-directory')
        self.public_url = getattr(settings, 'R2_PUBLIC_URL', '').rstrip('/')
        self.endpoint_url = f"https://{self.account_id}.r2.cloudflarestorage.com"
        self._client = None  # Reset client to use new credentials
        logger.info(f"R2 config refreshed: {self.get_config_status()}")

    def validate_image(
        self,
        content_type: str,
        size: int,
        is_icon: bool = False,
        file_content: bytes = None
    ) -> Tuple[bool, Optional[str]]:
        """
        Validate an image file.

        Args:
            content_type: MIME type of the image
            size: Size in bytes
            is_icon: Whether this is an app icon (stricter size limit)
            file_content: Optional file content bytes for magic bytes validation

        Returns:
            Tuple of (is_valid, error_message)
        """
        if content_type not in ALLOWED_IMAGE_TYPES:
            return False, f"Invalid image type. Allowed: JPEG, PNG, WebP"

        max_size = MAX_ICON_SIZE if is_icon else MAX_SCREENSHOT_SIZE
        if size > max_size:
            if is_icon:
                max_kb = max_size / 1024
                return False, f"Image too large. Maximum size: {max_kb:.0f} KB"
            else:
                max_mb = max_size / (1024 * 1024)
                return False, f"Image too large. Maximum size: {max_mb:.0f} MB"

        # Validate magic bytes if file content is provided
        if file_content:
            if not self._validate_magic_bytes(content_type, file_content):
                return False, f"File content does not match declared type. Allowed: JPEG, PNG, WebP"

        return True, None

    def _validate_magic_bytes(self, content_type: str, content: bytes) -> bool:
        """
        Validate file content matches declared MIME type using magic bytes.

        Args:
            content_type: Declared MIME type
            content: File content bytes

        Returns:
            True if magic bytes match the declared type
        """
        if len(content) < 12:
            return False

        # PNG: \x89PNG\r\n\x1a\n
        if content_type == 'image/png':
            return content[:8] == b'\x89PNG\r\n\x1a\n'

        # JPEG: \xff\xd8\xff
        if content_type == 'image/jpeg':
            return content[:3] == b'\xff\xd8\xff'

        # WebP: RIFF....WEBP
        if content_type == 'image/webp':
            return content[:4] == b'RIFF' and content[8:12] == b'WEBP'

        return False

    def generate_path(self, tracking_id: str, filename: str, prefix: str = '') -> str:
        """
        Generate a unique storage path for a file.

        Args:
            tracking_id: Submission tracking ID
            filename: Original filename
            prefix: Optional prefix (e.g., 'icon', 'screenshots_en')

        Returns:
            Storage path like 'submissions/QAD-ABC123/icon_uuid.png'
        """
        # Get file extension
        content_type = mimetypes.guess_type(filename)[0] or 'image/png'
        extension = ALLOWED_IMAGE_TYPES.get(content_type, '.png')

        # Generate unique filename
        unique_id = uuid.uuid4().hex[:8]
        if prefix:
            new_filename = f"{prefix}_{unique_id}{extension}"
        else:
            new_filename = f"{unique_id}{extension}"

        return f"submissions/{tracking_id}/{new_filename}"

    def upload_file(
        self,
        file: UploadedFile,
        tracking_id: str,
        prefix: str = '',
        is_icon: bool = False
    ) -> str:
        """
        Upload a file to R2.

        Args:
            file: Django UploadedFile object
            tracking_id: Submission tracking ID
            prefix: Optional prefix for the filename
            is_icon: Whether this is an app icon

        Returns:
            Public URL of the uploaded file

        Raises:
            StorageError: If upload fails
        """
        if not self.is_configured():
            raise StorageError(
                f"R2 storage is not properly configured. Config: {self.get_config_status()}"
            )

        # Read file content for magic bytes validation
        file_content = file.read()
        file.seek(0)  # Reset file pointer for upload

        # Validate with magic bytes
        is_valid, error = self.validate_image(
            file.content_type, file.size, is_icon, file_content
        )
        if not is_valid:
            raise StorageError(error)

        # Generate path
        path = self.generate_path(tracking_id, file.name, prefix)

        try:
            # Upload to R2
            self.client.upload_fileobj(
                file,
                self.bucket_name,
                path,
                ExtraArgs={
                    'ContentType': file.content_type,
                    'CacheControl': 'public, max-age=31536000',  # 1 year cache
                }
            )

            public_url = f"{self.public_url}/{path}"
            logger.info(f"Uploaded file to R2: {public_url}")
            return public_url

        except Exception as e:
            logger.error(f"Failed to upload file to R2: {e}")
            raise StorageError(f"Failed to upload file: {str(e)}")

    def upload_from_url(
        self,
        url: str,
        tracking_id: str,
        prefix: str = '',
        is_icon: bool = False
    ) -> str:
        """
        Download an image from URL and upload to R2.

        Args:
            url: URL of the image to download
            tracking_id: Submission tracking ID
            prefix: Optional prefix for the filename
            is_icon: Whether this is an app icon

        Returns:
            Public URL of the uploaded file

        Raises:
            StorageError: If download or upload fails
        """
        if not self.is_configured():
            raise StorageError(
                f"R2 storage is not properly configured. Config: {self.get_config_status()}"
            )

        try:
            # Download the image with proper headers
            headers = {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'image/*,*/*;q=0.8',
            }
            response = requests.get(url, timeout=30, stream=True, headers=headers)
            response.raise_for_status()

            content_type = response.headers.get('Content-Type', 'image/png').split(';')[0]
            content = response.content
            size = len(content)

            # Validate with magic bytes
            is_valid, error = self.validate_image(content_type, size, is_icon, content)
            if not is_valid:
                raise StorageError(error)

            # Generate path
            path = self.generate_path(tracking_id, url.split('/')[-1], prefix)

            # Upload to R2
            self.client.upload_fileobj(
                BytesIO(content),
                self.bucket_name,
                path,
                ExtraArgs={
                    'ContentType': content_type,
                    'CacheControl': 'public, max-age=31536000',
                }
            )

            public_url = f"{self.public_url}/{path}"
            logger.info(f"Uploaded file from URL to R2: {public_url}")
            return public_url

        except requests.RequestException as e:
            logger.error(f"Failed to download image from URL: {e}")
            raise StorageError(f"Failed to download image: {str(e)}")
        except Exception as e:
            logger.error(f"Failed to upload file to R2: {e}")
            raise StorageError(f"Failed to upload file: {str(e)}")

    def delete_file(self, path: str) -> bool:
        """
        Delete a file from R2.

        Args:
            path: Full path or URL of the file

        Returns:
            True if deleted successfully
        """
        if not self.is_configured():
            return True

        # Extract path from URL if needed
        if path.startswith(self.public_url):
            path = path.replace(self.public_url + '/', '')

        try:
            self.client.delete_object(Bucket=self.bucket_name, Key=path)
            logger.info(f"Deleted file from R2: {path}")
            return True
        except Exception as e:
            logger.error(f"Failed to delete file from R2: {e}")
            return False


# Singleton instance
_storage_service = None


def get_storage_service() -> R2StorageService:
    """Get the singleton storage service instance."""
    global _storage_service
    if _storage_service is None:
        _storage_service = R2StorageService()
    return _storage_service
