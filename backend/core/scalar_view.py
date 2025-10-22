"""
Scalar UI Integration for OpenAPI Documentation

Provides a custom view for serving Scalar UI as a modern alternative to Swagger UI.
"""

from django.http import HttpResponse
from django.views import View
from django.utils.safestring import mark_safe
from django.middleware.csrf import get_token


class ScalarUIView(View):
    """
    View to serve Scalar UI for API documentation.

    Scalar is a modern, beautiful API documentation tool that supports OpenAPI 3.0+ and AsyncAPI.
    """

    def get(self, request, *args, **kwargs):
        """
        Render Scalar UI with the OpenAPI schema.

        The OpenAPI schema URL is expected to be passed as a URL parameter or can be hardcoded.
        Uses absolute URL to ensure proper schema loading.
        """
        # Get schema URL - use absolute URL for proper loading
        schema_url = request.GET.get('url', request.build_absolute_uri('/api/schema/'))

        # Ensure the URL is absolute (fallback for edge cases)
        if not schema_url.startswith('http'):
            schema_url = request.build_absolute_uri(schema_url)

        html_content = f'''
<!DOCTYPE html>
<html>
  <head>
    <title>Quran Apps Directory API - Scalar UI</title>
    <meta charset="utf-8"/>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      body {{
        margin: 0;
        padding: 0;
      }}
    </style>
  </head>
  <body>
    <script
      id="api-reference"
      data-url="{schema_url}"
      data-configuration='{{"theme":"purple"}}'
    ></script>
    <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>
  </body>
</html>
'''
        return HttpResponse(mark_safe(html_content), content_type='text/html')


scalar_ui_view = ScalarUIView.as_view()
