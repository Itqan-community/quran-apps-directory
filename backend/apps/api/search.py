from typing import List, Optional
from ninja import Router
from django.conf import settings
from .schemas import PaginatedAppListSchema
from core.services.search import AISearchService
from ..services.app_service_simple import AppService

router = Router(tags=["Search"])

@router.get("/", response=PaginatedAppListSchema)
def search_apps(request, q: str, page: int = 1, page_size: int = 20):
    """
    Semantic search for apps using AI Embeddings + LLM Reranking.
    """
    search_service = AISearchService()
    app_service = AppService()

    # Perform semantic search (Retrieve + Rerank)
    # We fetch more candidates (limit=50) to allow the Reranker (top 20) to filter best results
    # The 'limit' here is the initial retrieval pool size.
    all_results = search_service.search_apps(q, limit=50, rerank_top_k=20)
    
    total = len(all_results)

    start = (page - 1) * page_size
    end = start + page_size
    
    page_items = all_results[start:end]
    
    # Convert to schema format using AppService helper
    items_data = [app_service._app_to_dict(app) for app in page_items]
    
    return {
        "items": items_data,
        "count": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size
    }