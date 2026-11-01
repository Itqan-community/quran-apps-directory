import { describe, it, expect, vi, afterEach } from "vitest";
import { slackBackend, postToSlack, postToSlackUrl, type SlackMessage } from "@/lib/services/slack";
import { newSubmissionMessage, pendingDigestMessage } from "@/lib/services/slack";

const msg: SlackMessage = { text: "hello" };
const okTransport = () => async () => ({ ok: true, status: 200 });

afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

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

/** Slack header blocks must carry a plain_text object (mrkdwn is rejected by the API). */
const headerText = (m: SlackMessage): { type: string; text: string } =>
  (m.blocks?.[0] as { text: { type: string; text: string } }).text;

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
    expect(headerText(m).type).toBe("plain_text");
    expect(headerText(m).text).toContain("Test App");
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
    expect(headerText(m).type).toBe("plain_text");
    expect(headerText(m).text).toContain("2");
  });
  it("clips header text to Slack's 150-char limit", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "http://localhost:3000");
    const longName = "A".repeat(200);
    const m = newSubmissionMessage({
      trackingId: "QAD-LONG01", appNameEn: longName, appNameAr: "طويل",
      submitterName: "Ahmed", submitterEmail: "ahmed@test.dev",
      categories: ["Quran"], submissionId: 7, submittedAt: NOW,
    }, NOW);
    const header = headerText(m);
    expect(header.type).toBe("plain_text");
    expect(header.text.length).toBe(150);
    expect(header.text).toBe(`New app submission: ${"A".repeat(130)}`);
  });

  it("pendingDigestMessage reports the TRUE oldest age from `oldest` when total > 10 (F3)", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "http://localhost:3000");
    // 12 pending: the shown slice holds the newest 10 (ages 1..10 days). The
    // true oldest row is 40 days old and is NOT in the slice — a slice-derived
    // estimate would under-report it as 10 days.
    const items = Array.from({ length: 12 }, (_, i) => ({
      trackingId: `QAD-SLICE${i}`,
      appNameEn: `App ${i}`,
      submittedAt: new Date(NOW.getTime() - (i + 1) * DAY),
    }));
    const m = pendingDigestMessage(items, 12, NOW, new Date(NOW.getTime() - 40 * DAY));
    const json = JSON.stringify(m);
    expect(json).toContain("40 days ago");
    // The slice-derived estimate must not be reported as the oldest age.
    expect(json).not.toContain("oldest 10 days ago");
    expect(json).not.toContain("oldest 12 days ago");
  });

  it("pendingDigestMessage falls back to the slice-derived estimate when `oldest` is omitted (old behavior)", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "http://localhost:3000");
    const m = pendingDigestMessage([
      { trackingId: "QAD-A", appNameEn: "A", submittedAt: new Date(NOW.getTime() - 3 * DAY) },
      { trackingId: "QAD-B", appNameEn: "B", submittedAt: new Date(NOW.getTime() - DAY) },
    ], 2, NOW);
    const json = JSON.stringify(m);
    expect(json).toContain("oldest 3 days ago");
  });
});

describe("mrkdwn escaping (F7: user-controlled text)", () => {
  it("escapes <!channel> mentions and <url|label> link injection in section fields", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "http://localhost:3000");
    const m = newSubmissionMessage({
      trackingId: "QAD-EVIL01",
      appNameEn: "<!channel> Free iPhone",
      appNameAr: "<https://evil|Review>",
      submitterName: "Bob <@U0123>",
      submitterEmail: "bob@test.dev",
      submitterOrganization: "<!here> Org",
      categories: ["<https://evil|Quran>"],
      submissionId: 42, submittedAt: NOW,
    }, NOW);

    const json = JSON.stringify(m);
    expect(json).toContain("&lt;!channel&gt;");
    expect(json).toContain("&lt;https://evil|Review&gt;");
    expect(json).toContain("&lt;@U0123&gt;");

    // No raw mention / link injection survives in ANY section's mrkdwn text.
    const mrkdwnTexts = (m.blocks ?? [])
      .filter((b) => b.type === "section")
      .flatMap((b) => {
        const fields = (b as { fields?: unknown[] }).fields;
        if (Array.isArray(fields)) return fields;
        return [b.text];
      })
      .map((f) => (typeof f === "object" && f !== null && "text" in f ? String((f as { text: unknown }).text) : String(f)));
    expect(mrkdwnTexts.length).toBeGreaterThan(0);
    for (const text of mrkdwnTexts) {
      expect(text).not.toMatch(/<!channel>|<@U|<https?:\/\//);
    }
  });

  it("escapes user-controlled app names in digest bullets", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "http://localhost:3000");
    const m = pendingDigestMessage([
      { trackingId: "QAD-EVIL02", appNameEn: "<!channel> Free iPhone", submittedAt: new Date(NOW.getTime() - DAY) },
    ], 1, NOW);
    const json = JSON.stringify(m);
    expect(json).toContain("&lt;!channel&gt;");
    const bullets = (m.blocks ?? [])
      .filter((b) => b.type === "section")
      .map((b) => (typeof b.text === "object" && b.text !== null && "text" in b.text ? String((b.text as { text: unknown }).text) : ""))
      .join("\n");
    expect(bullets).not.toContain("<!channel>");
  });
});

describe("defaultTransport (F8: real fetch path)", () => {
  it("POSTs the JSON body to the URL and throws on !ok", async () => {
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => ({ ok: false, status: 503 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      postToSlackUrl("https://hooks.slack.test/T1/B1/x", msg),
    ).rejects.toThrow("[slack] post failed (HTTP 503)");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://hooks.slack.test/T1/B1/x");
    expect(init?.method).toBe("POST");
    expect(init?.headers).toEqual({ "content-type": "application/json" });
    expect(init?.body).toBe(JSON.stringify(msg));
    // The default transport bounds hung connections with an AbortSignal.
    expect(init?.signal).toBeInstanceOf(AbortSignal);
  });

  it("resolves when the response is ok", async () => {
    const fetchMock = vi.fn(async () => ({ ok: true, status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(
      postToSlackUrl("https://hooks.slack.test/T1/B1/x", msg),
    ).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("wraps network-level rejections with the [slack] prefix and preserves the cause", async () => {
    const fetchMock = vi.fn(async () => { throw new Error("fetch failed"); });
    vi.stubGlobal("fetch", fetchMock);
    await expect(
      postToSlackUrl("https://hooks.slack.test/T1/B1/x", msg),
    ).rejects.toMatchObject({
      message: "[slack] post failed (fetch failed)",
      cause: expect.any(Error),
    });
  });
});
