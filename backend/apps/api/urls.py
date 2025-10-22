"""
Ninja API URL routing for Quranic Applications

Following ITQAN community standards using Django Ninja framework.
"""

from ninja import NinjaAPI
from .controllers import router as apps_router

# Create NinjaAPI instance (disable default docs to use Scalar)
api = NinjaAPI(
    title="Quran Apps API",
    version="1.0.0",
    docs_url=None  # Disable default docs to use Scalar instead
)

# Add apps router
api.add_router("/apps", apps_router)

# Add categories endpoint directly to main API
from .controllers import get_categories
api.add_api_route("/categories/", get_categories, methods=["GET"], tags=["Categories"])