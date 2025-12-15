from django.contrib import admin
from django.utils.html import format_html
from .models import App, AppCrawledData


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
        'has_embedding',
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
    readonly_fields = ['id', 'created_at', 'updated_at', 'icon_preview_large', 'embedding_status']
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
        ('AI Search', {
            'fields': ['embedding_status'],
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

    def embedding_status(self, obj):
        """Display embedding status with dimensions."""
        if obj.embedding is not None:
            dims = len(obj.embedding) if hasattr(obj.embedding, '__len__') else 768
            return format_html(
                '<span style="color: green; font-weight: bold;">✓ Indexed</span> '
                '<span style="color: #666;">({} dimensions)</span>',
                dims
            )
        return format_html('<span style="color: red;">✗ Not indexed</span>')
    embedding_status.short_description = 'AI Embedding'

    def has_embedding(self, obj):
        """Show embedding status in list view."""
        if obj.embedding is not None:
            return format_html('<span style="color: green;">✓</span>')
        return format_html('<span style="color: red;">✗</span>')
    has_embedding.short_description = 'AI'
    has_embedding.admin_order_field = 'embedding'

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


@admin.register(AppCrawledData)
class AppCrawledDataAdmin(admin.ModelAdmin):
    """
    Admin interface for viewing crawled data from app stores.
    Read-only - data is populated by the crawler service.
    """
    list_display = [
        'app_name',
        'source',
        'status',
        'char_count',
        'crawled_at',
    ]
    list_filter = [
        'source',
        'status',
        'crawled_at',
    ]
    search_fields = [
        'app__name_en',
        'app__name_ar',
        'url',
    ]
    readonly_fields = [
        'id',
        'app',
        'source',
        'url',
        'content_preview',
        'status',
        'metadata',
        'crawled_at',
    ]
    ordering = ['-crawled_at']

    fieldsets = [
        ('Source Information', {
            'fields': ['id', 'app', 'source', 'url', 'status', 'crawled_at']
        }),
        ('Content', {
            'fields': ['content_preview']
        }),
        ('Metadata', {
            'fields': ['metadata'],
            'classes': ['collapse'],
        }),
    ]

    def app_name(self, obj):
        """Display app name."""
        return obj.app.name_en
    app_name.short_description = 'App'
    app_name.admin_order_field = 'app__name_en'

    def char_count(self, obj):
        """Display character count."""
        count = len(obj.content) if obj.content else 0
        return f"{count:,}"
    char_count.short_description = 'Chars'

    def content_preview(self, obj):
        """Display content preview (first 500 chars)."""
        if obj.content:
            preview = obj.content[:500]
            if len(obj.content) > 500:
                preview += '...'
            return format_html('<pre style="white-space: pre-wrap; max-width: 800px;">{}</pre>', preview)
        return '-'
    content_preview.short_description = 'Content Preview'

    def has_add_permission(self, request):
        """Disable add - data is populated by crawler."""
        return False

    def has_change_permission(self, request, obj=None):
        """Disable edit - data is read-only."""
        return False
