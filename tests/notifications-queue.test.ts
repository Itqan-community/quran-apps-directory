import { describe, it, expect, vi, afterEach } from "vitest";
import {
  NOTIFICATIONS_QUEUE,
  JOB_DEFAULTS,
  notificationsQueueEnabled,
  enqueueSubmissionNotification,
  type QueueLike,
} from "@/lib/services/notifications-queue";

const originalRedisUrl = process.env.REDIS_URL;

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  if (originalRedisUrl === undefined) delete process.env.REDIS_URL;
  else process.env.REDIS_URL = originalRedisUrl;
});

const clearRedisUrl = () => {
  delete process.env.REDIS_URL;
};

describe("NOTIFICATIONS_QUEUE / JOB_DEFAULTS", () => {
  it("pins the queue name and the retention/retry contract", () => {
    expect(NOTIFICATIONS_QUEUE).toBe("notifications");
    expect(JOB_DEFAULTS).toEqual({
      attempts: 5,
      backoff: { type: "exponential", delay: 30_000 },
      removeOnComplete: 100,
      removeOnFail: 200,
    });
  });
});

describe("notificationsQueueEnabled", () => {
  it("is false when REDIS_URL is unset", () => {
    clearRedisUrl();
    expect(notificationsQueueEnabled()).toBe(false);
  });

  it("is false when REDIS_URL is empty", () => {
    vi.stubEnv("REDIS_URL", "");
    expect(notificationsQueueEnabled()).toBe(false);
  });

  it("is true when REDIS_URL is set", () => {
    vi.stubEnv("REDIS_URL", "redis://localhost:6379");
    expect(notificationsQueueEnabled()).toBe(true);
  });
});

describe("enqueueSubmissionNotification (disabled)", () => {
  it("returns false, logs the skip line, and never calls add", async () => {
    clearRedisUrl();
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    const add = vi.fn().mockResolvedValue(undefined);
    const queue = { add } as QueueLike;

    const ok = await enqueueSubmissionNotification(42, queue);

    expect(ok).toBe(false);
    expect(info).toHaveBeenCalledWith(
      "[notifications] REDIS_URL unset — enqueue skipped",
    );
    expect(add).not.toHaveBeenCalled();
  });
});

describe("enqueueSubmissionNotification (enabled, injected queue)", () => {
  it("adds the job with JOB_DEFAULTS and does not close the injected queue", async () => {
    vi.stubEnv("REDIS_URL", "redis://localhost:6379");
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    const add = vi.fn().mockResolvedValue(undefined);
    const close = vi.fn().mockResolvedValue(undefined);
    const queue = { add, close } as unknown as QueueLike;

    const ok = await enqueueSubmissionNotification(42, queue);

    expect(ok).toBe(true);
    expect(info).not.toHaveBeenCalled();
    expect(add).toHaveBeenCalledTimes(1);
    expect(add).toHaveBeenCalledWith(
      "submission-notification",
      { kind: "submission-notification", submissionId: 42 },
      expect.objectContaining({
        attempts: 5,
        removeOnComplete: 100,
        removeOnFail: 200,
      }),
    );
    expect(close).not.toHaveBeenCalled();
  });
});
