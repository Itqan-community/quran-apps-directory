"""
URL configuration for quran_apps project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/4.2/topics/http/urls/
"""
from django.contrib import admin
from django.urls import path, include
from django.http import JsonResponse
from django.utils import timezone
from apps.api.urls import api as ninja_api
from apps.api.views import ScalarDocumentationView


def health_check(request):
    """
    Health check endpoint for deployment verification and monitoring.

    Returns:
        JSON response with status, service name, and timestamp
    """
    return JsonResponse({
        'status': 'healthy',
        'service': 'Quran Apps Directory API',
        'timestamp': str(timezone.now()),
        'version': '1.0.0',
    })


urlpatterns = [
    # Health check endpoint (for monitoring/load balancers)
    path('health/', health_check, name='health_check'),

    # Admin interface
    path('admin/', admin.site.urls),

    # API endpoints (Ninja API - versioned via HTTP headers)
    path('api/', ninja_api.urls),        # Apps & Categories API endpoints (Django Ninja)

    # Scalar API Documentation (Modern, beautiful docs)
    path('api/docs/', ScalarDocumentationView.as_view(), name='scalar-docs'),
]
