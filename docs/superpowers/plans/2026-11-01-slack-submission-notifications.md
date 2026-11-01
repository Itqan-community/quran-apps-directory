# Slack Notifications for App Submissions — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Notify the review team in Slack instantly on every app-submission request and run a scheduled pending-submissions digest via BullMQ/Redis, following the repo's service-layer patterns.

**Architecture:** `submitApp` enqueues an id-only job after its DB commit (post-commit wrapper, never fails the submission). A BullMQ `worker` container (docker-compose, dev + prod) processes two job kinds — instant notification and repeatable digests — reading fresh data from Postgres and posting Block Kit messages through an injectable-transport Slack service module. Digests are a declarative registry (add a definition = new digest; worker/compose untouched).

**Tech Stack:** TypeScript (Next 16.4.3 codebase), Drizzle/Postgres (existing), `bullmq` ^5 + `ioredis` ^5 (new runtime deps), `tsx` ^4 (new dev dep — worker entrypoint only), Slack Incoming Webhooks, Redis 7 (AOF, `maxmemory 128mb`, `noeviction`), Vitest (unit + real-DB tests).

**Spec:** `docs/superpowers/specs/2026-11-01-slack-submission-notifications-design.md` — read it first; it carries the full error-handling matrix, job-lifecycle decisions and docker topology this plan implements.

## Global Constraints

- All env reads at call time (`process.env.X` inside functions) — never at module import (repo-wide convention).
- Notification infrastructure failures are logged and swallowed; `submitApp`'s committed result must never degrade (existing try/catch block is the contract).
- Jobs carry **ids only**; Slack formatting and data always re-read from Postgres at processing time.
- Digest job names are write-once (persisted Redis state); unknown digest names/kinds → handler throws (loud), never silently ignored.
- Job options everywhere: `attempts: 5, backoff: { type: "exponential", delay: 30_000 }, removeOnComplete: 100, removeOnFail: 200`.
- Zero pending submissions → digest `build` returns `null` → no POST (silence over noise).
- Redis runs `--appendonly yes --maxmemory 128mb --maxmemory-policy noeviction` (both dev and prod compose).
- No new HTTP routes; no changes to the email path beyond exporting `siteUrl`; no changes to `db/seed.ts`-style script dialects.
- Repo scripts keep their `node --experimental-strip-types` dialect; ONLY the new worker entry runs via `tsx` (tsconfig `@/*` alias resolution).
- Tests: Vitest, node env; DB tests hit real Postgres on :5433 (`docker compose up -d db` first; config already aliases `@` → `src`, `fileParallelism: false`).
- No new Next.js app-router APIs are introduced; the only app code touched is inside the existing `"use server"` module `src/lib/actions/submissions.ts`.

## Review Focus

Inputs/conditions the spec implies but unit paths below don't fully exercise — behavior a person should expect, each pinned by a named test in its owning task:

1. Slack returns non-2xx (network hiccups, 4xx/5xx) → the post **throws**, BullMQ marks the attempt and retries per backoff — never a fake success. → pinned by "throws on non-ok response" (Task 1).
2. Redis unreachable exactly when a submission commits → `submitApp` still returns `ok: true`, enqueue error logged, email path unaffected. → pinned by "submit still succeeds when enqueue rejects" (Task 6).
3. Digest slot with zero pending submissions → no POST at all. → pinned by "null build skips POST" (Task 7).
4. An unknown digest name arrives in a queued job (stale repeat config after a rename) → loud throw landing in the failed set, not silence. → pinned by "unknown digest name throws" (Task 7).
5. Retention contract (`removeOnComplete: 100`, `removeOnFail: 200` on both producer and repeat registrations) — memory stays bounded. → pinned by "job options carry retention" (Task 5).

---

### Task 1: Slack service transport (`src/lib/services/slack.ts`)

**Files:**
- Create: `src/lib/services/slack.ts`
- Test: `tests/slack.test.ts`

**Interfaces:**
- Consumes: nothing (first task).
- Produces (used by Tasks 2, 4, 7): exact signatures —

