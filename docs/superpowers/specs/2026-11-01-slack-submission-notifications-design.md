# Design: Slack Notifications for App Submissions

Date: 2026-11-01
Status: Approved (brainstorming), pending implementation plan
Path: Architectural (new notification subsystem: queue + worker + Slack service)

## 1. Problem & Goal

Users submit app-addition requests via the public submission form. The review team
lives in Slack and does not reliably see notifications, so submission review
turnaround suffers. Two outcomes are wanted:

1. **Instant notification**: when a user submits an app request, a rich Slack
   message lands in the team's review channel within seconds.
2. **Pending digest**: on a schedule (default every 3 days), a Slack digest of
   all currently-pending submissions reminds the team of the backlog.

Success criteria:

- A successful submission produces a Slack message in the channel within seconds,
  without the user ever observing a failure.
- The digest arrives at its configured slot; when zero submissions are pending,
  nothing is sent (no channel noise).
- Notification infrastructure failure never degrades or fails a submission.

## 2. Non-Goals

- No changes to the existing email notifications (`sendSubmissionReceived`,
  `sendAdminNewSubmission` and all status-change emails continue unchanged).
- No Slack notifications for admin status changes (approve/reject/info-request).
- No user-facing UI changes to the submission form or flow.
- No general "Notifier" abstraction over arbitrary channels (YAGNI — email exists
  independently; Slack is the only new channel).
- No Bull Board / monitoring UI (operators use `docker logs` for now).

## 3. Current State (verified)

- `src/lib/actions/submissions.ts` — `submitApp(input)` server action: Zod
  validation (`src/lib/validation/submission.ts`), duplicate-name check
  (`findDuplicateAppName`, `src/lib/repo/apps.ts`), transactional insert into
  `appSubmissions` + `appSubmissionsCategories` + first `submissionStatusLogs`
  row (Drizzle, `db/schema.ts`, export `db` singleton from `db/index.ts`),
  tracking id `QAD-XXXXXX` with collision retries. **After commit** it calls
  `sendSubmitEmails(data, trackingId, submissionId)` wrapped in its own
  try/catch (`console.error`) so email failures never fail the submission.
- `src/lib/services/email.ts` (736 lines) — established service pattern:
  - `emailBackend()` reads `process.env` at call time; unset SMTP → console
    backend (graceful degradation, never throws at import).
  - `sendMail(mail, injected?: MailTransport)` — transport injectable for tests.
  - `sendAdminNewSubmission` no-ops when `ADMIN_EMAIL` is unset.
  - Private `siteUrl()` reads `NEXT_PUBLIC_SITE_URL`; `trackUrl`/`appUrl` are
    exported wrappers; not exported itself.
- `src/lib/repo/submissions.ts` — read functions for tracked submissions; a
  pending-list query does not exist yet.
- `src/lib/services/r2.ts` — `r2Configured()` "configured?" predicate pattern.
- `db/seed.ts`, `scripts/reindex-embeddings.ts` — repo convention for standalone
  node scripts: plain package/relative imports only (`node
  --experimental-strip-types` does not resolve the tsconfig `@/*` alias).
- Docker: `Dockerfile` multi-stage (`deps` → `builder` → `runner`); the `runner`
  is the Next.js standalone output with a **pruned** node_modules — full source
  and deps are not present, so background jobs cannot run in the `app`
  container. `docker-compose.prod.yml` = app + nginx + certbot; DEV
  `docker-compose.yml` = db (pgvector) + minio. No cron/scheduler/queue
  infrastructure exists anywhere in the repo or compose files.
- Tests: Vitest against a real Postgres on :5433 (`tests/setup.ts` loads
  `.env.test`); external services mocked at module level (`vi.mock`) or
  injected, env stubbed via `vi.stubEnv` (see `tests/email.test.ts`).

## 4. Architecture

Two new runtime concerns, deliberately layered:

1. **`src/lib/services/` — pure application services** (own all Slack/domain
   formatting and data queries; injectable side effects; testable without Redis
   or Slack).
