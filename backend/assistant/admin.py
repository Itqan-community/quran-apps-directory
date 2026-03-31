from django.contrib import admin
from .models import AssistantConversation


@admin.register(AssistantConversation)
class AssistantConversationAdmin(admin.ModelAdmin):
    list_display = ['session_id', 'lang', 'selected_app', 'created_at']
    list_filter = ['lang', 'created_at']
    readonly_fields = ['session_id', 'created_at']
