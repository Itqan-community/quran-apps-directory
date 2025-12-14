# AI Search Setup Guide

This guide explains how to enable and use the AI Semantic Search feature in the Quran Apps Directory.

## Prerequisites

1.  **AI Provider API Key**: You need a valid API Key for OpenAI, DeepSeek, or Gemini.
2.  **PostgreSQL with pgvector**: The database must support the `vector` extension. (Standard on Railway).

## Setup Steps

### 1. Environment Configuration

Add the following environment variables to your `.env` file or Railway configuration:

#### Option A: OpenAI (Default)
```bash
AI_SEARCH_PROVIDER=openai
AI_API_KEY=sk-your-openai-api-key-here
AI_EMBEDDING_MODEL=text-embedding-3-small
```

#### Option B: DeepSeek
```bash
AI_SEARCH_PROVIDER=deepseek
AI_API_KEY=your-deepseek-api-key
AI_EMBEDDING_MODEL=deepseek-embed  # or appropriate model name
```

#### Option C: Gemini (Recommended)
```bash
AI_SEARCH_PROVIDER=gemini
AI_API_KEY=your-gemini-api-key
AI_EMBEDDING_MODEL=models/text-embedding-004
AI_RERANK_MODEL=gemini-2.5-flash
```

### 2. Install Dependencies

Update your python environment:

```bash
pip install -r backend/requirements.txt
```

### 3. Database Migration

Run migrations to enable `pgvector` and add the embedding column:

```bash
python manage.py migrate
```

### 4. Index Data

Generate embeddings for all existing apps. This process now includes **web crawling** of app store links to enrich the search context!

```bash
python manage.py reindex_embeddings
```

## Usage

### API Endpoint

**GET** `/api/search?q=query`

Example:
```bash
curl "http://localhost:8000/api/search?q=apps%20for%20memorization"
```

### How it Works

1.  **Ingestion**: The `reindex_embeddings` command combines the App's name, category, and description. It also **crawls the App Store/Google Play link** to get the full app description from the store page.
2.  **Embedding**: It sends this rich text to the configured AI Provider to generate a vector.
3.  **Storage**: The vector is stored in the `App.embedding` field in PostgreSQL.
4.  **Search**: When a user queries `/api/search`, their query is converted to a vector.
5.  **Comparison**: The database calculates the Cosine Distance between the query vector and all app vectors, returning the closest matches.
