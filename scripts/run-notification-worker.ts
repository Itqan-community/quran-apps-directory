/**
 * BullMQ worker entrypoint for the notifications queue.
 *
 * Run with tsx so the tsconfig `@/*` aliases resolve:
 *   npx tsx scripts/run-notification-worker.ts                 # worker mode
 *   npx tsx scripts/run-notification-worker.ts --fire-digest <name>
 *
 * The dispatch layer (toSlackSubmission, webhookForDef, handleJob,
 * registerDigests) is exported for tests and stays pure over an injected
 * `WorkerIO`; only `main()` touches Redis/Slack, and it runs only when this
 * file is the process entrypoint — importing it from vitest never starts
 * workers or connections.
 */

import { Queue, type JobsOptions, Worker } from "bullmq";
import { Redis } from "ioredis";

import {
  NOTIFICATIONS_QUEUE,
  JOB_DEFAULTS,
  type QueueLike,
} from "@/lib/services/notifications-queue";
import {
  digests,
  type DigestDefinition,
} from "@/lib/services/notifications/digests";
import {
  getSubmissionForAdminNotification,
  type SlackSubmissionData,
} from "@/lib/repo/submissions";
import {
  newSubmissionMessage,
  postToSlack,
  postToSlackUrl,
  type SlackMessage,
  type SlackSubmission,
} from "@/lib/services/slack";

export type WorkerIO = {
  getSubmission: (id: number) => Promise<SlackSubmissionData | null>;
  registry: DigestDefinition[];
  /** url === undefined → SLACK_WEBHOOK_URL via postToSlack; === "" → logged skip */
  post: (message: SlackMessage, url?: string) => Promise<void>;
  env: NodeJS.ProcessEnv; // passed explicitly so dispatch is unit-testable
};

/** Maps SlackSubmissionData → SlackSubmission (script-local composition helper). */
export function toSlackSubmission(data: SlackSubmissionData): SlackSubmission {
  return {
    trackingId: data.trackingId,
    appNameEn: data.appNameEn,
    appNameAr: data.appNameAr,
    submitterName: data.submitterName,
    submitterEmail: data.submitterEmail,
    submitterOrganization: data.submitterOrganization,
    categories: data.categories,
    submissionId: data.id,
    submittedAt: data.submittedAt,
  };
}

/** Per-digest webhook override, falling back to SLACK_WEBHOOK_URL, then "". */
export function webhookForDef(
  def: DigestDefinition,
  env: NodeJS.ProcessEnv,
): string {
  const override = def.webhookEnvVar ? env[def.webhookEnvVar] : undefined;
  return override || env.SLACK_WEBHOOK_URL || "";
}

/**
 * Dispatch one queued job. Every failure path throws (loud) so BullMQ's
 * retry/backoff from JOB_DEFAULTS applies; nothing is silently dropped.
 */
export async function handleJob(raw: unknown, io: WorkerIO): Promise<void> {
  if (typeof raw !== "object" || raw === null) {
    throw new Error("[notifications] unknown job payload");
  }
  const payload = raw as { kind?: unknown; submissionId?: unknown; digest?: unknown };

  if (payload.kind === "submission-notification") {
    if (typeof payload.submissionId !== "number") {
      throw new Error(
        "[notifications] submission-notification job missing numeric submissionId",
      );
    }
    const row = await io.getSubmission(payload.submissionId);
    if (!row) {
      throw new Error(
        `[notifications] submission ${payload.submissionId} not found`,
      );
    }
    await io.post(newSubmissionMessage(toSlackSubmission(row)));
    return;
  }

  if (payload.kind === "digest") {
    if (typeof payload.digest !== "string") {
      throw new Error("[notifications] digest job missing digest name");
    }
    // Digest names are write-once contracts: an unknown name is a bug and
    // must fail loudly, never be silently ignored.
    const def = io.registry.find((d) => d.name === payload.digest);
    if (!def) {
      throw new Error(
        `[notifications] unknown digest "${payload.digest}" (known: ${io.registry
          .map((d) => d.name)
          .join(", ")})`,
      );
    }
    const url = webhookForDef(def, io.env);
    const msg = await def.build();
    if (msg === null) {
      console.info("[notifications] digest skipped (nothing pending)");
      return;
    }
    await io.post(msg, url);
    return;
  }

  throw new Error(`[notifications] unknown job kind: ${String(payload.kind)}`);
}

/**
 * Registers each digest whose cron env var is set as a BullMQ job scheduler
 * (scheduler id = job name = digest name, write-once). Uses
 * `upsertJobScheduler` — idempotent on every boot (upserting an existing id
 * updates it) and, unlike `add({ repeat })` in bullmq v6, actually creates a
 * cron scheduler instead of firing the job once. Returns the number of
 * digests actually registered.
 */
