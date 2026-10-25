import { type EmbeddingProvider, EmbeddingUnavailableError } from "./types";
import { MockProvider } from "./providers/mock";
import { createGeminiProvider } from "./providers/gemini";
import { createOpenAIProvider } from "./providers/openai";

/** Fallback model per provider, used by aiSearchVersion() when AI_EMBEDDING_MODEL is unset. */
const DEFAULT_MODEL: Record<EmbeddingProvider["name"], string> = {
  gemini: "models/gemini-embedding-001",
  openai: "text-embedding-3-small",
  mock: "mock",
};

/**
 * Picks the embedding provider from AI_SEARCH_PROVIDER (default "gemini").
 * Never throws: unconfigured or unknown providers fail at call time with
 * EmbeddingUnavailableError, so importing this module is always safe.
 */
export function getEmbeddingProvider(): EmbeddingProvider {
  const name = providerName();
  switch (name) {
    case "mock":
      return new MockProvider();
    case "openai":
      return createOpenAIProvider();
    case "gemini":
      return createGeminiProvider();
    default:
      return unavailableProvider(`unknown AI_SEARCH_PROVIDER "${name}"`);
  }
}

/** `${provider.name}:${sanitized model}` — a stable cache-key ingredient. */
export function aiSearchVersion(provider?: EmbeddingProvider): string {
  const name = provider?.name ?? providerName();
  const defaultModel = DEFAULT_MODEL[name as EmbeddingProvider["name"]] ?? "gemini";
  const model = (process.env.AI_EMBEDDING_MODEL ?? defaultModel).replace(/[^a-z0-9.]/gi, "");
  return `${name}:${model}`;
}

function providerName(): string {
  return (process.env.AI_SEARCH_PROVIDER ?? "").trim().toLowerCase() || "gemini";
}

/** Stub for unknown AI_SEARCH_PROVIDER values: fails at call time, never at import. */
function unavailableProvider(reason: string): EmbeddingProvider {
  const fail = async (): Promise<number[]> => {
    throw new EmbeddingUnavailableError(reason);
  };
  // `name` is a type constraint; this provider is unusable and always throws.
  return { name: "gemini", dimensions: 768, embedDocument: fail, embedQuery: fail };
}
