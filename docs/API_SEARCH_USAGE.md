# AI Search Usage Guide (Frontend)

## Overview

The new `/api/search` endpoint now includes an AI-powered "Reasoning" engine. When a user searches, the backend not only finds apps by keyword/similarity but also uses a Generative AI (Gemini 1.5) to analyze *why* a specific app is a good fit for their query.

## Endpoint

`GET /api/search?q={query}`

### Response Format

The response remains a paginated list of apps, but each app object now includes an **optional** field: `ai_reasoning`.

```json
{
  "items": [
    {
      "id": "uuid-...",
      "name_en": "Noorani Qaida",
      "description_en": "Learn to read Quran...",
      "ai_reasoning": "This app is specifically designed for beginners and children, matching the user's intent for 'kids learning'.",
      ...
    }
  ],
  "count": 50,
  ...
}
```

## UI Implementation Guidelines

### 1. The "Why this result?" Tooltip
*   **Trigger:** If `ai_reasoning` is present and not null/empty.
*   **Visual:** Add a small "Sparkle" icon (✨) or "AI" badge next to the app title in the search results.
*   **Interaction:** Hovering or clicking this badge should show the text from `ai_reasoning`.
*   **Example Text:** *"This app focuses on memorization tools like repetition and recording, which aligns with your search for 'hifz helper'."*

### 2. Result Ordering
*   The API returns results **already sorted by AI relevance**. Trust the order.
*   The top 5-10 results are usually "Reranked" by the LLM and are highly accurate.
*   Results further down might lack the `ai_reasoning` field (as they were outside the top-k reranking window). This is normal.

### 3. Empty States
*   If `ai_reasoning` is missing, do not show the badge.
*   This feature is an enhancement, not a dependency. The app works fine without it.

## Hybrid Search Endpoint

`GET /api/search/hybrid/?q={query}&features=offline&riwayah=hafs`

The hybrid search endpoint supports **soft metadata filters** that boost matching apps without excluding others.

### Filter Parameters

| Parameter | Example | Description |
|-----------|---------|-------------|
| `features` | `offline,audio` | Comma-separated feature filters |
| `riwayah` | `hafs,warsh` | Comma-separated riwayah filters |
| `mushaf_type` | `madani,uthmani` | Comma-separated mushaf type filters |
| `platform` | `android,ios` | Comma-separated platform filters |
| `category` | `mushaf,tafsir` | Comma-separated category slugs |
| `include_facets` | `true` | Include facet counts (default: true) |
| `use_cf` | `false` | Use CF AI Search instead of pgvector (default: false) |

### How Soft Filters Work

Filters are converted to bilingual semantic context and appended to the query before embedding generation. This means:
- All published apps are still returned in results
- Apps matching the filters naturally rank higher via vector similarity
- No apps are excluded - users see the full picture with relevant apps at the top

### Response Format

```json
{
  "results": [
    {
      "id": 1,
      "name_en": "Quran Warsh",
      "ai_reasoning": "Highly relevant for warsh recitation...",
      "match_reasons": [
        {"type": "riwayah", "value": "warsh", "label_en": "Warsh", "label_ar": "ورش"}
      ],
      "relevance_score": 0.95
    }
  ],
  "count": 30,
  "facets": {
    "riwayah": [{"value": "hafs", "label_en": "Hafs", "label_ar": "حفص", "count": 15}],
    "features": [{"value": "offline", "label_en": "Offline Mode", "label_ar": "بدون إنترنت", "count": 10}]
  },
  "next": null,
  "previous": null
}
```

## Example Mockup

> **[Icon] Noorani Qaida**  ✨ *AI Top Pick*
> *Tooltip: "Rated best for 3-year-olds due to its simple interface and audio prompts."*
>
> Description: The classic way to learn...
