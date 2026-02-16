from django.contrib import admin
from django.utils.html import format_html
from .models import Developer


@admin.register(Developer)
class DeveloperAdmin(admin.ModelAdmin):
    """
    Admin interface for managing application developers.
    """
    list_display = [
        'logo_preview',
        'name_en',
        'name_ar',
        'email',
        'website_link',
        'app_count',
        'is_verified',
        'created_at',
    ]
    list_filter = [
        'is_verified',
        'created_at',
    ]
    search_fields = [
        'name_en',
        'name_ar',
        'email',
        'website',
        'description_en',
        'description_ar',
    ]
    readonly_fields = ['id', 'created_at', 'updated_at', 'logo_preview_large']

    fieldsets = [
        ('Basic Information', {
            'fields': [
                'id',
                'name_en',
                'name_ar',
                'is_verified',
            ]
        }),
        ('Contact Information', {
            'fields': [
                'email',
                'website',
                'contact_info',
            ]
        }),
        ('Descriptions', {
            'fields': [
                'description_en',
                'description_ar',
            ]
        }),
        ('Media & Social', {
            'fields': [
                'logo_url',
                'logo_preview_large',
                'social_links',
            ]
        }),
        ('Timestamps', {
            'fields': ['created_at', 'updated_at'],
            'classes': ['collapse'],
        }),
    ]

    ordering = ['name_en']

    def logo_preview(self, obj):
        """Display small logo preview in list view."""
        if obj.logo_url:
            return format_html(
                '<img src="{}" style="width: 40px; height: 40px; object-fit: contain;" />',
                obj.logo_url
            )
        return '-'
    logo_preview.short_description = 'Logo'

    def logo_preview_large(self, obj):
        """Display large logo preview in detail view."""
        if obj.logo_url:
            return format_html(
                '<img src="{}" style="max-width: 200px; max-height: 100px; object-fit: contain;" />',
                obj.logo_url
            )
        return '-'
    logo_preview_large.short_description = 'Logo Preview'

    def website_link(self, obj):
        """Display clickable website link."""
        if obj.website:
            return format_html(
                '<a href="{}" target="_blank">{}</a>',
                obj.website,
                obj.website[:50] + '...' if len(obj.website) > 50 else obj.website
            )
        return '-'
    website_link.short_description = 'Website'

    def app_count(self, obj):
        """Display number of apps by this developer."""
        return obj.apps.count()
    app_count.short_description = 'Apps'

    actions = ['verify_developers', 'unverify_developers']

    def verify_developers(self, request, queryset):
        """Mark selected developers as verified."""
        updated = queryset.update(is_verified=True)
        self.message_user(request, f'{updated} developers verified.')
    verify_developers.short_description = 'Verify selected developers'

    def unverify_developers(self, request, queryset):
        """Remove verified status from selected developers."""
        updated = queryset.update(is_verified=False)
        self.message_user(request, f'{updated} developers unverified.')
    unverify_developers.short_description = 'Unverify selected developers'
