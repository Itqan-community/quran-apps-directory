# Deploying Cloudflare R2 Image Storage with Django: A Complete Setup Guide

Storing and serving user-uploaded images at scale is a challenge every growing application faces. Traditional filesystem storage doesn't scale well, CDNs are expensive, and managing infrastructure becomes complex.

**Cloudflare R2** solves this elegantly. It's S3-compatible object storage with built-in CDN delivery and **no egress fees**—a game-changer for cost-conscious projects.

In this post, we'll walk through how we integrated Cloudflare R2 with Django in the Quran Apps Directory, handling app submission images, optimizations, and lessons we learned along the way.

---

## Why Cloudflare R2?

### The Problem with Traditional Storage

When building the Quran Apps Directory submission system, we needed to store:
- App icons
- Preview images (English and Arabic versions)
- Multiple screenshots per app

Using local filesystem storage has serious limitations:

```
❌ Doesn't scale across multiple servers
❌ Not suitable for cloud deployments
❌ Requires manual backup strategies
❌ Slows down application server
❌ Difficult to serve globally
```

### Why We Chose R2

```
✅ S3-compatible API (standard, proven)
✅ No egress fees (massive cost savings)
✅ Automatic CDN integration
✅ Pay-as-you-go pricing
✅ Excellent documentation
✅ Simple setup process
✅ Works great with Django
```

**Bottom line:** R2 is ideal for projects prioritizing cost efficiency without sacrificing performance or scalability.

---

## Architecture Overview

Here's how R2 fits into our Django application:

```
User Uploads Images
      ↓
Django View/API
      ↓
boto3 (S3 Client)
      ↓
Cloudflare R2
      ↓
R2 URL → Stored in Database
      ↓
User Retrieves Image
      ↓
Cloudflare CDN ← Automatic
      ↓
Image Served to User (Fast!)
```

### Key Components

1. **boto3** - AWS SDK for Python (works with R2 via S3 compatibility)
2. **Cloudflare R2** - Object storage service
3. **Django Storage Backend** - Custom or django-storages integration
4. **Database** - Stores R2 URLs for retrieval
5. **CDN** - Automatic Cloudflare CDN for fast delivery

---

## Prerequisites

Before you start, ensure you have:

- A Django project (any recent version)
- Python 3.8+
- A Cloudflare account (free tier works)
- Basic knowledge of Django models and views
- AWS CLI or boto3 experience (helpful but not required)

---

## Step 1: Create R2 Storage Bucket

### 1.1 Login to Cloudflare Dashboard

