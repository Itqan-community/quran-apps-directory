import { Queue, type JobsOptions } from "bullmq";
import { Redis } from "ioredis";

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

export type QueueLike = {
  add: (
    jobName: string,
    data: NotificationJobData,
    opts?: unknown,
  ) => Promise<unknown>;
};

/** True when a Redis connection is configured. Read at call time. */
export function notificationsQueueEnabled(): boolean {
  return Boolean(process.env.REDIS_URL);
}

/**
 * Enqueue a submission-notification job.
 *
 * Disabled (REDIS_URL unset) → logs a skip line and returns false (silent
 * degradation, same pattern as the email/R2 services). Enabled → adds the job
 * and returns true. A self-created queue is always closed in `finally`; an
 * injected queue (tests) is left open by the caller. Failures from Redis/
 * BullMQ propagate to the caller — this producer never swallows them.
 */
export async function enqueueSubmissionNotification(
  submissionId: number,
  injected?: QueueLike,
): Promise<boolean> {
  const redisUrl = process.env.REDIS_URL;
  if (!notificationsQueueEnabled() || !redisUrl) {
    console.info("[notifications] REDIS_URL unset — enqueue skipped");
    return false;
  }

  let selfQueue: Queue | undefined;
  let queue: QueueLike;
  if (injected) {
    queue = injected;
  } else {
    selfQueue = new Queue(NOTIFICATIONS_QUEUE, {
      connection: new Redis(redisUrl),
    });
    const self = selfQueue;
    // Wrap so the bullmq-specific `JobsOptions` param meets the `QueueLike`
    // contract (`opts?: unknown`); callers only ever pass JOB_DEFAULTS.
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
      await selfQueue.close();
    }
  }
}
