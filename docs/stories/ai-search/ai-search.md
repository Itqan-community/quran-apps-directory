# AI Search Implementation Plan: The "Professor & Librarian" Architecture

**Status:** Implementation Complete
**Date:** 9 December 2025
**Author:** Senior Architect (Agent)

## 1. Executive Summary

This document outlines the architectural plan to implement a **Model-Agnostic, Retrieve-Then-Reason AI Search** for the Quran Apps Directory.

The system adopts a **"Professor & Librarian" architecture**:
1.  **The Librarian (Retrieval):** Uses efficient vector embeddings (`pgvector` + `text-embedding-004`) to quickly fetch a broad set of candidate apps.
2.  **The Professor (Reasoning):** Uses **Gemini 1.5 Pro** to "read" the user's intent and "curate" the final results, re-ranking them by strict relevance and providing synthesis.

This approach combines the speed of vector search with the deep reasoning capabilities of Large Language Models (LLMs), solving the common problem of "fuzzy" or irrelevant search results in bilingual (Arabic/English) contexts.

## 2. Objectives

1.  **Provider Agnostic Core:** A flexible `AISearchProvider` interface that supports OpenAI, Gemini, DeepSeek, or local models.
2.  **Rich Context Ingestion:** An ingestion engine that crawls App Store/Google Play links to index the *full* app content, not just the directory's short description.
3.  **Intelligent Retrieval Pipeline:** A two-stage search process:
    *   **Stage 1:** Vector Similarity Search (Fast retrieval of top 30-50 candidates).
    *   **Stage 2:** LLM Reranking (Intelligent sorting and filtering by Gemini Pro).
4.  **Seamless API:** A `/api/search` endpoint that abstracts this complexity from the frontend.

## 3. Architecture & Components

### 3.1. Database Infrastructure (The Storage)
*   **Technology:** PostgreSQL 15+ with `pgvector` extension.
*   **Schema:** `App` model includes an `embedding` column (VectorField).
*   **Dimension Strategy:** Default to **768** (for Google `text-embedding-004`) or **1536** (OpenAI `text-embedding-3-small`). Configurable via settings.

### 3.2. Universal Provider Layer (The Adapters)
*   **Interface:** `AISearchProvider` (Abstract Base Class)
    *   `get_embedding(text)`
    *   `rerank(query, documents)` (New capability)
*   **Implementations:**
    *   `GeminiSearchProvider`: Uses `google-generativeai` SDK. Implements Reranking.
    *   `OpenAISearchProvider`: Uses `openai` SDK (also compatible with DeepSeek/Local).
*   **Factory:** `AISearchFactory` selects provider based on `.env`.

### 3.3. Ingestion Engine (The Crawler)
*   **Component:** `AppCrawler` & `reindex_embeddings` command.
*   **Workflow:**
    1.  Load App.
    2.  Check for `google_play_link` / `app_store_link`.
    3.  **Crawl:** Fetch and sanitize text from the store page using `AppCrawler`.
    4.  **Combine:** `Name + Category + Local Description + Crawled Store Description`.
    5.  **Vectorize:** Generate embedding via Provider.
    6.  **Store:** Save to DB.

### 3.4. Search Service (The Orchestrator)
*   **Class:** `AISearchService`
*   **Workflow (`search_apps`):**
    1.  **Query Expansion (Optional):** Use LLM to clarify vague queries (e.g., "kids" -> "educational, hifz, alphabet, stories").
    2.  **Vector Search:** Query `pgvector` for top 50 candidates.
    3.  **Reranking:** Send the Query + Top 50 Metadata to Gemini Flash.
        *   *Prompt:* "Rank these apps for the user query '{q}'. Return top 20 JSON."
    4.  **Response:** Return the re-ordered list to the API.

*   **Workflow (`hybrid_search`):**
    1.  **Query Augmentation:** If filters are provided, augment the query with bilingual filter context (e.g., `[Filter: Warsh (ورش) riwayah]`). Filter values are resolved to bilingual labels via `MetadataOption` lookup.
    2.  **Vector Search:** Query `pgvector` for top candidates from **all published apps** (no hard pre-filtering).
    3.  **Metadata Boosting:** Calculate boost scores based on query-metadata keyword matches.
    4.  **LLM Reranking:** Rerank top candidates with filter context passed to the reranker.
    5.  **Facets:** Calculate facet counts from the full published app set.
    6.  **Response:** Return results with match_reasons, relevance_score, and facets.

## 4. Implementation Plan (Task List)

### Phase 1: Foundation (Provider & Storage)
*   [x] **Dependencies:** Install `google-generativeai`, `openai`, `pgvector`, `beautifulsoup4`.
*   [x] **Database:** Enable `pgvector` extension and add `embedding` field to `App`.
*   [x] **Interface:** Define `AISearchProvider` abstract base class.
*   [x] **Providers:** Implement `OpenAISearchProvider` and `GeminiSearchProvider`.
*   [x] **Factory:** Implement `AISearchFactory` for dependency injection.

### Phase 2: Data Ingestion (The Librarian)
*   [x] **Crawler:** Implement `AppCrawler` to fetch text from URLs.
*   [x] **Ingestion Logic:** Update `prepare_app_text` to include crawled content.
*   [x] **Refinement:** Ensure `reindex_embeddings` handles crawling errors gracefully and respects rate limits.

### Phase 3: The "Professor" (Reasoning & Reranking)
*   [x] **Rerank Interface:** Add `rerank(query, docs)` method to `AISearchProvider`.
*   [x] **Gemini Rerank:** Implement `rerank` in `GeminiSearchProvider` using a specialized prompt for Gemini 1.5 Pro.
*   [x] **OpenAI Rerank:** Implement fallback `rerank` (basic pass-through) for OpenAI.
*   [x] **Orchestration:** Update `AISearchService.search_apps` to call `rerank` after `get_embedding`.

### Phase 4: Integration & Optimization
*   [x] **API Update:** Ensure `/api/search` uses the full pipeline.
*   [ ] **Testing:** Verify "Hifz for kids" returns better results with Reranking enabled vs disabled.
*   [ ] **Performance:** Measure latency. If Gemini Pro Rerank is > 2s, consider falling back to Flash or caching.

## 5. Risks & Mitigation

*   **Latency:** Calling an LLM for reranking adds time.
    *   *Mitigation:* Use **Gemini 1.5 Flash** for reranking (faster/cheaper) instead of Pro if latency is high. Use Pro only for complex queries.
*   **Cost:** Reranking every search uses input tokens.
    *   *Mitigation:* Cache search results (Redis) for common queries. Limit reranking to top 20-30 items.
*   **Crawling Reliability:** Store pages change structure.
    *   *Mitigation:* `AppCrawler` should fail silently and fall back to local descriptions.

## 6. Resources

*   **Google AI Studio:** For Gemini API Keys.
*   **Railway:** For hosting PostgreSQL + Python Backend.
