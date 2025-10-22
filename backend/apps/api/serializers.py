"""
API Serializers for Quranic Applications

Serializers for converting App, Category, and Developer models to/from JSON.
"""

from rest_framework import serializers
from apps.models import App
from categories.serializers import CategoryListSerializer
from developers.serializers import DeveloperListSerializer


class AppListSerializer(serializers.ModelSerializer):
    """
    Lightweight serializer for app list views.
    """
    developer_name = serializers.CharField(source='developer.name_en', read_only=True)
    developer_name_ar = serializers.CharField(source='developer.name_ar', read_only=True)
    categories = CategoryListSerializer(many=True, read_only=True)
    rating_display = serializers.ReadOnlyField()

    class Meta:
        model = App
        fields = [
            'id',
            'name_en',
            'name_ar',
            'slug',
            'short_description_en',
            'short_description_ar',
            'application_icon',
            'main_image_en',
            'main_image_ar',
            'screenshots_en',
            'screenshots_ar',
            'avg_rating',
            'rating_display',
            'review_count',
            'view_count',
            'featured',
            'platform',
            'developer_name',
            'developer_name_ar',
            'categories',
            'sort_order',
        ]


class AppDetailSerializer(serializers.ModelSerializer):
    """
    Detailed serializer for app detail views.
    """
    developer = DeveloperListSerializer(read_only=True)
    categories = CategoryListSerializer(many=True, read_only=True)
    rating_display = serializers.ReadOnlyField()

    class Meta:
        model = App
        fields = [
            'id',
            'name_en',
            'name_ar',
            'slug',
            'short_description_en',
            'short_description_ar',
            'description_en',
            'description_ar',
            'application_icon',
            'main_image_en',
            'main_image_ar',
            'google_play_link',
            'app_store_link',
            'app_gallery_link',
            'screenshots_en',
            'screenshots_ar',
            'avg_rating',
            'rating_display',
            'review_count',
            'view_count',
            'featured',
            'platform',
            'sort_order',
            'status',
            'developer',
            'categories',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'view_count']


class AppCreateUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating and updating apps (admin use).
    """
    categories = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset='categories.Category.objects.all()',
        write_only=True
    )

    class Meta:
        model = App
        fields = [
            'name_en',
            'name_ar',
            'short_description_en',
            'short_description_ar',
            'description_en',
            'description_ar',
            'application_icon',
            'main_image_en',
            'main_image_ar',
            'google_play_link',
            'app_store_link',
            'app_gallery_link',
            'screenshots_en',
            'screenshots_ar',
            'avg_rating',
            'review_count',
            'platform',
            'sort_order',
            'status',
            'featured',
            'developer',
            'categories',
        ]

    def create(self, validated_data):
        categories = validated_data.pop('categories', [])
        app = App.objects.create(**validated_data)
        app.categories.set(categories)
        return app

    def update(self, instance, validated_data):
        categories = validated_data.pop('categories', None)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if categories is not None:
            instance.categories.set(categories)

        return instance
