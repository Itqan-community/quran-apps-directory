import logging
import json
from typing import List, Dict, Any
from ..base import AISearchProvider, SearchResult

logger = logging.getLogger(__name__)

class GeminiSearchProvider(AISearchProvider):
    """
    Google Gemini Implementation of AI Search Provider.
    Requires google-generativeai package.
    """
    
    def __init__(self, api_key: str, model: str = "models/gemini-embedding-001", rerank_model: str = "gemini-2.5-pro"):
        self.api_key = api_key
        self.model = model
        self.rerank_model_name = rerank_model
        
        try:
            import google.generativeai as genai
            # Configure global API key only once if possible, but safe to call
            genai.configure(api_key=self.api_key)
            self.genai = genai
            
            # Pre-instantiate the model to avoid overhead per request
            self._rerank_model_client = self.genai.GenerativeModel(self.rerank_model_name)
            
        except ImportError:
            logger.error("google-generativeai library not installed.")
            self.genai = None
            self._rerank_model_client = None

    def get_embedding(self, text: str) -> List[float]:
        if not self.genai:
            return []
            
        try:
            text = text.replace("\n", " ")
            result = self.genai.embed_content(
                model=self.model,
                content=text,
                task_type="retrieval_document",
                output_dimensionality=768
            )
            return result['embedding']
        except Exception as e:
            logger.error(f"Gemini Embedding Error: {e}")
            return []

    def search(self, query: str) -> List[SearchResult]:
        return []

    def rerank(self, query: str, documents: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Uses Gemini 2.5 Pro to re-rank documents with AI reasoning.
        """
        if not self.genai or not documents or not self._rerank_model_client:
            return documents

        try:
            # Construct the prompt
            docs_json = json.dumps([{
                'id': doc.get('id'), 
                'name': doc.get('name_en'), 
                'description': (doc.get('description_en') or '')[:300] 
            } for doc in documents], indent=2)

            prompt = f"""
            You are an expert curator of Quranic applications.
            
            User Query: "{query}"

            Here is a list of potential apps (JSON format):
            {docs_json}

            Task:
            1. Analyze the user's intent.
            2. Rank these apps strictly by relevance to the query.
            3. Return the re-ordered list as a valid JSON array of objects. 
            4. Each object must contain the 'id' of the app and a 'reason' field explaining why it fits.
            5. Exclude irrelevant apps if necessary.
            
            Output strictly JSON. No markdown formatting.
            """

            # Use cached client
            response = self._rerank_model_client.generate_content(prompt)
            
            # Parse JSON response
            response_text = response.text.strip()
            if response_text.startswith("```json"):
                response_text = response_text[7:-3]
            elif response_text.startswith("```"):
                 response_text = response_text[3:-3]
            
            ranked_results = json.loads(response_text)
            
            doc_map = {str(d.get('id')): d for d in documents}
            
            final_list = []
            for item in ranked_results:
                original_doc = doc_map.get(str(item.get('id')))
                if original_doc:
                    original_doc['ai_reasoning'] = item.get('reason')
                    final_list.append(original_doc)
            
            return final_list if final_list else documents

        except Exception as e:
            logger.error(f"Gemini Rerank Error: {e}")
            return documents