2. **Queue orchestration** (`bullmq` + `ioredis`) — persistence, scheduling and
   retry mechanics live here and only here.

```
submitApp (Next server action)
  └─ after DB commit ──► enqueue { kind: "submission-notification", submissionId }
                              │  (src/lib/services/notifications-queue.ts)
                              ▼
                     ┌── BullMQ queue "notifications" ──┐        (Redis, AOF-persisted)
                     │  { kind: "submission-notification", submissionId }
                     │  { kind: "digest", digest: "pending-submissions" }   ◄─ repeatable
                     └──────────────┬───────────────────┘
                                    ▼ (worker container, long running)
                     dispatch by kind:
                       submission-notification → repo read → newSubmissionMessage()
                       digest → digests registry (def.build) → message builder
                     → POST to Slack Incoming Webhook (injectable transport)
```

### 4.1 Slack service — `src/lib/services/slack.ts` (new)

Mirrors `email.ts` conventions:

- `slackBackend(): "none" | "webhook"` — reads `process.env.SLACK_WEBHOOK_URL`
  at call time (never module top-level).
- `postToSlack(message: SlackMessage, injected?: SlackTransport)` — POSTs JSON
  `{ text?, blocks? }` to the incoming webhook. `SlackTransport` is a minimal
  injectable interface `(url, body) => Promise<response>` (default: global
  `fetch`) — same injection philosophy as `MailTransport`.
- No-op when `SLACK_WEBHOOK_URL` unset: message builders still work, posting
  logs and returns (mirrors `sendAdminNewSubmission` behavior with `ADMIN_EMAIL`).
- Pure message builders — no I/O, fully snapshot/assert-testable:
  - `newSubmissionMessage(sub: SlackSubmission): SlackMessage` — Block Kit:
    app name (EN/AR), submitter name/email, categories, submitted date,
    and a "Review" link button → `${siteUrl()}/admin/submissions/{id}`.
  - `pendingDigestMessage(items: PendingDigestItem[], total: number): SlackMessage`
    — total count, oldest pending age, newest N (≤ 10) with name + tracking id,
    and a link button to `${siteUrl()}/admin/submissions`.
- Types exported for reuse: `SlackMessage`, `SlackMessageBlock`,
  `SlackSubmission`, `PendingDigestItem`.
- `siteUrl()` is currently private in `email.ts`. Minimal collaboration change:
  **export `siteUrl` from `email.ts`** and import it in `slack.ts` (one-site-url
  rule; no value duplication).

### 4.2 Repository additions — `src/lib/repo/submissions.ts`

- `getSubmissionForAdminNotification(id): Promise<SlackSubmissionData | null>` —
  the submission row + categories + submitter fields, re-read fresh at
  notification time (for the instant notification).
- `listPendingSubmissions({ limit })` — rows with `status = "pending"`
  ordered newest-first (for the digest), plus a cheap `count`.
  Pure SELECT functions in the existing repo style.

### 4.3 Notification queue — producer (Next app side)

`src/lib/services/notifications-queue.ts` (new):

- `enqueueSubmissionNotification(submissionId: number)` — adds
  `{ kind: "submission-notification", submissionId }` to the queue with
  `attempts: 5` and exponential backoff.
- `notificationsQueueEnabled()` reads `process.env.REDIS_URL` at call time.
  When unset (local dev without Redis): logs at debug level and returns without
  side effects — same degradation philosophy as the email/R2 services.
- Connection details owned only here ("owns connection" rule; `slack.ts` and
  workers share the URL string but never the connection object).
- `src/lib/services/notifications-queue.ts` and the worker create jobs with an
  explicit retention policy: `removeOnComplete: 100, removeOnFail: 200`
  (a bounded debugging tail in Redis rather than unbounded growth). The
  complete-on-fire removal always applies to regular jobs of **both** kinds —
  `submission-notification` and digest runs alike.

