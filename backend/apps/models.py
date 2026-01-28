import uuid
from decimal import Decimal
from django.db import models
from django.utils.text import slugify
from django.core.validators import MinValueValidator, MaxValueValidator
from django.core.cache import cache
from django.conf import settings
from pgvector.django import VectorField
from core.models import PublishedModel
from core.storage import R2Storage
from .validators import validate_icon_file, validate_image_file


def app_icon_upload_path(instance, filename):
    """
    Generate upload path for app icons.

    Args:
        instance: App model instance
        filename: Original filename

    Returns:
        Path like 'app-icons/app-slug/icon.png'
    """
    ext = filename.split('.')[-1].lower()
    if ext not in ['png', 'jpg', 'jpeg', 'webp']:
        ext = 'png'
    slug = instance.slug or 'unknown'
    return f"app-icons/{slug}/icon.{ext}"


def main_image_en_upload_path(instance, filename):
    """
    Generate upload path for English main images.

    Args:
        instance: App model instance
        filename: Original filename

    Returns:
        Path like 'app-images/app-slug/main_en.png'
    """
    ext = filename.split('.')[-1].lower()
    if ext not in ['png', 'jpg', 'jpeg', 'webp']:
        ext = 'png'
    slug = instance.slug or 'unknown'
    return f"app-images/{slug}/main_en.{ext}"


def main_image_ar_upload_path(instance, filename):
    """
    Generate upload path for Arabic main images.

    Args:
        instance: App model instance
        filename: Original filename

    Returns:
        Path like 'app-images/app-slug/main_ar.png'
    """
    ext = filename.split('.')[-1].lower()
    if ext not in ['png', 'jpg', 'jpeg', 'webp']:
        ext = 'png'
    slug = instance.slug or 'unknown'
    return f"app-images/{slug}/main_ar.{ext}"


def screenshot_upload_path(instance, filename):
    """
    Generate upload path for app screenshots.

    Args:
        instance: AppScreenshot model instance
        filename: Original filename

    Returns:
        Path like 'app-images/app-slug/screenshots/en_0.png'
    """
    ext = filename.split('.')[-1].lower()
    if ext not in ['png', 'jpg', 'jpeg', 'webp']:
        ext = 'png'
    slug = instance.app.slug or 'unknown'
    return f"app-images/{slug}/screenshots/{instance.language}_{instance.sort_order}.{ext}"


