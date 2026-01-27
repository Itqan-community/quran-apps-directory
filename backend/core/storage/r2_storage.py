"""
Custom Django Storage backend for Cloudflare R2.

Wraps the existing R2StorageService to provide Django's Storage interface,
enabling use with ImageField and FileField.
"""
import uuid
import mimetypes
import logging
from io import BytesIO
from django.core.files.storage import Storage
from django.core.files.base import ContentFile
from django.conf import settings

logger = logging.getLogger(__name__)


class R2Storage(Storage):
    """
    Django Storage backend for Cloudflare R2.

    Uses boto3 with S3-compatible API for R2 operations.
    Files are stored with public read access and 1-year cache headers.
    """

    def __init__(self, location=''):
        """
        Initialize R2 storage.

        Args:
            location: Optional base path prefix for all files
        """
        self.location = location.strip('/')
        self._client = None

    def _get_settings(self):
        """Get R2 settings from Django settings."""
        return {
            'account_id': getattr(settings, 'R2_ACCOUNT_ID', ''),
            'access_key_id': getattr(settings, 'R2_ACCESS_KEY_ID', ''),
            'secret_access_key': getattr(settings, 'R2_SECRET_ACCESS_KEY', ''),
            'bucket_name': getattr(settings, 'R2_BUCKET_NAME', 'quran-apps-directory'),
            'public_url': getattr(settings, 'R2_PUBLIC_URL', '').rstrip('/'),
        }

    @property
    def client(self):
        """Lazy initialization of boto3 S3 client."""
        if self._client is None:
            settings_dict = self._get_settings()
            try:
                import boto3
                from botocore.config import Config

                endpoint_url = f"https://{settings_dict['account_id']}.r2.cloudflarestorage.com"
                self._client = boto3.client(
                    's3',
                    endpoint_url=endpoint_url,
                    aws_access_key_id=settings_dict['access_key_id'],
                    aws_secret_access_key=settings_dict['secret_access_key'],
                    config=Config(
                        signature_version='s3v4',
                        s3={'addressing_style': 'path'}
                    ),
                    region_name='auto'
                )
            except ImportError:
                logger.error("boto3 not installed")
                raise ImportError("boto3 is required for R2Storage")
        return self._client

    def _get_full_path(self, name):
        """Get full path including location prefix."""
        name = name.lstrip('/')
        if self.location:
            return f"{self.location}/{name}"
        return name

    def _save(self, name, content):
        """
        Save file to R2.

        Args:
            name: File path/name
            content: File content (File-like object)

        Returns:
            The name of the saved file
        """
        settings_dict = self._get_settings()
        full_path = self._get_full_path(name)

        # Determine content type
        content_type = getattr(content, 'content_type', None)
        if not content_type:
            content_type = mimetypes.guess_type(name)[0] or 'application/octet-stream'

        # Read content
        if hasattr(content, 'read'):
            file_content = content.read()
            if hasattr(content, 'seek'):
                content.seek(0)
        else:
            file_content = content

        try:
            self.client.upload_fileobj(
                BytesIO(file_content),
                settings_dict['bucket_name'],
                full_path,
                ExtraArgs={
                    'ContentType': content_type,
                    'CacheControl': 'public, max-age=31536000',  # 1 year
                }
            )
            logger.info(f"R2Storage: Uploaded {full_path}")
            return name
        except Exception as e:
            logger.error(f"R2Storage: Failed to upload {full_path}: {e}")
            raise

    def _open(self, name, mode='rb'):
        """
        Open a file from R2.

        Args:
            name: File path/name
            mode: File mode (only 'rb' supported)

        Returns:
            ContentFile with file data
        """
        settings_dict = self._get_settings()
        full_path = self._get_full_path(name)

        try:
            response = self.client.get_object(
                Bucket=settings_dict['bucket_name'],
                Key=full_path
            )
            return ContentFile(response['Body'].read())
        except Exception as e:
            logger.error(f"R2Storage: Failed to open {full_path}: {e}")
            raise

    def delete(self, name):
        """
        Delete a file from R2.

        Args:
            name: File path/name
        """
        settings_dict = self._get_settings()
        full_path = self._get_full_path(name)

        try:
            self.client.delete_object(
                Bucket=settings_dict['bucket_name'],
                Key=full_path
            )
            logger.info(f"R2Storage: Deleted {full_path}")
        except Exception as e:
            logger.warning(f"R2Storage: Failed to delete {full_path}: {e}")

    def exists(self, name):
        """
        Check if a file exists in R2.

        Args:
            name: File path/name

        Returns:
            True if file exists, False otherwise
        """
        settings_dict = self._get_settings()
        full_path = self._get_full_path(name)

        try:
            self.client.head_object(
                Bucket=settings_dict['bucket_name'],
                Key=full_path
            )
            return True
        except self.client.exceptions.ClientError:
            return False
        except Exception:
            return False

    def url(self, name):
        """
        Get the public URL for a file.

        If the name is already a complete URL (starts with http), return as-is.
        This handles legacy data that stores full URLs instead of relative paths.

        Args:
            name: File path/name or full URL

        Returns:
            Public URL string
        """
        # If already a full URL, return as-is (legacy support)
        if name and name.startswith(('http://', 'https://')):
            return name

        settings_dict = self._get_settings()
        full_path = self._get_full_path(name)
        return f"{settings_dict['public_url']}/{full_path}"

    def size(self, name):
        """
        Get the size of a file in R2.

        Args:
            name: File path/name

        Returns:
            File size in bytes
        """
        settings_dict = self._get_settings()
        full_path = self._get_full_path(name)

        try:
            response = self.client.head_object(
                Bucket=settings_dict['bucket_name'],
                Key=full_path
            )
            return response.get('ContentLength', 0)
        except Exception:
            return 0

    def get_available_name(self, name, max_length=None):
        """
        Generate a unique filename to avoid overwriting existing files.

        Args:
            name: Desired file name
            max_length: Optional max length

        Returns:
            Available file name
        """
        if self.exists(name):
            # Add UUID suffix to make unique
            name_parts = name.rsplit('.', 1)
            unique_id = uuid.uuid4().hex[:8]
            if len(name_parts) > 1:
                name = f"{name_parts[0]}_{unique_id}.{name_parts[1]}"
            else:
                name = f"{name}_{unique_id}"

        if max_length and len(name) > max_length:
            # Truncate if too long
            ext_idx = name.rfind('.')
            if ext_idx > 0:
                ext = name[ext_idx:]
                name = name[:max_length - len(ext)] + ext
            else:
                name = name[:max_length]

        return name
