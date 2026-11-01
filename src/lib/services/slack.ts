/** Slack webhook delivery for submission notifications. Mirrors the email service pattern: env read at call time, injectable transport for tests, silent no-op when unconfigured. */

import { siteUrl } from "./email";

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
  // ~10s ceiling: a hung Slack connection must not stall the concurrency-1
  // worker. Only the default transport gets this — an injected transport
  // (tests) owns its own timeout semantics.
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10_000),
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
  let result: { ok: boolean; status: number };
  try {
    result = await transport(url, message);
  } catch (err) {
    // Network-level rejection (DNS, timeout, refused) — rethrow with the
    // workspace `[slack]` prefix and the original error preserved as cause.
    const reason = err instanceof Error ? err.message : String(err);
    throw new Error(`[slack] post failed (${reason})`, { cause: err });
  }
  if (!result.ok) throw new Error(`[slack] post failed (HTTP ${result.status})`);
}

/** Posts to SLACK_WEBHOOK_URL (read at call time). */
export function postToSlack(message: SlackMessage, injected?: SlackTransport): Promise<void> {
  return postToSlackUrl(process.env.SLACK_WEBHOOK_URL ?? "", message, injected);
}

/* ------------------------------------------------------------------ */
/* Message builders (pure — no I/O; `now` injectable for tests)        */
/* ------------------------------------------------------------------ */

const DAY_MS = 24 * 60 * 60 * 1000;
const DIGEST_MAX_ITEMS = 10;

export type SlackSubmission = {
  trackingId: string; appNameEn: string; appNameAr: string;
  submitterName: string; submitterEmail: string; submitterOrganization?: string;
  categories: string[];              // category name_en values
  submissionId: number; submittedAt: Date;
};
export type PendingDigestItem = { trackingId: string; appNameEn: string; submittedAt: Date };

/** Admin review link: one submission when `id` is given, else the pending list. */
function adminUrl(id?: number): string {
  return id != null
    ? `${siteUrl()}/admin/submissions/${id}`
    : `${siteUrl()}/admin/submissions`;
}

/** Whole days between `submittedAt` and `now`, floored, never negative. */
function wholeDays(submittedAt: Date, now: Date): number {
  return Math.max(0, Math.floor((now.getTime() - submittedAt.getTime()) / DAY_MS));
}

function ageLabel(days: number): string {
  return `${days} ${days === 1 ? "day" : "days"} ago`;
}

/** Relative submission age: "just now" under a day, else whole-day age. */
function submittedLabel(submittedAt: Date, now: Date): string {
  const days = wholeDays(submittedAt, now);
  return days === 0 ? "just now" : ageLabel(days);
}

const mrkdwn = (text: string): SlackMessageBlock => ({ type: "mrkdwn", text });

/**
 * Escapes user-controlled text for mrkdwn so Slack cannot parse it as
 * markup — raw `<!channel>`/`<@U…>` mentions, or `<url|label>` link
 * injection, from app names, submitter fields, or category names. Slack's
 * documented order: `&` first, then `<` and `>`. (The plain-text fallback
 * `text` and `plain_text` headers are not mrkdwn and stay raw.)
 */
function escapeMrkdwn(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
/** Slack header blocks require plain_text (mrkdwn is rejected) and are capped at 150 chars. */
const HEADER_MAX_CHARS = 150;
const header = (text: string): SlackMessageBlock => ({
  type: "header",
  text: { type: "plain_text", text: text.slice(0, HEADER_MAX_CHARS) },
});
const button = (label: string, url: string): SlackMessageBlock => ({
  type: "button",
  text: { type: "plain_text", text: label },
  url,
});

/** Block Kit message for one new submission (spec §4.1/§4.8). `text` is a plain-text fallback of the same facts. */
export function newSubmissionMessage(sub: SlackSubmission, now: Date = new Date()): SlackMessage {
  const url = adminUrl(sub.submissionId);
  const orgLine = sub.submitterOrganization ? `\nOrganization: ${sub.submitterOrganization}` : "";
  const text = [
    `New app submission: ${sub.appNameEn} (${sub.appNameAr})`,
    `Tracking ID: ${sub.trackingId}`,
    `Submitted by: ${sub.submitterName} <${sub.submitterEmail}>${orgLine}`,
    `Categories: ${sub.categories.join(", ") || "—"}`,
    `Submitted: ${sub.submittedAt.toISOString()} (${submittedLabel(sub.submittedAt, now)})`,
    `Review: ${url}`,
  ].join("\n");
  const fields: SlackMessageBlock[] = [
    mrkdwn(`*App:*\n${escapeMrkdwn(sub.appNameEn)} (${escapeMrkdwn(sub.appNameAr)})`),
    mrkdwn(`*Tracking ID:*\n${sub.trackingId}`),
    mrkdwn(`*Submitted by:*\n${escapeMrkdwn(sub.submitterName)} <${escapeMrkdwn(sub.submitterEmail)}>`),
    mrkdwn(`*Categories:*\n${escapeMrkdwn(sub.categories.join(", ")) || "—"}`),
    mrkdwn(`*Submitted:*\n${sub.submittedAt.toISOString()} (${submittedLabel(sub.submittedAt, now)})`),
  ];
  if (sub.submitterOrganization) fields.push(mrkdwn(`*Organization:*\n${escapeMrkdwn(sub.submitterOrganization)}`));
  return {
    text,
    blocks: [
      header(`New app submission: ${sub.appNameEn}`),
      { type: "section", fields },
      { type: "actions", elements: [button("Review submission", url)] },
    ],
  };
}

/**
 * Block Kit digest of pending submissions (spec §4.1/§4.8). `items` must be
 * newest-first (as returned by `listPendingSubmissions`); at most the newest
 * `DIGEST_MAX_ITEMS` are shown as `name (trackingId) — N days ago` bullets.
 *
 * The "oldest pending" age is a fact over ALL pending rows, not over the
 * newest-10 slice that is shown: with `total > DIGEST_MAX_ITEMS` the slice
 * underestimates it. Pass `oldest` (the min submittedAt over all pending
 * rows, from `oldestPendingSubmittedAt`) to report the true age; when
 * omitted, the slice-derived estimate is used (old behavior).
 */
export function pendingDigestMessage(
  items: PendingDigestItem[],
  total: number,
  now: Date = new Date(),
  oldest?: Date,
): SlackMessage {
  const url = adminUrl();
  const shown = items.slice(0, DIGEST_MAX_ITEMS);
  const oldestDays = oldest
    ? wholeDays(oldest, now)
    : shown.length
      ? Math.max(...shown.map((i) => wholeDays(i.submittedAt, now)))
      : 0;
  const bullets = shown.map(
    (i) => `• ${escapeMrkdwn(i.appNameEn)} (${i.trackingId}) — ${ageLabel(wholeDays(i.submittedAt, now))}`,
  );
  const text = [
    `${total} pending submission${total === 1 ? "" : "s"} — oldest ${ageLabel(oldestDays)}`,
    ...bullets,
    `Review: ${url}`,
  ].join("\n");
  return {
    text,
    blocks: [
      header(`Pending submissions: ${total}`),
      { type: "section", text: mrkdwn(`*${total}* pending — oldest ${ageLabel(oldestDays)}`) },
      { type: "section", text: mrkdwn(bullets.join("\n") || "_none_") },
      { type: "actions", elements: [button("Review pending submissions", url)] },
    ],
  };
}
