"""
Django Admin configuration for Dynamic Metadata.

Provides admin interfaces for managing:
- MetadataType: Metadata categories (riwayah, mushaf_type, features, etc.)
- MetadataOption: Values within each metadata type
- AppMetadataValue: M2M links between apps and metadata options

Key Features:
- Inline editing of MetadataOptions within MetadataType admin
- Autocomplete for metadata option selection in App admin
- Display counts of options and apps using each metadata
"""

from django.contrib import admin
from .models import MetadataType, MetadataOption, AppMetadataValue


class MetadataOptionInline(admin.TabularInline):
    """
    Inline admin for MetadataOptions within MetadataType.

    Allows editing all options for a metadata type on the same page.
    """
    model = MetadataOption
    fields = ['value', 'label_en', 'label_ar', 'sort_order', 'is_active', 'color']
    extra = 1
    ordering = ['sort_order', 'value']


@admin.register(MetadataType)
class MetadataTypeAdmin(admin.ModelAdmin):
    """
    Admin for MetadataType (riwayah, mushaf_type, features, etc.).

    Includes inline editing of all options for each metadata type.
    """
    list_display = ['name', 'label_en', 'label_ar', 'is_multi_select', 'option_count_display', 'is_active', 'sort_order']
    list_filter = ['is_active', 'is_multi_select']
    list_editable = ['sort_order', 'is_active']
    search_fields = ['name', 'label_en', 'label_ar']
    ordering = ['sort_order', 'name']
    prepopulated_fields = {'name': ('label_en',)}

    fieldsets = (
        (None, {
            'fields': ('name', 'label_en', 'label_ar')
        }),
        ('Descriptions', {
            'fields': ('description_en', 'description_ar'),
            'classes': ('collapse',),
        }),
        ('Settings', {
            'fields': ('is_multi_select', 'sort_order', 'is_active', 'icon'),
        }),
    )

    inlines = [MetadataOptionInline]

    def option_count_display(self, obj):
        """Display number of active options for this metadata type."""
        return obj.options.filter(is_active=True).count()
    option_count_display.short_description = 'Options'


@admin.register(MetadataOption)
class MetadataOptionAdmin(admin.ModelAdmin):
    """
    Admin for MetadataOption (individual metadata values).

    Standalone admin for bulk management of metadata options across types.
    """
    list_display = ['value', 'label_en', 'label_ar', 'metadata_type', 'app_count_display', 'is_active', 'sort_order']
    list_filter = ['metadata_type', 'is_active']
    list_editable = ['sort_order', 'is_active']
    search_fields = ['value', 'label_en', 'label_ar']
    ordering = ['metadata_type', 'sort_order', 'value']
    autocomplete_fields = ['metadata_type']

    fieldsets = (
        (None, {
            'fields': ('metadata_type', 'value', 'label_en', 'label_ar')
        }),
        ('Descriptions', {
            'fields': ('description_en', 'description_ar'),
            'classes': ('collapse',),
        }),
        ('Display', {
            'fields': ('sort_order', 'is_active', 'icon', 'color'),
        }),
    )

    def app_count_display(self, obj):
        """Display number of apps using this option."""
        return obj.app_values.count()
    app_count_display.short_description = 'Apps'


class AppMetadataValueInline(admin.TabularInline):
    """
    Inline admin for AppMetadataValue within App admin.

    Allows assigning metadata options to apps directly from the App edit page.
    Uses autocomplete for easy selection of metadata options.
    """
    model = AppMetadataValue
    fields = ['metadata_option']
    autocomplete_fields = ['metadata_option']
    extra = 1
    verbose_name = 'Metadata Value'
    verbose_name_plural = 'Metadata Values'

    def get_queryset(self, request):
        """Order by metadata type and sort order for better readability."""
        return super().get_queryset(request).select_related(
            'metadata_option', 'metadata_option__metadata_type'
        ).order_by('metadata_option__metadata_type__sort_order', 'metadata_option__sort_order')


@admin.register(AppMetadataValue)
class AppMetadataValueAdmin(admin.ModelAdmin):
    """
    Admin for AppMetadataValue (M2M junction table).

    Allows bulk management of app-metadata relationships.
    """
    list_display = ['app', 'metadata_option', 'metadata_type_display', 'created_at']
    list_filter = ['metadata_option__metadata_type', 'created_at']
    search_fields = ['app__name_en', 'app__name_ar', 'metadata_option__value', 'metadata_option__label_en']
    autocomplete_fields = ['app', 'metadata_option']
    ordering = ['app', 'metadata_option__metadata_type', 'metadata_option__sort_order']
    date_hierarchy = 'created_at'

    def metadata_type_display(self, obj):
        """Display the metadata type name."""
        return obj.metadata_option.metadata_type.name
    metadata_type_display.short_description = 'Metadata Type'
    metadata_type_display.admin_order_field = 'metadata_option__metadata_type__name'
