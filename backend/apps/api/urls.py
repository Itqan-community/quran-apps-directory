"""
Ninja API URL routing for Quranic Applications

Following ITQAN community standards using Django Ninja framework.
"""

import json
from ninja import NinjaAPI, Router
from ninja.renderers import JSONRenderer
from .controllers import router as apps_router, get_categories
from .search import router as search_router
from .admin_controllers import router as admin_router
from submissions.api.controllers import router as submissions_router


class UnicodeJSONRenderer(JSONRenderer):
    """Custom JSON renderer that properly displays Arabic/Unicode characters."""

    def render(self, request, data, *, response_status):
        return json.dumps(data, ensure_ascii=False, cls=self.encoder_class)


# Create NinjaAPI instance (disable default docs to use Scalar)
api = NinjaAPI(
    title="Quran Apps API",
    version="1.0.0",
    docs_url=None,  # Disable default docs to use Scalar instead
    renderer=UnicodeJSONRenderer()
)

# Create categories router
categories_router = Router(tags=["Categories"])

@categories_router.get("/")
def list_categories(request):
    """Get all application categories."""
    return get_categories(request)

# Add routers to API
api.add_router("/apps", apps_router)
api.add_router("/search", search_router)
api.add_router("/categories", categories_router)
api.add_router("/submissions", submissions_router)
api.add_router("/admin", admin_router)