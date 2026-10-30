import { describe, it, expect } from "vitest";
import { orderingComparator, sortOrdering } from "@/lib/repo/apps-rows";

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

describe("orderingComparator (ordering CSV → JS comparator)", () => {
  const row = (
    nameEn: string,
    nameAr: string,
    avgRating: string,
    createdAt: string,
    sortOrder: number,
  ) => ({ nameEn, nameAr, avgRating, createdAt: new Date(createdAt), sortOrder });
  const alpha = row("Alpha", "ألفا", "4.50", "2024-01-01T00:00:00Z", 2);
  const beta = row("Beta", "بيتا", "3.00", "2025-01-01T00:00:00Z", 1);
  const rows = [alpha, beta];

  it("returns null for the default/unknown ordering: the caller keeps its own order", () => {
    expect(orderingComparator(undefined)).toBeNull();
    expect(orderingComparator("featured_first")).toBeNull();
    expect(orderingComparator("bogus")).toBeNull();
  });

  it("orders by name, rating, created_at and sort_order with the CSV direction", () => {
    const names = (ordering: string) =>
      [...rows].sort(orderingComparator(ordering)!).map((r) => r.nameEn);

    expect(names("name_en")).toEqual(["Alpha", "Beta"]);
    expect(names("avg_rating,desc")).toEqual(["Alpha", "Beta"]);
    expect(names("created_at,desc")).toEqual(["Beta", "Alpha"]);
    expect(names("sort_order")).toEqual(["Beta", "Alpha"]);
  });

  it("keeps ties in the incoming order (stable sort)", () => {
    const sameDay = new Date("2025-01-01T00:00:00Z");
    const a = { ...alpha, createdAt: sameDay };
    const b = { ...beta, createdAt: sameDay };
    const names = (rows: typeof a[]) =>
      [...rows].sort(orderingComparator("created_at,desc")!).map((r) => r.nameEn);

    expect(names([a, b])).toEqual(["Alpha", "Beta"]);
    expect(names([b, a])).toEqual(["Beta", "Alpha"]);
  });
});
