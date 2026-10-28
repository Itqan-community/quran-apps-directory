import { describe, expect, it } from "vitest";
import { categoryHref, searchHref, sortQuery } from "@/lib/listing-links";

describe("listing link helpers", () => {
  it("omits the featured sort", () => {
    expect(sortQuery("featured")).toBe("");
    expect(sortQuery()).toBe("");
  });

  it("keeps and encodes a non-default sort", () => {
    expect(sortQuery("newest")).toBe("?sort=newest");
    expect(sortQuery("a b")).toBe("?sort=a%20b");
  });

  it("builds category and all links with the sort", () => {
    expect(categoryHref("en", "mushaf", "newest")).toBe("/en/mushaf?sort=newest");
    expect(categoryHref("ar", undefined, "newest")).toBe("/ar?sort=newest");
    expect(categoryHref("en", "mushaf", "featured")).toBe("/en/mushaf");
  });

  it("builds traditional and smart search links", () => {
    expect(searchHref("en", "ayah")).toBe("/en/apps?search=ayah");
    expect(searchHref("en", "  ayah  ", "smart")).toBe("/en/apps?search=ayah&mode=smart");
    expect(searchHref("ar", "تجويد", "smart")).toBe(
      "/ar/apps?search=%D8%AA%D8%AC%D9%88%D9%8A%D8%AF&mode=smart",
    );
    expect(searchHref("en", "   ")).toBe("/en/apps");
  });
});
