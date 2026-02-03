"""
Dynamic Metadata Models for Quran Apps Directory

This module implements a fully dynamic metadata system where:
- New metadata TYPES can be added via admin (e.g., "reading_level", "target_audience")
- New metadata VALUES can be added via admin (e.g., new riwayah options)
- API automatically supports any new metadata without code changes

Architecture:
    MetadataType (riwayah, mushaf_type, features, reading_level...)
        │
        └── MetadataOption (hafs, warsh, offline, beginner...)
                │
                └── AppMetadataValue (M2M linking App ↔ MetadataOption)
"""

from django.db import models
from django.core.validators import RegexValidator


slug_validator = RegexValidator(
    regex=r'^[a-z][a-z0-9_]*$',
    message='Slug must start with a letter and contain only lowercase letters, numbers, and underscores.'
)


class MetadataType(models.Model):
    """
    Defines a metadata category (e.g., riwayah, features, reading_level).

    Each MetadataType becomes an API query parameter automatically.
    For example, a MetadataType with name='riwayah' enables ?riwayah=hafs,warsh filtering.
    """
    name = models.SlugField(
        max_length=50,
        unique=True,
        validators=[slug_validator],
        help_text="API key for this metadata (e.g., 'riwayah'). Used in query params like ?riwayah=hafs"
    )
    label_en = models.CharField(
        max_length=100,
        help_text="English display name (e.g., 'Riwayah')"
    )
    label_ar = models.CharField(
        max_length=100,
        help_text="Arabic display name (e.g., 'الرواية')"
    )
    description_en = models.TextField(
        blank=True,
        help_text="English description for tooltips/help text"
    )
    description_ar = models.TextField(
        blank=True,
        help_text="Arabic description for tooltips/help text"
    )
    is_multi_select = models.BooleanField(
        default=True,
        help_text="Can an app have multiple values for this metadata? (e.g., multiple riwayat)"
    )
    sort_order = models.PositiveIntegerField(
        default=0,
        help_text="Display order in filter UI (lower = first)"
    )
    is_active = models.BooleanField(
        default=True,
        db_index=True,
        help_text="Inactive metadata types are hidden from API and admin"
    )
    icon = models.TextField(
        blank=True,
        help_text="SVG icon or icon class for this metadata type"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'metadata_types'
        ordering = ['sort_order', 'name']
        verbose_name = 'Metadata Type'
        verbose_name_plural = 'Metadata Types'

    def __str__(self):
        return f"{self.label_en} ({self.name})"

    @property
    def option_count(self):
        """Return the number of active options for this metadata type."""
        return self.options.filter(is_active=True).count()


class MetadataOption(models.Model):
    """
    A value within a metadata type (e.g., "hafs" in riwayah).

    Each MetadataOption represents one selectable value in a filter dropdown.
    """
    metadata_type = models.ForeignKey(
        MetadataType,
        on_delete=models.CASCADE,
        related_name='options',
        help_text="The metadata type this option belongs to"
    )
    value = models.SlugField(
        max_length=50,
        validators=[slug_validator],
        help_text="API value (e.g., 'hafs'). Used in query params like ?riwayah=hafs"
    )
    label_en = models.CharField(
        max_length=100,
        help_text="English display label (e.g., 'Hafs')"
    )
    label_ar = models.CharField(
        max_length=100,
        help_text="Arabic display label (e.g., 'حفص')"
    )
    description_en = models.TextField(
        blank=True,
        help_text="English description for tooltips"
    )
    description_ar = models.TextField(
        blank=True,
        help_text="Arabic description for tooltips"
    )
    sort_order = models.PositiveIntegerField(
        default=0,
        help_text="Display order within this metadata type (lower = first)"
    )
    is_active = models.BooleanField(
        default=True,
        db_index=True,
        help_text="Inactive options are hidden from API and admin"
    )
    icon = models.TextField(
        blank=True,
        help_text="SVG icon or icon class for this option"
    )
    color = models.CharField(
        max_length=7,
        blank=True,
        help_text="Hex color code (e.g., '#A0533B') for UI styling"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'metadata_options'
        ordering = ['metadata_type', 'sort_order', 'value']
        verbose_name = 'Metadata Option'
        verbose_name_plural = 'Metadata Options'
        constraints = [
            models.UniqueConstraint(
                fields=['metadata_type', 'value'],
                name='unique_metadata_type_value'
            )
        ]
        indexes = [
            models.Index(fields=['metadata_type', 'is_active']),
            models.Index(fields=['value']),
        ]

    def __str__(self):
        return f"{self.metadata_type.name}:{self.value} ({self.label_en})"

    @property
    def app_count(self):
        """Return the number of apps using this metadata option."""
        return self.app_values.count()


class AppMetadataValue(models.Model):
    """
    M2M linking App to MetadataOption.

    This replaces the JSONFields (riwayah, mushaf_type, features) on the App model
    with a normalized relational structure.
    """
    app = models.ForeignKey(
        'apps.App',
        on_delete=models.CASCADE,
        related_name='metadata_values',
        help_text="The app this metadata value is assigned to"
    )
    metadata_option = models.ForeignKey(
        MetadataOption,
        on_delete=models.CASCADE,
        related_name='app_values',
        help_text="The metadata option assigned to this app"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'app_metadata_values'
        ordering = ['app', 'metadata_option__metadata_type', 'metadata_option__sort_order']
        verbose_name = 'App Metadata Value'
        verbose_name_plural = 'App Metadata Values'
        constraints = [
            models.UniqueConstraint(
                fields=['app', 'metadata_option'],
                name='unique_app_metadata_option'
            )
        ]
        indexes = [
            models.Index(fields=['app', 'metadata_option']),
            models.Index(fields=['metadata_option', 'app']),
        ]

    def __str__(self):
        return f"{self.app.name_en} - {self.metadata_option}"
