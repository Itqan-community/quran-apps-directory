from django.contrib import admin
from django.utils.html import format_html
from .models import App


@admin.register(App)
class AppAdmin(admin.ModelAdmin):
    """
    Admin interface for managing Quranic applications.
    """
    list_display = [
        'icon_preview',
        'name_en',
        'name_ar',
        'platform',
        'avg_rating',
        'review_count',
        'view_count',
        'featured',
        'status',
        'developer',
        'created_at',
    ]
    list_filter = [
        'status',
        'featured',
        'platform',
        'categories',
        'developer',
        'created_at',
    ]
    search_fields = [
        'name_en',
        'name_ar',
        'slug',
        'short_description_en',
        'short_description_ar',
        'developer__name_en',
        'developer__name_ar',
    ]
    prepopulated_fields = {'slug': ('name_en',)}
    readonly_fields = ['id', 'created_at', 'updated_at', 'icon_preview_large']
    filter_horizontal = ['categories']

    fieldsets = [
        ('Basic Information', {
            'fields': [
                'id',
                'name_en',
                'name_ar',
                'slug',
                'status',
            ]
        }),
        ('Descriptions', {
            'fields': [
                'short_description_en',
                'short_description_ar',
                'description_en',
                'description_ar',
            ]
        }),
        ('Media', {
            'fields': [
                'application_icon',
                'icon_preview_large',
                'main_image_en',
                'main_image_ar',
                'screenshots_en',
                'screenshots_ar',
            ]
        }),
        ('Store Links', {
            'fields': [
                'google_play_link',
                'app_store_link',
                'app_gallery_link',
            ]
        }),
        ('Ratings & Statistics', {
            'fields': [
                'avg_rating',
                'review_count',
                'view_count',
            ]
        }),
        ('Organization', {
            'fields': [
                'developer',
                'categories',
                'platform',
                'featured',
                'sort_order',
            ]
        }),
        ('Timestamps', {
            'fields': ['created_at', 'updated_at'],
            'classes': ['collapse'],
        }),
    ]

    ordering = ['sort_order', 'name_en']

    def icon_preview(self, obj):
        """Display small icon preview in list view."""
        if obj.application_icon:
            return format_html(
                '<img src="{}" style="width: 40px; height: 40px; border-radius: 8px;" />',
                obj.application_icon
            )
        return '-'
    icon_preview.short_description = 'Icon'

    def icon_preview_large(self, obj):
        """Display large icon preview in detail view."""
        if obj.application_icon:
            return format_html(
                '<img src="{}" style="width: 100px; height: 100px; border-radius: 12px;" />',
                obj.application_icon
            )
        return '-'
    icon_preview_large.short_description = 'Icon Preview'

    actions = ['mark_as_featured', 'mark_as_published', 'mark_as_draft']

    def mark_as_featured(self, request, queryset):
        """Mark selected apps as featured."""
        updated = queryset.update(featured=True)
        self.message_user(request, f'{updated} apps marked as featured.')
    mark_as_featured.short_description = 'Mark selected apps as featured'

    def mark_as_published(self, request, queryset):
        """Publish selected apps."""
        updated = queryset.update(status='published')
        self.message_user(request, f'{updated} apps published.')
    mark_as_published.short_description = 'Publish selected apps'

    def mark_as_draft(self, request, queryset):
        """Move selected apps to draft."""
        updated = queryset.update(status='draft')
        self.message_user(request, f'{updated} apps moved to draft.')
    mark_as_draft.short_description = 'Move selected apps to draft'
