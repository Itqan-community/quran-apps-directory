import uuid
from django.db import models
from django.utils.text import slugify
from core.models import BaseModel


class Category(BaseModel):
    """
    Category model for organizing Quranic applications.
    """
    name_en = models.CharField(max_length=100, unique=True)
    name_ar = models.CharField(max_length=100, unique=True)
    description_en = models.TextField(blank=True)
    description_ar = models.TextField(blank=True)
    slug = models.SlugField(max_length=120, unique=True, db_index=True)
    icon = models.URLField(blank=True, null=True, help_text="Icon URL for the category")
    color = models.CharField(max_length=7, blank=True, help_text="Hex color code for the category")
    sort_order = models.PositiveIntegerField(default=0, help_text="Order for displaying categories")
    is_active = models.BooleanField(default=True, db_index=True)

    class Meta:
        db_table = 'categories'
        verbose_name_plural = 'Categories'
        ordering = ['sort_order', 'name_en']
        indexes = [
            models.Index(fields=['slug']),
            models.Index(fields=['is_active']),
            models.Index(fields=['sort_order']),
        ]

    def __str__(self):
        return f"{self.name_en} / {self.name_ar}"

    def save(self, *args, **kwargs):
        if not self.slug:
            # Generate slug from English name
            self.slug = slugify(self.name_en)
        super().save(*args, **kwargs)
