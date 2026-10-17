import { EmbeddingProvider, EmbeddingUnavailableError } from "../types";

const DIMENSIONS = 768;
const DEFAULT_MODEL = "models/gemini-embedding-001";
const MAX_INPUT_CHARS = 2000;

type TaskType = "retrieval_document" | "retrieval_query";

/** Gemini embedding provider (native fetch, no SDK). */
export function createGeminiProvider(): EmbeddingProvider {
  return {
    name: "gemini",
    dimensions: DIMENSIONS,
    embedDocument: (text) => embed("retrieval_document", text),
    embedQuery: (text) => embed("retrieval_query", text),
  };
}

async function embed(taskType: TaskType, text: string): Promise<number[]> {
  const apiKey = process.env.AI_API_KEY ?? process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new EmbeddingUnavailableError(
      "gemini provider not configured: set AI_API_KEY (or GEMINI_API_KEY)"
    );
  }
  const model = process.env.AI_EMBEDDING_MODEL ?? DEFAULT_MODEL;
  const url = `https://generativelanguage.googleapis.com/v1beta/${model}:embedContent`;
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        content: { parts: [{ text: text.slice(0, MAX_INPUT_CHARS) }] },
        taskType,
        outputDimensionality: DIMENSIONS,
      }),
    });
  } catch (cause) {
    throw new EmbeddingUnavailableError("gemini embed request failed", { cause });
  }
  if (!res.ok) {
    throw new EmbeddingUnavailableError(`gemini embed request failed: HTTP ${res.status}`);
  }
  let data: unknown;
  try {
    data = await res.json();
  } catch (cause) {
    throw new EmbeddingUnavailableError("gemini embed response is not valid JSON", { cause });
  }
  const values = (data as { embedding?: { values?: unknown } })?.embedding?.values;
  if (
    !Array.isArray(values) ||
    values.length !== DIMENSIONS ||
    values.some((v) => typeof v !== "number")
  ) {
    throw new EmbeddingUnavailableError(
      "gemini embed response malformed: expected embedding.values with 768 numbers"
    );
  }
  return values as number[];
}
