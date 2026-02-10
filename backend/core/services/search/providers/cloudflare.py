import logging
import requests
from typing import List, Dict, Any
from django.conf import settings
from ..base import AISearchProvider, SearchResult

logger = logging.getLogger(__name__)


class CloudflareSearchProvider(AISearchProvider):
    """
    Cloudflare AI Search (AutoRAG) Provider.
    Uses Cloudflare's managed RAG service that indexes R2 data automatically.
    """

    def __init__(self, account_id: str, rag_name: str, token: str):
        self.account_id = account_id
        self.rag_name = rag_name
        self.token = token
        self.base_url = f"https://api.cloudflare.com/client/v4/accounts/{account_id}/autorag/rags/{rag_name}"

    def _get_headers(self) -> Dict[str, str]:
        return {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }

    def get_embedding(self, text: str) -> List[float]:
        """
        CF AI Search handles embeddings internally.
        This method is not used for CF provider but required by interface.
        """
        return []

    def search(self, query: str, max_results: int = 20, rewrite_query: bool = True) -> List[SearchResult]:
        """
        Perform AI-powered search using Cloudflare AI Search REST API.
        """
        # CF API enforces max_num_results <= 50
        max_results = min(max_results, 50)

        if not all([self.account_id, self.rag_name, self.token]):
            logger.warning("Cloudflare AI Search not configured properly")
            return []

        try:
            response = requests.post(
                f"{self.base_url}/ai-search",
                headers=self._get_headers(),
                json={
                    "query": query,
                    "rewrite_query": rewrite_query,
                    "max_num_results": max_results,
                    "ranking_options": {
                        "score_threshold": 0.0
                    },
                    "reranking": {
                        "enabled": True
                    }
                },
                timeout=30
            )

            if response.status_code != 200:
                logger.error(f"CF AI Search error: {response.status_code} - {response.text}")
                return []

            data = response.json()

            if not data.get("success"):
                logger.error(f"CF AI Search failed: {data.get('errors', [])}")
                return []

            results = []
            for item in data.get("result", {}).get("data", []):
                results.append(SearchResult(
                    content=item.get("content", ""),
                    source=item.get("filename", ""),
                    relevance_score=item.get("score", 0.0),
                    metadata={
                        "file_id": item.get("file_id"),
                        "part_number": item.get("part_number"),
                        "total_parts": item.get("total_parts_count")
                    }
                ))

            return results

        except requests.RequestException as e:
            logger.error(f"CF AI Search request error: {e}")
            return []
        except Exception as e:
            logger.error(f"CF AI Search unexpected error: {e}")
            return []

    def search_apps(self, query: str, max_results: int = 20) -> List[Dict[str, Any]]:
        """
        Search for apps and return app data with scores.

        CF AI Search returns chunked content, so we extract app IDs from
        filenames (apps/{id}.json) and return them with scores.
        """
        import re

        # CF API enforces max_num_results <= 50
        max_results = min(max_results, 50)

        if not all([self.account_id, self.rag_name, self.token]):
            logger.warning("Cloudflare AI Search not configured properly")
            return []

        try:
            response = requests.post(
                f"{self.base_url}/ai-search",
                headers=self._get_headers(),
                json={
                    "query": query,
                    "rewrite_query": True,
                    "max_num_results": max_results,
                    "ranking_options": {
                        "score_threshold": 0.0
                    },
                    "reranking": {
                        "enabled": True
                    }
                },
                timeout=30
            )

            if response.status_code != 200:
                logger.error(f"CF AI Search error: {response.status_code} - {response.text}")
                return []

            data = response.json()

            if not data.get("success"):
                logger.error(f"CF AI Search failed: {data.get('errors', [])}")
                return []

            apps = []
            seen_ids = set()  # Dedupe apps (CF may return multiple chunks per app)

            for item in data.get("result", {}).get("data", []):
                filename = item.get("filename", "")
                score = item.get("score", 0.0)

                # Extract app ID from filename (apps/123.json -> 123)
                match = re.search(r'apps/(\d+)\.json', filename)
                if match:
                    app_id = int(match.group(1))
                    if app_id not in seen_ids:
                        seen_ids.add(app_id)
                        apps.append({
                            'id': app_id,
                            'cf_score': score,
                            'cf_source': filename
                        })

            return apps

        except requests.RequestException as e:
            logger.error(f"CF AI Search request error: {e}")
            return []
        except Exception as e:
            logger.error(f"CF AI Search unexpected error: {e}", exc_info=True)
            return []

    def search_hybrid(self, query: str, filters: Dict[str, List[str]] = None, max_results: int = 20) -> List[Dict[str, Any]]:
        """
        Hybrid search using query augmentation with filter terms.

        Appends filter values to the query so CF embeddings naturally
        boost matching apps (soft filtering via semantic similarity).

        Args:
            query: User search query
            filters: Dict of metadata filters e.g. {'riwayah': ['warsh'], 'features': ['offline']}
            max_results: Max results to return

        Returns:
            List of dicts with app id and cf_score
        """
        augmented_query = query
        if filters:
            filter_terms = []
            for values in filters.values():
                filter_terms.extend(values)
            if filter_terms:
                augmented_query = f"{query} {' '.join(filter_terms)}"

        logger.info(f"CF hybrid search: original='{query}', augmented='{augmented_query}'")
        return self.search_apps(augmented_query, max_results=max_results)

    def rerank(self, query: str, documents: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        CF AI Search handles reranking internally via reranking.enabled=True.
        This method returns documents as-is since reranking happens in search().
        """
        return documents
