import { describe, it, expect } from "vitest";
import { digests } from "@/lib/services/notifications/digests";

// Task 7 appends the dispatch/worker describe blocks to this file; the
// registry metadata tests below only import the registry itself.
describe("digest registry", () => {
  it("declares at least one digest", () => {
    expect(digests.length).toBeGreaterThanOrEqual(1);
  });

  it("has unique digest names", () => {
    const names = digests.map((d) => d.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it("every digest has a non-empty name, cronEnvVar, and build function", () => {
    for (const def of digests) {
      expect(def.name.length).toBeGreaterThan(0);
      expect(def.cronEnvVar.length).toBeGreaterThan(0);
      expect(def.build).toBeTypeOf("function");
    }
  });

  it("includes the pending-submissions digest wired to its cron env var", () => {
    const def = digests.find((d) => d.name === "pending-submissions");
    expect(def).toBeDefined();
    expect(def?.cronEnvVar).toBe("DIGEST_PENDING_SUBMISSIONS_CRON");
    expect(def?.webhookEnvVar).toBeUndefined();
  });
});
