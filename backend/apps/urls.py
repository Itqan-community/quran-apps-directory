from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import AppViewSet

router = DefaultRouter()
router.register(r'apps', AppViewSet, basename='app')

app_name = 'apps'

urlpatterns = [
    path('', include(router.urls)),
]