import { describe, it, expect } from "vitest";
import { suggestQuery, levenshtein, QUERY_ALIASES } from "@/lib/ai/suggest";

describe("QUERY_ALIASES", () => {
  it("exposes lowercase latin keys and normalized arabic keys", () => {
    expect(QUERY_ALIASES["wersh"]).toBe("warsh");
    expect(QUERY_ALIASES["kuran"]).toBe("quran");
    expect(QUERY_ALIASES["قران"]).toBe("قرآن");
    expect(QUERY_ALIASES["Wersh"]).toBeUndefined(); // latin keys are lowercase
  });
});

describe("levenshtein", () => {
  it("computes the classic edit distance", () => {
    expect(levenshtein("hsfs", "hafs")).toBe(1);
    expect(levenshtein("alqran", "quran")).toBe(3);
    expect(levenshtein("quran", "quran")).toBe(0);
    expect(levenshtein("", "abc")).toBe(3);
  });
});

describe("suggestQuery", () => {
  it("aliases exact token hits are replaced", () => {
    expect(suggestQuery("werSh mishaf", ["hafs", "mushaf"])).toBe("warsh mushaf");
    expect(suggestQuery("قران كريم", [])).toBe("قرآن كريم");
  });

  it("levenshtein distance <=2 suggests nearest vocab word for tokens >=4 chars", () => {
    // Ruling R3 (literal). "alqran" is 3 edits from "quran" (beyond the <=2 fuzzy
    // threshold), so it is caught by the curated alias alqran -> quran, not fuzzy.
    expect(suggestQuery("alqran", ["quran"])).toBe("quran");
    expect(suggestQuery("hsfs", ["hafs"])).toBe("hafs");
  });

  it("prefers the strictly smaller distance, breaking ties lexicographically", () => {
    // "abcd" is 1 edit from both "abcy" and "abxd" (tie) -> lexicographically first.
    expect(suggestQuery("abcd", ["abxd", "abcy"])).toBe("abcy");
    // "abcde" is 1 edit from "abcdef" and 3 edits from "abxyz" -> nearest wins.
    expect(suggestQuery("abcde", ["abxyz", "abcdef"])).toBe("abcdef");
  });

  it("returns null when nothing improves", () => {
    expect(suggestQuery("quran", ["quran", "warsh"])).toBeNull();
    expect(suggestQuery("ab", ["ab"])).toBeNull(); // token <4 chars: no levenshtein guessing
  });
});
