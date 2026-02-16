from django.contrib import admin
from django.utils.html import format_html
from .models import Category


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    """
    Admin interface for managing application categories.
    """
    list_display = [
        'color_badge',
        'icon_preview',
        'name_en',
        'name_ar',
        'slug',
        'app_count',
        'sort_order',
        'is_active',
        'created_at',
    ]
    list_filter = [
        'is_active',
        'created_at',
    ]
    search_fields = [
        'name_en',
        'name_ar',
        'slug',
        'description_en',
        'description_ar',
    ]
    prepopulated_fields = {'slug': ('name_en',)}
    readonly_fields = ['id', 'created_at', 'updated_at', 'icon_preview_large', 'color_preview']

    fieldsets = [
        ('Basic Information', {
            'fields': [
                'id',
                'name_en',
                'name_ar',
                'slug',
                'is_active',
            ]
        }),
        ('Descriptions', {
            'fields': [
                'description_en',
                'description_ar',
            ]
        }),
        ('Visual', {
            'fields': [
                'icon',
                'icon_preview_large',
                'color',
                'color_preview',
                'sort_order',
            ]
        }),
        ('Timestamps', {
            'fields': ['created_at', 'updated_at'],
            'classes': ['collapse'],
        }),
    ]

    ordering = ['sort_order', 'name_en']

    def color_badge(self, obj):
        """Display color badge in list view."""
        if obj.color:
            return format_html(
                '<div style="width: 20px; height: 20px; background-color: {}; border-radius: 4px; border: 1px solid #ccc;"></div>',
                obj.color
            )
        return '-'
    color_badge.short_description = 'Color'

    def color_preview(self, obj):
        """Display color preview in detail view."""
        if obj.color:
            return format_html(
                '<div style="width: 100px; height: 50px; background-color: {}; border-radius: 8px; border: 2px solid #ccc; display: inline-block;"></div> <span style="margin-left: 10px; font-weight: bold;">{}</span>',
                obj.color,
                obj.color
            )
        return '-'
    color_preview.short_description = 'Color Preview'

    def icon_preview(self, obj):
        """Display small icon preview in list view."""
        if obj.icon:
            return format_html(
                '<img src="{}" style="width: 24px; height: 24px;" />',
                obj.icon
            )
        return '-'
    icon_preview.short_description = 'Icon'

    def icon_preview_large(self, obj):
        """Display large icon preview in detail view."""
        if obj.icon:
            return format_html(
                '<img src="{}" style="width: 64px; height: 64px;" />',
                obj.icon
            )
        return '-'
    icon_preview_large.short_description = 'Icon Preview'

    def app_count(self, obj):
        """Display number of apps in this category."""
        return obj.apps.count()
    app_count.short_description = 'Apps'

    actions = ['activate_categories', 'deactivate_categories']

    def activate_categories(self, request, queryset):
        """Activate selected categories."""
        updated = queryset.update(is_active=True)
        self.message_user(request, f'{updated} categories activated.')
    activate_categories.short_description = 'Activate selected categories'

    def deactivate_categories(self, request, queryset):
        """Deactivate selected categories."""
        updated = queryset.update(is_active=False)
        self.message_user(request, f'{updated} categories deactivated.')
    deactivate_categories.short_description = 'Deactivate selected categories'
