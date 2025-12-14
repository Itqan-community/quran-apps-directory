from typing import Optional
from django.conf import settings
from .base import AISearchProvider
from .providers.openai import OpenAISearchProvider
from .providers.gemini import GeminiSearchProvider

class AISearchFactory:
    """
    Factory to instantiate the correct AI Search Provider based on configuration.
    Implements Singleton pattern for the provider to avoid re-initialization overhead.
    """
    
    _provider_instance: Optional[AISearchProvider] = None
    
    @classmethod
    def get_provider(cls) -> Optional[AISearchProvider]:
        if cls._provider_instance:
            return cls._provider_instance

        provider_type = getattr(settings, 'AI_SEARCH_PROVIDER', 'openai').lower()
        api_key = getattr(settings, 'AI_API_KEY', None)
        
        if not api_key:
            return None

        if provider_type == 'openai':
            cls._provider_instance = OpenAISearchProvider(
                api_key=api_key, 
                model=getattr(settings, 'AI_EMBEDDING_MODEL', 'text-embedding-3-small')
            )
            
        elif provider_type == 'deepseek':
            cls._provider_instance = OpenAISearchProvider(
                api_key=api_key,
                base_url="https://api.deepseek.com/v1",
                model="deepseek-embed"
            )

        elif provider_type == 'gemini':
            cls._provider_instance = GeminiSearchProvider(
                api_key=api_key,
                model=getattr(settings, 'AI_EMBEDDING_MODEL', 'models/text-embedding-004'),
                rerank_model=getattr(settings, 'AI_RERANK_MODEL', 'gemini-2.5-flash')
            )
        else:
            # Default fallback
            cls._provider_instance = OpenAISearchProvider(api_key=api_key)
            
        return cls._provider_instance