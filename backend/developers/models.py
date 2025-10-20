import uuid
from django.db import models
from core.models import BaseModel


class Developer(BaseModel):
    """
    Developer model for application developers/companies.
    """
    name_en = models.CharField(max_length=200, unique=True)
    name_ar = models.CharField(max_length=200, unique=True)
    website = models.URLField(blank=True, null=True)
    email = models.EmailField(blank=True, null=True)
    logo_url = models.URLField(blank=True, null=True, help_text="Developer/company logo URL")
    description_en = models.TextField(blank=True)
    description_ar = models.TextField(blank=True)
    contact_info = models.JSONField(default=dict, blank=True, help_text="Additional contact information")
    is_verified = models.BooleanField(default=False, db_index=True, help_text="Whether this developer is verified")
    social_links = models.JSONField(default=dict, blank=True, help_text="Social media links")

    class Meta:
        db_table = 'developers'
        ordering = ['name_en']
        indexes = [
            models.Index(fields=['name_en']),
            models.Index(fields=['is_verified']),
        ]

    def __str__(self):
        return f"{self.name_en} / {self.name_ar}"
