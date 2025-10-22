"""
Ninja API schemas for Quranic Applications

Following ITQAN community standards using Django Ninja framework.
"""

from typing import List, Optional
from ninja import ModelSchema
from pydantic import BaseModel, Field


class CategorySchema(BaseModel):
    """Schema for category data."""
    id: int
    name_en: str = Field(..., alias="name_en")
    name_ar: str = Field(..., alias="name_ar")
    slug: str
    description_en: Optional[str] = Field(None, alias="description_en")
    description_ar: Optional[str] = Field(None, alias="description_ar")
    icon: Optional[str] = None

    class Config:
        populate_by_name = True


class DeveloperSchema(BaseModel):
    """Schema for developer data."""
    id: int
    name_en: str = Field(..., alias="name_en")
    name_ar: str = Field(..., alias="name_ar")
    website: Optional[str] = None
    logo: Optional[str] = None

    class Config:
        populate_by_name = True


class AppSchema(BaseModel):
    """Schema for detailed app data."""
    id: str
    name_en: str = Field(..., alias="name_en")
    name_ar: str = Field(..., alias="name_ar")
    slug: str
    short_description_en: str = Field(..., alias="short_description_en")
    short_description_ar: str = Field(..., alias="short_description_ar")
    description_en: str = Field(..., alias="description_en")
    description_ar: str = Field(..., alias="description_ar")
    application_icon: Optional[str] = None
    main_image_en: Optional[str] = Field(None, alias="main_image_en")
    main_image_ar: Optional[str] = Field(None, alias="main_image_ar")
    google_play_link: Optional[str] = None
    app_store_link: Optional[str] = None
    app_gallery_link: Optional[str] = None
    screenshots_en: List[str] = Field(default_factory=list, alias="screenshots_en")
    screenshots_ar: List[str] = Field(default_factory=list, alias="screenshots_ar")
    avg_rating: float
    review_count: int
    view_count: int
    sort_order: int
    featured: bool
    platform: str
    status: str
    developer: DeveloperSchema
    categories: List[CategorySchema]
    created_at: str
    updated_at: str

    class Config:
        populate_by_name = True


class AppListSchema(BaseModel):
    """Schema for app list data (optimized for list views)."""
    id: str
    name_en: str = Field(..., alias="name_en")
    name_ar: str = Field(..., alias="name_ar")
    slug: str
    short_description_en: str = Field(..., alias="short_description_en")
    short_description_ar: str = Field(..., alias="short_description_ar")
    application_icon: Optional[str] = None
    main_image_en: Optional[str] = Field(None, alias="main_image_en")
    main_image_ar: Optional[str] = Field(None, alias="main_image_ar")
    avg_rating: float
    review_count: int
    view_count: int
    sort_order: int
    featured: bool
    platform: str
    status: str
    developer: DeveloperSchema
    categories: List[str]  # Simplified for list view
    created_at: str

    class Config:
        populate_by_name = True


class AppCreateSchema(BaseModel):
    """Schema for creating new apps."""
    name_en: str = Field(..., alias="name_en")
    name_ar: str = Field(..., alias="name_ar")
    short_description_en: str = Field(..., alias="short_description_en")
    short_description_ar: str = Field(..., alias="short_description_ar")
    description_en: str = Field(..., alias="description_en")
    description_ar: str = Field(..., alias="description_ar")
    application_icon: Optional[str] = None
    main_image_en: Optional[str] = Field(None, alias="main_image_en")
    main_image_ar: Optional[str] = Field(None, alias="main_image_ar")
    google_play_link: Optional[str] = None
    app_store_link: Optional[str] = None
    app_gallery_link: Optional[str] = None
    screenshots_en: List[str] = Field(default_factory=list, alias="screenshots_en")
    screenshots_ar: List[str] = Field(default_factory=list, alias="screenshots_ar")
    platform: str = "cross_platform"
    featured: bool = False
    sort_order: int = 0
    categories: List[str] = Field(default_factory=list)
    developer_id: int

    class Config:
        populate_by_name = True


class AppUpdateSchema(BaseModel):
    """Schema for updating existing apps."""
    name_en: Optional[str] = Field(None, alias="name_en")
    name_ar: Optional[str] = Field(None, alias="name_ar")
    short_description_en: Optional[str] = Field(None, alias="short_description_en")
    short_description_ar: Optional[str] = Field(None, alias="short_description_ar")
    description_en: Optional[str] = Field(None, alias="description_en")
    description_ar: Optional[str] = Field(None, alias="description_ar")
    application_icon: Optional[str] = None
    main_image_en: Optional[str] = Field(None, alias="main_image_en")
    main_image_ar: Optional[str] = Field(None, alias="main_image_ar")
    google_play_link: Optional[str] = None
    app_store_link: Optional[str] = None
    app_gallery_link: Optional[str] = None
    screenshots_en: Optional[List[str]] = Field(None, alias="screenshots_en")
    screenshots_ar: Optional[List[str]] = Field(None, alias="screenshots_ar")
    platform: Optional[str] = None
    featured: Optional[bool] = None
    sort_order: Optional[int] = None
    categories: Optional[List[str]] = None
    developer_id: Optional[int] = None

    class Config:
        populate_by_name = True


# Pagination response schemas
class PaginatedAppListSchema(BaseModel):
    """Schema for paginated app list responses."""
    count: int
    next: Optional[str] = None
    previous: Optional[str] = None
    results: List[AppListSchema]