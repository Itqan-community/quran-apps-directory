/** Slack webhook delivery for submission notifications. Mirrors the email service pattern: env read at call time, injectable transport for tests, silent no-op when unconfigured. */

export type SlackMessageBlock = Record<string, unknown>;
export type SlackMessage = { text: string; blocks?: SlackMessageBlock[] };
export type SlackTransport = (
  url: string,
  body: SlackMessage,
) => Promise<{ ok: boolean; status: number }>;

/** Reads SLACK_WEBHOOK_URL at call time, mirroring `emailBackend()`. */
export function slackBackend(): "none" | "webhook" {
  return process.env.SLACK_WEBHOOK_URL ? "webhook" : "none";
}

async function defaultTransport(
  url: string,
  body: SlackMessage,
): Promise<{ ok: boolean; status: number }> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return { ok: response.ok, status: response.status };
}

/**
 * Posts to an explicit webhook URL; empty URL is a logged no-op (mirrors
 * `sendAdminNewSubmission`'s unset-ADMIN_EMAIL behavior). `transport` is
 * injectable for tests.
 */
export async function postToSlackUrl(
  url: string,
  message: SlackMessage,
  injected?: SlackTransport,
): Promise<void> {
  if (!url) {
    console.info("[slack] no webhook configured — skipping");
    return;
  }
  const transport = injected ?? defaultTransport;
  const { ok, status } = await transport(url, message);
  if (!ok) throw new Error(`[slack] post failed (HTTP ${status})`);
}

/** Posts to SLACK_WEBHOOK_URL (read at call time). */
export function postToSlack(message: SlackMessage, injected?: SlackTransport): Promise<void> {
  return postToSlackUrl(process.env.SLACK_WEBHOOK_URL ?? "", message, injected);
}
