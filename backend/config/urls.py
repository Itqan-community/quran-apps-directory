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

    This is a liveness probe - confirms the application is running.
    By default, it does NOT check database connectivity to avoid latency.

    Query Parameters:
        check_db (optional): If 'true', performs database connectivity check

    Returns:
        JSON response with status, service name, timestamp, and version.
        Optionally includes database_status if check_db=true

    Status Codes:
        200: Healthy
        503: Unhealthy (database unreachable if check_db=true)
    """
    response_data = {
        'status': 'healthy',
        'service': 'Quran Apps Directory API',
        'timestamp': str(timezone.now()),
        'version': '1.0.0',
    }

    # Optional database connectivity check
    check_db = request.GET.get('check_db', '').lower() == 'true'
    status_code = 200

    if check_db:
        try:
            from django.db import connection
            # Attempt a simple database connection
            connection.ensure_connection()
            response_data['database_status'] = 'connected'
        except Exception as e:
            response_data['database_status'] = 'disconnected'
            response_data['status'] = 'unhealthy'
            status_code = 503

    return JsonResponse(response_data, status=status_code)


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
