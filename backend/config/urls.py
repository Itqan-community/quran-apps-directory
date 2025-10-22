"""
URL configuration for quran_apps project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/4.2/topics/http/urls/
"""
from django.contrib import admin
from django.urls import path, include
from django.http import JsonResponse
from django.utils import timezone
from drf_spectacular.views import SpectacularAPIView
from core.scalar_view import scalar_ui_view  # Modern Scalar UI


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

    # API endpoints (versioned via HTTP headers)
    path('api/', include('apps.api.urls')),        # Apps API endpoints
    path('api/', include('categories.urls')),      # Categories endpoints
    path('api/', include('developers.urls')),      # Developers endpoints

    # API Documentation
    # OpenAPI Schema endpoint (JSON)
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),

    # Scalar UI - Modern, beautiful API documentation
    path('api/docs/', scalar_ui_view, name='scalar-ui'),
]

# Root redirect to API documentation
from django.views.generic import RedirectView

urlpatterns += [
    path('', RedirectView.as_view(url='/api/docs/', permanent=False)),
]