The producer in `submitApp` (see §5) does not import bullmq.

### 4.4 Digest registry — `src/lib/services/notifications/digests.ts` (new)

Digests are a **data registry**, not hardcoded workers. One digest = one entry:

```ts
export type DigestDefinition = {
  /** stable job name (write-once; used as the BullMQ job name + repeat key) */
  name: string;                     // e.g. "pending-submissions"
  /** env var holding the node-cron pattern for this digest, e.g. "0 9 */3 * *" */
  cronEnvVar: string;               // e.g. "DIGEST_PENDING_SUBMISSIONS_CRON"
  /** optional per-digest webhook override; falls back to SLACK_WEBHOOK_URL */
  webhookEnvVar?: string;
  /** pure: query pending data, build the Slack message (null = send nothing) */
  build: () => Promise<SlackMessage | null>;
};
```

Rules:

- Stable job names are a contract with persisted state in Redis: renaming a
  digest after first deployment is forbidden (renames require an operator to
  delete the stale repeat config). Unknown/rejected digest names in job payloads
  are treated as errors and logged loudly, not silently ignored — this surfaces
  "script renamed but Redis still holds the old repeatable" mistakes.
- Adding a future digest = add one definition (name + env var + build fn) to
  this array. No changes to the worker, queue, or compose files. Schedules and
  channels are env config, not code.

Shipping initially with one entry: `pending-submissions` whose `build` calls
`listPendingSubmissions()` and `pendingDigestMessage(...)`, returning `null`
when the count is zero (skip-send rule — no empty digests).

### 4.5 Worker & scheduling — BullMQ worker (new `worker` container)

Standalone entrypoint `scripts/run-notification-worker.ts` (repo script
convention: `node --experimental-strip-types --env-file-if-exists=.env`,
relative imports only — no `@/*` alias):

1. **Register** repeatable jobs: for each `DigestDefinition`:
   `add(def.name, { kind: "digest", digest: def.name },
   { repeat: { pattern: env(def.cronEnvVar), tz: TZ or UTC } })`. Registration is
   idempotent (upsert); safe on every boot.
2. **Process** — `new Worker(queueName, handler)` blocks forever:
   - `kind: "submission-notification"` → fetch the submission from the repo →
     `postToSlack(newSubmissionMessage(...))`.
   - `kind: "digest"` → resolve definition by payload name from the registry →
     `def.build()` → if non-null → `postToSlack(message, webhookByDef)`.
   - Unknown job kind/name → handler throws (job lands in the failed set, error
     logged).
   - `--fire-digest <name>` mode: registers nothing, enqueues a single digest
     job by name and exits (operator tooling for manual verification; name
     validated against the registry, unknown name exits non-zero).

Single source of truth for the queue name: a deterministic exported constant
`NOTIFICATIONS_QUEUE = "notifications"` in `src/lib/services/notifications-queue.ts`,
imported by the worker script as a relative path (simple, one-way dependency —
the worker script is a repo script, not part of the Next app bundle).
Per-job options: `attempts: 5, backoff: { type: "exponential", delay: 30_000 }`.
Job lifecycle (fires vs. persistent state): a **repeatable job** is a persisted
repeat *configuration* in Redis; each cron slot enqueues one normal job and
scheduling continues forever from that config. Regular jobs of both kinds
(`submission-notification` **and** each fired digest run) are removed from Redis
once processed, subject to the retention tail defined in §4.3 — only the repeat
configs survive as persistent state.
Timezone: respects container `TZ` (spec'd default UTC unless `.env.prod` sets
`TZ`).

### 4.6 Docker topology

`Dockerfile` — new stage `worker` (before `runner`; nothing in the runner
changes):

```dockerfile
FROM node:22-bookworm-slim AS worker
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules   # full deps (bullmq, drizzle, ...)
COPY src ./src
COPY db ./db
COPY drizzle.config.ts ./
COPY scripts ./scripts
USER node
# Runtime env (DATABASE_URL, SLACK_WEBHOOK_URL, REDIS_URL, digest crons, TZ)
# arrives from the compose service's env_file — no .env is baked into the image.
CMD ["node", "--experimental-strip-types", "scripts/run-notification-worker.ts"]
```

