import uuid
from django.db import models


class AssistantConversation(models.Model):
    session_id = models.UUIDField(default=uuid.uuid4, unique=True)
    answers = models.JSONField()
    result_app_ids = models.JSONField(default=list)
    selected_app = models.ForeignKey(
        'apps.App',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='assistant_conversations'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    lang = models.CharField(max_length=2, default='ar')

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Conversation {self.session_id} ({self.lang})"
