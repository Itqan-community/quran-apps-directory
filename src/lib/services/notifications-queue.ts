import { Queue, type JobsOptions } from "bullmq";

// Queue producer shared by the Next app and the worker script (Task 7).
// This module must stay dependency-free of `@/db` and repo modules: it talks
// to Redis only, so both entry points can import it without a database.

export const NOTIFICATIONS_QUEUE = "notifications";

export type NotificationJobData =
  | { kind: "submission-notification"; submissionId: number }
  | { kind: "digest"; digest: string };

// Retention ring (spec): keep the last 100 completed / 200 failed jobs so the
// queue never grows unbounded while still leaving a short audit trail.
export const JOB_DEFAULTS = {
  attempts: 5,
  backoff: { type: "exponential" as const, delay: 30_000 },
  removeOnComplete: 100,
  removeOnFail: 200,
};

/**
 * Producer-facing queue shape: the Next app only ever adds jobs. The
 * worker-facing `QueueLike` below extends this with the scheduler methods
 * `registerDigests` needs (ISP: the producer is not typed against APIs it
 * never calls).
 */
export type JobAdderLike = {
  add: (
    jobName: string,
    data: NotificationJobData,
    opts?: unknown,
  ) => Promise<unknown>;
};

export type QueueLike = JobAdderLike & {
  // Cron-based repeatable scheduling. In bullmq v6 a plain `add` with
  // `{ repeat: { pattern } }` fires once and creates NO scheduler — the
  // scheduler must be created via `upsertJobScheduler` (idempotent on the
  // scheduler id). `jobTemplate.opts` carries the per-job options (retention).
  upsertJobScheduler: (
    jobSchedulerId: string,
    repeatOpts: { pattern?: string; tz?: string },
    jobTemplate?: {
      name?: string;
      data?: NotificationJobData;
      opts?: unknown;
    },
  ) => Promise<unknown>;
  // Removes a persisted scheduler by id; resolves true when one existed.
  // Used to clean up a scheduler whose cron env var was unset since the
  // last boot (upsert alone would leave the old scheduler running).
  removeJobScheduler: (jobSchedulerId: string) => Promise<unknown>;
};

/** True when a Redis connection is configured. Read at call time. */
export function notificationsQueueEnabled(): boolean {
  return Boolean(process.env.REDIS_URL);
}

/**
 * Bounded, fast-fail connection for the producer. The Next app runs on a
 * public, unauthenticated path, so a Redis outage must reject quickly
 * instead of hanging the request:
 *
 * - `enableOfflineQueue: false` — commands issued while not connected fail
 *   immediately instead of queueing behind infinite reconnects.
 * - `connectTimeout: 2_000` — a dead Redis cannot stall a submit for long.
 * - `maxRetriesPerRequest: 1` — one retry per command, then reject.
 * - `retryStrategy: () => null` — ioredis gives up after the first failed
 *   reconnect attempt (its default retries forever).
 *
 * Passing an OPTIONS object (not a client instance) also matters: bullmq
 * treats a caller-supplied ioredis INSTANCE as `shared` and deliberately
 * does not quit it on `queue.close()` — every submission would then leak a
 * live socket + reconnect timers. With an options object bullmq constructs
 * and owns its own client (`new ioredis(url, rest)` — the `url` key is
 * honored by its client builder) and `close()` quits it. The worker keeps
 * its own long-lived shared ioredis connection; this fast-fail behavior is
 * producer-only.
 */
export function producerConnectionOptions(redisUrl: string): {
  url: string;
  enableOfflineQueue: false;
  maxRetriesPerRequest: number;
  connectTimeout: number;
  // ioredis retry hook: returning null stops reconnection after the first
  // failed attempt (its default retries forever).
  retryStrategy: (times: number) => null;
} {
  return {
    url: redisUrl,
    enableOfflineQueue: false,
    maxRetriesPerRequest: 1,
    connectTimeout: 2_000,
    retryStrategy: () => null,
  };
}

/**
 * Enqueue a submission-notification job.
 *
 * Disabled (REDIS_URL unset) → logs a skip line and returns false (silent
 * degradation, same pattern as the email/R2 services). Enabled → adds the job
 * and returns true. A self-created queue is always closed in `finally` (and
 * bullmq owns its connection, so the close actually quits the client — see
 * `producerConnectionOptions`); an injected queue (tests) is left open by the
 * caller. Failures from Redis/BullMQ propagate to the caller — this producer
 * never swallows them — and a failing `close()` can only be logged, never
 * mask the original error.
 */
export async function enqueueSubmissionNotification(
  submissionId: number,
  injected?: JobAdderLike,
): Promise<boolean> {
  if (!notificationsQueueEnabled()) {
    console.info("[notifications] REDIS_URL unset — enqueue skipped");
    return false;
  }
  const redisUrl = process.env.REDIS_URL!;

  let selfQueue: Queue | undefined;
  let queue: JobAdderLike;
  if (injected) {
    queue = injected;
  } else {
    selfQueue = new Queue(NOTIFICATIONS_QUEUE, {
      connection: producerConnectionOptions(redisUrl),
    });
    const self = selfQueue;
    // Wrap so the bullmq-specific `JobsOptions` param meets the
    // `JobAdderLike` contract (`opts?: unknown`); callers only ever pass
    // JOB_DEFAULTS.
    queue = {
      add: (name, data, opts) =>
        self.add(name, data, opts as JobsOptions | undefined),
    };
  }

  try {
    await queue.add(
      "submission-notification",
      { kind: "submission-notification", submissionId },
      JOB_DEFAULTS,
    );
    return true;
  } finally {
    if (selfQueue) {
      try {
        await selfQueue.close();
      } catch (closeErr) {
        // Never let a close failure mask the original add error.
        console.error("[notifications] failed to close self-created queue", closeErr);
      }
    }
  }
}
