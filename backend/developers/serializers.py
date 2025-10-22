from typing import List, Dict, Any
from rest_framework import serializers
from .models import Developer


class DeveloperSerializer(serializers.ModelSerializer):
    """
    Serializer for Developer model.
    """
    apps_count = serializers.SerializerMethodField(read_only=True)
    apps = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Developer
        fields = [
            'id',
            'name_en',
            'name_ar',
            'website',
            'email',
            'logo_url',
            'description_en',
            'description_ar',
            'contact_info',
            'is_verified',
            'social_links',
            'apps_count',
            'apps',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_apps_count(self, obj) -> int:
        """Get the count of published apps by this developer."""
        return obj.apps.filter(status='published').count()

    def get_apps(self, obj) -> List[Dict[str, Any]]:
        """Get a list of published apps by this developer (limited)."""
        apps = obj.apps.filter(status='published').order_by('-featured', 'sort_order')[:5]
        return [
            {
                'id': str(app.id),
                'name_en': app.name_en,
                'name_ar': app.name_ar,
                'slug': app.slug,
                'application_icon': app.application_icon,
                'avg_rating': app.avg_rating,
            }
            for app in apps
        ]


class DeveloperListSerializer(serializers.ModelSerializer):
    """
    Lightweight serializer for developer list views.
    """
    class Meta:
        model = Developer
        fields = [
            'id',
            'name_en',
            'name_ar',
            'logo_url',
            'is_verified',
        ]