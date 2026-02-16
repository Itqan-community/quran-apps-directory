from typing import Optional
from django.conf import settings
from .base import AISearchProvider
from .providers.openai import OpenAISearchProvider
from .providers.gemini import GeminiSearchProvider
from .providers.cloudflare import CloudflareSearchProvider

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
                model=getattr(settings, 'AI_EMBEDDING_MODEL', 'models/gemini-embedding-001'),
                rerank_model=getattr(settings, 'AI_RERANK_MODEL', 'gemini-2.5-flash')
            )

        elif provider_type == 'cloudflare':
            cls._provider_instance = CloudflareSearchProvider(
                account_id=getattr(settings, 'CF_ACCOUNT_ID', ''),
                rag_name=getattr(settings, 'CF_AI_SEARCH_NAME', ''),
                token=getattr(settings, 'CF_AI_SEARCH_TOKEN', '')
            )
        else:
            # Default fallback
            cls._provider_instance = OpenAISearchProvider(api_key=api_key)

        return cls._provider_instance

    @classmethod
    def get_cloudflare_provider(cls) -> Optional[CloudflareSearchProvider]:
        """Get Cloudflare provider directly (for use_cf=true parameter)."""
        cf_account = getattr(settings, 'CF_ACCOUNT_ID', '')
        cf_name = getattr(settings, 'CF_AI_SEARCH_NAME', '')
        cf_token = getattr(settings, 'CF_AI_SEARCH_TOKEN', '')

        if not all([cf_account, cf_name, cf_token]):
            return None

        return CloudflareSearchProvider(
            account_id=cf_account,
            rag_name=cf_name,
            token=cf_token
        )