"""
URL configuration for quran_apps project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/4.2/topics/http/urls/
"""
from django.contrib import admin
from django.urls import path, include
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularSwaggerView,
)

urlpatterns = [
    # Admin
    path('admin/', admin.site.urls),

    # API v1 endpoints
    path('api/v1/', include('apps.urls')),
    path('api/v1/', include('categories.urls')),
    path('api/v1/', include('developers.urls')),

    # API Documentation
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
]

# Root redirect to API documentation (optional)
from django.views.generic import RedirectView

urlpatterns += [
    path('', RedirectView.as_view(url='/api/docs/', permanent=False)),
]
