# Django Models for Quran Apps Directory
# File: apps/models.py (to be split into appropriate app modules)

from django.db import models
from django.contrib.auth.models import AbstractUser
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils.text import slugify
import uuid


# ============================================================================
# ABSTRACT BASE MODELS
# ============================================================================

class BaseModel(models.Model):
    """Abstract base model with common fields"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class BilingualModel(BaseModel):
    """Abstract model for bilingual content"""
    name_en = models.CharField(max_length=255, db_index=True)
    name_ar = models.CharField(max_length=255, db_index=True)
    description_en = models.TextField(blank=True, null=True)
    description_ar = models.TextField(blank=True, null=True)

    class Meta:
        abstract = True


# ============================================================================
# CORE ENTITIES
# ============================================================================

class Category(BilingualModel):
    """App Categories (Mushaf, Tafsir, Translations, etc.)"""
    slug = models.SlugField(max_length=100, unique=True, db_index=True)
    icon_url = models.URLField(blank=True, null=True)
    sort_order = models.IntegerField(default=0, db_index=True)

    class Meta:
        db_table = 'categories'
        ordering = ['sort_order', 'name_en']
        verbose_name_plural = 'Categories'
        indexes = [
            models.Index(fields=['slug']),
            models.Index(fields=['sort_order']),
        ]

    def __str__(self):
        return f"{self.name_en} / {self.name_ar}"

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name_en)
        super().save(*args, **kwargs)


class Developer(BilingualModel):
    """Quran App Developers"""
    website = models.URLField(blank=True, null=True)
    logo_url = models.URLField(blank=True, null=True)
    contact_email = models.EmailField(blank=True, null=True, db_index=True)

    class Meta:
        db_table = 'developers'
        ordering = ['name_en']
        verbose_name_plural = 'Developers'
        constraints = [
            models.UniqueConstraint(
                fields=['name_en', 'name_ar'],
                name='unique_developer_name'
            )
        ]

    def __str__(self):
        return f"{self.name_en} / {self.name_ar}"

    @property
    def app_count(self):
        """Return count of apps by this developer"""
        return self.apps.filter(status='published').count()


class App(BilingualModel):
    """Quran Applications"""
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('published', 'Published'),
        ('archived', 'Archived'),
        ('done', 'Done'),
    ]

    slug = models.SlugField(max_length=255, unique=True, db_index=True)
    developer = models.ForeignKey(
        Developer,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='apps',
        db_index=True
    )

    # Bilingual content inherited from BilingualModel
    short_description_en = models.CharField(max_length=500, blank=True, null=True)
    short_description_ar = models.CharField(max_length=500, blank=True, null=True)

    # Media URLs
    main_image_en = models.URLField(blank=True, null=True)
    main_image_ar = models.URLField(blank=True, null=True)
    app_icon = models.URLField(blank=True, null=True)

    # Status & Ratings
    status = models.CharField(
        max_length=50,
        choices=STATUS_CHOICES,
        default='draft',
        db_index=True
    )
    apps_avg_rating = models.DecimalField(
        max_digits=3,
        decimal_places=2,
        default=0,
        validators=[MinValueValidator(0), MaxValueValidator(5)],
        db_index=True
    )
    total_reviews = models.IntegerField(default=0)

    # Store Links
    google_play_link = models.URLField(blank=True, null=True)
    app_store_link = models.URLField(blank=True, null=True)
    app_gallery_link = models.URLField(blank=True, null=True)

    # Categories (Many-to-Many)
    categories = models.ManyToManyField(
        Category,
        related_name='apps',
        through='AppCategory',
        blank=True
    )

    # Metadata
    sort_order = models.IntegerField(default=0)
    is_featured = models.BooleanField(default=False, db_index=True)

    class Meta:
        db_table = 'apps'
        ordering = ['-apps_avg_rating', 'name_en']
        verbose_name_plural = 'Apps'
        indexes = [
            models.Index(fields=['slug']),
            models.Index(fields=['developer_id']),
            models.Index(fields=['-apps_avg_rating']),
            models.Index(fields=['is_featured']),
            models.Index(fields=['status']),
            models.Index(fields=['-created_at']),
        ]

    def __str__(self):
        return f"{self.name_en} / {self.name_ar}"

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name_en)
        super().save(*args, **kwargs)

    def update_rating(self):
        """Recalculate average rating from reviews"""
        approved_reviews = self.reviews.filter(status='approved')
        if approved_reviews.exists():
            avg_rating = approved_reviews.aggregate(
                models.Avg('rating')
            )['rating__avg']
            self.apps_avg_rating = avg_rating
            self.total_reviews = approved_reviews.count()
            self.save(update_fields=['apps_avg_rating', 'total_reviews'])

    @property
    def favorite_count(self):
        """Return count of users who favorited this app"""
        return self.favorites.count()

    @property
    def share_count_30d(self):
        """Return share count in last 30 days"""
        from django.utils import timezone
        from datetime import timedelta
        cutoff = timezone.now() - timedelta(days=30)
        return self.share_events.filter(timestamp__gte=cutoff).count()


class AppCategory(models.Model):
    """Through model for App-Category relationship"""
    app = models.ForeignKey(
        App,
        on_delete=models.CASCADE,
        related_name='app_categories'
    )
    category = models.ForeignKey(
        Category,
        on_delete=models.CASCADE,
        related_name='category_apps'
    )
    sort_order = models.IntegerField(default=0, db_index=True)
    added_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'app_categories'
        unique_together = ('app', 'category')
        ordering = ['sort_order']
        verbose_name_plural = 'App Categories'
        indexes = [
            models.Index(fields=['category', 'app']),
            models.Index(fields=['sort_order']),
        ]

    def __str__(self):
        return f"{self.app.name_en} - {self.category.name_en}"


class AppFeature(BilingualModel):
    """Features of Apps"""
    app = models.ForeignKey(
        App,
        on_delete=models.CASCADE,
        related_name='features',
        db_index=True
    )
    sort_order = models.IntegerField(default=0, db_index=True)

    class Meta:
        db_table = 'app_features'
        ordering = ['sort_order']
        verbose_name_plural = 'App Features'
        constraints = [
            models.UniqueConstraint(
                fields=['app', 'name_en'],
                name='unique_feature_per_app'
            )
        ]

    def __str__(self):
        return f"{self.app.name_en} - {self.name_en}"


class Screenshot(BaseModel):
    """App Screenshots"""
    LANGUAGE_CHOICES = [
        ('en', 'English'),
        ('ar', 'Arabic'),
    ]

    app = models.ForeignKey(
        App,
        on_delete=models.CASCADE,
        related_name='screenshots',
        db_index=True
    )
    url = models.URLField()
    language = models.CharField(
        max_length=5,
        choices=LANGUAGE_CHOICES,
        db_index=True
    )
    sort_order = models.IntegerField(default=0, db_index=True)

    class Meta:
        db_table = 'screenshots'
        ordering = ['language', 'sort_order']
        verbose_name_plural = 'Screenshots'
        indexes = [
            models.Index(fields=['app', 'language']),
            models.Index(fields=['sort_order']),
        ]

    def __str__(self):
        return f"{self.app.name_en} - {self.language}"


# ============================================================================
# USER & AUTHENTICATION
# ============================================================================

class User(AbstractUser):
    """Extended Django User Model"""
    LANGUAGE_CHOICES = [
        ('en', 'English'),
        ('ar', 'العربية'),
    ]
    THEME_CHOICES = [
        ('light', 'Light'),
        ('dark', 'Dark'),
        ('auto', 'Auto'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    avatar_url = models.URLField(blank=True, null=True)
    bio = models.TextField(blank=True, null=True)
    email_verified = models.BooleanField(default=False, db_index=True)
    language_preference = models.CharField(
        max_length=5,
        choices=LANGUAGE_CHOICES,
        default='en'
    )
    theme_preference = models.CharField(
        max_length=10,
        choices=THEME_CHOICES,
        default='auto'
    )
    last_login_at = models.DateTimeField(null=True, blank=True, db_index=True)

    class Meta:
        db_table = 'users'
        verbose_name_plural = 'Users'
        ordering = ['-date_joined']
        indexes = [
            models.Index(fields=['email']),
            models.Index(fields=['is_active']),
            models.Index(fields=['-date_joined']),
        ]

    def __str__(self):
        return f"{self.email} ({self.get_full_name()})"

    @property
    def profile_complete(self):
        """Check if user profile is complete"""
        return all([
            self.first_name,
            self.last_name,
            self.avatar_url,
            self.bio,
            self.email_verified
        ])


class OAuthProvider(BaseModel):
    """OAuth Provider Integrations"""
    PROVIDER_CHOICES = [
        ('google', 'Google'),
        ('apple', 'Apple'),
        ('facebook', 'Facebook'),
        ('twitter', 'Twitter'),
    ]

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='oauth_providers',
        db_index=True
    )
    provider = models.CharField(
        max_length=50,
        choices=PROVIDER_CHOICES,
        db_index=True
    )
    provider_user_id = models.CharField(max_length=255)
    email = models.EmailField(blank=True, null=True)
    name = models.CharField(max_length=255, blank=True, null=True)
    access_token = models.TextField()  # Encrypted at app level
    refresh_token = models.TextField(blank=True, null=True)  # Encrypted at app level
    token_expires_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'oauth_providers'
        unique_together = ('provider', 'provider_user_id')
        verbose_name_plural = 'OAuth Providers'
        constraints = [
            models.UniqueConstraint(
                fields=['provider', 'provider_user_id'],
                name='unique_oauth_account'
            )
        ]

    def __str__(self):
        return f"{self.user.email} - {self.provider}"


class User2FA(BaseModel):
    """Two-Factor Authentication"""
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='two_fa',
        primary_key=False
    )
    secret = models.CharField(max_length=255)  # Encrypted at app level
    backup_codes = models.JSONField(default=list, blank=True)  # Encrypted at app level
    enabled_at = models.DateTimeField(null=True, blank=True, db_index=True)
    disabled_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'user_2fa'
        verbose_name_plural = 'Two-Factor Authentication'

    def __str__(self):
        return f"{self.user.email} 2FA"

    @property
    def is_enabled(self):
        """Check if 2FA is enabled"""
        return self.enabled_at is not None


# ============================================================================
# USER ENGAGEMENT
# ============================================================================

class Favorite(BaseModel):
    """User Favorite Apps"""
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='favorites',
        db_index=True
    )
    app = models.ForeignKey(
        App,
        on_delete=models.CASCADE,
        related_name='favorites',
        db_index=True
    )

    class Meta:
        db_table = 'favorites'
        unique_together = ('user', 'app')
        ordering = ['-created_at']
        verbose_name_plural = 'Favorites'
        indexes = [
            models.Index(fields=['user', 'app']),
            models.Index(fields=['-created_at']),
        ]

    def __str__(self):
        return f"{self.user.email} ❤️ {self.app.name_en}"


class Collection(BilingualModel):
    """User Collections of Apps"""
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='collections',
        db_index=True
    )
    is_public = models.BooleanField(default=False, db_index=True)
    share_token = models.CharField(
        max_length=50,
        unique=True,
        null=True,
        blank=True,
        db_index=True
    )

    class Meta:
        db_table = 'collections'
        ordering = ['-created_at']
        verbose_name_plural = 'Collections'
        indexes = [
            models.Index(fields=['user']),
            models.Index(fields=['is_public']),
            models.Index(fields=['share_token']),
            models.Index(fields=['-created_at']),
        ]

    def __str__(self):
        return f"{self.user.email} - {self.name_en}"

    def generate_share_token(self):
        """Generate unique share token"""
        import secrets
        self.share_token = secrets.token_urlsafe(32)[:50]
        self.save(update_fields=['share_token'])


class CollectionApp(BaseModel):
    """Through model for Collection-App relationship"""
    collection = models.ForeignKey(
        Collection,
        on_delete=models.CASCADE,
        related_name='collection_apps'
    )
    app = models.ForeignKey(
        App,
        on_delete=models.CASCADE,
        related_name='collection_apps',
        db_index=True
    )
    sort_order = models.IntegerField(default=0, db_index=True)
    note = models.TextField(blank=True, null=True)

    class Meta:
        db_table = 'collection_apps'
        unique_together = ('collection', 'app')
        ordering = ['sort_order']
        verbose_name_plural = 'Collection Apps'

    def __str__(self):
        return f"{self.collection.name_en} - {self.app.name_en}"


class Review(BaseModel):
    """User Reviews & Ratings"""
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
        ('flagged', 'Flagged'),
    ]

    app = models.ForeignKey(
        App,
        on_delete=models.CASCADE,
        related_name='reviews',
        db_index=True
    )
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='reviews',
        db_index=True
    )
    rating = models.IntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        db_index=True
    )
    title = models.CharField(max_length=255)
    content = models.TextField()
    status = models.CharField(
        max_length=50,
        choices=STATUS_CHOICES,
        default='pending',
        db_index=True
    )
    moderated_at = models.DateTimeField(null=True, blank=True)
    moderator = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='moderated_reviews'
    )
    moderation_reason = models.TextField(blank=True, null=True)
    helpful_count = models.IntegerField(default=0, db_index=True)
    not_helpful_count = models.IntegerField(default=0)

    class Meta:
        db_table = 'reviews'
        unique_together = ('user', 'app')
        ordering = ['-created_at']
        verbose_name_plural = 'Reviews'
        indexes = [
            models.Index(fields=['app', 'status']),
            models.Index(fields=['user']),
            models.Index(fields=['status']),
            models.Index(fields=['-helpful_count']),
            models.Index(fields=['-created_at']),
        ]

    def __str__(self):
        return f"{self.user.email} - {self.app.name_en} ({self.rating}⭐)"

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        # Update app rating after review save
        self.app.update_rating()


class ReviewHelpfulness(BaseModel):
    """Helpful/Not Helpful Votes on Reviews"""
    review = models.ForeignKey(
        Review,
        on_delete=models.CASCADE,
        related_name='helpfulness_votes'
    )
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='review_helpfulness_votes'
    )
    is_helpful = models.BooleanField(db_index=True)

    class Meta:
        db_table = 'review_helpfulness'
        unique_together = ('review', 'user')
        verbose_name_plural = 'Review Helpfulness Votes'
        constraints = [
            models.UniqueConstraint(
                fields=['review', 'user'],
                name='unique_helpfulness_vote'
            )
        ]

    def __str__(self):
        return f"{self.user.email} - {self.review.id} ({'👍' if self.is_helpful else '👎'})"

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        # Update review helpful counts
        helpful = self.review.helpfulness_votes.filter(is_helpful=True).count()
        not_helpful = self.review.helpfulness_votes.filter(is_helpful=False).count()
        self.review.helpful_count = helpful
        self.review.not_helpful_count = not_helpful
        self.review.save(update_fields=['helpful_count', 'not_helpful_count'])


class ReviewFlag(BaseModel):
    """Flagged Reviews for Moderation"""
    REASON_CHOICES = [
        ('spam', 'Spam'),
        ('inappropriate', 'Inappropriate Content'),
        ('off_topic', 'Off-topic'),
        ('other', 'Other'),
    ]

    review = models.ForeignKey(
        Review,
        on_delete=models.CASCADE,
        related_name='flags'
    )
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='flagged_reviews'
    )
    reason = models.CharField(
        max_length=50,
        choices=REASON_CHOICES,
        db_index=True
    )

    class Meta:
        db_table = 'review_flags'
        unique_together = ('review', 'user')
        verbose_name_plural = 'Review Flags'

    def __str__(self):
        return f"Flag: {self.review.id} - {self.reason}"


# ============================================================================
# ANALYTICS & TRACKING
# ============================================================================

class ShareEvent(BaseModel):
    """Social Media Share Events"""
    PLATFORM_CHOICES = [
        ('whatsapp', 'WhatsApp'),
        ('twitter', 'Twitter'),
        ('facebook', 'Facebook'),
        ('telegram', 'Telegram'),
        ('email', 'Email'),
        ('web_share', 'Web Share API'),
        ('other', 'Other'),
    ]

    app = models.ForeignKey(
        App,
        on_delete=models.CASCADE,
        related_name='share_events',
        db_index=True
    )
    platform = models.CharField(
        max_length=50,
        choices=PLATFORM_CHOICES,
        db_index=True
    )
    user = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='share_events'
    )
    ip_address = models.GenericIPAddressField(blank=True, null=True)
    user_agent = models.TextField(blank=True, null=True)
    timestamp = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        db_table = 'share_events'
        ordering = ['-timestamp']
        verbose_name_plural = 'Share Events'
        indexes = [
            models.Index(fields=['app', 'platform']),
            models.Index(fields=['user']),
            models.Index(fields=['-timestamp']),
        ]

    def __str__(self):
        return f"{self.app.name_en} shared on {self.platform}"


class UserActivity(BaseModel):
    """User Activity Tracking"""
    ACTIVITY_CHOICES = [
        ('view', 'App Viewed'),
        ('favorite', 'Favorited'),
        ('unfavorite', 'Unfavorited'),
        ('review', 'Review Posted'),
        ('collection_create', 'Collection Created'),
        ('collection_share', 'Collection Shared'),
        ('search', 'Search Performed'),
    ]

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='activities',
        db_index=True
    )
    activity_type = models.CharField(
        max_length=50,
        choices=ACTIVITY_CHOICES,
        db_index=True
    )
    app = models.ForeignKey(
        App,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='user_activities'
    )
    metadata = models.JSONField(default=dict, blank=True)
    ip_address = models.GenericIPAddressField(blank=True, null=True)
    user_agent = models.TextField(blank=True, null=True)
    timestamp = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        db_table = 'user_activities'
        ordering = ['-timestamp']
        verbose_name_plural = 'User Activities'
        indexes = [
            models.Index(fields=['user', 'activity_type']),
            models.Index(fields=['app']),
            models.Index(fields=['-timestamp']),
        ]

    def __str__(self):
        return f"{self.user.email} - {self.activity_type}"


class AppViewAnalytics(BaseModel):
    """Daily View Analytics per App"""
    app = models.ForeignKey(
        App,
        on_delete=models.CASCADE,
        related_name='view_analytics',
        db_index=True
    )
    view_date = models.DateField(db_index=True)
    view_count = models.IntegerField(default=0)
    unique_viewers = models.IntegerField(default=0)
    average_session_duration = models.IntegerField(null=True, blank=True)  # seconds

    class Meta:
        db_table = 'app_view_analytics'
        unique_together = ('app', 'view_date')
        ordering = ['-view_date']
        verbose_name_plural = 'App View Analytics'
        constraints = [
            models.UniqueConstraint(
                fields=['app', 'view_date'],
                name='unique_daily_analytics'
            )
        ]

    def __str__(self):
        return f"{self.app.name_en} - {self.view_date}"


# ============================================================================
# NOTIFICATIONS & COMMUNICATIONS
# ============================================================================

class Notification(BaseModel):
    """In-App Notifications"""
    NOTIFICATION_CHOICES = [
        ('review_approved', 'Review Approved'),
        ('review_rejected', 'Review Rejected'),
        ('new_review', 'New Review on Your App'),
        ('collection_shared', 'Collection Shared with You'),
        ('app_mentioned', 'App Mentioned'),
        ('system_alert', 'System Alert'),
    ]

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='notifications',
        db_index=True
    )
    notification_type = models.CharField(
        max_length=50,
        choices=NOTIFICATION_CHOICES,
        db_index=True
    )
    title_en = models.CharField(max_length=255)
    title_ar = models.CharField(max_length=255)
    message_en = models.TextField(blank=True, null=True)
    message_ar = models.TextField(blank=True, null=True)
    app = models.ForeignKey(
        App,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='notifications'
    )
    related_user = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='mentions'
    )
    is_read = models.BooleanField(default=False, db_index=True)
    read_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'notifications'
        ordering = ['-created_at']
        verbose_name_plural = 'Notifications'
        indexes = [
            models.Index(fields=['user', 'is_read']),
            models.Index(fields=['-created_at']),
        ]

    def __str__(self):
        return f"{self.user.email} - {self.notification_type}"

    def mark_as_read(self):
        """Mark notification as read"""
        from django.utils import timezone
        if not self.is_read:
            self.is_read = True
            self.read_at = timezone.now()
            self.save(update_fields=['is_read', 'read_at'])


class EmailLog(BaseModel):
    """Email Delivery Tracking"""
    EMAIL_CHOICES = [
        ('verification', 'Email Verification'),
        ('password_reset', 'Password Reset'),
        ('review_approved', 'Review Approved'),
        ('review_rejected', 'Review Rejected'),
        ('collection_shared', 'Collection Shared'),
        ('digest', 'Weekly Digest'),
    ]
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('sent', 'Sent'),
        ('failed', 'Failed'),
        ('bounced', 'Bounced'),
    ]

    user = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='email_logs'
    )
    email_address = models.EmailField(db_index=True)
    email_type = models.CharField(
        max_length=50,
        choices=EMAIL_CHOICES,
        db_index=True
    )
    subject = models.CharField(max_length=255, blank=True, null=True)
    status = models.CharField(
        max_length=50,
        choices=STATUS_CHOICES,
        default='pending',
        db_index=True
    )
    error_message = models.TextField(blank=True, null=True)
    sent_at = models.DateTimeField(null=True, blank=True)
    opened_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'email_logs'
        ordering = ['-created_at']
        verbose_name_plural = 'Email Logs'
        indexes = [
            models.Index(fields=['email_address', 'status']),
            models.Index(fields=['status']),
            models.Index(fields=['-created_at']),
        ]

    def __str__(self):
        return f"{self.email_address} - {self.email_type}"
