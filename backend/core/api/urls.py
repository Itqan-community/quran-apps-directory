"""
Core API URL configuration.

Provides centralized API routing with versioning support.
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .versioning import APIVersionInfoView

# Create API router
api_router = DefaultRouter()

# Register core API endpoints
api_router.register(r'version', APIVersionInfoView, basename='api-version')

app_name = 'core'

urlpatterns = [
    path('', include(api_router.urls)),
]