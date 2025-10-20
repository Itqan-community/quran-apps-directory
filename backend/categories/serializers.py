from rest_framework import serializers
from .models import Category


class CategorySerializer(serializers.ModelSerializer):
    """
    Serializer for Category model.
    """
    apps_count = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Category
        fields = [
            'id',
            'name_en',
            'name_ar',
            'description_en',
            'description_ar',
            'slug',
            'icon',
            'color',
            'sort_order',
            'is_active',
            'apps_count',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_apps_count(self, obj):
        """Get the count of published apps in this category."""
        return obj.apps.filter(status='published').count()


class CategoryListSerializer(serializers.ModelSerializer):
    """
    Lightweight serializer for category list views.
    """
    class Meta:
        model = Category
        fields = [
            'id',
            'name_en',
            'name_ar',
            'slug',
            'icon',
            'color',
            'sort_order',
        ]