(Note: node_modules full tree is reused from the existing `deps` stage; no new
`npm ci`, no second registry fetch.)

`docker-compose.prod.yml` — two new services, existing three untouched:

```yaml
redis:
  image: redis:7-alpine
  command: ["redis-server", "--appendonly", "yes"]   # job persistence across restarts
  volumes: [redis-data:/data]
  restart: unless-stopped

worker:
  build: { context: ., dockerfile: Dockerfile, target: worker }
  env_file: .env.prod          # DATABASE_URL, SLACK_WEBHOOK_URL, REDIS_URL, digest crons, TZ
  environment:
    NODE_ENV: production
  depends_on: [redis]
  restart: unless-stopped
  # no ports/expose — nothing reachable from outside; jobs egress to Postgres + Slack only

volumes:
  redis-data:
```

`docker-compose.yml` (dev) — **same full stack**, since this is the primary
local/dev version: `redis` service (identical AOF command + volume, named under
the dev project) and a `worker` service pointing at the same `worker` Dockerfile
target with `restart: unless-stopped` and `depends_on: [redis]`. One
dev-specific detail: inside the container, `localhost` is not the dev Postgres —
the `worker` service sets `DATABASE_URL=postgres://postgres:postgres@db:5432/qad`
(service-network hostname, no mapped port), while `REDIS_URL` uses
`redis://redis:6379`. Slack vars may be left unset in `.env` locally: the
worker then runs with the no-op Slack degradation (§4.1) and enqueued jobs
complete without sending — useful for exercising the queue end to end without a
real webhook. Unset `REDIS_URL` in the app env still means "producer disabled"
(§4.3) — the compose stack is additive and safe to run.

### 4.7 Producer wiring in the action — `src/lib/actions/submissions.ts`

Current post-commit block:

```ts
await sendSubmitEmails(data, result.trackingId, result.submissionId);
```

Becomes (id, not full row, goes over Redis; format stays in code):

```ts
await notifySubmission(result.submissionId, result.trackingId);
```

with

```ts
async function notifySubmission(submissionId: number, trackingId: string) {
  try {
    await sendSubmitEmails(...as today...);            // unchanged email path
    await enqueueSubmissionNotification(submissionId); // bullmq producer
  } catch (e) {
    console.error("submit notification failed", e);
  }
}
```

Contract preserved from the current email wrapper: **any notification
infrastructure failure logs and is swallowed; the submission result is already
committed and returned to the user**.

### 4.8 Slack contract

Incoming webhooks are used (no bot, no OAuth): one webhook per destination,
created in Slack and pinned to a channel at creation time. The code therefore
never names a channel. Message bodies use Slacks chat-message structure
`{ text, blocks }` and are laid out with Block Kit sections/fields/buttons.
Admin links point at the existing admin UI (no new routes).

## 5. Data Flow (end to end)

**Instant**:
1. User submits → `submitApp` validation/transaction succeed → row `pending`.
2. `notifySubmission` → email still sent → enqueue job → user gets success
   screen (all infrastructure failures swallowed).
3. Worker container picks up job (typical latency < 1 s; adds retry on
   failure: 5 attempts, exponential backoff from 30 s).
4. Handler re-reads full submission + categories from Postgres (payload is ids
   only so Slack formatting always reflects current code, never frozen job data).
5. Build Block Kit → POST webhook → job marked completed.

**Digest**:
1. On worker boot (and at every restart), repeatable `pending-submissions` job
   is re-registered from `DIGEST_PENDING_SUBMISSIONS_CRON` (node-cron syntax,
   e.g. `"0 9 */3 * *"`, wall-clock anchored — unlike sleep loops).
