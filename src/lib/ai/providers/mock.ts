import { createHash } from "node:crypto";
import type { EmbeddingProvider } from "../types";

/**
 * Deterministic, network-free provider for tests and local development.
 * Each vector is derived from the SHA-256 of `"<task>|<text>"`, so identical
 * inputs always yield identical 768-dim vectors, and document vs query
 * embeddings differ by their task tag.
 */
export class MockProvider implements EmbeddingProvider {
  readonly name = "mock" as const;
  readonly dimensions = 768;

  async embedDocument(text: string): Promise<number[]> {
    return this.embed("doc", text);
  }

  async embedQuery(text: string): Promise<number[]> {
    return this.embed("query", text);
  }

  private embed(task: "doc" | "query", text: string): number[] {
    const digest = createHash("sha256").update(`${task}|${text}`).digest();
    const values = new Array<number>(this.dimensions);
    for (let i = 0; i < this.dimensions; i++) {
      values[i] = digest[i % digest.length] / 255;
    }
    return values;
  }
}
