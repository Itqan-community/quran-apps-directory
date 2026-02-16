from django.core.management.base import BaseCommand
from core.services.search import AISearchService
import json

class Command(BaseCommand):
    help = 'Test the AI Semantic Search and Reranking pipeline.'

    def add_arguments(self, parser):
        parser.add_argument('query', type=str, help='The search query to test (e.g. "hifz for kids")')
        parser.add_argument('--limit', type=int, default=10, help='Number of retrieval results')
        parser.add_argument('--rerank-top', type=int, default=5, help='Number of items to send to reranker')

    def handle(self, *args, **options):
        query = options['query']
        limit = options['limit']
        rerank_top = options['rerank_top']

        self.stdout.write(f"\n🔍 Testing Search Query: '{query}'")
        self.stdout.write(f"⚙️ Config: Retrieve Top {limit} -> Rerank Top {rerank_top}")
        
        service = AISearchService()
        if not service.provider:
            self.stdout.write(self.style.ERROR("❌ AI Provider not configured."))
            return

        # 1. Test Retrieval Only (Pre-Rerank Simulation)
        self.stdout.write("\n📡 Step 1: Performing Vector Retrieval...")
        
        # We manually call the steps to show the 'Before' state
        embedding = service.get_embedding(query)
        if not embedding:
            self.stdout.write(self.style.ERROR("❌ Failed to generate embedding."))
            return

        from apps.models import App
        from pgvector.django import CosineDistance
        
        # Raw Vector Search
        candidates = App.objects.annotate(
            distance=CosineDistance('embedding', embedding)
        ).order_by('distance')[:limit]
        
        candidate_list = list(candidates)
        
        self.stdout.write(f"✅ Retrieved {len(candidate_list)} candidates.")
        self.stdout.write("\n--- [BEFORE RERANK] Top 5 Results ---")
        for i, app in enumerate(candidate_list[:5]):
            self.stdout.write(f"{i+1}. {app.name_en} (Dist: {app.distance:.4f})")

        # 2. Test Full Pipeline (With Reranking)
        self.stdout.write("\n🧠 Step 2: Executing 'The Professor' (Reranking)...")
        
        final_results = service.search_apps(query, limit=limit, rerank_top_k=rerank_top)
        
        self.stdout.write("\n--- [AFTER RERANK] Top 5 Results ---")
        for i, app in enumerate(final_results[:5]):
            reasoning = getattr(app, 'ai_reasoning', 'N/A')
            self.stdout.write(self.style.SUCCESS(f"{i+1}. {app.name_en}"))
            if reasoning != 'N/A':
                self.stdout.write(self.style.WARNING(f"   💡 Reasoning: {reasoning}"))
            else:
                self.stdout.write(f"   (No AI reasoning - likely outside rerank window)")

        # 3. Compare Movement
        self.stdout.write("\n📊 Analysis:")
        before_ids = [app.id for app in candidate_list[:rerank_top]]
        after_ids = [app.id for app in final_results[:rerank_top]]
        
        if before_ids != after_ids:
            self.stdout.write(self.style.SUCCESS("✅ The list order CHANGED! Reranking is working."))
        else:
            self.stdout.write(self.style.WARNING("ℹ️ The list order is unchanged. (Maybe the vector search was already perfect?)"))
