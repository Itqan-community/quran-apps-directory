import { describe, it, expect } from "vitest";
import { sortOrdering } from "@/lib/repo/apps-rows";

describe("sortOrdering (public ?sort= → internal ordering CSV)", () => {
  it("maps newest to created_at desc (locale-independent)", () => {
    expect(sortOrdering("newest", "en")).toBe("created_at,desc");
    expect(sortOrdering("newest", "ar")).toBe("created_at,desc");
  });

  it("maps rating to avg_rating desc (locale-independent)", () => {
    expect(sortOrdering("rating", "en")).toBe("avg_rating,desc");
    expect(sortOrdering("rating", "ar")).toBe("avg_rating,desc");
  });

  it("maps az to name_en in EN", () => {
    expect(sortOrdering("az", "en")).toBe("name_en");
  });

  it("maps az to name_ar in AR", () => {
    expect(sortOrdering("az", "ar")).toBe("name_ar");
  });

  it("maps featured (and thus the default) to featured-first ordering", () => {
    expect(sortOrdering("featured", "en")).toBe("featured_first");
    expect(sortOrdering("featured", "ar")).toBe("featured_first");
  });

  it("falls back to the curated default for missing or unknown values", () => {
    expect(sortOrdering(undefined, "en")).toBeUndefined();
    expect(sortOrdering("", "ar")).toBeUndefined();
    expect(sortOrdering("bogus", "ar")).toBeUndefined();
  });
});
