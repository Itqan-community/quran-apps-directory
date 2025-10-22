"""
API URL Routing for Quranic Applications

Routes for the apps API endpoints.
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import AppViewSet

router = DefaultRouter()
router.register(r'apps', AppViewSet, basename='app')

app_name = 'apps_api'

urlpatterns = [
    path('', include(router.urls)),
]
