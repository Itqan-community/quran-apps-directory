/** Shared types for the AI embedding provider layer (smart RAG search). */

export interface EmbeddingProvider {
  readonly name: "gemini" | "openai" | "mock";
  readonly dimensions: number; // always 768
  embedDocument(text: string): Promise<number[]>;
  embedQuery(text: string): Promise<number[]>;
}

/**
 * Thrown when a provider is unconfigured, unreachable, or returns a
 * malformed payload. Carries the underlying error (if any) on `cause`.
 */
export class EmbeddingUnavailableError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "EmbeddingUnavailableError";
  }
}
