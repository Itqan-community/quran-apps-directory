import { describe, it, expect, vi, beforeEach } from "vitest";
import { EmbeddingUnavailableError } from "@/lib/ai/types";
import { getEmbeddingProvider, aiSearchVersion } from "@/lib/ai/provider";
import { MockProvider } from "@/lib/ai/providers/mock";

const env = (v: Record<string, string | undefined>) =>
  vi.stubEnv("AI_SEARCH_PROVIDER", v.p!) && vi.stubEnv("AI_API_KEY", v.key ?? "");

// Isolate env per test: baseline is the safe, network-free mock provider.
// GEMINI_API_KEY must be stubbed too: with `AI_API_KEY || GEMINI_API_KEY`
// resolution, an ambient GEMINI_API_KEY would leak into the unconfigured-gemini
// test, which never stubs fetch (it would become a live request).
beforeEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.stubEnv("AI_SEARCH_PROVIDER", "mock");
  vi.stubEnv("AI_API_KEY", "");
  vi.stubEnv("GEMINI_API_KEY", "");
});

describe("smart search embedding providers", () => {
  it("mock is deterministic, length 768, unit-ish; document vs query differ by task tag", async () => {
    const p = new MockProvider();
    const a = await p.embedQuery("ورش");
    const b = await p.embedQuery("ورش");
    expect(a).toEqual(b); expect(a).toHaveLength(768);
    expect(a).not.toEqual(await p.embedDocument("ورش"));
  });

  it("factory picks by env; unknown/unconfigured -> EmbeddingUnavailableError at call time", async () => {
    env({ p: "mock" }); expect(getEmbeddingProvider().name).toBe("mock");
    env({ p: "" }); // gemini default, no key
    await expect(getEmbeddingProvider().embedQuery("q"))
      .rejects.toBeInstanceOf(EmbeddingUnavailableError);
  });

  it("gemini: POST embedContent with taskType + outputDimensionality=768; malformed body -> typed error", async () => {
    env({ p: "gemini", key: "K" });
    const fetchMock = vi.fn().mockResolvedValue(new Response(
      JSON.stringify({ embedding: { values: Array.from({ length: 768 }, () => 0.1) } }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const p = getEmbeddingProvider();
    await p.embedQuery("quran");
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain("models/gemini-embedding-001:embedContent");
    const body = JSON.parse(init.body);
    expect(body).toMatchObject({ taskType: "retrieval_query", outputDimensionality: 768 });
    fetchMock.mockResolvedValue(new Response("{}", { status: 200 })); // malformed
    await expect(p.embedQuery("q")).rejects.toBeInstanceOf(EmbeddingUnavailableError);
  });

  it("gemini: blank AI_API_KEY falls through to GEMINI_API_KEY (shipped .env.example shape)", async () => {
    env({ p: "gemini", key: "" }); // AI_API_KEY= as shipped in .env.example
    vi.stubEnv("GEMINI_API_KEY", "G");
    const fetchMock = vi.fn().mockResolvedValue(new Response(
      JSON.stringify({ embedding: { values: Array.from({ length: 768 }, () => 0.1) } }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    await getEmbeddingProvider().embedQuery("q");
    expect(fetchMock.mock.calls[0][1].headers["x-goog-api-key"]).toBe("G");
  });

  it("openai: Bearer key, dimensions 768, AI_BASE_URL honored", async () => {
    env({ p: "openai", key: "K" });
    vi.stubEnv("AI_BASE_URL", "https://example.com/v1");
    const fetchMock = vi.fn().mockResolvedValue(new Response(
      JSON.stringify({ data: [{ embedding: Array.from({ length: 768 }, () => 0.2) }] }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    await getEmbeddingProvider().embedDocument("t");
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toBe("https://example.com/v1/embeddings");
    expect(init.headers.Authorization).toBe("Bearer K");
    expect(JSON.parse(init.body)).toMatchObject({ dimensions: 768 });
  });

  it("aiSearchVersion encodes provider+model", () => { expect(aiSearchVersion()).toMatch(/^mock:.+/); });
});
