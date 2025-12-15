import uuid
from decimal import Decimal
from django.db import models
from django.utils.text import slugify
from django.core.validators import MinValueValidator, MaxValueValidator
from django.core.cache import cache
from django.conf import settings
from pgvector.django import VectorField
from core.models import PublishedModel


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
    application_icon = models.URLField(blank=True, null=True)
    main_image_en = models.URLField(blank=True, null=True)
    main_image_ar = models.URLField(blank=True, null=True)
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
