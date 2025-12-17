from typing import List, Optional
from ninja import Router
from django.conf import settings
from .schemas import PaginatedAppListSchema
from core.services.search import AISearchService
from core.services.search.factory import AISearchFactory
from ..services.app_service_simple import AppService
from ..models import App

router = Router(tags=["Search"])


@router.get("/", response=PaginatedAppListSchema)
def search_apps(request, q: str, page: int = 1, page_size: int = 20, use_cf: bool = False):
    """
    Semantic search for apps using AI Embeddings + LLM Reranking.

    Args:
        q: Search query
        page: Page number (default: 1)
        page_size: Results per page (default: 20)
        use_cf: Use Cloudflare AI Search instead of pgvector (default: False)
    """
    app_service = AppService()

    if use_cf:
        # Use Cloudflare AI Search (managed RAG)
        import logging
        logger = logging.getLogger(__name__)

        cf_provider = AISearchFactory.get_cloudflare_provider()
        if not cf_provider:
            return {
                "results": [],
                "count": 0,
                "next": None,
                "previous": None,
                "error": "Cloudflare AI Search not configured"
            }

        try:
            # Search via CF AI Search
            cf_results = cf_provider.search_apps(q, max_results=50)
            logger.info(f"CF Search returned {len(cf_results)} results for query: {q}")

            total = len(cf_results)
            start = (page - 1) * page_size
            end = start + page_size
            page_items = cf_results[start:end]

            # Fetch full app objects from DB for consistent response format
            items_data = []
            for cf_app in page_items:
                app_id = cf_app.get('id')
                cf_score = cf_app.get('cf_score', 0)
                try:
                    app = App.objects.select_related('developer').prefetch_related('categories').get(id=app_id)
                    app_dict = app_service._app_to_dict(app)
                    app_dict['cf_score'] = cf_score
                    app_dict['ai_reasoning'] = f"CF AI Search score: {cf_score:.4f}"
                    items_data.append(app_dict)
                except App.DoesNotExist:
                    logger.warning(f"App {app_id} not found in DB")
                    # Skip apps not found in database
                    continue
                except Exception as e:
                    logger.error(f"Error fetching app {app_id}: {e}")
                    continue

            return {
                "results": items_data,
                "count": total,
                "next": None,
                "previous": None,
            }
        except Exception as e:
            logger.exception(f"CF Search error: {e}")
            return {
                "results": [],
                "count": 0,
                "next": None,
                "previous": None,
                "error": str(e)
            }

    # Default: Use pgvector + Gemini (existing implementation)
    search_service = AISearchService()

    # Perform semantic search (Retrieve + Rerank)
    # We fetch more candidates (limit=50) to allow the Reranker (top 20) to filter best results
    all_results = search_service.search_apps(q, limit=50, rerank_top_k=20)

    total = len(all_results)
    start = (page - 1) * page_size
    end = start + page_size
    page_items = all_results[start:end]

    # Convert to schema format using AppService helper, include AI reasoning
    items_data = []
    for app in page_items:
        app_dict = app_service._app_to_dict(app)
        # Add AI reasoning if available (set by reranker)
        app_dict['ai_reasoning'] = getattr(app, 'ai_reasoning', None)
        items_data.append(app_dict)

    return {
        "results": items_data,
        "count": total,
        "next": None,
        "previous": None,
    }