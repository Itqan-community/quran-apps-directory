# AI Search Implementation Plan: Model-Agnostic Architecture

**Status:** Draft
**Date:** 9 December 2025
**Author:** Senior Architect (Agent)

## 1. Executive Summary

This document outlines the architectural plan to implement a **Model-Agnostic AI Semantic Search** feature for the Quran Apps Directory. The goal is to decouple the search functionality from any specific AI provider (e.g., OpenAI), allowing the backend to switch between providers (OpenAI, DeepSeek, Local LLMs) simply by changing configuration, without code refactoring.

## 2. Objectives

1.  **Universal Database Support:** Enable vector storage in PostgreSQL using `pgvector`, independent of the generation source.
2.  **Abstraction Layer:** Create a service layer that communicates with *any* OpenAI-compatible API (standard in the industry) via configurable Base URLs.
3.  **Flexible Ingestion:** Build a re-indexing engine that transforms app data into vector-ready text blocks.
4.  **Seamless API Integration:** Expose a clean `/api/search` endpoint that handles the complexity of vector conversion and similarity search.

## 3. Architecture & Components

### 3.1. Database Infrastructure (The Storage)
*   **Technology:** PostgreSQL 15+ with `pgvector` extension.
*   **Schema Change:** Add `embedding` column to `App` model.
*   **Dimension:** Default to **1536** (Standard for `text-embedding-3-small` and many others). *Note: If a model with different dimensions is chosen later, a schema migration will be required.*

### 3.2. Universal Translator Service (The Logic)
*   **Class:** `AISearchService`
*   **Location:** `backend/core/services/search.py`
*   **Configuration:**
    *   `AI_PROVIDER`: (e.g., 'openai', 'azure', 'custom')
    *   `AI_API_KEY`: Secret key.
    *   `AI_BASE_URL`: (Optional) To point to DeepSeek, vLLM, or LocalAI.
    *   `AI_MODEL`: (e.g., `text-embedding-3-small`, `bert-base`).
*   **Interface:** `get_embedding(text: str) -> List[float]`

### 3.3. Ingestion Engine (The Worker)
*   **Command:** `reindex_embeddings`
*   **Location:** `backend/apps/management/commands/reindex_embeddings.py`
*   **Logic:**
    1.  Iterate through all `App` records.
    2.  Construct a "Rich Text Document" for each app: `Title + Category + Description + Tags`.
    3.  Call `AISearchService.get_embedding()`.
    4.  Save the resulting vector to the database.

### 3.4. Search API (The Interface)
*   **Endpoint:** `GET /api/search?q={query}`
*   **Logic:**
    1.  Receive user text query.
    2.  Convert query to vector using `AISearchService`.
    3.  Perform Cosine Similarity search on `App` table.
    4.  Return results sorted by distance.

## 4. Implementation Steps (Sub-tasks)

| Step | Task | Description | Success Criteria |
| :--- | :--- | :--- | :--- |
| 1 | **Dependencies** | Update `requirements.txt`. | `pip install` passes with `openai`, `pgvector`. |
| 2 | **Database** | Create Django migration. | `pgvector` extension enabled; `App` model has `embedding` field. |
| 3 | **Service** | Implement `AISearchService`. | Service can connect to OpenAI (or compatible URL) and return a list of floats. |
| 4 | **Ingestion** | Create `reindex_embeddings` cmd. | Command runs without error; DB is populated with vectors. |
| 5 | **API** | Implement `search_apps` endpoint. | Endpoint returns JSON results relevant to a semantic query. |
| 6 | **Routing** | Register URL router. | `/api/search` is accessible. |

## 5. Resources & Dependencies

*   **Libraries:** `openai` (v1.x), `pgvector` (django).
*   **Environment Variables:** `AI_API_KEY`, `AI_BASE_URL` (optional), `DB_URL`.
*   **Database:** PostgreSQL instance with `vector` extension allowed.

## 6. Risks & Mitigation

*   **Risk:** Model dimension mismatch (e.g., switching from OpenAI 1536d to a 768d model).
    *   *Mitigation:* The `App` model vector field must match the model dimensions. Changing models requires a DB migration to resize the column and a full re-index.
*   **Risk:** API Rate Limiting.
    *   *Mitigation:* Implement simple backoff/sleep in the re-indexing script.
