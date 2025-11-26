"""
Django Admin configuration for App Submissions.

Provides a rich interface for reviewing and managing app submissions
with custom actions for approval, rejection, and information requests.
"""
from django.contrib import admin
from django.utils.html import format_html
from django.utils import timezone
from django.urls import reverse
from django.http import HttpResponseRedirect
from django.contrib import messages
from django import forms

from .models import AppSubmission, SubmissionStatus, SubmissionStatusLog


class SubmissionStatusLogInline(admin.TabularInline):
    """Inline display of status change history."""
    model = SubmissionStatusLog
    extra = 0
    readonly_fields = ['from_status', 'to_status', 'changed_by', 'notes', 'created_at']
    can_delete = False

    def has_add_permission(self, request, obj=None):
        return False


class RejectForm(forms.Form):
    """Form for rejection reason."""
    rejection_reason = forms.CharField(
        widget=forms.Textarea(attrs={'rows': 4, 'cols': 60}),
        label='Rejection Reason',
        help_text='This message will be sent to the submitter.'
    )


class InfoRequestForm(forms.Form):
    """Form for information request message."""
    info_request_message = forms.CharField(
        widget=forms.Textarea(attrs={'rows': 4, 'cols': 60}),
        label='Information Request',
        help_text='Describe what additional information you need from the submitter.'
    )


