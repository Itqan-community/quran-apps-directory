from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import CategoryViewSet

router = DefaultRouter()
router.register(r'categories', CategoryViewSet, basename='category')

app_name = 'categories'

urlpatterns = [
    path('', include(router.urls)),
]