2. At each slot, BullMQ enqueues one `{ kind: "digest", digest: "pending-submissions" }`.
3. `def.build()` → `listPendingSubmissions()` → zero rows → `null` → skip send
   (not an error).
4. Otherwise POST digest (count, oldest age, ≤10 newest with tracking ids,
   admin link) → completed.

## 6. Error Handling

| Failure | Behavior |
|---|---|
| Slack POST fails (network/4xx/5xx) | BullMQ retries job (5 attempts, exponential backoff from 30 s); after exhaustion, job sits in `failed` set; reported via `docker logs qad-prod-worker-1` |
| Slack webhook unset (`SLACK_WEBHOOK_URL=""`) | `slackBackend() === "none"`: worker and producers log no-op only (mirrors `ADMIN_EMAIL` unset). No channel message |
| Redis unreachable at enqueue time (`submitApp`) | Exception caught by the post-commit wrapper + `console.error`; submission returns success. Email confirmation is still out. Recovery = the digest, which self-heals visibility of every pending item on the next slot |
| Redis down at worker runtime | `restart: unless-stopped` retries the worker; Redis AOF keeps queue/repeat configs across redis restarts |
| Duplicate enqueue (bulked retry / race) | Harmless: two identical Slack messages, worst case. Idempotence through DB state (a duplicate message is an annoyance, not a bug — not worth introducing a dedup table under YAGNI) |
| Unknown job kind / digest name | Worker throws → job in failed set → loud log. Repeatable renames require explicit cleanup, per §4.4 |
| Zero pending submissions at digest slot | `build` returns null → skip send (explicit product decision: silence over noise) |

## 7. Configuration (new env vars)

| Var | Where | Meaning | Unset behavior |
|---|---|---|---|
| `SLACK_WEBHOOK_URL` | `.env`, `.env.prod`, `.env.example`, `.env.prod.example` | Team review-channel incoming webhook | Slack disabled (no-op + log) |
| `REDIS_URL` | both | e.g. `redis://redis:6379` | Producer no-op; worker shall not start |
| `DIGEST_PENDING_SUBMISSIONS_CRON` | both | node-cron pattern, e.g. `0 9 */3 * *` | Digest not registered (repeatable job + names are per-digest opt-in) |
| `TZ` | service env, optional | cron slot semantics | UTC |

Documented in both `.env.example` (group "Submission Slack notifications") and
`.env.prod.example` (with deploy guidance), following the existing grouping
convention ("Submission emails (Plan 3)" style comments).

## 8. Testing

Following existing conventions (`tests/email.test.ts`, `tests/review-actions.test.ts`):

1. **`tests/slack.test.ts`** — pure message builders + `postToSlack`:
   - Building `newSubmissionMessage` produces the expected Block Kit shape
     (heading texts, category fields, correct admin URL, button `url`).
   - `pendingDigestMessage` — 0/1/few/many items (≤10 newest shown, `total`
     correct, oldest-age wording day-precise).
   - `postToSlack` POSTS to URL with correct JSON (`vi` on injected fetch);
     unset env no-op is asserted; the injected-transport path is asserted
     without network.
2. **`tests/notifications-queue.test.ts`** — producer with injected fake queue:
   - `enqueueSubmissionNotification` creates correct job kind/payload/attempts.
   - Desired degradation when `REDIS_URL` unset / queue disabled.
   - Desired no-op vs. throw behavior (unhandled errors only surface as log).
3. **Repo functions tested against real DB**, style of `tests/apps-repo.test.ts`:
   - `listPendingSubmissions` — pending filter (approved/rejected excluded),
     newest-first, limit, count correctness.
   - `getSubmissionForAdminNotification` — categories attached, missing id → null.
4. **Worker dispatch unit test** (`tests/notification-worker-dispatch.test.ts`)
   using an injected handler map — dispatch by `kind`, registry lookup by
   digest name, unknown kind → throw, `build → null → skip` (no slack call).
