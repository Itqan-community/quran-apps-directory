from django.db import models
from pgvector.django import VectorField


class SearchEmbeddingCache(models.Model):
    """Cache for search query embeddings to avoid repeated Gemini API calls."""
    query_hash = models.CharField(max_length=64, unique=True, db_index=True)
    query_text = models.TextField()
    embedding = VectorField(dimensions=768)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'core_search_embedding_cache'

    def __str__(self):
        return f"EmbeddingCache: {self.query_text[:50]}"


class BaseModel(models.Model):
    """
    Abstract base model with BigAutoField primary key and timestamp fields.
    """
    id = models.BigAutoField(primary_key=True)
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
