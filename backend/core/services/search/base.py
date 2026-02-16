from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import List, Optional, Dict, Any

@dataclass
class SearchResult:
    """Standardized search result object."""
    content: str
    source: str
    relevance_score: float
    metadata: Optional[dict] = None

class AISearchProvider(ABC):
    """
    Abstract Interface for AI Search Providers.
    Any AI service (OpenAI, Gemini, etc.) must implement these methods.
    """

    @abstractmethod
    def get_embedding(self, text: str) -> List[float]:
        """
        Generate an embedding vector for the given text.
        """
        pass
    
    @abstractmethod
    def search(self, query: str) -> List[SearchResult]:
        """
        Perform a search query (if the provider supports direct search).
        Note: For our vector DB implementation, we mostly use get_embedding,
        but this method allows for future hybrid/RAG implementations.
        """
        pass
        
    @abstractmethod
    def rerank(self, query: str, documents: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Re-rank a list of documents based on relevance to the query using an LLM.
        
        Args:
            query: The user's search query.
            documents: A list of dicts, each containing at least 'id' and 'content' (and potentially 'metadata').
            
        Returns:
            A re-ordered list of the input documents, potentially filtered or with added reasoning.
        """
        pass