class App(PublishedModel):
    """
    Main App model for Quranic applications.
    """
    # Basic Information
    name_en = models.CharField(max_length=200, db_index=True)
    name_ar = models.CharField(max_length=200, db_index=True)
    slug = models.SlugField(max_length=220, unique=True, db_index=True)

    # AI Search
    # 768 dimensions for Gemini text-embedding-004 (was 1536 for OpenAI)
    embedding = VectorField(dimensions=768, null=True, blank=True)

    # Descriptions
    short_description_en = models.TextField()
    short_description_ar = models.TextField()
    description_en = models.TextField()
    description_ar = models.TextField()

    # URLs and Links
    application_icon = models.ImageField(
        upload_to=app_icon_upload_path,
        storage=R2Storage(),
        validators=[validate_icon_file],
        blank=False,
        null=False,
        help_text="App icon (PNG, JPG, or WebP, max 512KB, required)"
    )
    main_image_en = models.ImageField(
        upload_to=main_image_en_upload_path,
        storage=R2Storage(),
        validators=[validate_image_file],
        max_length=500,  # Full URLs can be long
        blank=True,
        null=True,
        help_text="Main cover image - English (PNG, JPG, WebP, max 5MB)"
    )
    main_image_ar = models.ImageField(
        upload_to=main_image_ar_upload_path,
        storage=R2Storage(),
        validators=[validate_image_file],
        max_length=500,  # Full URLs can be long
        blank=True,
        null=True,
        help_text="Main cover image - Arabic (PNG, JPG, WebP, max 5MB)"
    )
    google_play_link = models.URLField(blank=True, null=True)
    app_store_link = models.URLField(blank=True, null=True)
    app_gallery_link = models.URLField(blank=True, null=True)

    # Screenshots (stored as JSON arrays)
    screenshots_en = models.JSONField(default=list, blank=True)
    screenshots_ar = models.JSONField(default=list, blank=True)

    # Ratings and Statistics
    avg_rating = models.DecimalField(
        max_digits=3,
        decimal_places=2,
        default=Decimal('0.00'),
        validators=[MinValueValidator(Decimal('0.00')), MaxValueValidator(Decimal('5.00'))],
        db_index=True,
        help_text="Average rating from 0.00 to 5.00"
    )
    review_count = models.PositiveIntegerField(default=0, db_index=True)
    view_count = models.PositiveIntegerField(default=0, db_index=True)

    # Sorting
    sort_order = models.PositiveIntegerField(default=0, help_text="Order for displaying apps")

    # Relationships
    developer = models.ForeignKey(
        'developers.Developer',
        on_delete=models.CASCADE,
        related_name='apps',
        db_index=True
    )
    categories = models.ManyToManyField(
        'categories.Category',
        related_name='apps',
        db_index=True
    )

    # Additional fields
    platform = models.CharField(
        max_length=20,
        choices=[
            ('android', 'Android'),
            ('ios', 'iOS'),
            ('web', 'Web'),
            ('cross_platform', 'Cross Platform'),
        ],
        default='cross_platform',
        db_index=True
    )

    featured = models.BooleanField(default=False, db_index=True, help_text="Whether this app is featured")

    # Crawled content cache for AI embeddings
    crawled_content = models.TextField(
        blank=True,
        null=True,
        help_text="Cached content crawled from external sources (Google Play, App Store, AppGallery)"
    )
    crawled_at = models.DateTimeField(
        blank=True,
        null=True,
        help_text="Timestamp when external content was last crawled"
    )

    class Meta:
        db_table = 'apps'
        ordering = ['sort_order', 'name_en']
        indexes = [
            models.Index(fields=['slug']),
            models.Index(fields=['status']),
            models.Index(fields=['avg_rating']),
            models.Index(fields=['review_count']),
            models.Index(fields=['view_count']),
            models.Index(fields=['featured']),
            models.Index(fields=['platform']),
            models.Index(fields=['sort_order']),
            models.Index(fields=['developer']),
            models.Index(fields=['name_en']),
            models.Index(fields=['name_ar']),
            models.Index(fields=['status', 'featured']),
        ]
        verbose_name = 'Application'
        verbose_name_plural = 'Applications'

    def __str__(self):
        return f"{self.name_en} / {self.name_ar}"

    @property
    def rating_display(self) -> str:
        """Return formatted rating string."""
        return f"{self.avg_rating:.1f}"

    def increment_view_count(self):
        """Increment the view count."""
        self.view_count += 1
        self.save(update_fields=['view_count'])

    def invalidate_cache(self):
        """Invalidate cache entries related to this app."""
        # Clear featured apps cache
        cache.delete('featured_apps_all')

        # Clear category-specific featured apps cache
        for category in self.categories.all():
            cache.delete(f'featured_apps_{category.slug}')

        # Clear app detail cache
        cache.delete(f'app_detail_{self.id}')
        cache.delete(f'app_detail_{self.slug}')

    def save(self, *args, **kwargs):
        """Override save to generate slug and invalidate cache."""
        # Generate slug if not set
        if not self.slug:
            # Generate slug from English name
            base_slug = slugify(self.name_en)
            self.slug = base_slug
            # Ensure unique slug
            counter = 1
            while App.objects.filter(slug=self.slug).exists():
                self.slug = f"{base_slug}-{counter}"
                counter += 1

        # Track if this is a new instance
        is_new = self._state.adding
        old_instance = None

        if not is_new:
            try:
                old_instance = App.objects.get(pk=self.pk)
            except App.DoesNotExist:
                pass

        # Call parent save
        super().save(*args, **kwargs)

        # Invalidate cache after save
        self.invalidate_cache()

        # If this was a status change, clear additional caches
        if old_instance and old_instance.status != self.status:
            cache.delete_many([
                'apps_list_published',
                'apps_list_featured',
            ])


class CrawlSource(models.TextChoices):
    """Enum for crawl sources."""
    GOOGLE_PLAY = 'google_play', 'Google Play'
    APP_STORE = 'app_store', 'App Store'
    APP_GALLERY = 'app_gallery', 'AppGallery'
    WEBSITE = 'website', 'Website'


class CrawlStatus(models.TextChoices):
    """Enum for crawl status."""
    SUCCESS = 'success', 'Success'
    FAILED = 'failed', 'Failed'
    NOT_FOUND = 'not_found', 'Not Found'
    PENDING = 'pending', 'Pending'


