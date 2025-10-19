# US4.2: Implement Categories & Developers Endpoints

**Epic:** Epic 4 - API Development & Integration  
**Sprint:** Week 3, Day 2  
**Story Points:** 5  
**Priority:** P0  
**Assigned To:** Backend Developer  
**Status:** Not Started

---

## 📋 User Story

**As a** Frontend Developer  
**I want** API endpoints for categories and developers  
**So that** I can display filtered lists, category chips, and developer profiles

---

## 🎯 Acceptance Criteria

### AC1: GET /api/categories - List All Categories
- [ ] Returns all categories (no pagination needed - only 11)
- [ ] Includes both Arabic and English names
- [ ] Includes app count per category
- [ ] HTTP 200 on success
- [ ] Response format:
```json
{
  "categories": [
    {
      "id": "uuid",
      "nameAr": "القراءة",
      "nameEn": "Reading",
      "appCount": 15
    }
  ]
}
```

### AC2: GET /api/categories/{id}/apps - Apps by Category
- [ ] Returns paginated apps for specific category
- [ ] Supports same pagination as /api/apps
- [ ] HTTP 200 on success
- [ ] HTTP 404 if category not found

### AC3: GET /api/developers - List All Developers
- [ ] Returns paginated list of developers
- [ ] Includes app count per developer
- [ ] Supports search by name
- [ ] HTTP 200 on success

### AC4: GET /api/developers/{id} - Get Single Developer
- [ ] Returns developer details
- [ ] Includes list of their apps
- [ ] HTTP 200 on success
- [ ] HTTP 404 if not found

### AC5: GET /api/developers/{id}/apps - Apps by Developer
- [ ] Returns all apps by specific developer
- [ ] Paginated response
- [ ] HTTP 200 on success

### AC6: POST /api/categories - Create Category (Admin)
- [ ] Requires admin authentication
- [ ] Validates bilingual names
- [ ] HTTP 201 on success
- [ ] HTTP 400 for validation errors

### AC7: PUT /api/developers/{id} - Update Developer
- [ ] Requires authentication (developer or admin)
- [ ] Updates developer profile
- [ ] HTTP 200 on success

---

## 📝 Technical Notes

### CategoriesViewSet
```python
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from django_filters.rest_framework import DjangoFilterBackend

class CategoriesViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.annotate(app_count=Count('apps'))
    serializer_class = CategorySerializer
    filter_backends = [DjangoFilterBackend]
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=['get'])
    def list_all(self, request):
        """
        GET /api/categories - Returns all categories with app counts
        """
        categories = self.get_queryset()
        serializer = self.get_serializer(categories, many=True)
        return Response({"categories": serializer.data})

    @action(detail=True, methods=['get'])
    def apps(self, request, pk=None):
        """
        GET /api/categories/{id}/apps - Returns paginated apps for category
        """
        category = self.get_object()
        apps = category.apps.all()

        paginator = PageNumberPagination()
        paginated_apps = paginator.paginate_queryset(apps, request)

        serializer = AppSerializer(paginated_apps, many=True)
        return paginator.get_paginated_response(serializer.data)

    def create(self, request, *args, **kwargs):
        """
        POST /api/categories - Create category (admin only)
        """
        if not request.user.is_staff:
            return Response(
                {"detail": "Admin access required"},
                status=status.HTTP_403_FORBIDDEN
            )
        return super().create(request, *args, **kwargs)
```

### DevelopersViewSet
```python
class DevelopersViewSet(viewsets.ModelViewSet):
    queryset = Developer.objects.annotate(app_count=Count('apps'))
    serializer_class = DeveloperSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter]
    search_fields = ['name_ar', 'name_en']
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        """Use different serializers for list vs detail views"""
        if self.action == 'retrieve':
            return DeveloperDetailSerializer
        return DeveloperListSerializer

    @action(detail=True, methods=['get'])
    def apps(self, request, pk=None):
        """
        GET /api/developers/{id}/apps - Returns paginated apps by developer
        """
        developer = self.get_object()
        apps = developer.apps.all()

        paginator = PageNumberPagination()
        paginated_apps = paginator.paginate_queryset(apps, request)

        serializer = AppSerializer(paginated_apps, many=True)
        return paginator.get_paginated_response(serializer.data)

    def update(self, request, *args, **kwargs):
        """
        PUT /api/developers/{id} - Update developer (auth required)
        """
        developer = self.get_object()

        # Check permissions: must be developer owner or admin
        if not (request.user == developer.user or request.user.is_staff):
            return Response(
                {"detail": "Insufficient permissions"},
                status=status.HTTP_403_FORBIDDEN
            )

        return super().update(request, *args, **kwargs)
```

### Django Serializers
```python
class CategorySerializer(serializers.ModelSerializer):
    app_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Category
        fields = ['id', 'name_ar', 'name_en', 'app_count']


class DeveloperListSerializer(serializers.ModelSerializer):
    app_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Developer
        fields = ['id', 'name_ar', 'name_en', 'logo_url', 'app_count']


class DeveloperDetailSerializer(serializers.ModelSerializer):
    app_count = serializers.IntegerField(read_only=True)
    apps = AppSerializer(many=True, read_only=True)

    class Meta:
        model = Developer
        fields = ['id', 'name_ar', 'name_en', 'website', 'email',
                 'logo_url', 'app_count', 'apps', 'created_at']
```

---

## 🔗 Dependencies
- US4.1: Core Apps Endpoints

---

## 📊 Definition of Done
- [ ] All 7 endpoints implemented
- [ ] DTOs created
- [ ] Authentication/authorization working
- [ ] drf-spectacular documentation updated
- [ ] Unit tests written
- [ ] Integration tests pass

---

**Created:** October 6, 2025  
**Owner:** Abubakr Abduraghman, a.abduraghman@itqan.dev  
**Epic:** [Epic 4: API Development](../epics/epic-4-api-development-integration.md)
