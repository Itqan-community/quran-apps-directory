import logging
import openai
from typing import List, Dict, Any
from django.conf import settings
from ..base import AISearchProvider, SearchResult

logger = logging.getLogger(__name__)

class OpenAISearchProvider(AISearchProvider):
    """
    OpenAI Implementation of AI Search Provider.
    Also serves as a base for any OpenAI-compatible API (e.g. DeepSeek).
    """
    
    def __init__(self, api_key: str, model: str = "text-embedding-3-small", base_url: str = None):
        self.model = model
        self.client = openai.OpenAI(
            api_key=api_key,
            base_url=base_url
        )

    def get_embedding(self, text: str) -> List[float]:
        try:
            text = text.replace("\n", " ")
            response = self.client.embeddings.create(
                input=[text],
                model=self.model
            )
            return response.data[0].embedding
        except Exception as e:
            logger.error(f"OpenAI Embedding Error: {e}")
            return []

    def search(self, query: str) -> List[SearchResult]:
        # This implementation mainly focuses on embedding generation for the DB
        # Direct search via OpenAI would typically imply RAG or similar, 
        # which isn't the primary 'vector search' use case here.
        # Returning empty for now as our service layer handles the DB query.
        return []

    def rerank(self, query: str, documents: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        OpenAI (or generic LLM) Reranking.
        Currently a pass-through. 
        TODO: Implement GPT-4o-mini based reranking similar to Gemini.
        """
        # For now, we trust the vector search order if using OpenAI to avoid extra costs/latency
        # unless explicitly enabled.
        return documents