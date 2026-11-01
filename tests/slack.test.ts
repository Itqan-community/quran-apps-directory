import { describe, it, expect, vi, afterEach } from "vitest";
import { slackBackend, postToSlack, postToSlackUrl, type SlackMessage } from "@/lib/services/slack";
import { newSubmissionMessage, pendingDigestMessage } from "@/lib/services/slack";

const msg: SlackMessage = { text: "hello" };
const okTransport = () => async () => ({ ok: true, status: 200 });

afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); });

describe("slackBackend", () => {
  it("is none when SLACK_WEBHOOK_URL is unset", () => {
    vi.stubEnv("SLACK_WEBHOOK_URL", "");
    expect(slackBackend()).toBe("none");
  });

  it("flips to webhook when SLACK_WEBHOOK_URL is set", () => {
    vi.stubEnv("SLACK_WEBHOOK_URL", "https://hooks.slack.test/T1/B1/x");
    expect(slackBackend()).toBe("webhook");
  });
});

describe("postToSlackUrl", () => {
  it("posts JSON to the URL through the injected transport", async () => {
    vi.stubEnv("SLACK_WEBHOOK_URL", "");
    const transport = vi.fn(okTransport());
    await postToSlackUrl("https://hooks.slack.test/T1/B1/x", msg, transport);
    expect(transport).toHaveBeenCalledWith(
      "https://hooks.slack.test/T1/B1/x",
      expect.objectContaining({ text: "hello" }),
    );
  });

  it("throws on a non-ok response", async () => {
    const transport = vi.fn(async () => ({ ok: false, status: 500 }));
    await expect(
      postToSlackUrl("https://hooks.slack.test/T1/B1/x", msg, transport),
    ).rejects.toThrow("[slack] post failed (HTTP 500)");
  });

  it("is a logged no-op when its argument URL is empty", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    const transport = vi.fn(okTransport());
    const p = postToSlackUrl("", msg, transport);
    await expect(p).resolves.toBeUndefined();
    expect(transport).not.toHaveBeenCalled();
    expect(info.mock.calls.some((c) => String(c[0]).includes("[slack]"))).toBe(true);
  });
});

describe("postToSlack", () => {
  it("delegates to the env SLACK_WEBHOOK_URL", async () => {
    vi.stubEnv("SLACK_WEBHOOK_URL", "https://hooks.slack.test/T1/B1/env");
    const transport = vi.fn(okTransport());
    await postToSlack(msg, transport);
    expect(transport).toHaveBeenCalledWith(
      "https://hooks.slack.test/T1/B1/env",
      expect.objectContaining({ text: "hello" }),
    );
  });

  it("is a logged no-op when the env URL is empty", async () => {
    vi.stubEnv("SLACK_WEBHOOK_URL", "");
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    const transport = vi.fn(okTransport());
    const p = postToSlack({ text: "x" }, transport);
    await expect(p).resolves.toBeUndefined();
    expect(transport).not.toHaveBeenCalled();
    expect(info.mock.calls.some((c) => String(c[0]).includes("[slack]"))).toBe(true);
  });
});

const NOW = new Date("2026-11-01T09:00:00Z");
const DAY = 24 * 60 * 60 * 1000;

describe("message builders", () => {
  it("newSubmissionMessage embeds the admin review URL and facts", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "http://localhost:3000");
    const m = newSubmissionMessage({
      trackingId: "QAD-ABC123", appNameEn: "Test App", appNameAr: "تطبيق",
      submitterName: "Ahmed", submitterEmail: "ahmed@test.dev",
      categories: ["Quran", "Kids"], submissionId: 42, submittedAt: NOW,
    }, NOW);
    const json = JSON.stringify(m);
    expect(json).toContain("http://localhost:3000/admin/submissions/42");
    expect(json).toContain("Test App");
    expect(json).toContain("QAD-ABC123");
    expect(json).toContain("Ahmed");
  });
  it("pendingDigestMessage shows total, ages and each item's tracking id", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "http://localhost:3000");
    const m = pendingDigestMessage([
      { trackingId: "QAD-XYZ789", appNameEn: "Older App", submittedAt: new Date(NOW.getTime() - 5 * DAY) },
      { trackingId: "QAD-NEW456", appNameEn: "New App", submittedAt: new Date(NOW.getTime() - DAY) },
    ], 2, NOW);
    const json = JSON.stringify(m);
    expect(json).toContain("2");
    expect(json).toContain("QAD-XYZ789");
    expect(json).toContain("QAD-NEW456");
    expect(json).toContain("5 days ago");
    expect(json).toContain("http://localhost:3000/admin/submissions");
  });
});
