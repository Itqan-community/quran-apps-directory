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
const header = (text: string): SlackMessageBlock => ({ type: "header", text: mrkdwn(text) });
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
    mrkdwn(`*App:*\n${sub.appNameEn} (${sub.appNameAr})`),
    mrkdwn(`*Tracking ID:*\n${sub.trackingId}`),
    mrkdwn(`*Submitted by:*\n${sub.submitterName} <${sub.submitterEmail}>`),
    mrkdwn(`*Categories:*\n${sub.categories.join(", ") || "—"}`),
    mrkdwn(`*Submitted:*\n${sub.submittedAt.toISOString()} (${submittedLabel(sub.submittedAt, now)})`),
  ];
  if (sub.submitterOrganization) fields.push(mrkdwn(`*Organization:*\n${sub.submitterOrganization}`));
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
 */
export function pendingDigestMessage(
  items: PendingDigestItem[],
  total: number,
  now: Date = new Date(),
): SlackMessage {
  const url = adminUrl();
  const shown = items.slice(0, DIGEST_MAX_ITEMS);
  const oldestDays = shown.length
    ? Math.max(...shown.map((i) => wholeDays(i.submittedAt, now)))
    : 0;
  const bullets = shown.map(
    (i) => `• ${i.appNameEn} (${i.trackingId}) — ${ageLabel(wholeDays(i.submittedAt, now))}`,
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
