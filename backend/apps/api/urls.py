"""
Ninja API URL routing for Quranic Applications

Following ITQAN community standards using Django Ninja framework.
"""

from django.core.cache import cache
from ninja import NinjaAPI, Router
from .controllers import router as apps_router, get_categories

# Create NinjaAPI instance (disable default docs to use Scalar)
api = NinjaAPI(
    title="Quran Apps API",
    version="1.0.0",
    docs_url=None  # Disable default docs to use Scalar instead
)

# Create categories router
categories_router = Router(tags=["Categories"])

@categories_router.get("/")
def list_categories(request):
    """Get all application categories."""
    # Use application-level caching instead of view-level
    cache_key = 'api:categories:all'

    # Try to get from cache first
    cached_result = cache.get(cache_key)
    if cached_result:
        return cached_result

    # Get from database
    result = get_categories(request)

    # Cache for 7 days (categories rarely change)
    cache.set(cache_key, result, 7 * 24 * 60 * 60)

    return result

# Add routers to API
api.add_router("/apps", apps_router)
api.add_router("/categories", categories_router)