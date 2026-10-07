import { describe, it, expect } from "vitest";
import { normalizeArabic } from "@/lib/services/arabic";

describe("normalizeArabic", () => {
  it("removes tashkeel", () => {
    expect(normalizeArabic("مُحَمَّد")).toBe("محمد");
  });
  it("folds alef variants", () => {
    expect(normalizeArabic("أإآٱ")).toBe("اااا");
  });
  it("folds taa marbuta and hamza carriers", () => {
    expect(normalizeArabic("ةؤئ")).toBe("هوي");
  });
  it("handles empty string", () => {
    expect(normalizeArabic("")).toBe("");
  });
});
