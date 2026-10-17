import { EmbeddingProvider, EmbeddingUnavailableError } from "../types";

const DIMENSIONS = 768;
const DEFAULT_MODEL = "text-embedding-3-small";
const MAX_INPUT_CHARS = 2000;

/** OpenAI-compatible embedding provider (native fetch, no SDK). Honors AI_BASE_URL for proxies. */
export function createOpenAIProvider(): EmbeddingProvider {
  return {
    name: "openai",
    dimensions: DIMENSIONS,
    embedDocument: (text) => embed(text),
    embedQuery: (text) => embed(text),
  };
}

async function embed(text: string): Promise<number[]> {
  const apiKey = process.env.AI_API_KEY;
  if (!apiKey) {
    throw new EmbeddingUnavailableError("openai provider not configured: set AI_API_KEY");
  }
  const model = process.env.AI_EMBEDDING_MODEL ?? DEFAULT_MODEL;
  // AI_BASE_URL is the full base (version included); only the endpoint is appended.
  const baseUrl = (process.env.AI_BASE_URL ?? "https://api.openai.com/v1").replace(/\/+$/, "");
  const url = `${baseUrl}/embeddings`;
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        input: text.slice(0, MAX_INPUT_CHARS),
        dimensions: DIMENSIONS,
      }),
    });
  } catch (cause) {
    throw new EmbeddingUnavailableError("openai embed request failed", { cause });
  }
  if (!res.ok) {
    throw new EmbeddingUnavailableError(`openai embed request failed: HTTP ${res.status}`);
  }
  let data: unknown;
  try {
    data = await res.json();
  } catch (cause) {
    throw new EmbeddingUnavailableError("openai embed response is not valid JSON", { cause });
  }
  const embedding = (data as { data?: { embedding?: unknown }[] })?.data?.[0]?.embedding;
  if (
    !Array.isArray(embedding) ||
    embedding.length !== DIMENSIONS ||
    embedding.some((v) => typeof v !== "number")
  ) {
    throw new EmbeddingUnavailableError(
      "openai embed response malformed: expected data[0].embedding with 768 numbers"
    );
  }
  return embedding as number[];
}
