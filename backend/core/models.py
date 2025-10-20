import uuid
from django.db import models


class BaseModel(models.Model):
    """
    Abstract base model with UUID primary key and timestamp fields.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class PublishedModel(BaseModel):
    """
    Abstract model with status field for published content.
    """
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('published', 'Published'),
        ('archived', 'Archived'),
    ]

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='draft',
        db_index=True,
        help_text="Content status: draft, published, or archived"
    )

    class Meta:
        abstract = True
        indexes = [
            models.Index(fields=['status']),
        ]
