import { describe, it, expect } from "vitest";
import { itemListJsonLd } from "@/lib/seo/jsonld";

const app = {
  id: 1,
  slug: "app-a",
  nameEn: "App A",
  nameAr: "تطبيق أ",
  shortDescriptionEn: "d",
  shortDescriptionAr: "د",
  applicationIcon: "icon.png",
  avgRating: "4.50",
};

describe("itemListJsonLd pagination", () => {
  it("reports the total and offsets positions by the page", () => {
    const ld = itemListJsonLd([app], null, "en", { total: 123, offset: 20 });
    expect(ld.numberOfItems).toBe(123);
    expect(ld.itemListElement[0].position).toBe(21);
    expect(ld.itemListElement[0].name).toBe("App A");
  });

  it("defaults numberOfItems/positions to the passed items", () => {
    const ld = itemListJsonLd([app], null, "en");
    expect(ld.numberOfItems).toBe(1);
    expect(ld.itemListElement[0].position).toBe(1);
  });
});