@admin.register(AppSubmission)
class AppSubmissionAdmin(admin.ModelAdmin):
    """Admin configuration for App Submissions."""

    list_display = [
        'tracking_id',
        'icon_preview',
        'app_name_en',
        'app_name_ar',
        'submitter_email',
        'status_badge',
        'categories_display',
        'has_store_links',
        'created_at',
    ]

    list_filter = [
        'status',
        'is_developer',
        'categories',
        'created_at',
    ]

    search_fields = [
        'tracking_id',
        'app_name_en',
        'app_name_ar',
        'submitter_name',
        'submitter_email',
        'developer_name_en',
        'developer_name_ar',
    ]

    readonly_fields = [
        'tracking_id',
        'created_at',
        'updated_at',
        'reviewed_at',
        'reviewed_by',
        'created_app_link',
        'icon_preview_large',
        'screenshots_preview_en',
        'screenshots_preview_ar',
    ]

    fieldsets = [
        ('Tracking & Status', {
            'fields': (
                'tracking_id',
                'status',
                'created_at',
                'updated_at',
            )
        }),
        ('Contact Information', {
            'fields': (
                'submitter_name',
                'submitter_email',
                'submitter_phone',
                'submitter_organization',
                'is_developer',
            )
        }),
        ('App Details (English)', {
            'fields': (
                'app_name_en',
                'short_description_en',
                'description_en',
            )
        }),
        ('App Details (Arabic)', {
            'fields': (
                'app_name_ar',
                'short_description_ar',
                'description_ar',
            ),
            'classes': ('collapse',)
        }),
        ('Store Links', {
            'fields': (
                'google_play_link',
                'app_store_link',
                'app_gallery_link',
                'website_link',
            )
        }),
        ('Categories', {
            'fields': ('categories',)
        }),
        ('Developer Information', {
            'fields': (
                'developer_name_en',
                'developer_name_ar',
                'developer_website',
                'developer_email',
            )
        }),
        ('Media', {
            'fields': (
                'app_icon_url',
                'icon_preview_large',
                'screenshots_en',
                'screenshots_preview_en',
                'screenshots_ar',
                'screenshots_preview_ar',
            )
        }),
        ('Additional Information', {
            'fields': (
                'additional_notes',
                'content_confirmation',
            )
        }),
        ('Review', {
            'fields': (
                'admin_notes',
                'rejection_reason',
                'info_request_message',
                'reviewed_by',
                'reviewed_at',
                'created_app_link',
            )
        }),
    ]

    filter_horizontal = ['categories']
    date_hierarchy = 'created_at'
    list_per_page = 25

    actions = ['mark_under_review', 'approve_submissions', 'reject_submissions', 'request_info']

    def icon_preview(self, obj):
        """Display small icon preview in list view."""
        if obj.app_icon_url:
            return format_html(
                '<img src="{}" style="width: 40px; height: 40px; object-fit: cover; border-radius: 8px;" />',
                obj.app_icon_url
            )
        return '-'
    icon_preview.short_description = 'Icon'

    def icon_preview_large(self, obj):
        """Display larger icon preview in detail view."""
        if obj.app_icon_url:
            return format_html(
                '<img src="{}" style="width: 100px; height: 100px; object-fit: cover; border-radius: 12px;" />',
                obj.app_icon_url
            )
        return 'No icon uploaded'
    icon_preview_large.short_description = 'Icon Preview'

    def screenshots_preview_en(self, obj):
        """Display English screenshots preview."""
        if obj.screenshots_en:
            html = '<div style="display: flex; gap: 10px; flex-wrap: wrap;">'
            for url in obj.screenshots_en[:5]:
                html += f'<img src="{url}" style="height: 150px; border-radius: 4px; border: 1px solid #ddd;" />'
            if len(obj.screenshots_en) > 5:
                html += f'<div style="display: flex; align-items: center;">+{len(obj.screenshots_en) - 5} more</div>'
            html += '</div>'
            return format_html(html)
        return 'No screenshots'
    screenshots_preview_en.short_description = 'English Screenshots'

    def screenshots_preview_ar(self, obj):
        """Display Arabic screenshots preview."""
        if obj.screenshots_ar:
            html = '<div style="display: flex; gap: 10px; flex-wrap: wrap;">'
            for url in obj.screenshots_ar[:5]:
                html += f'<img src="{url}" style="height: 150px; border-radius: 4px; border: 1px solid #ddd;" />'
            if len(obj.screenshots_ar) > 5:
                html += f'<div style="display: flex; align-items: center;">+{len(obj.screenshots_ar) - 5} more</div>'
            html += '</div>'
            return format_html(html)
        return 'No screenshots'
    screenshots_preview_ar.short_description = 'Arabic Screenshots'

    def status_badge(self, obj):
        """Display colored status badge."""
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 10px; '
            'border-radius: 10px; font-size: 11px; font-weight: bold;">{}</span>',
            obj.status_display_color,
            obj.get_status_display()
        )
    status_badge.short_description = 'Status'
    status_badge.admin_order_field = 'status'

    def categories_display(self, obj):
        """Display categories as comma-separated list."""
        return ', '.join([c.name_en for c in obj.categories.all()[:3]])
    categories_display.short_description = 'Categories'

    def has_store_links(self, obj):
        """Show checkmark if at least one store link exists."""
        if obj.has_store_link:
            return format_html('<span style="color: green;">✓</span>')
        return format_html('<span style="color: red;">✗</span>')
    has_store_links.short_description = 'Store Links'

    def created_app_link(self, obj):
        """Link to the created app if approved."""
        if obj.created_app:
            url = reverse('admin:apps_app_change', args=[obj.created_app.id])
            return format_html('<a href="{}">{}</a>', url, obj.created_app.name_en)
        return 'Not yet created'
    created_app_link.short_description = 'Created App'

    def log_status_change(self, obj, from_status, to_status, user, notes=''):
        """Create a status log entry."""
        SubmissionStatusLog.objects.create(
            submission=obj,
            from_status=from_status,
            to_status=to_status,
            changed_by=user,
            notes=notes
        )

    @admin.action(description='Mark selected as Under Review')
    def mark_under_review(self, request, queryset):
        """Mark submissions as under review."""
        updated = 0
        for obj in queryset.filter(status=SubmissionStatus.PENDING):
            old_status = obj.status
            obj.status = SubmissionStatus.UNDER_REVIEW
            obj.save()
            self.log_status_change(obj, old_status, obj.status, request.user)
            updated += 1
        self.message_user(request, f'{updated} submission(s) marked as under review.')

    @admin.action(description='Approve selected submissions')
    def approve_submissions(self, request, queryset):
        """Approve submissions and create App records."""
        from submissions.services.submission_service import SubmissionService

        service = SubmissionService()
        approved = 0
        errors = []

        for obj in queryset.exclude(status=SubmissionStatus.APPROVED):
            try:
                service.approve_submission(obj, request.user)
                approved += 1
            except Exception as e:
                errors.append(f"{obj.tracking_id}: {str(e)}")

        if approved:
            self.message_user(request, f'{approved} submission(s) approved and apps created.')
        if errors:
            self.message_user(request, f'Errors: {"; ".join(errors)}', level=messages.ERROR)

    @admin.action(description='Reject selected submissions')
    def reject_submissions(self, request, queryset):
        """Reject submissions with a reason."""
        # This action needs custom handling for the rejection reason
        # For now, show a message directing to individual review
        self.message_user(
            request,
            'Please reject submissions individually to provide specific rejection reasons.',
            level=messages.WARNING
        )

    @admin.action(description='Request more information')
    def request_info(self, request, queryset):
        """Request additional information from submitters."""
        self.message_user(
            request,
            'Please request information individually to provide specific details.',
            level=messages.WARNING
        )

    def save_model(self, request, obj, form, change):
        """
        Override save to track reviewer/status changes and flag auto-approve.

        The actual creation of the App (when status -> approved) happens in
        save_related so M2M fields (categories) are already saved.
        """
        obj._auto_approve = False          # temp flag used in save_related
        obj._desired_status = obj.status   # track target status for clarity

        if change:
            old_obj = AppSubmission.objects.get(pk=obj.pk)
            status_changed = old_obj.status != obj.status

            # Auto-approve path: defer status change & let service handle full workflow
            if (
                status_changed
                and obj.status == SubmissionStatus.APPROVED
                and not obj.created_app_id
            ):
                obj._auto_approve = True
                obj._original_status = old_obj.status
                obj.status = old_obj.status  # keep DB status unchanged until service runs

            # Regular status change (not auto-approve)
            elif status_changed:
                obj.reviewed_by = request.user
                obj.reviewed_at = timezone.now()
                self.log_status_change(old_obj, old_obj.status, obj.status, request.user)

        super().save_model(request, obj, form, change)

    def save_related(self, request, form, formsets, change):
        """
        After the submission and its M2M fields are saved, auto-approve when needed.
        """
        super().save_related(request, form, formsets, change)

        obj = form.instance
        if getattr(obj, "_auto_approve", False):
            from submissions.services.submission_service import SubmissionService

            service = SubmissionService()
            try:
                app = service.approve_submission(obj, request.user)
                messages.success(
                    request,
                    f'Submission approved! App "{app.name_en}" has been created and published.'
                )
            except Exception as e:
                messages.error(request, f'Error auto-approving submission: {str(e)}')
            finally:
                obj._auto_approve = False

    def get_urls(self):
        """Add custom URLs for approve/reject/request-info actions."""
        from django.urls import path
        urls = super().get_urls()
        custom_urls = [
            path(
                '<int:submission_id>/approve/',
                self.admin_site.admin_view(self.approve_view),
                name='submissions_appsubmission_approve'
            ),
            path(
                '<int:submission_id>/reject/',
                self.admin_site.admin_view(self.reject_view),
                name='submissions_appsubmission_reject'
            ),
            path(
                '<int:submission_id>/request-info/',
                self.admin_site.admin_view(self.request_info_view),
                name='submissions_appsubmission_request_info'
            ),
        ]
        return custom_urls + urls

    def approve_view(self, request, submission_id):
        """Handle individual approval."""
        from submissions.services.submission_service import SubmissionService

        obj = AppSubmission.objects.get(pk=submission_id)
        service = SubmissionService()

        try:
            app = service.approve_submission(obj, request.user)
            messages.success(
                request,
                f'Submission approved! App "{app.name_en}" has been created and published.'
            )
            return HttpResponseRedirect(reverse('admin:apps_app_change', args=[app.id]))
        except Exception as e:
            messages.error(request, f'Error approving submission: {str(e)}')
            return HttpResponseRedirect(
                reverse('admin:submissions_appsubmission_change', args=[submission_id])
            )

    def reject_view(self, request, submission_id):
        """Handle individual rejection with reason form."""
        from submissions.services.submission_service import SubmissionService

        obj = AppSubmission.objects.get(pk=submission_id)

        if request.method == 'POST':
            form = RejectForm(request.POST)
            if form.is_valid():
                service = SubmissionService()
                service.reject_submission(
                    obj,
                    request.user,
                    form.cleaned_data['rejection_reason']
                )
                messages.success(request, f'Submission {obj.tracking_id} has been rejected.')
                return HttpResponseRedirect(
                    reverse('admin:submissions_appsubmission_changelist')
                )
        else:
            form = RejectForm()

        context = {
            'form': form,
            'submission': obj,
            'title': f'Reject Submission: {obj.tracking_id}',
            'opts': self.model._meta,
        }
        from django.shortcuts import render
        return render(request, 'admin/submissions/reject_form.html', context)

    def request_info_view(self, request, submission_id):
        """Handle individual info request with message form."""
        from submissions.services.submission_service import SubmissionService

        obj = AppSubmission.objects.get(pk=submission_id)

        if request.method == 'POST':
            form = InfoRequestForm(request.POST)
            if form.is_valid():
                service = SubmissionService()
                service.request_info(
                    obj,
                    request.user,
                    form.cleaned_data['info_request_message']
                )
                messages.success(
                    request,
                    f'Information request sent for {obj.tracking_id}.'
                )
                return HttpResponseRedirect(
                    reverse('admin:submissions_appsubmission_changelist')
                )
        else:
            form = InfoRequestForm()

        context = {
            'form': form,
            'submission': obj,
            'title': f'Request Information: {obj.tracking_id}',
            'opts': self.model._meta,
        }
        from django.shortcuts import render
        return render(request, 'admin/submissions/info_request_form.html', context)

    def change_view(self, request, object_id, form_url='', extra_context=None):
        """Add action buttons to the change view."""
        extra_context = extra_context or {}
        obj = self.get_object(request, object_id)

        if obj:
            extra_context['show_approve_button'] = obj.status in [
                SubmissionStatus.PENDING,
                SubmissionStatus.UNDER_REVIEW,
                SubmissionStatus.INFO_REQUESTED
            ]
            extra_context['show_reject_button'] = obj.status not in [
                SubmissionStatus.APPROVED,
                SubmissionStatus.REJECTED
            ]
            extra_context['show_request_info_button'] = obj.status in [
                SubmissionStatus.PENDING,
                SubmissionStatus.UNDER_REVIEW
            ]

        return super().change_view(request, object_id, form_url, extra_context)


@admin.register(SubmissionStatusLog)
class SubmissionStatusLogAdmin(admin.ModelAdmin):
    """Admin for viewing status change logs."""
    list_display = ['submission', 'from_status', 'to_status', 'changed_by', 'created_at']
    list_filter = ['to_status', 'created_at']
    search_fields = ['submission__tracking_id', 'notes']
    readonly_fields = ['submission', 'from_status', 'to_status', 'changed_by', 'notes', 'created_at']

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
