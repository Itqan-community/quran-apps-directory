import { describe, expect, it } from "vitest";
import { formatAppCount } from "@/lib/listing-format";

describe("formatAppCount", () => {
  it("formats finite counts", () => {
    expect(formatAppCount(0)).toBe("0");
    expect(formatAppCount(123)).toBe("123");
  });

  it("returns null for unknown or invalid counts", () => {
    expect(formatAppCount(null)).toBeNull();
    expect(formatAppCount(undefined)).toBeNull();
    expect(formatAppCount(Number.NaN)).toBeNull();
  });
});