export async function registerDigests(
  queue: QueueLike,
  env: NodeJS.ProcessEnv,
): Promise<number> {
  let registered = 0;
  for (const def of digests) {
    const pattern = env[def.cronEnvVar];
    if (!pattern) {
      // An unset cron var must ALSO remove a scheduler persisted by a
      // previous boot with the var set — upsert alone would leave the old
      // scheduler firing. Idempotent: a missing scheduler just resolves
      // false and the removal is not announced.
      const removed = await queue
        .removeJobScheduler(def.name)
        .catch((err) => {
          console.error(
            `[notifications] failed to remove leftover scheduler "${def.name}"`,
            err,
          );
          return false;
        });
      console.info(
        removed
          ? `[notifications] digest "${def.name}" not registered (${def.cronEnvVar} unset) — removed leftover scheduler`
          : `[notifications] digest "${def.name}" not registered (${def.cronEnvVar} unset)`,
      );
      continue;
    }
    await queue.upsertJobScheduler(
      def.name,
      { pattern },
      {
        name: def.name,
        data: { kind: "digest", digest: def.name },
        opts: JOB_DEFAULTS,
      },
    );
    registered += 1;
  }
  console.info(`[notifications] registered ${registered} digest(s)`);
  return registered;
}

async function main(): Promise<void> {
  const io: WorkerIO = {
    getSubmission: (id) => getSubmissionForAdminNotification(id),
    registry: digests,
    // url === undefined → SLACK_WEBHOOK_URL; "" → the slack module's logged no-op.
    post: (message, url) =>
      url === undefined ? postToSlack(message) : postToSlackUrl(url, message),
    env: process.env,
  };

  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    console.error("[notifications] REDIS_URL is not set — cannot run the worker");
    process.exit(1);
  }

  const connection = new Redis(redisUrl, { maxRetriesPerRequest: null });

  // --fire-digest <name>: enqueue one digest job now, then exit.
  const fireAt = process.argv.indexOf("--fire-digest");
  if (fireAt !== -1) {
    const name = process.argv[fireAt + 1];
    const def = digests.find((d) => d.name === name);
    if (!def) {
      console.error(
        `[notifications] unknown digest "${name ?? ""}" (known: ${digests
          .map((d) => d.name)
          .join(", ")})`,
      );
      process.exit(1);
    }
    const queue = new Queue(NOTIFICATIONS_QUEUE, { connection });
    try {
      await queue.add(def.name, { kind: "digest", digest: def.name }, JOB_DEFAULTS);
      console.info(`[notifications] enqueued one-shot digest "${def.name}"`);
    } finally {
      await queue.close();
    }
    await connection.quit();
    process.exit(0);
  }

  // Worker mode: register repeat digests, then process until killed.
  const queue = new Queue(NOTIFICATIONS_QUEUE, { connection });
  // Wrap so the bullmq-specific `JobsOptions` param meets the `QueueLike`
  // contract (`opts?: unknown`) — same adapter pattern as the producer.
  const queueLike: QueueLike = {
    add: (name, data, opts) =>
      queue.add(name, data, opts as JobsOptions | undefined),
    upsertJobScheduler: (id, repeatOpts, jobTemplate) =>
      queue.upsertJobScheduler(
        id,
        repeatOpts,
        jobTemplate as
          | { name?: string; data?: unknown; opts?: JobsOptions }
          | undefined,
      ),
    removeJobScheduler: (id) => queue.removeJobScheduler(id),
  };
  await registerDigests(queueLike, process.env);

  const worker = new Worker(NOTIFICATIONS_QUEUE, (job) => handleJob(job.data, io), {
    connection,
  });
  worker.on("failed", (job, err) => {
    console.error(
      `[notifications] job "${job?.name ?? "unknown"}" failed:`,
      err,
    );
  });
  worker.on("completed", (job) => {
    console.info("[notifications] processed", job.name, job.id);
  });
  // Graceful shutdown: let in-flight jobs finish, close the worker (and its
  // shared connection), then exit 0 for a clean compose restart.
  process.on("SIGTERM", () => {
    worker
      .close()
      .then(() => process.exit(0))
      .catch((err) => {
        console.error("[notifications] worker.close() failed on SIGTERM:", err);
        process.exit(1);
      });
  });
  console.info(`[notifications] worker running on queue "${NOTIFICATIONS_QUEUE}"`);
  // Block forever; the ioredis connection keeps the event loop alive too.
  await new Promise<void>(() => {});
}

// Entrypoint guard: importing this module (vitest) never starts workers.
if (process.argv[1]?.includes("run-notification-worker")) {
  main().catch((err) => {
    console.error("[notifications] worker crashed:", err);
    process.exit(1);
  });
}
