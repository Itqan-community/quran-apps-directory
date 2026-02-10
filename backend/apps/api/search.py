from typing import List, Optional
from ninja import Router
from django.conf import settings
from .schemas import PaginatedAppListSchema, HybridSearchResponseSchema
from core.services.search import AISearchService
from core.services.search.factory import AISearchFactory
from ..services.app_service_simple import AppService
from ..models import App
import logging

logger = logging.getLogger(__name__)

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


@router.get("/hybrid/", response=HybridSearchResponseSchema)
def hybrid_search(
    request,
    q: str,
    page: int = 1,
    page_size: int = 20,
    features: str = None,
    riwayah: str = None,
    mushaf_type: str = None,
    platform: str = None,
    category: str = None,
    include_facets: bool = True,
    use_cf: bool = False,
):
    """
    Hybrid semantic search combining AI embeddings with metadata filters.

    This endpoint provides:
    1. Semantic search using vector embeddings
    2. Pre-filtering by metadata (features, riwayah, mushaf_type, platform, category)
    3. Ranking boost for query-metadata matches
    4. LLM reranking for top results
    5. Faceted counts for filter UI

    Args:
        q: Search query (required)
        page: Page number (default: 1)
        page_size: Results per page (default: 20)
        features: Comma-separated feature filters (e.g., "offline,audio")
        riwayah: Comma-separated riwayah filters (e.g., "hafs,warsh")
        mushaf_type: Comma-separated mushaf type filters
        platform: Comma-separated platform filters (e.g., "android,ios")
        category: Comma-separated category slugs
        include_facets: Whether to include facet counts (default: True)
        use_cf: Use Cloudflare AutoRAG instead of pgvector (default: False)

    Returns:
        Paginated results with match_reasons and facets
    """
    app_service = AppService()
    search_service = AISearchService()

    # Parse comma-separated filter values
    def parse_csv(value: str) -> List[str]:
        if not value:
            return []
        return [v.strip().lower() for v in value.split(',') if v.strip()]

    filters = {}
    if features:
        filters['features'] = parse_csv(features)
    if riwayah:
        filters['riwayah'] = parse_csv(riwayah)
    if mushaf_type:
        filters['mushaf_type'] = parse_csv(mushaf_type)
    if platform:
        filters['platform'] = parse_csv(platform)
    if category:
        filters['category'] = parse_csv(category)

    try:
        # Route to CF or pgvector based on use_cf flag
        if use_cf:
            search_result = search_service.hybrid_search_cf(
                query=q,
                filters=filters if filters else None,
                limit=100,
                include_facets=include_facets,
                apply_boost=True
            )
        else:
            search_result = search_service.hybrid_search(
                query=q,
                filters=filters if filters else None,
                limit=100,
                rerank_top_k=20,
                include_facets=include_facets,
                apply_boost=True
            )

        all_results = search_result.get('results', [])
        facets_raw = search_result.get('facets', {})
        error = search_result.get('error', None)

        # Paginate
        total = len(all_results)
        start = (page - 1) * page_size
        end = start + page_size
        page_items = all_results[start:end]

        # Convert to response format
        items_data = []
        for app in page_items:
            app_dict = app_service._app_to_dict(app)

            # Add search-specific fields
            app_dict['ai_reasoning'] = getattr(app, 'ai_reasoning', None)
            app_dict['match_reasons'] = getattr(app, '_match_reasons', [])
            app_dict['relevance_score'] = getattr(app, '_combined_score', None)

            items_data.append(app_dict)

        # Format facets for response
        facets = {}
        for facet_name, facet_values in facets_raw.items():
            facets[facet_name] = [
                {
                    'value': fv['value'],
                    'label_en': fv['label_en'],
                    'label_ar': fv['label_ar'],
                    'count': fv['count']
                }
                for fv in facet_values
            ]

        return {
            "results": items_data,
            "count": total,
            "next": f"?q={q}&page={page + 1}" if end < total else None,
            "previous": f"?q={q}&page={page - 1}" if page > 1 else None,
            "facets": facets,
            "error": error
        }

    except Exception as e:
        logger.exception(f"Hybrid search error: {e}")
        return {
            "results": [],
            "count": 0,
            "next": None,
            "previous": None,
            "facets": {}
        }