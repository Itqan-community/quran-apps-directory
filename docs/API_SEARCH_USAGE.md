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

## Example Mockup

> **[Icon] Noorani Qaida**  ✨ *AI Top Pick*
> *Tooltip: "Rated best for 3-year-olds due to its simple interface and audio prompts."*
>
> Description: The classic way to learn...
