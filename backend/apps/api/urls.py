"""
Ninja API URL routing for Quranic Applications

Following ITQAN community standards using Django Ninja framework.
"""

from ninja import NinjaAPI, Router
from .controllers import router as apps_router, get_categories
from submissions.api.controllers import router as submissions_router

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
    return get_categories(request)

# Add routers to API
api.add_router("/apps", apps_router)
api.add_router("/categories", categories_router)
api.add_router("/submissions", submissions_router)