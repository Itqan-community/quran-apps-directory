import logging
from typing import List, Any
from django.db.models import QuerySet
from pgvector.django import CosineDistance

from .factory import AISearchFactory
from .crawler import AppCrawler

logger = logging.getLogger(__name__)

class AISearchService:
    """
    Service for AI-powered semantic search.
    Uses AISearchFactory to load the configured provider (OpenAI, DeepSeek, Gemini).
    """
    
    def __init__(self):
        self.provider = AISearchFactory.get_provider()
        if not self.provider:
            logger.warning("AISearchProvider could not be initialized. Check settings.")

    def get_embedding(self, text: str) -> List[float]:
        """
        Generate embedding vector using the active provider.
        """
        if not self.provider:
            return []
        return self.provider.get_embedding(text)

    def prepare_app_text(self, app: Any, crawl_links: bool = False) -> str:
        """
        Prepare rich text representation of an App for embedding.
        Optionally crawls external links (App Store, Google Play, Website) for more context.
        """
        # Get category names
        categories = " ".join([c.name_en for c in app.categories.all()])
        
        # Base content
        content = [
            f"App: {app.name_en} {app.name_ar}",
            f"Category: {categories}",
            f"Description: {app.short_description_en} {app.description_en}",
            f"Platform: {app.get_platform_display()}"
        ]

        # Crawl external links if requested
        if crawl_links:
            urls_to_check = [
                app.google_play_link,
                app.app_store_link,
                app.app_gallery_link,
            ]
            
            for url in urls_to_check:
                if url:
                    crawled_text = AppCrawler.extract_text_from_url(url)
                    if crawled_text:
                        content.append(f"External Info ({url}): {crawled_text}")
                        # Only crawl one valid link to avoid context bloat/time cost
                        break 
        
        return "\n".join(content)

    def search_apps(self, query: str, limit: int = 50, rerank_top_k: int = 20) -> List[Any]:
        """
        Perform semantic search on Apps with optional Reranking.
        
        Flow:
        1. Vector Search (Retrieval) -> Get top 'limit' candidates (fast).
        2. LLM Reranking (Reasoning) -> Sort top 'rerank_top_k' candidates by strict relevance (slower).
        
        Returns:
            List of App objects (possibly reordered).
        """
        from apps.models import App
        
        embedding = self.get_embedding(query)
        if not embedding:
            return []

        # 1. Retrieval: Semantic Search using Cosine Distance
        candidates = App.objects.annotate(
            distance=CosineDistance('embedding', embedding)
        ).order_by('distance')[:limit]
        
        # Convert queryset to list
        candidate_list = list(candidates)
        
        if not candidate_list or not self.provider:
            return candidate_list

        # 2. Reasoning: LLM Reranking
        # We assume the first 'rerank_top_k' are worth checking deeply.
        # We pass minimal context to the LLM to save tokens.
        docs_to_rank = []
        for app in candidate_list[:rerank_top_k]:
            docs_to_rank.append({
                'id': app.id,
                'name_en': app.name_en,
                'description_en': app.description_en,
                # Store the original obj reference to retrieve later
                '_obj': app 
            })
            
        reranked_docs = self.provider.rerank(query, docs_to_rank)
        
        # Reconstruct the list of App objects based on reranked order
        final_results = []
        seen_ids = set()
        
        for doc in reranked_docs:
            app = doc.get('_obj')
            if app:
                # Attach AI reasoning if available (not persisted to DB, just runtime)
                app.ai_reasoning = doc.get('ai_reasoning')
                final_results.append(app)
                seen_ids.add(app.id)
                
        # Append any candidates that weren't reranked (the long tail)
        for app in candidate_list:
            if app.id not in seen_ids:
                final_results.append(app)
                
        return final_results
