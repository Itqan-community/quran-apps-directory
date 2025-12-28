# Cloudflare AI Search Integration

## Overview

Integration of Cloudflare AI Search (formerly AutoRAG) as an alternative semantic search provider for the Quran Apps Directory. This provides a managed RAG solution that automatically indexes R2 data and offers query rewriting, reranking, and LLM-powered responses.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Django API                              │
│  GET /api/search/?q=tajweed&use_cf=true                     │
└─────────────────────┬───────────────────────────────────────┘
                      │
          ┌───────────┴───────────┐
          │                       │
          ▼                       ▼
┌─────────────────┐     ┌─────────────────────────┐
│  pgvector +     │     │  Cloudflare AI Search   │
│  Gemini         │     │  (Managed RAG)          │
│  (default)      │     │  use_cf=true            │
└─────────────────┘     └───────────┬─────────────┘
                                    │
                        ┌───────────┴───────────┐
                        │                       │
                        ▼                       ▼
              ┌─────────────────┐     ┌─────────────────┐
              │  R2 Bucket      │     │  Vectorize      │
              │  apps/*.json    │     │  (auto-managed) │
              └─────────────────┘     └─────────────────┘
```

## Implementation Status

### Completed

- [x] CloudflareSearchProvider class (`core/services/search/providers/cloudflare.py`)
- [x] Factory method for CF provider (`core/services/search/factory.py`)
- [x] Settings configuration (`config/settings/base.py`)
- [x] sync_to_r2 management command (`apps/management/commands/sync_to_r2.py`)
- [x] Search API with `use_cf` parameter (`apps/api/search.py`)
- [x] R2 credentials in Railway develop environment
- [x] Apps synced to R2 bucket (49 apps in `apps/` folder)

### Pending

- [ ] Create AI Search instance in Cloudflare dashboard
- [ ] Set CF_AI_SEARCH_TOKEN in Railway
- [ ] Test CF AI Search endpoint
- [ ] Compare results with pgvector search
- [ ] Production deployment

## Task List

### Phase 1: Setup (Completed)

| Task | Status | Notes |
|------|--------|-------|
| Create CloudflareSearchProvider | ✅ Done | `providers/cloudflare.py` |
| Update factory with CF provider | ✅ Done | `factory.py` |
| Add CF settings to base.py | ✅ Done | CF_ACCOUNT_ID, CF_AI_SEARCH_NAME, CF_AI_SEARCH_TOKEN |
| Create sync_to_r2 command | ✅ Done | `management/commands/sync_to_r2.py` |
| Update search API | ✅ Done | Added `use_cf` parameter |
| Set Railway R2 variables | ✅ Done | R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME |
| Set Railway CF variables | ✅ Done | CF_ACCOUNT_ID, CF_AI_SEARCH_NAME |
| Sync apps to R2 | ✅ Done | 49 apps in `quran-apps-directory/apps/` |

### Phase 2: Cloudflare Dashboard Setup (Manual)

| Task | Status | Instructions |
|------|--------|--------------|
| Create AI Search instance | ✅ Done | Instance: `quran-apps-rag` |
| Generate Service API token | ✅ Done | Token created and stored |
| Set CF_AI_SEARCH_TOKEN | ✅ Done | Set in Railway develop |

### Phase 3: Testing

| Task | Status | Command/Endpoint |
|------|--------|------------------|
| Test CF search endpoint | ✅ Done | API returns results with AI response |
| Compare with pgvector | ⏳ Pending | Compare results for same queries |
| Test Arabic queries | ✅ Done | Works (response language may vary) |
| Test bilingual queries | ⏳ Pending | Mixed Arabic/English queries |
| Measure latency | ⏳ Pending | Compare response times |

### Phase 4: Production

| Task | Status | Notes |
|------|--------|-------|
| Deploy to staging | ⏳ Pending | Merge to staging branch |
| Set staging CF credentials | ⏳ Pending | Railway staging environment |
| Staging testing | ⏳ Pending | Full test suite |
| Deploy to production | ⏳ Pending | Merge to main branch |
| Set production CF credentials | ⏳ Pending | Railway production environment |
| Monitor and optimize | ⏳ Pending | Check AI Gateway metrics |

## Dashboard Setup Instructions

### Step 1: Create AI Search Instance

1. Go to: https://dash.cloudflare.com/71be39fa76ea6261ea925d02b6ee15e6/ai/autorag
2. Click **"Create AutoRAG"**
3. Configure:
   - **Name:** `quran-apps-rag`
   - **R2 Bucket:** `quran-apps-directory`
   - **Source Path:** `apps/`
   - **Embedding Model:** Default (recommended)
   - **LLM:** Default (recommended)
4. Create or select an **AI Gateway** for monitoring
5. Create a **Service API token** when prompted
6. Click **"Create"**

### Step 2: Set API Token in Railway

```bash
# Link to develop environment
railway link -p 5b2fd4f4-605d-4e30-ba07-6bd97224afc6 -e develop -s "QAD Backend Api"

# Set the token
railway variables --set "CF_AI_SEARCH_TOKEN=<your_token_here>"
```

### Step 3: Verify Setup

```bash
# Test the endpoint
curl "https://qad-backend-api-develop.up.railway.app/api/search/?q=quran+memorization&use_cf=true"
```

## Files Created/Modified

### New Files

```
backend/
├── core/services/search/providers/
│   └── cloudflare.py              # CloudflareSearchProvider class
└── apps/management/commands/
    └── sync_to_r2.py              # R2 sync management command
```

### Modified Files

```
backend/
├── config/settings/base.py        # Added CF_* settings
├── core/services/search/factory.py # Added CF provider and get_cloudflare_provider()
└── apps/api/search.py             # Added use_cf parameter
```

## Environment Variables

### Railway Develop (Set)

| Variable | Value | Status |
|----------|-------|--------|
| CF_ACCOUNT_ID | 71be39fa76ea6261ea925d02b6ee15e6 | ✅ Set |
| CF_AI_SEARCH_NAME | quran-apps-rag | ✅ Set |
| CF_AI_SEARCH_TOKEN | LGDlTHoe1WEMU4-rOsEqQ-... | ✅ Set |
| R2_ACCOUNT_ID | 71be39fa76ea6261ea925d02b6ee15e6 | ✅ Set |
| R2_ACCESS_KEY_ID | 70efec12c3928f2a3bbce74ddc9fadab | ✅ Set |
| R2_SECRET_ACCESS_KEY | (secret) | ✅ Set |
| R2_BUCKET_NAME | quran-apps-directory | ✅ Set |
| R2_PUBLIC_URL | https://pub-e11717db663c469fb51c65995892b449.r2.dev | ✅ Set |

## API Usage

### Search with Cloudflare AI Search

```http
GET /api/search/?q=tajweed+quran&use_cf=true&page=1&page_size=20
```

### Response Format

```json
{
  "results": [
    {
      "id": 8,
      "slug": "tarteel",
      "name_en": "Tarteel",
      "name_ar": "ترتيل",
      "short_description_en": "AI-powered Quran memorization...",
      "cf_score": 0.9234,
      "ai_reasoning": "CF AI Search score: 0.9234"
    }
  ],
  "count": 15,
  "next": null,
  "previous": null
}
```

### Search with pgvector (default)

```http
GET /api/search/?q=tajweed+quran&page=1&page_size=20
```

## Management Commands

### Sync Apps to R2

```bash
# Sync all published apps
python manage.py sync_to_r2

# Dry run (preview only)
python manage.py sync_to_r2 --dry-run

# Sync specific app
python manage.py sync_to_r2 --app-id 123
```

## Comparison: pgvector vs CF AI Search

| Feature | pgvector + Gemini | CF AI Search |
|---------|-------------------|--------------|
| Hosting | Self-managed | Managed |
| Embeddings | Gemini text-embedding-004 | CF default model |
| Reranking | Gemini 2.5 Pro | Built-in |
| Query Rewriting | No | Yes |
| Auto-indexing | No (manual) | Yes |
| Cost | API calls only | Free (beta) |
| Latency | ~500ms | ~300ms (expected) |
| Control | High | Low |

## Future Enhancements

1. **A/B Testing:** Route percentage of traffic to CF search
2. **Hybrid Search:** Combine results from both providers
3. **Custom Embeddings:** Train on Islamic terminology
4. **Analytics:** Compare relevance scores and user engagement
5. **Caching:** Add Redis cache for frequent queries

## References

- [CF AI Search Docs](https://developers.cloudflare.com/ai-search/)
- [CF AI Search REST API](https://developers.cloudflare.com/ai-search/usage/rest-api/)
- [RAG Architecture](https://developers.cloudflare.com/reference-architecture/diagrams/ai/ai-rag/)
- [AutoRAG Tutorial](https://developers.cloudflare.com/workers-ai/tutorials/build-a-retrieval-augmented-generation-ai/)
