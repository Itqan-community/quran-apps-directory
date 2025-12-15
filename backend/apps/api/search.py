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
        "next": None,  # Semantic search doesn't use URL pagination
        "previous": None,
    }