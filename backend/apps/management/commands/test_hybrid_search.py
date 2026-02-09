from django.core.management.base import BaseCommand
from core.services.search import AISearchService


class Command(BaseCommand):
    help = 'Test the Hybrid Semantic Search with metadata filters and boosting.'

    def add_arguments(self, parser):
        parser.add_argument('query', type=str, help='The search query to test (e.g. "offline quran")')
        parser.add_argument('--limit', type=int, default=10, help='Number of results')
        parser.add_argument('--features', type=str, default=None, help='Comma-separated features filter')
        parser.add_argument('--riwayah', type=str, default=None, help='Comma-separated riwayah filter')
        parser.add_argument('--show-facets', action='store_true', help='Show facet counts')

    def handle(self, *args, **options):
        query = options['query']
        limit = options['limit']
        features = options['features']
        riwayah = options['riwayah']
        show_facets = options['show_facets']

        self.stdout.write(f"\n🔍 Hybrid Search Query: '{query}'")

        # Build filters
        filters = {}
        if features:
            filters['features'] = [f.strip().lower() for f in features.split(',')]
            self.stdout.write(f"📌 Features filter: {filters['features']}")
        if riwayah:
            filters['riwayah'] = [r.strip().lower() for r in riwayah.split(',')]
            self.stdout.write(f"📌 Riwayah filter: {filters['riwayah']}")

        service = AISearchService()
        if not service.provider:
            self.stdout.write(self.style.ERROR("❌ AI Provider not configured."))
            return

        # Perform hybrid search
        self.stdout.write("\n🔄 Executing hybrid search...")

        result = service.hybrid_search(
            query=query,
            filters=filters if filters else None,
            limit=limit,
            rerank_top_k=5,
            include_facets=show_facets,
            apply_boost=True
        )

        apps = result.get('results', [])
        facets = result.get('facets', {})

        self.stdout.write(f"\n✅ Found {len(apps)} results")
        self.stdout.write("\n--- Results ---")

        for i, app in enumerate(apps[:10]):
            boost = getattr(app, '_metadata_boost', 1.0)
            score = getattr(app, '_combined_score', 0)
            match_reasons = getattr(app, '_match_reasons', [])
            distance = getattr(app, 'distance', 0)
            ai_reasoning = getattr(app, 'ai_reasoning', None)

            self.stdout.write(self.style.SUCCESS(f"\n{i+1}. {app.name_en}"))
            self.stdout.write(f"   Distance: {distance:.4f} | Boost: {boost:.2f} | Score: {score:.4f}")

            if match_reasons:
                reasons = [f"{r['type']}:{r['value']}" for r in match_reasons]
                self.stdout.write(self.style.WARNING(f"   🎯 Match: {', '.join(reasons)}"))

            if ai_reasoning:
                self.stdout.write(f"   💡 AI: {ai_reasoning}")

        if show_facets and facets:
            self.stdout.write("\n--- Facets ---")
            for facet_name, facet_values in facets.items():
                if facet_values:
                    self.stdout.write(f"\n📊 {facet_name}:")
                    for fv in facet_values[:5]:
                        self.stdout.write(f"   - {fv['value']}: {fv['count']} apps")