class AppCrawledData(models.Model):
    """
    Stores crawled content from external sources for each app.
    Each app can have multiple entries (one per source).
    """
    id = models.BigAutoField(primary_key=True)

    app = models.ForeignKey(
        'App',
        on_delete=models.CASCADE,
        related_name='crawled_data',
        db_index=True
    )

    source = models.CharField(
        max_length=20,
        choices=CrawlSource.choices,
        db_index=True
    )

    url = models.URLField(
        max_length=500,
        help_text="The URL that was crawled"
    )

    content = models.TextField(
        blank=True,
        default='',
        help_text="Crawled text content"
    )

    status = models.CharField(
        max_length=20,
        choices=CrawlStatus.choices,
        default=CrawlStatus.PENDING,
        db_index=True
    )

    metadata = models.JSONField(
        default=dict,
        blank=True,
        help_text="Extra info: char_count, error_message, http_status, etc."
    )

    crawled_at = models.DateTimeField(
        auto_now_add=True,
        db_index=True,
        help_text="Timestamp when this URL was crawled"
    )

    class Meta:
        db_table = 'app_crawled_data'
        ordering = ['-crawled_at']
        indexes = [
            models.Index(fields=['app', 'source']),
            models.Index(fields=['status']),
            models.Index(fields=['crawled_at']),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=['app', 'source'],
                name='unique_app_source'
            )
        ]
        verbose_name = 'App Crawled Data'
        verbose_name_plural = 'App Crawled Data'

    def __str__(self):
        return f"{self.app.name_en} - {self.get_source_display()}"


class DeviceType(models.TextChoices):
    """Enum for device types in view analytics."""
    MOBILE = 'mobile', 'Mobile'
    TABLET = 'tablet', 'Tablet'
    DESKTOP = 'desktop', 'Desktop'
    BOT = 'bot', 'Bot'
    UNKNOWN = 'unknown', 'Unknown'


class AppViewEvent(models.Model):
    """
    Individual view event for time-series analytics.
    Tracks each app view with extended metadata.
    """
    id = models.BigAutoField(primary_key=True)

    app = models.ForeignKey(
        'App',
        on_delete=models.CASCADE,
        related_name='view_events',
        db_index=True
    )

    viewed_at = models.DateTimeField(
        auto_now_add=True,
        db_index=True,
        help_text="Timestamp when the view occurred"
    )

    # Request metadata
    referrer = models.URLField(
        max_length=2000,
        blank=True,
        null=True,
        help_text="HTTP Referer header"
    )

    user_agent = models.TextField(
        blank=True,
        null=True,
        help_text="Raw User-Agent string"
    )

    session_id = models.CharField(
        max_length=64,
        blank=True,
        null=True,
        db_index=True,
        help_text="Session identifier for deduplication"
    )

    # Privacy-compliant location
    country_code = models.CharField(
        max_length=2,
        blank=True,
        null=True,
        db_index=True,
        help_text="ISO 3166-1 alpha-2 country code from Cloudflare"
    )

    ip_hash = models.CharField(
        max_length=64,
        blank=True,
        null=True,
        db_index=True,
        help_text="SHA256 hash of IP with daily rotating salt"
    )

    # Parsed user agent data
    device_type = models.CharField(
        max_length=20,
        choices=DeviceType.choices,
        default=DeviceType.UNKNOWN,
        db_index=True,
        help_text="Device type: mobile, tablet, desktop, bot, unknown"
    )

    browser = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        help_text="Browser name and version"
    )

    os = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        help_text="Operating system name and version"
    )

    class Meta:
        db_table = 'app_view_events'
        ordering = ['-viewed_at']
        indexes = [
            models.Index(fields=['app', 'viewed_at']),
            models.Index(fields=['viewed_at', 'app']),
            models.Index(fields=['app', 'country_code']),
            models.Index(fields=['app', 'device_type']),
        ]
        verbose_name = 'App View Event'
        verbose_name_plural = 'App View Events'

    def __str__(self):
        return f"{self.app.name_en} - {self.viewed_at.strftime('%Y-%m-%d %H:%M')}"


class AppScreenshot(models.Model):
    """
    Screenshot file for an app, supports both languages.

    Replaces the screenshots_en and screenshots_ar JSONFields with
    a proper model for file uploads. Stores full R2 URLs in the database.
    """
    app = models.ForeignKey(
        'App',
        on_delete=models.CASCADE,
        related_name='screenshot_files',
        db_index=True
    )
    language = models.CharField(
        max_length=2,
        choices=[('en', 'English'), ('ar', 'Arabic')],
        default='en',
        db_index=True
    )
    image = models.ImageField(
        upload_to=screenshot_upload_path,
        storage=R2Storage(),
        validators=[validate_image_file],
        max_length=500,  # Full URLs can be long
        help_text="Screenshot image (PNG, JPG, WebP, max 5MB)"
    )
    sort_order = models.PositiveIntegerField(default=0)

    class Meta:
        db_table = 'app_screenshots'
        ordering = ['language', 'sort_order']
        indexes = [
            models.Index(fields=['app', 'language']),
            models.Index(fields=['app', 'language', 'sort_order']),
        ]
        verbose_name = 'App Screenshot'
        verbose_name_plural = 'App Screenshots'

    def __str__(self):
        return f"{self.app.name_en} - {self.get_language_display()} #{self.sort_order}"
