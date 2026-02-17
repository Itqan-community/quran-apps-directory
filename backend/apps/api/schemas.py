"""
Ninja API schemas for Quranic Applications

Following ITQAN community standards using Django Ninja framework.
"""

from typing import List, Optional, Dict
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
    application_icon: str
    main_image_en: str = Field(..., alias="main_image_en")
    main_image_ar: str = Field(..., alias="main_image_ar")
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
    # Multi-filter fields
    riwayah: List[str] = Field(default_factory=list, description="Supported Quranic recitation styles")
    mushaf_type: List[str] = Field(default_factory=list, alias="mushaf_type", description="Supported Mushaf types")
    features: List[str] = Field(default_factory=list, description="App features")
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
    application_icon: str
    main_image_en: str = Field(..., alias="main_image_en")
    main_image_ar: str = Field(..., alias="main_image_ar")
    avg_rating: float
    review_count: int
    view_count: int
    sort_order: int
    featured: bool
    platform: str
    status: str
    # Multi-filter fields
    riwayah: List[str] = Field(default_factory=list, description="Supported Quranic recitation styles")
    mushaf_type: List[str] = Field(default_factory=list, alias="mushaf_type", description="Supported Mushaf types")
    features: List[str] = Field(default_factory=list, description="App features")
    developer: DeveloperSchema
    categories: List[str]  # Simplified for list view
    created_at: str
    ai_reasoning: Optional[str] = Field(None, description="AI explanation for search relevance")

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
    application_icon: str = Field(..., description="App icon (required)")
    main_image_en: str = Field(..., alias="main_image_en", description="Main cover image - English (required)")
    main_image_ar: str = Field(..., alias="main_image_ar", description="Main cover image - Arabic (required)")
    google_play_link: Optional[str] = None
    app_store_link: Optional[str] = None
    app_gallery_link: Optional[str] = None
    screenshots_en: List[str] = Field(default_factory=list, alias="screenshots_en")
    screenshots_ar: List[str] = Field(default_factory=list, alias="screenshots_ar")
    platform: str = "cross_platform"
    featured: bool = False
    sort_order: int = 0
    # Multi-filter fields
    riwayah: List[str] = Field(default_factory=list, description="Supported Quranic recitation styles")
    mushaf_type: List[str] = Field(default_factory=list, alias="mushaf_type", description="Supported Mushaf types")
    features: List[str] = Field(default_factory=list, description="App features")
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
    # Multi-filter fields
    riwayah: Optional[List[str]] = Field(None, description="Supported Quranic recitation styles")
    mushaf_type: Optional[List[str]] = Field(None, alias="mushaf_type", description="Supported Mushaf types")
    features: Optional[List[str]] = Field(None, description="App features")
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


# Metadata value schemas for filter dropdowns
class MetadataValueSchema(BaseModel):
    """Schema for a single metadata option."""
    value: str
    label_en: str = Field(..., alias="label_en")
    label_ar: str = Field(..., alias="label_ar")
    count: int = Field(0, description="Number of apps with this value")

    class Config:
        populate_by_name = True


class MetadataValuesResponseSchema(BaseModel):
    """Schema for all available metadata values."""
    platforms: List[MetadataValueSchema] = Field(default_factory=list)
    riwayah: List[MetadataValueSchema] = Field(default_factory=list)
    mushaf_type: List[MetadataValueSchema] = Field(default_factory=list, alias="mushaf_type")
    features: List[MetadataValueSchema] = Field(default_factory=list)

    class Config:
        populate_by_name = True


# ====================
# Smart Search Schemas (1.7)
# ====================

class MatchReasonSchema(BaseModel):
    """Schema for explaining why an app matched the search query."""
    type: str = Field(..., description="Match type: 'feature', 'riwayah', 'mushaf_type'")
    value: str = Field(..., description="The metadata value that matched")
    label_en: str = Field(..., alias="label_en", description="English label")
    label_ar: str = Field(..., alias="label_ar", description="Arabic label")

    class Config:
        populate_by_name = True


class FacetValueSchema(BaseModel):
    """Schema for a facet value with count."""
    value: str
    label_en: str = Field(..., alias="label_en")
    label_ar: str = Field(..., alias="label_ar")
    count: int

    class Config:
        populate_by_name = True


class HybridAppListSchema(BaseModel):
    """Schema for app in hybrid search results with match info."""
    id: str
    name_en: str = Field(..., alias="name_en")
    name_ar: str = Field(..., alias="name_ar")
    slug: str
    short_description_en: str = Field(..., alias="short_description_en")
    short_description_ar: str = Field(..., alias="short_description_ar")
    application_icon: str
    main_image_en: str = Field(..., alias="main_image_en")
    main_image_ar: str = Field(..., alias="main_image_ar")
    avg_rating: float
    review_count: int
    view_count: int
    sort_order: int
    featured: bool
    platform: str
    status: str
    # Metadata
    riwayah: List[str] = Field(default_factory=list)
    mushaf_type: List[str] = Field(default_factory=list, alias="mushaf_type")
    features: List[str] = Field(default_factory=list)
    developer: DeveloperSchema
    categories: List[str]
    created_at: str
    # Search-specific fields
    ai_reasoning: Optional[str] = Field(None, description="AI explanation for search relevance")
    match_reasons: List[MatchReasonSchema] = Field(default_factory=list, description="Why this app matched")
    relevance_score: Optional[float] = Field(None, description="Combined relevance score (0-1)")

    class Config:
        populate_by_name = True


class HybridSearchResponseSchema(BaseModel):
    """Schema for hybrid search response with facets."""
    count: int
    next: Optional[str] = None
    previous: Optional[str] = None
    results: List[HybridAppListSchema]
    facets: Dict[str, List[FacetValueSchema]] = Field(default_factory=dict, description="Filter facet counts")
    error: Optional[str] = Field(None, description="Error message if search provider failed")
    fallback_mode: bool = Field(False, description="True when embeddings failed and search fell back to keyword-only")

    class Config:
        populate_by_name = True