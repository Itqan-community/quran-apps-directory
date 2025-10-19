# US4.5: API Documentation with drf-spectacular/OpenAPI

**Epic:** Epic 4 - API Development & Integration
**Sprint:** Week 3, Day 4
**Story Points:** 3
**Priority:** P1
**Assigned To:** Backend Developer
**Status:** Not Started

---

## 📋 User Story

**As a** Frontend Developer or API Consumer
**I want** comprehensive, interactive API documentation
**So that** I can understand and test all endpoints without reading source code

---

## 🎯 Acceptance Criteria

### AC1: drf-spectacular UI Available
- [ ] drf-spectacular UI accessible at `/api/schema/swagger/`
- [ ] ReDoc available at `/api/schema/redoc/`
- [ ] Development environment: Always enabled
- [ ] Staging environment: Enabled
- [ ] Production environment: Disabled (security)
- [ ] Custom branding (Quran Apps Directory title, logo)

### AC2: Complete Endpoint Documentation
- [ ] All endpoints documented with:
  - Summary and description
  - Request parameters (path, query, body)
  - Response schemas (200, 400, 404, 500)
  - Example requests/responses
- [ ] Authentication requirements clearly marked

### AC3: Schema Definitions
- [ ] All DTOs defined in drf-spectacular
- [ ] Validation rules visible (required, min/max, regex)
- [ ] Example values provided
- [ ] Bilingual field structure documented

### AC4: Authentication Integration
- [ ] JWT Bearer auth scheme configured in drf-spectacular
- [ ] "Authorize" button functional
- [ ] Test requests with auth tokens

### AC5: OpenAPI JSON Export
- [ ] OpenAPI 3.0 JSON spec available at `/api/schema/`
- [ ] Can be imported into Postman
- [ ] Can be used for client SDK generation

### AC6: Response Examples
- [ ] Example responses for each endpoint
- [ ] Success and error scenarios
- [ ] Realistic sample data (Quran apps)

### AC7: Versioning Support
- [ ] API versioning documented (v1)
- [ ] Future versions planned (v2 placeholder)

---

## 📝 Technical Notes

### drf-spectacular Configuration (settings.py)
```python
# settings.py

INSTALLED_APPS = [
    # ...
    'drf_spectacular',
    'rest_framework',
    # ...
]

REST_FRAMEWORK = {
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 20,
}

SPECTACULAR_SETTINGS = {
    'TITLE': 'Quran Apps Directory API',
    'DESCRIPTION': 'RESTful API for managing Quran-related mobile applications',
    'VERSION': '1.0.0',
    'CONTACT': {
        'name': 'Abubakr Abduraghman',
        'email': 'a.abduraghman@itqan.dev',
        'url': 'https://quran-apps.itqan.dev',
    },
    'LICENSE': {
        'name': 'MIT License',
        'url': 'https://opensource.org/licenses/MIT',
    },
    'SECURITY': {
        'Bearer': {
            'type': 'http',
            'scheme': 'bearer',
            'bearerFormat': 'JWT',
        }
    },
    'SERVE_PERMISSIONS': ['rest_framework.permissions.IsAuthenticated'],
    'SWAGGER_UI_SETTINGS': {
        'deepLinking': True,
        'defaultModelsExpandDepth': 2,
        'presets': [
            'swagger-ui/swagger-ui-bundle.js',
            'swagger-ui/swagger-ui-standalone-preset.js',
        ],
    },
}

# urls.py
urlpatterns = [
    # ...
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/schema/swagger/', Spectaculardrf-spectacularView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/schema/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
    # ...
]
```

### ViewSet Documentation Examples
```python
class AppViewSet(viewsets.ModelViewSet):
    """
    API for Quran applications management.

    list:
    Returns a paginated list of all Quran apps with filtering and search.

    Query Parameters:
    - page: Page number (default: 1)
    - page_size: Items per page (default: 20, max: 100)
    - search: Search by name_en or name_ar
    - category: Filter by category ID

    Response:
    - 200: Paginated list of apps
    - 400: Invalid query parameters
    """
    queryset = App.objects.select_related('developer').prefetch_related('categories')
    serializer_class = AppSerializer
    pagination_class = PageNumberPagination
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['category']
    search_fields = ['name_en', 'name_ar']
    ordering_fields = ['created_at', 'apps_avg_rating']
    permission_classes = [IsAuthenticated]

    def retrieve(self, request, *args, **kwargs):
        """
        GET /api/apps/{id} - Retrieve a single app by ID

        Response:
        - 200: Complete app details including developer, categories
        - 404: App not found
        """
        return super().retrieve(request, *args, **kwargs)

    def create(self, request, *args, **kwargs):
        """
        POST /api/apps - Create a new app (requires authentication)

        Response:
        - 201: App created successfully
        - 400: Validation errors
        - 401: Unauthorized
        """
        return super().create(request, *args, **kwargs)
```

### Example Serializer with Examples
```python
class AppListSerializer(serializers.ModelSerializer):
    """
    Example:
    {
        "id": "a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d",
        "name_ar": "مصحف التجويد الملون",
        "name_en": "Tajweed Quran",
        "short_description_ar": "مصحف ملون بألوان التجويد",
        "short_description_en": "Color-coded Tajweed Quran",
        "application_icon": "https://cdn.example.com/icons/tajweed.png",
        "apps_avg_rating": 4.7,
        "categories": ["Reading", "Learning"]
    }
    """

    class Meta:
        model = App
        fields = ['id', 'name_ar', 'name_en', 'short_description_ar',
                 'short_description_en', 'application_icon', 'apps_avg_rating']
```

### Django settings.py Configuration for Docstrings
```python
# In settings.py, docstrings are automatically extracted from:
# 1. ViewSet class docstrings
# 2. Method docstrings in ViewSet
# 3. Serializer field help_text attributes
# No additional configuration needed - drf-spectacular auto-generates from docstrings
```

---

## 🔗 Dependencies
- US4.1, US4.2, US4.3: All endpoints implemented
- US4.4: Error handling (for error response examples)

---

## 📊 Definition of Done
- [ ] drf-spectacular UI accessible and branded
- [ ] All endpoints documented with XML comments
- [ ] Authentication integration working
- [ ] Example requests/responses provided
- [ ] OpenAPI JSON export available
- [ ] Postman collection importable
- [ ] Environment-specific configuration (disabled in prod)
- [ ] Documentation reviewed by team

---

**Created:** October 6, 2025  
**Owner:** Abubakr Abduraghman, a.abduraghman@itqan.dev  
**Epic:** [Epic 4: API Development](../epics/epic-4-api-development-integration.md)