```ts
export type SlackMessageBlock = Record<string, unknown>;
export type SlackMessage = { text: string; blocks?: SlackMessageBlock[] };
export type SlackTransport = (
  url: string,
  body: SlackMessage
) => Promise<{ ok: boolean; status: number }>;
export function slackBackend(): "none" | "webhook"; // reads SLACK_WEBHOOK_URL at call time
export function postToSlack(message: SlackMessage, injected?: SlackTransport): Promise<void>; // → SLACK_WEBHOOK_URL
export function postToSlackUrl(url: string, message: SlackMessage, injected?: SlackTransport): Promise<void>;
```

Behavior contract: empty/unset webhook URL → `console.info("[slack] no webhook configured — skipping")` and return (no-op, mirrors `sendAdminNewSubmission`'s `ADMIN_EMAIL` behavior); otherwise POST `JSON.stringify(message)` with header `content-type: application/json`; response `!ok` → `throw new Error(\`[slack] post failed (HTTP ${status})\`)`.

- [ ] **Step 1: Write the failing tests** in `tests/slack.test.ts` (mirror `tests/email.test.ts` patterns: `vi.stubEnv`, `afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); })`):

```ts
import { describe, it, expect, vi, afterEach } from "vitest";
import { slackBackend, postToSlack, postToSlackUrl, type SlackMessage } from "@/lib/services/slack";

const msg: SlackMessage = { text: "hello" };
const okTransport = () => async (url: string, body: unknown) => ({ ok: true, status: 200 });

afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); });

it("slackBackend is none when SLACK_WEBHOOK_URL is unset", () => {
  vi.stubEnv("SLACK_WEBHOOK_URL", "");
  expect(slackBackend()).toBe("none");
});
it("flips to webhook when SLACK_WEBHOOK_URL is set", () => {
  vi.stubEnv("SLACK_WEBHOOK_URL", "https://hooks.slack.test/T1/B1/x");
  expect(slackBackend()).toBe("webhook");
});
it("postToSlackUrl posts JSON to the URL through the injected transport", async () => {
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
it("is a logged no-op when the URL is empty", async () => {
  vi.stubEnv("SLACK_WEBHOOK_URL", "");
  const info = vi.spyOn(console, "info").mockImplementation(() => {});
  const transport = vi.fn(okTransport());
  const p = postToSlack({ text: "x" }, transport);
  await expect(p).resolves.toBeUndefined(); // swapping postToSlack for postToSlackUrl below while typing contract
  expect(transport).not.toHaveBeenCalled();
  expect(info.mock.calls.some((c) => String(c[0]).includes("[slack]"))).toBe(true);
});
```

Note while writing the test: the no-op assertion must be spelled per function — `postToSlack` no-ops when *env* URL is empty; `postToSlackUrl` no-ops when *its argument* is empty. Write both variants instead of the placeholder line.

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run tests/slack.test.ts`
Expected: FAIL — module not found (`@/lib/services/slack`).

- [ ] **Step 3: Implement** `src/lib/services/slack.ts` — types + the three functions. `postToSlack` delegates to `postToSlackUrl(process.env.SLACK_WEBHOOK_URL, ...)`; default transport is global `fetch`; tests never need it real.

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run tests/slack.test.ts`
Expected: PASS (all cases).

- [ ] **Step 5: Commit**

```bash
git add src/lib/services/slack.ts tests/slack.test.ts
git commit -m "feat: slack service transport with injectable delivery + no-op degradation"
```

### Task 2: Slack message builders (+ share the site-url helper)

**Files:**
- Modify: `src/lib/services/slack.ts` (append builders; same module)
- Modify: `src/lib/services/email.ts:30` — change `function siteUrl()` to `export function siteUrl()` (one word)
- Test: `tests/slack.test.ts` (append)

**Interfaces:**
- Consumes: Task 1 types; `siteUrl` re-exported from `email.ts`.
- Produces:

```ts
export type SlackSubmission = {
  trackingId: string; appNameEn: string; appNameAr: string;
  submitterName: string; submitterEmail: string; submitterOrganization?: string;
  categories: string[];              // category name_en values
  submissionId: number; submittedAt: Date;
};
export type PendingDigestItem = { trackingId: string; appNameEn: string; submittedAt: Date };
export function newSubmissionMessage(sub: SlackSubmission, now?: Date): SlackMessage;
export function pendingDigestMessage(items: PendingDigestItem[], total: number, now?: Date): SlackMessage;
```

Content contract (Block Kit, per spec §4.1/§4.8): both embed a button/link whose URL is `${siteUrl()}/admin/submissions/${sub.submissionId}` (instant) / `${siteUrl()}/admin/submissions` (digest); `text` is a plain-text fallback of the same facts. Digest shows `total`, oldest-item age in whole days ("N days ago"), and the newest ≤10 items as `name (trackingId) — N days ago` bullets. Default `now = new Date()`; tests pass a fixed `now` for determinism.

- [ ] **Step 1: Write failing tests** (append to `tests/slack.test.ts`):

```ts
import { newSubmissionMessage, pendingDigestMessage } from "@/lib/services/slack";

const NOW = new Date("2026-11-01T09:00:00Z");
const DAY = 24 * 60 * 60 * 1000;

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
```

- [ ] **Step 2: Run** `npx vitest run tests/slack.test.ts` — expected: FAIL (builders not defined).
- [ ] **Step 3: Implement** the two builders + `export` word on `email.ts` `siteUrl`. Small private helper `adminUrl(id?: number)` inside `slack.ts` (`import { siteUrl } from "./email"` — same directory).
- [ ] **Step 4: Run** `npx vitest run tests/slack.test.ts` — expected: PASS.
- [ ] **Step 5: Commit**

```bash
git add src/lib/services/slack.ts src/lib/services/email.ts tests/slack.test.ts
git commit -m "feat: slack block-kit builders for instant + digest messages; export email siteUrl"
```

### Task 3: Submission repo reads

**Files:**
- Modify: `src/lib/repo/submissions.ts` (append at end; existing code untouched)
- Test: `tests/submissions-repo.test.ts` (new)

**Interfaces:**
- Consumes: `PendingDigestItem` from `@/lib/services/slack` (Task 2); drizzle `db`/`schema` like the file's existing functions (see `getSubmissionByTrackingId` style at line 26).
- Produces:

```ts
export type SlackSubmissionData = {
  id: number; trackingId: string; appNameEn: string; appNameAr: string;
  submitterName: string; submitterEmail: string; submitterOrganization: string;
  developerNameEn: string; categories: string[]; submittedAt: Date;
};
export async function getSubmissionForAdminNotification(id: number): Promise<SlackSubmissionData | null>;
export async function listPendingSubmissions(limit = 10): Promise<PendingDigestItem[]>;
export async function countPendingSubmissions(): Promise<number>;
```

Queries: all filter `status = "pending"` for the pending pair; `listPendingSubmissions` orders `desc(appSubmissions.createdAt)` newest-first; the submission fetch runs one row query + one categories query joining `appSubmissionsCategories` (join key `appsubmissionId`) → `categories.nameEn`.

- [ ] **Step 1: Write failing tests** (real-DB style copied from `tests/duplicate-name.test.ts`: plain `postgres(TEST_DATABASE_URL)` for setup/cleanup, drizzle repo functions under test). Seed via raw sql: two `app_submissions` rows (`tracking_id = 't-slack-a'/'t-slack-b'`, `status = 'pending'`, distinct `created_at` — one 5 days ago), one row `status = 'approved'`, and a category + `app_submissions_categories` link on row A. Assert:
  - `listPendingSubmissions(10)` returns exactly the two pending rows, newest-first; `limit 1` truncates to newest.
  - `countPendingSubmissions()` — exact count of seeded pending rows.
  - `getSubmissionForAdminNotification(rowA)` — returns object with `categories: [<seeded name_en>]` and `submitterEmail`; for a non-existing id `…Notification(999999999)` → `null`.
- [ ] **Step 2: Run** `npx vitest run tests/submissions-repo.test.ts` — expected: FAIL (functions missing).
- [ ] **Step 3: Implement** the three functions + type in `src/lib/repo/submissions.ts`.
- [ ] **Step 4: Run** — expected: PASS. (`afterAll` cleanup deletes seeded rows by `tracking_id LIKE 't-slack-%'`, the category link and category, then `sql.end()`.)
- [ ] **Step 5: Commit**

```bash
git add src/lib/repo/submissions.ts tests/submissions-repo.test.ts
git commit -m "feat: pending-submission reads for slack notifications"
```

### Task 4: Digest registry

**Files:**
- Create: `src/lib/services/notifications/digests.ts`
- Test: append to `tests/notification-worker-dispatch.test.ts` (created in Task 7; write this file's metadata test there now, importing only the registry)

**Interfaces:**
- Consumes: `listPendingSubmissions`, `countPendingSubmissions` (Task 3); `pendingDigestMessage`, `SlackMessage` (Task 2).
- Produces (used by Task 7):

```ts
import { countPendingSubmissions, listPendingSubmissions } from "@/lib/repo/submissions";
import { pendingDigestMessage, type SlackMessage } from "@/lib/services/slack";

export type DigestDefinition = {
  name: string;          // write-once BullMQ job name
  cronEnvVar: string;    // env var holding the node-cron pattern
  webhookEnvVar?: string; // per-digest webhook override; falls back to SLACK_WEBHOOK_URL
  build: () => Promise<SlackMessage | null>; // null = nothing to send
};
export const digests: DigestDefinition[];
```

Initial registry holds exactly one entry: `name: "pending-submissions"`, `cronEnvVar: "DIGEST_PENDING_SUBMISSIONS_CRON"`, no `webhookEnvVar`, whose `build` fetches items; returns `null` when `items.length === 0`, otherwise `pendingDigestMessage(items, await countPendingSubmissions())`.

- [ ] **Step 1: Write failing test** in `tests/notification-worker-dispatch.test.ts` (the dispatch tests come in Task 7 — for now only this file with the registry describe): assert `digests` has length ≥ 1, `names` are unique, every def has a non-empty `name`/`cronEnvVar`, and the `pending-submissions` entry exists with exactly `cronEnvVar = "DIGEST_PENDING_SUBMISSIONS_CRON"`.
- [ ] **Step 2: Run** `npx vitest run tests/notification-worker-dispatch.test.ts` — expected: FAIL (module missing).
- [ ] **Step 3: Implement** `src/lib/services/notifications/digests.ts` exactly as the Produces block.
- [ ] **Step 4: Run** — expected: PASS.
- [ ] **Step 5: Commit**

```bash
git add src/lib/services/notifications/digests.ts tests/notification-worker-dispatch.test.ts
git commit -m "feat: declarative digest registry with pending-submissions digest"
```

### Task 5: Queue producer (new runtime deps)

**Files:**
- Modify: `package.json` — `npm install bullmq ioredis` (runtime deps)
- Create: `src/lib/services/notifications-queue.ts`
- Test: `tests/notifications-queue.test.ts` (new)

**Interfaces:**
- Consumes: nothing (bullmq API). Constraint: this file imports ONLY `bullmq` + `ioredis` — never `@/db` — so the worker entry can share it.
- Produces (used by Tasks 6, 7):

```ts
export const NOTIFICATIONS_QUEUE = "notifications";
export type NotificationJobData =
  | { kind: "submission-notification"; submissionId: number }
  | { kind: "digest"; digest: string };
export const JOB_DEFAULTS = {
  attempts: 5,
  backoff: { type: "exponential" as const, delay: 30_000 },
  removeOnComplete: 100,
  removeOnFail: 200,
};
export type QueueLike = { add: (jobName: string, data: NotificationJobData, opts?: unknown) => Promise<unknown> };
export function notificationsQueueEnabled(): boolean; // Boolean(process.env.REDIS_URL) at call time
export async function enqueueSubmissionNotification(
  submissionId: number,
  injected?: QueueLike,
): Promise<boolean>;
```

`enqueueSubmissionNotification` behavior: disabled (`REDIS_URL` unset) → `console.info("[notifications] REDIS_URL unset — enqueue skipped")`, return `false`. Enabled → `new Queue(NOTIFICATIONS_QUEUE, { connection: new Redis(process.env.REDIS_URL) })`, `add("submission-notification", { kind: "submission-notification", submissionId }, JOB_DEFAULTS)`, return `true`; close the self-created queue in `finally` (skip closing an injected queue).

- [ ] **Step 1: Write failing tests** (env stubbing per `tests/email.test.ts`):

  - `notificationsQueueEnabled()` — false when `REDIS_URL` unset/empty; true when set.
  - disabled enqueue → returns `false`, logs the `[notifications]` line, fake `add` never called.
  - enabled + injected → `add` called once with job name `"submission-notification"`, data `{ kind: "submission-notification", submissionId: 42 }`, and options containing `attempts: 5`, `removeOnComplete: 100`, `removeOnFail: 200`; returns `true`; injected fake gets **no** `close` call.
- [ ] **Step 2: Run** `npx vitest run tests/notifications-queue.test.ts` — expected: FAIL (module missing).
- [ ] **Step 3: Install deps**: `npm install bullmq ioredis` — then implement the module.
- [ ] **Step 4: Run** — expected: PASS.
- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json src/lib/services/notifications-queue.ts tests/notifications-queue.test.ts
git commit -m "feat: bullmq producer for submission notifications with retention defaults"
```

### Task 6: Wire the post-commit enqueue into `submitApp`

**Files:**
- Modify: `src/lib/actions/submissions.ts` — replace line 105 `await sendSubmitEmails(data, result.trackingId, result.submissionId);` with `await notifySubmission(data, result.trackingId, result.submissionId);` and add (bottom of file, next to `sendSubmitEmails`):

```ts
import { enqueueSubmissionNotification } from "@/lib/services/notifications-queue";

async function notifySubmission(
  data: SubmissionInput,
  trackingId: string,
  submissionId: number,
): Promise<void> {
  try {
    await sendSubmitEmails(data, trackingId, submissionId); // email path unchanged
    await enqueueSubmissionNotification(submissionId);      // id-only payload
  } catch (e) {
    console.error("submit notification failed", e);
  }
}
```

**Interfaces:**
- Consumes: `enqueueSubmissionNotification(submissionId: number): Promise<boolean>` (Task 5).
- Produces: none new (internal function); `submitApp`'s external contract is unchanged.

- [ ] **Step 1: Write failing test** — create `tests/submission-notify.test.ts`, `vi.mock("@/lib/services/notifications-queue", ...)` exposing a `vi.fn()` for `enqueueSubmissionNotification`; submit through the real `submitApp` (real DB, seeded cleanup via raw sql deleting by `submitter_email`, mirroring `tests/duplicate-name.test.ts` structure). Assert:
  - valid submission → result `{ ok: true }`, mock called once with a numeric id.
  - mock rejection (`new Error("redis down")`) → result still `{ ok: true }`, `console.error` was called with "submit notification failed".
- [ ] **Step 2: Run** `npx vitest run tests/submission-notify.test.ts` — expected: FAIL (submitApp doesn't call the mock yet).
- [ ] **Step 3: Implement** the edit above.
- [ ] **Step 4: Run** — expected: PASS. Also run `npx vitest run tests/duplicate-name.test.ts` — expected: PASS (existing flow intact).
- [ ] **Step 5: Commit**

```bash
git add src/lib/actions/submissions.ts tests/submission-notify.test.ts
git commit -m "feat: enqueue slack notification after submission commit"
```

### Task 7: Worker entrypoint + dispatch logic

**Files:**
- Install dev dep: `npm install -D tsx` (runs the entry; resolves `@/*` aliases)
- Create: `scripts/run-notification-worker.ts`
- Test: extend `tests/notification-worker-dispatch.test.ts` (Task 4 added the registry describe; append the dispatch describes)

**Interfaces:**
- Consumes: `NOTIFICATIONS_QUEUE`, `JOB_DEFAULTS`, `NotificationJobData` (Task 5); `digests`, `DigestDefinition` (Task 4); `getSubmissionForAdminNotification` (Task 3); `newSubmissionMessage`, `postToSlack`, `postToSlackUrl`, `SlackMessage`, `SlackSubmission` (Tasks 1–2); `SlackSubmissionData` (Task 3).
- Produces (dispatch is exported for tests; only `main` runs in prod):

```ts
import assert from "node:assert/strict";
export type WorkerIO = {
  getSubmission: (id: number) => Promise<SlackSubmissionData | null>;
  registry: DigestDefinition[];
  /** url === undefined → SLACK_WEBHOOK_URL via postToSlack; === "" → logged skip */
  post: (message: SlackMessage, url?: string) => Promise<void>;
  env: NodeJS.ProcessEnv; // passed explicitly so dispatch is unit-testable
};
/** maps SlackSubmissionData → SlackSubmission (script-local composition helper) */
export function toSlackSubmission(data: SlackSubmissionData): SlackSubmission;
export function webhookForDef(def: DigestDefinition, env: NodeJS.ProcessEnv): string;
// = env[def.webhookEnvVar] || env.SLACK_WEBHOOK_URL || ""
export async function handleJob(raw: unknown, io: WorkerIO): Promise<void>;
export async function registerDigests(queue: QueueLike, env: NodeJS.ProcessEnv): Promise<number>;
// per def: pattern = env[def.cronEnvVar]; unset → console.info skip; else
// add(def.name, { kind: "digest", digest: def.name }, { ...JOB_DEFAULTS, repeat: { pattern } })
```

`handleJob` contract: payload must be an object with `kind` — else `throw new Error("[notifications] unknown job payload")`.
- `kind: "submission-notification"` → `io.getSubmission(submissionId)`; missing row → `throw`; then `io.post(newSubmissionMessage(toSlackSubmission(row)))`.
- `kind: "digest"` → def lookup by `digest` name; missing → `throw`; `const url = webhookForDef(def, io.env)`; `const msg = await def.build()`; `null` → `console.info("[notifications] digest skipped (nothing pending)")` and return; else `io.post(msg, url)`.
- unknown `kind` values → throw.

Entrypoint guard so vitest import never starts workers: `if (process.argv[1]?.includes("run-notification-worker")) { … }`. Modes: default = connect (`new Redis(REDIS_URL, { maxRetriesPerRequest: null })` — `REDIS_URL` unset → exit 1 with error), register digests via a `Queue`, then run `new Worker(NOTIFICATIONS_QUEUE, (job) => handleJob(job.data, io), { connection })` and block. `--fire-digest <name>` = validate against registry (unknown → `console.error` + exit 1), add one job, exit 0.

- [ ] **Step 1: Write failing tests** (append; fake `io` objects, no network/redis):
  - valid instant payload → `post` called once with a message containing the admin URL `/admin/submissions/<id>` and the app name.
  - missing submission id → rejects (loud).
  - digest with `build → null` → **no** `post` call (Review Focus #3).
  - digest with `build → <message>` → post called with `webhookForDef` URL; env override assertion: def with `webhookEnvVar: "X_WEBHOOK"` + `env` `{ "X_WEBHOOK": "https://x.test/h", "SLACK_WEBHOOK_URL": "https://d.test/h" }` → URL is `https://x.test/h`; without the override key → falls back to SLACK_WEBHOOK_URL.
  - unknown digest name → rejects (Review Focus #4); non-object payload → rejects.
  - `registerDigests` with fake queue: def with pattern env → `add` called with job name = digest name, data `{ kind: "digest", digest: name }`, opts containing `repeat: { pattern }` and `removeOnComplete: 100`; def with unset pattern env → not added, returns count of registered.
  - `toSlackSubmission` maps fields incl. `categories` passthrough.
- [ ] **Step 2: Run** `npx vitest run tests/notification-worker-dispatch.test.ts` — expected: FAIL (script missing).
- [ ] **Step 3: Implement** the script; `npm install -D tsx` first so the entry shape is real.
- [ ] **Step 4: Run** `npx vitest run tests/notification-worker-dispatch.test.ts` — expected: PASS.
- [ ] **Step 5: Commit**

```bash
git add scripts/run-notification-worker.ts tests/notification-worker-dispatch.test.ts package.json package-lock.json
git commit -m "feat: bullmq worker entrypoint with digest dispatch + fire-digest mode"
```

### Task 8: Docker + env wiring, full verification

**Files:**
- Modify: `Dockerfile` — add `worker` stage after `deps` (before `runner`; nothing in `runner` changes):

```dockerfile
FROM node:22-bookworm-slim AS worker
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules   # full tree: bullmq, tsx, drizzle…
COPY package.json package-lock.json tsconfig.json ./
COPY src ./src
COPY db ./db
COPY scripts ./scripts
USER node
# Runtime env (DATABASE_URL, SLACK_WEBHOOK_URL, REDIS_URL, digest crons, TZ) comes
# from the compose service's env_file — nothing baked into image layers.
CMD ["npx", "tsx", "scripts/run-notification-worker.ts"]
```

  (Note: `tsconfig.json` is copied — tsx resolves `@/*` through it.)
- Modify: `docker-compose.prod.yml` — append services + volume (existing three untouched):

```yaml
  redis:
    image: redis:7-alpine
    command: ["redis-server", "--appendonly", "yes", "--maxmemory", "128mb", "--maxmemory-policy", "noeviction"]
    volumes: [redis-data:/data]
    restart: unless-stopped

  worker:
    build: { context: ., dockerfile: Dockerfile, target: worker }
    env_file: .env.prod            # DATABASE_URL, SLACK_WEBHOOK_URL, REDIS_URL, DIGEST_…_CRON, TZ
    environment:
      NODE_ENV: production
    depends_on: [redis]
    restart: unless-stopped
    # no ports/expose — jobs egress to Postgres + Slack only
```

  and `volumes: { redis-data: }` (merge with existing volumes key if it exists; prod stack currently defines none).
- Modify: `docker-compose.yml` (dev) — **same full stack** per spec: same `redis` service **plus a published port `6379:6379`** — in dev the Next app runs on the host (`next dev`) and its producer reaches Redis over `localhost:6379` (prod redis stays port-less, internal network only); `worker` service with:

```yaml
  worker:
    build: { context: ., dockerfile: Dockerfile, target: worker }
    environment:
      DATABASE_URL: postgres://postgres:postgres@db:5432/qad   # service-network host, NOT localhost
      REDIS_URL: redis://redis:6379
      DIGEST_PENDING_SUBMISSIONS_CRON: "0 9 */3 * *"
    depends_on: [redis]
    restart: unless-stopped
```

```yaml
  redis:
    image: redis:7-alpine
    command: ["redis-server", "--appendonly", "yes", "--maxmemory", "128mb", "--maxmemory-policy", "noeviction"]
    ports: ["6379:6379"]   # dev only — host-side next dev producer enqueues over localhost:6379
    volumes: [redis-data:/data]
    restart: unless-stopped
```

  plus its `redis-data` volume.
- Modify: `.env.example` and `.env.prod.example` — append group (comment style of "Submission emails (Plan 3)"):

```
# Submission Slack notifications (BullMQ worker + Redis)
SLACK_WEBHOOK_URL=
REDIS_URL=
DIGEST_PENDING_SUBMISSIONS_CRON=
```

  In `.env.prod.example`, set `REDIS_URL=redis://redis:6379` as the default value.

**Interfaces:**
- Consumes: Task 7 script path `scripts/run-notification-worker.ts` (the image CMD).
- Produces: deployable dev/prod stacks; no new routes/ports.

- [ ] **Step 1: Write** the Dockerfile stage + both compose services + env example lines verbatim above.
- [ ] **Step 2: Validate** `docker compose -f docker-compose.yml config -q && docker compose -f docker-compose.prod.yml config -q` — expected: silent success.
- [ ] **Step 3: Build the worker target** `docker build --target worker -t qad-worker:check .` — expected: success (never runs the `builder` stage, no DB needed).
- [ ] **Step 4: Full test suite** `npx vitest run` — expected: PASS (all files, including previously-green ones; `fileParallelism: false` serializes DB tests).
- [ ] **Step 5: Commit**

```bash
git add Dockerfile docker-compose.yml docker-compose.prod.yml .env.example .env.prod.example
git commit -m "feat: worker/redis compose stack (dev+prod) and slack notification env wiring"
```

### Task 9: End-to-end smoke (dev compose, manual verification)

No new code. Order taken from spec §10:

- [ ] `docker compose up -d --build` (dev) → `docker logs <worker container>` shows the `[notifications]` start line and "registered 1 digest(s)" (or the skip line when `DIGEST_PENDING_SUBMISSIONS_CRON` is unset).
- [ ] Set a real or echo webhook in env, submit an app through the UI (`/submit-app`) → Slack message lands in the channel within seconds; `docker logs` shows the processed job id.
- [ ] `docker compose run --rm worker npx tsx scripts/run-notification-worker.ts --fire-digest pending-submissions` → digest posts immediately (or logs the nothing-pending skip).
- [ ] `docker compose exec redis redis-cli INFO memory | grep used_memory_human` — expected: well under 1 MB at this scale.
- [ ] Stop `redis` container, submit again → `submitApp` still succeeds (Result `{ ok: true }`); restart redis → next digest still scheduled (repeat config survived AOF).

## Notes for the implementer

- The email tests' console-backend no-op spy pattern (`tests/email.test.ts:57-69`) is the reference for all "degrades silently" cases.
- Repo test DB is shared and serialized (`fileParallelism: false`); cleanup must hit only seeded rows (`tracking_id LIKE 't-slack-%'`, exact emails) — never `TRUNCATE`.
- Do not add a `Notifier`-style interface beyond what's specced; the boundaries are the three service modules + one script.
- Next.js docs (`node_modules/next/dist/docs/`) are only relevant if you find yourself touching app-router APIs — this plan does not.
