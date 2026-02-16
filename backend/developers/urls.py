from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import DeveloperViewSet

router = DefaultRouter()
router.register(r'developers', DeveloperViewSet, basename='developer')

app_name = 'developers'

urlpatterns = [
    path('', include(router.urls)),
]