Go to [dash.cloudflare.com](https://dash.cloudflare.com) and navigate to:

```
Account Home → R2 → Create bucket
```

### 1.2 Create a New Bucket

```
Bucket name: quran-apps-submissions
(or any name matching your project)
Region: Auto-detect (recommended)
Click: Create bucket
```

**Important:** Remember your bucket name—you'll need it later.

### 1.3 Create API Token

In R2 settings, click **Create API token**:

```
Token name: django-app
Permissions: Read & Write
TTL: Choose appropriate expiration (6 months, 1 year, or never)
Restrict to bucket: quran-apps-submissions
```

You'll get three values—**save them securely**:
- `R2_ACCOUNT_ID`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`

---

## Step 2: Install Python Dependencies

Install boto3 and supporting packages:

```bash
pip install boto3 botocore
```

Or add to your `requirements.txt`:

```
boto3>=1.26.0
botocore>=1.29.0
```

---

## Step 3: Configure Django Settings

Create environment variables for your credentials. In your `.env` file:

```bash
# Cloudflare R2 Configuration
R2_ACCOUNT_ID=your_account_id_here
R2_ACCESS_KEY_ID=your_access_key_here
R2_SECRET_ACCESS_KEY=your_secret_key_here
R2_BUCKET_NAME=quran-apps-submissions
R2_REGION=auto
```

In your Django `settings.py`:

```python
import os
from pathlib import Path

# Cloudflare R2 Configuration
if os.getenv('R2_ACCOUNT_ID'):
    # R2 is configured
    AWS_ACCESS_KEY_ID = os.getenv('R2_ACCESS_KEY_ID')
    AWS_SECRET_ACCESS_KEY = os.getenv('R2_SECRET_ACCESS_KEY')

    AWS_S3_ENDPOINT_URL = (
        f"https://{os.getenv('R2_ACCOUNT_ID')}.r2.cloudflarestorage.com"
    )

    AWS_STORAGE_BUCKET_NAME = os.getenv('R2_BUCKET_NAME', 'quran-apps')
    AWS_S3_REGION_NAME = os.getenv('R2_REGION', 'auto')

    # URL configuration
    AWS_S3_CUSTOM_DOMAIN = f"{AWS_STORAGE_BUCKET_NAME}.{os.getenv('R2_ACCOUNT_ID')}.r2.cloudflarestorage.com"
    AWS_S3_URL_PROTOCOL = 'https'
    AWS_S3_ADDRESS_STYLE = 'virtual'

    # File naming
    AWS_S3_FILE_OVERWRITE = False
    AWS_DEFAULT_ACL = 'public-read'

    # For static/media files
    DEFAULT_FILE_STORAGE = 'storages.backends.s3boto3.S3Boto3Storage'
else:
    # Fallback to local storage in development
    DEFAULT_FILE_STORAGE = 'django.core.files.storage.FileSystemStorage'
    MEDIA_ROOT = os.path.join(BASE_DIR, 'media')
    MEDIA_URL = '/media/'
```

---

## Step 4: Create a Storage Service

Instead of scattering R2 code throughout your app, create a centralized storage service:

```python
# services/storage_service.py
import boto3
import os
import logging
from botocore.exceptions import ClientError

logger = logging.getLogger(__name__)


class StorageError(Exception):
    """Raised when storage operations fail."""
    pass


class R2StorageService:
    """Cloudflare R2 storage service for uploading and managing files."""

    def __init__(self):
        self.account_id = os.getenv('R2_ACCOUNT_ID')
        self.access_key = os.getenv('R2_ACCESS_KEY_ID')
        self.secret_key = os.getenv('R2_SECRET_ACCESS_KEY')
        self.bucket = os.getenv('R2_BUCKET_NAME')
        self.endpoint = (
            f"https://{self.account_id}.r2.cloudflarestorage.com"
        )

    def is_configured(self) -> bool:
        """Check if R2 is properly configured."""
        return all([
            self.account_id,
            self.access_key,
            self.secret_key,
            self.bucket
        ])

    def _get_client(self):
        """Create and return boto3 S3 client."""
        return boto3.client(
            's3',
            endpoint_url=self.endpoint,
            aws_access_key_id=self.access_key,
            aws_secret_access_key=self.secret_key,
            region_name='auto'
        )

    def upload_from_url(self, url: str, prefix: str) -> str:
        """
        Download file from URL and upload to R2.

        Args:
            url: Source URL of file
            prefix: Storage path prefix

        Returns:
            R2 public URL of uploaded file

        Raises:
            StorageError: If upload fails
        """
        if not self.is_configured():
            raise StorageError("R2 not configured")

        try:
            import requests
            response = requests.get(url, timeout=10)
            response.raise_for_status()

            filename = url.split('/')[-1]
            key = f"{prefix}/{filename}"

            client = self._get_client()
            client.put_object(
                Bucket=self.bucket,
                Key=key,
                Body=response.content,
                ACL='public-read'
            )

            return f"https://{self.bucket}.{self.account_id}.r2.cloudflarestorage.com/{key}"

        except ClientError as e:
            logger.error(f"R2 upload failed: {e}")
            raise StorageError(f"Upload failed: {e}")
        except Exception as e:
            logger.error(f"Unexpected error during upload: {e}")
            raise StorageError(f"Upload error: {e}")


def get_storage_service() -> R2StorageService:
    """Factory function to get storage service."""
    return R2StorageService()
```

### Using the Service

```python
from services.storage_service import get_storage_service, StorageError

def upload_app_icon(app_icon_url: str) -> str:
    """Upload app icon to R2."""
    storage = get_storage_service()

    if not storage.is_configured():
        raise ValueError("R2 storage not configured")

    try:
        r2_url = storage.upload_from_url(
            url=app_icon_url,
            prefix='icons'
        )
        return r2_url
    except StorageError as e:
        logger.error(f"Failed to upload icon: {e}")
        raise
```

---

## Step 5: Integrate with Django Models

Store R2 URLs in your models:

```python
from django.db import models

class AppSubmission(models.Model):
    # ... other fields ...

    # Store R2 URLs directly (not file fields)
    app_icon_url = models.URLField(
        blank=True,
        help_text="URL of app icon (hosted on R2)"
    )
    main_image_en = models.URLField(
        blank=True,
        help_text="English main image URL (hosted on R2)"
    )
    main_image_ar = models.URLField(
        blank=True,
        help_text="Arabic main image URL (hosted on R2)"
    )
    screenshots_en = models.JSONField(
        default=list,
        help_text="List of English screenshot URLs (hosted on R2)"
    )
    screenshots_ar = models.JSONField(
        default=list,
        help_text="List of Arabic screenshot URLs (hosted on R2)"
    )
```

---

## Step 6: Testing Locally

### Without R2 (Recommended for Dev)

For local development, fall back to filesystem storage:

```bash
# Don't set R2 environment variables locally
# Django will use MEDIA_ROOT/MEDIA_URL instead
```

### With R2 (Optional)

To test R2 locally, create a `.env.local`:

```
R2_ACCOUNT_ID=your_test_account_id
R2_ACCESS_KEY_ID=your_test_key
R2_SECRET_ACCESS_KEY=your_test_secret
R2_BUCKET_NAME=test-bucket
```

Then test uploads:

```python
from django.test import TestCase
from services.storage_service import get_storage_service

class R2StorageTests(TestCase):
    def test_upload(self):
        storage = get_storage_service()

        # Test with a real URL
        url = storage.upload_from_url(
            url='https://example.com/test.jpg',
            prefix='tests'
        )

        self.assertIn('r2.cloudflarestorage.com', url)
        self.assertTrue(url.startswith('https://'))
```

---

## Step 7: Performance Optimizations

### 1. Image Optimization Before Upload

```python
from PIL import Image
from io import BytesIO
import requests

def optimize_and_upload(url: str, max_size: tuple = (2000, 2000)) -> str:
    """Download, optimize, and upload image."""

    # Download
    response = requests.get(url)
    img = Image.open(BytesIO(response.content))

    # Resize if needed
    if img.size[0] > max_size[0] or img.size[1] > max_size[1]:
        img.thumbnail(max_size, Image.Resampling.LANCZOS)

    # Convert to WebP (more efficient)
    buffer = BytesIO()
    img.save(buffer, format='WEBP', quality=85, optimize=True)
    buffer.seek(0)

    # Upload
    client = get_storage_service()._get_client()
    key = f"images/{url.split('/')[-1]}.webp"

    client.put_object(
        Bucket=os.getenv('R2_BUCKET_NAME'),
        Key=key,
        Body=buffer.getvalue(),
        ContentType='image/webp',
        ACL='public-read'
    )

    account_id = os.getenv('R2_ACCOUNT_ID')
    bucket = os.getenv('R2_BUCKET_NAME')
    return f"https://{bucket}.{account_id}.r2.cloudflarestorage.com/{key}"
```

### 2. CDN Caching Headers

Configure R2 to serve with proper cache headers:

```python
# In storage service
client.put_object(
    Bucket=self.bucket,
    Key=key,
    Body=response.content,
    ACL='public-read',
    CacheControl='public, max-age=31536000, immutable'  # 1 year
)
```

### 3. Use Cloudflare's CDN

R2 integrates seamlessly with Cloudflare's CDN:

1. Add R2 domain to your Cloudflare zone
2. Set cache rules for aggressive caching
3. Images are automatically cached globally

---

## Troubleshooting

### Issue: "Access Denied" Errors

**Cause:** Invalid credentials or permissions
**Solution:**
```bash
# Verify credentials in .env
# Check API token permissions in R2 dashboard
# Ensure bucket name matches configuration
```

### Issue: Images Don't Load

**Cause:** Wrong bucket name or account ID
**Solution:**
```python
# Test connection
from services.storage_service import get_storage_service

service = get_storage_service()
print(service.is_configured())  # Should be True
print(service.endpoint)  # Should match your R2 endpoint
```

### Issue: Slow Upload Speed

**Cause:** Network issues or large files
**Solution:**
- Optimize images before upload
- Use chunked uploads for large files
- Verify network connectivity

### Issue: Cost Higher Than Expected

**Cause:** Egress fees from other providers or operations
**Solution:**
- R2 has no egress fees (advantage!)
- Monitor API call costs
- Delete unused images regularly

---

## Cost Estimation

For a typical app directory with 1,000 apps:

| Item | Monthly Cost |
|------|-------------|
| Storage (1TB) | ~$15 |
| API Calls (100K) | ~$0.50 |
| Egress (R2→CDN) | $0 (no egress fees!) |
| **Total** | **~$15.50** |

Compare this to AWS S3:
- Storage: $23
- Egress: $92 (for same usage)
- **Total: $115** ← 7x more expensive!

---

## Production Checklist

Before deploying to production:

- [ ] Create dedicated R2 API token (not your main account)
- [ ] Set appropriate TTL on API token
- [ ] Configure backup/recovery strategy
- [ ] Test all upload scenarios
- [ ] Verify CDN caching working
- [ ] Set up monitoring/alerts
- [ ] Document recovery procedures
- [ ] Review bucket permissions
- [ ] Test failover scenarios

---

## Best Practices

### 1. Use Meaningful Prefixes
```python
# Good
key = f"submissions/{submission_id}/icons/{filename}"

# Bad
key = filename
```

### 2. Validate Before Upload
```python
# Check file size
if len(response.content) > 10 * 1024 * 1024:  # 10MB
    raise StorageError("File too large")

# Check content type
if not response.headers.get('content-type', '').startswith('image'):
    raise StorageError("Invalid file type")
```

### 3. Handle Failures Gracefully
```python
try:
    r2_url = storage.upload_from_url(url)
except StorageError:
    # Fallback to original URL if R2 fails
    return url
```

### 4. Monitor Usage
```bash
# View bucket stats
# In Cloudflare Dashboard → R2 → Bucket → Stats
# Monitor storage size
# Track API call counts
# Review bandwidth usage
```

---

## What We Learned

### ✅ What Worked Well
- R2's S3 compatibility made integration straightforward
- No egress fees provided huge cost savings
- Automatic CDN integration improved performance
- Boto3 is mature and reliable
- Environment-based configuration kept secrets safe

### ⚠️ What Was Tricky
- Initial API token permission configuration
- Understanding R2's endpoint URL format
- Handling timeouts during large file uploads
- Image optimization before storage
- Debugging S3 API errors (often cryptic)

### 💡 Key Recommendations
1. Use a dedicated service class (don't scatter S3 code around)
2. Implement image optimization before upload
3. Store R2 URLs in database, not file fields
4. Test with real files in staging
5. Monitor costs closely in first month

---

## Next Steps

Now that you have R2 integrated:

1. **Implement Upload Progress** - Show users upload progress bars
2. **Add Image Caching** - Cache images locally for performance
3. **Set Up Monitoring** - Alert on upload failures
4. **Enable Versioning** - R2 can version objects for safety
5. **Implement Cleanup** - Delete old/unused images automatically

---

## Resources

- **Cloudflare R2 Docs:** https://developers.cloudflare.com/r2/
- **boto3 Documentation:** https://boto3.amazonaws.com/v1/documentation/api/latest/index.html
- **Django Storage Backend:** https://docs.djangoproject.com/en/stable/topics/files/
- **S3 API Reference:** https://docs.aws.amazon.com/AmazonS3/latest/API/

---

## Questions?

Have issues or questions about R2 integration?

- **Open an Issue:** https://github.com/Itqan-community/quran-apps-directory/issues
- **Community Forum:** https://community.itqan.dev
- **Email:** connect@itqan.dev

---

**Version:** 1.0
**Last Updated:** November 30, 2025
**Django Version:** 5.0+
**Python Version:** 3.8+