5. **`tests/submissions-repo.test.ts`** (new file) covers both new repo
   functions in the existing real-DB style; existing repo test files are not
   modified unless a shared helper requires it.
5. **Playwright e2e — not extended** (visual flow unchanged; Slack/Redis are
   external services out of browser scope).

## 9. Files Touched (summary)

| File | Change |
|---|---|
| `src/lib/services/slack.ts` | new — backend check, postToSlack, message builders |
| `src/lib/services/notifications-queue.ts` | new — queue client, producer, no-op mode |
| `src/lib/services/notifications/digests.ts` | new — registry (initial digest: pending-submissions) |
| `src/lib/repo/submissions.ts` | add pending list + by-id get |
| `src/lib/actions/submissions.ts` | notifySubmission wrapper: enqueue after commit |
| `src/lib/services/email.ts` | export siteUrl (slight change, reuse not duplication) |
| `scripts/run-notification-worker.ts` | new — worker entrypoint |
| `Dockerfile` | new `worker` stage |
| `docker-compose.prod.yml` | redis service + worker service + volume |
| `docker-compose.yml` | optional redis (dev parity) |
| `.env.example`, `.env.prod.example` | document SLACK/REDIS/digest cron vars |
| `tests/slack.test.ts`, `tests/notifications-queue.test.ts`, `tests/notification-worker-dispatch.test.ts`, repo test | new |
| `package.json` | deps: `bullmq`, `ioredis` |

## 10. Deployment & Rollout Notes

1. Add the env vars to `.env.prod` (webhook URL from Slack; REDIS_URL; digest
   cron). Deploy `docker compose --env-file .env.prod -f docker-compose.prod.yml
   up -d --build`.
2. First boot registers the repeatable job; verify via `docker logs
   qad-prod-worker-1` and a test submission.
3. Manual checks, no waiting for the actual schedule:
   - Enqueue the digest through the BullMQ-correct path:
     `docker compose -f docker-compose.prod.yml run --rm worker node
     --experimental-strip-types scripts/run-notification-worker.ts --fire-digest
     pending-submissions` (a dedicated mode: registers nothing, adds one digest
     job, exits). With the worker service running, the message posts immediately.
   - Inspect the queue: `docker compose -f docker-compose.prod.yml exec redis
     redis-cli LLEN bull:notifications:wait` (BullMQ keys live under the
     `bull:notifications:*` namespace).
   - End-to-end proof: submit a real test submission through the app and watch
     `docker logs qad-prod-worker-1`.
4. Rollback: set env vars empty and redeploy → services no-op (no data damage);
   queue left behind in Redis is harmless; explicit cleanup:
   `bull:notifications` keys.

## 11. Risks & Accepted Trade-offs

- **Redis dependency is real**: a new containerized stateful service. Mitigated
  by AOF persistence, restart policies, and it being optional at the app level
  (env unset = disabled).
- **Enqueue-time loss window**: if Redis is briefly unreachable exactly when a
  submission commits, that instant notification is lost (accepted in favor of
  one notification path without a dual-send fallback; the email notification
  independently covers visibility, and the digest self-heals the backlog).
- **At-least-once delivery**: BullMQ does not guarantee exactly-once. Worst
  observed case is a duplicate Slack message on exotic retry timing; not worth
  a dedup store under YAGNI.
- **Node strip-types compatibility**: worker script must stick to the existing
  repo script dialect (relative imports, no `@/*`, typed import syntax only for
  `.ts` files) — the same constraint already respected by `db/seed.ts` and
  `scripts/reindex-embeddings.ts`.

## 12. Open Items for Implementation Plan

- Exact node-cron library choice: BullMQ uses its own cron engine (node-cron
  compatible syntax); no extra dependency needed.
- `attempts`/backoff more precisely: start at 30 s, cap at 1 h, 5 attempts max
  (numbers in this doc are defaults; tune during implementation from observed
  Slack error semantics).
- Whether the worker also serves future "kinds" with different payload shapes
  — dispatch design above already supports it with no structural change.
