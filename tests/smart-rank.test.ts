import { describe, it, expect } from "vitest";
import {
  tokenizeQuery,
  computeIdf,
  keywordScore,
  metadataBoost,
  qualityScore,
  combinedScore,
} from "@/lib/ai/rank";

describe("tokenizeQuery", () => {
  it("normalizes Arabic + drops stopwords <2 chars", () => {
    expect(tokenizeQuery("مُصْحَفِ الوَرْش!")).toEqual(["مصحف", "الورش"]);
    expect(tokenizeQuery("a و")).toEqual([]); // latin 1-char + arabic 1-char dropped
    expect(tokenizeQuery("!!!")).toEqual([]);
  });
});

describe("computeIdf", () => {
  it("weights rare tokens higher", () => {
    const idf = computeIdf(["ورش quran quran", "quran"], ["ورش", "quran"]);
    expect(idf.get("ورش")!).toBeGreaterThan(idf.get("quran")!);
  });
});

describe("keywordScore", () => {
  it("respects field priorities and normalizes to [0,1]", () => {
    const idf = computeIdf(["alpha alpha gamma"], ["alpha"]);
    const hit = keywordScore({ name: "alpha", full: "gamma", short: "", category: "" }, ["alpha"], idf);
    const part = keywordScore({ name: "", full: "alpha gamma", short: "", category: "" }, ["alpha"], idf);
    expect(hit).toBe(1); // name is the strongest field: a complete hit scores 1.0
    expect(part).toBeCloseTo(0.5, 5); // full-desc priority is half of name's
  });

  it("matches the bare form of an Arabic definite-article token", () => {
    const idf = computeIdf(["وحي wahy"], ["الوحي"]);
    expect(keywordScore({ name: "وحي wahy", full: "", short: "", category: "" }, ["الوحي"], idf)).toBe(1);
    expect(keywordScore({ name: "قرآن", full: "", short: "", category: "" }, ["الوحي"], idf)).toBe(0);
  });
});

describe("metadataBoost", () => {
  it("caps at 1 normalized (raw cap 2.0) and emits bilingual reasons", () => {
    const labels = [
      { type: "riwayah", value: "warsh", labelEn: "Warsh", labelAr: "ورش" },
      { type: "features", value: "offline", labelEn: "Offline", labelAr: "بدون إنترنت" },
      { type: "riwayah", value: "hafs", labelEn: "Hafs", labelAr: "حفص" },
    ];
    const { score, reasons } = metadataBoost(labels, ["warsh", "offline"]);
    expect(reasons).toHaveLength(2);
    expect(reasons[0]).toEqual({ type: "riwayah", value: "warsh", labelEn: "Warsh", labelAr: "ورش" });
    // Literal to the formula: min(1, (0.25 * 2) / 2.0) = 0.25
    expect(score).toBe(0.25);
  });
});

describe("combinedScore", () => {
  it("uses legacy weights; fallback distribution when vectorSim null", () => {
    expect(combinedScore({ vectorSim: 1, keyword: 1, metadata: 1, quality: 1 })).toBeCloseTo(1, 6);
    expect(combinedScore({ vectorSim: null, keyword: 1, metadata: 1, quality: 1 })).toBeCloseTo(1, 6);
    expect(combinedScore({ vectorSim: 0, keyword: 0, metadata: 0, quality: 0 })).toBe(0);
  });
});

describe("qualityScore", () => {
  it("anchors: 0 / great app", () => {
    expect(qualityScore({ avgRating: "0.00", reviewCount: 0, viewCount: 0 })).toBe(0);
    expect(qualityScore({ avgRating: "5.00", reviewCount: 1000, viewCount: 10000 })).toBeCloseTo(1, 6);
  });
});
