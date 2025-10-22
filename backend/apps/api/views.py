"""
Scalar API Documentation View

Modern Scalar UI for Django Ninja API documentation.
"""

from django.http import JsonResponse
from django.views.generic import TemplateView
from django.conf import settings
import json


class ScalarDocumentationView(TemplateView):
    """Scalar API Documentation View."""

    template_name = "scalar_docs.html"

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)

        # Get OpenAPI spec from Ninja API
        from .urls import api
        openapi_spec = api.get_openapi_schema()

        context.update({
            'title': 'Quran Apps API Documentation',
            'spec_url': '/api/openapi.json',
            'openapi_spec': json.dumps(openapi_spec, indent=2),
        })
        return context


def scalar_spec_json(request):
    """Return OpenAPI specification for Scalar UI."""
    from .urls import api
    spec = api.get_openapi_schema()
    return JsonResponse(spec)