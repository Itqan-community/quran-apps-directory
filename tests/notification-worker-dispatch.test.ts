import { describe, it, expect, vi, afterEach, type Mock } from "vitest";
import { digests } from "@/lib/services/notifications/digests";
import { JOB_DEFAULTS, type QueueLike } from "@/lib/services/notifications-queue";
import type { SlackSubmissionData } from "@/lib/repo/submissions";
import type { SlackMessage } from "@/lib/services/slack";
import {
  toSlackSubmission,
  webhookForDef,
  handleJob,
  registerDigests,
  type WorkerIO,
} from "../scripts/run-notification-worker";

// Task 7 appends the dispatch/worker describe blocks to this file; the
// registry metadata tests below only import the registry itself.
describe("digest registry", () => {
  it("declares at least one digest", () => {
    expect(digests.length).toBeGreaterThanOrEqual(1);
  });

  it("has unique digest names", () => {
    const names = digests.map((d) => d.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it("every digest has a non-empty name, cronEnvVar, and build function", () => {
    for (const def of digests) {
      expect(def.name.length).toBeGreaterThan(0);
      expect(def.cronEnvVar.length).toBeGreaterThan(0);
      expect(def.build).toBeTypeOf("function");
    }
  });

  it("includes the pending-submissions digest wired to its cron env var", () => {
    const def = digests.find((d) => d.name === "pending-submissions");
    expect(def).toBeDefined();
    expect(def?.cronEnvVar).toBe("DIGEST_PENDING_SUBMISSIONS_CRON");
    expect(def?.webhookEnvVar).toBeUndefined();
  });
});

/* ------------------------------------------------------------------ */
/* Task 7: dispatch / worker entrypoint logic (fake IO, no Redis/Slack) */
/* ------------------------------------------------------------------ */

// Env is exercised through the real process.env (vi.stubEnv, repo convention)
// because Next.js augments NodeJS.ProcessEnv with a required NODE_ENV, so a
// bare fake object would not typecheck. io.env still references it explicitly,
// keeping the dispatch layer unit-testable per the WorkerIO contract.
const originalSlackWebhook = process.env.SLACK_WEBHOOK_URL;
const originalXWebhook = process.env.X_WEBHOOK;
const originalDigestCron = process.env.DIGEST_PENDING_SUBMISSIONS_CRON;

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  if (originalSlackWebhook === undefined) delete process.env.SLACK_WEBHOOK_URL;
  else process.env.SLACK_WEBHOOK_URL = originalSlackWebhook;
  if (originalXWebhook === undefined) delete process.env.X_WEBHOOK;
  else process.env.X_WEBHOOK = originalXWebhook;
  if (originalDigestCron === undefined)
    delete process.env.DIGEST_PENDING_SUBMISSIONS_CRON;
  else process.env.DIGEST_PENDING_SUBMISSIONS_CRON = originalDigestCron;
});

const sampleRow: SlackSubmissionData = {
  id: 7,
  trackingId: "TRK-0007",
  appNameEn: "Tajweed Reader",
  appNameAr: "قارئ التجويد",
  submitterName: "Amina",
  submitterEmail: "amina@example.com",
  submitterOrganization: "Itqan Labs",
  developerNameEn: "Amina Dev",
  categories: ["tajweed", "qiraat"],
  submittedAt: new Date("2026-11-01T10:00:00Z"),
};

const digestMsg: SlackMessage = {
  text: "2 pending submissions — oldest 3 days ago",
  blocks: [],
};

function makeIO(
  overrides: Omit<Partial<WorkerIO>, "post"> = {},
): WorkerIO & { post: Mock } {
  return {
    getSubmission: vi.fn().mockResolvedValue(sampleRow),
    registry: digests,
    post: vi.fn().mockResolvedValue(undefined),
    env: process.env,
    ...overrides,
  };
}

describe("toSlackSubmission", () => {
  it("maps SlackSubmissionData fields incl. categories passthrough and id → submissionId", () => {
    expect(toSlackSubmission(sampleRow)).toEqual({
      trackingId: "TRK-0007",
      appNameEn: "Tajweed Reader",
      appNameAr: "قارئ التجويد",
      submitterName: "Amina",
      submitterEmail: "amina@example.com",
      submitterOrganization: "Itqan Labs",
      categories: ["tajweed", "qiraat"],
      submissionId: 7,
      submittedAt: sampleRow.submittedAt,
    });
  });
});

describe("webhookForDef", () => {
  const defWithOverride = {
    name: "d",
    cronEnvVar: "D_CRON",
    webhookEnvVar: "X_WEBHOOK",
    build: async () => null,
  };

  it("prefers the per-digest webhook override", () => {
    vi.stubEnv("X_WEBHOOK", "https://x.test/h");
    vi.stubEnv("SLACK_WEBHOOK_URL", "https://d.test/h");
    expect(webhookForDef(defWithOverride, process.env)).toBe("https://x.test/h");
  });

  it("falls back to SLACK_WEBHOOK_URL when the override key is unset", () => {
    delete process.env.X_WEBHOOK;
    vi.stubEnv("SLACK_WEBHOOK_URL", "https://d.test/h");
    expect(webhookForDef(defWithOverride, process.env)).toBe("https://d.test/h");
  });

  it("uses SLACK_WEBHOOK_URL for defs without a webhookEnvVar", () => {
    vi.stubEnv("SLACK_WEBHOOK_URL", "https://d.test/h");
    const def = { name: "d", cronEnvVar: "D_CRON", build: async () => null };
    expect(webhookForDef(def, process.env)).toBe("https://d.test/h");
  });

  it("returns an empty string when nothing is configured", () => {
    delete process.env.SLACK_WEBHOOK_URL;
    delete process.env.X_WEBHOOK;
    const def = { name: "d", cronEnvVar: "D_CRON", build: async () => null };
    expect(webhookForDef(def, process.env)).toBe("");
  });
});

describe("handleJob (submission-notification)", () => {
  it("posts a message containing the admin URL and the app name", async () => {
    const io = makeIO();

    await handleJob({ kind: "submission-notification", submissionId: 7 }, io);

    expect(io.getSubmission).toHaveBeenCalledWith(7);
    expect(io.post).toHaveBeenCalledTimes(1);
    const [message] = io.post.mock.calls[0] as [SlackMessage];
    expect(message.text).toContain("/admin/submissions/7");
    expect(message.text).toContain("Tajweed Reader");
  });

  it("rejects loudly when the submission row is missing and posts nothing", async () => {
    const io = makeIO({ getSubmission: vi.fn().mockResolvedValue(null) });

    await expect(
      handleJob({ kind: "submission-notification", submissionId: 999 }, io),
    ).rejects.toThrow();
    expect(io.post).not.toHaveBeenCalled();
  });
});

describe("handleJob (digest)", () => {
  it("does not post when build returns null and logs the skip line", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    const def = { name: "d", cronEnvVar: "D_CRON", build: async () => null };
    const io = makeIO({ registry: [def] });

    await handleJob({ kind: "digest", digest: "d" }, io);

    expect(io.post).not.toHaveBeenCalled();
    expect(info).toHaveBeenCalledWith(
      "[notifications] digest skipped (nothing pending)",
    );
  });

  it("posts to the per-digest webhook override when set", async () => {
    vi.stubEnv("X_WEBHOOK", "https://x.test/h");
    vi.stubEnv("SLACK_WEBHOOK_URL", "https://d.test/h");
    const def = {
      name: "d",
      cronEnvVar: "D_CRON",
      webhookEnvVar: "X_WEBHOOK",
      build: async () => digestMsg,
    };
    const io = makeIO({ registry: [def] });

    await handleJob({ kind: "digest", digest: "d" }, io);

    expect(io.post).toHaveBeenCalledTimes(1);
    expect(io.post).toHaveBeenCalledWith(digestMsg, "https://x.test/h");
  });

  it("falls back to SLACK_WEBHOOK_URL when the override key is unset", async () => {
    delete process.env.X_WEBHOOK;
    vi.stubEnv("SLACK_WEBHOOK_URL", "https://d.test/h");
    const def = {
      name: "d",
      cronEnvVar: "D_CRON",
      webhookEnvVar: "X_WEBHOOK",
      build: async () => digestMsg,
    };
    const io = makeIO({ registry: [def] });

    await handleJob({ kind: "digest", digest: "d" }, io);

    expect(io.post).toHaveBeenCalledWith(digestMsg, "https://d.test/h");
  });

  it("rejects loudly on an unknown digest name and posts nothing", async () => {
    const io = makeIO();

    await expect(
      handleJob({ kind: "digest", digest: "no-such-digest" }, io),
    ).rejects.toThrow();
    expect(io.post).not.toHaveBeenCalled();
  });
});

describe("handleJob (malformed payloads)", () => {
  it("rejects non-object payloads with the unknown-payload error", async () => {
    const io = makeIO();
    for (const bad of ["hello", 42, null, undefined, true]) {
      await expect(handleJob(bad, io)).rejects.toThrow(
        "[notifications] unknown job payload",
      );
    }
  });

  it("rejects unknown kind values", async () => {
    const io = makeIO();
    await expect(handleJob({ kind: "wat" }, io)).rejects.toThrow();
    expect(io.post).not.toHaveBeenCalled();
  });
});

describe("registerDigests", () => {
  it("upserts one scheduler per configured digest (idempotent) and returns the registered count", async () => {
    const upsertJobScheduler = vi.fn().mockResolvedValue(undefined);
    const removeJobScheduler = vi.fn().mockResolvedValue(false);
    const add = vi.fn().mockResolvedValue(undefined);
    const queue = { add, upsertJobScheduler, removeJobScheduler } as QueueLike;
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    vi.stubEnv("DIGEST_PENDING_SUBMISSIONS_CRON", "0 8 * * *");

    // Explicit expected count: defs whose cron env var is set in this env —
    // decoupled from the assumption that every digest is registered.
    const expectedCount = digests.filter(
      (d) => process.env[d.cronEnvVar],
    ).length;
    expect(expectedCount).toBeGreaterThan(0); // test is meaningful

    const count = await registerDigests(queue, process.env);

    expect(count).toBe(expectedCount);
    // One upsert per registered def — idempotent scheduler registration.
    expect(upsertJobScheduler).toHaveBeenCalledTimes(expectedCount);
    // Registration goes through the scheduler API, never a plain add.
    expect(add).not.toHaveBeenCalled();
    // Nothing is configured-out here, so no leftover-scheduler removal runs.
    expect(removeJobScheduler).not.toHaveBeenCalled();
    for (const def of digests) {
      if (!process.env[def.cronEnvVar]) continue;
      expect(upsertJobScheduler).toHaveBeenCalledWith(
        def.name, // scheduler id = write-once digest name
        { pattern: "0 8 * * *" }, // cron pattern
        {
          name: def.name, // job name stays the write-once digest name
          data: { kind: "digest", digest: def.name }, // payload unchanged
          // Full JOB_DEFAULTS carried via the job template opts — includes the
          // retention ring (removeOnComplete: 100 / removeOnFail: 200).
          opts: expect.objectContaining(JOB_DEFAULTS),
        },
      );
    }
    // F2: operator-visible registration summary with the accurate count.
    expect(info).toHaveBeenCalledWith(
      `[notifications] registered ${expectedCount} digest(s)`,
    );
  });

  it("skips digests whose cron env var is unset and returns the registered count", async () => {
    const upsertJobScheduler = vi.fn().mockResolvedValue(undefined);
    // No leftover scheduler exists → removal is a no-op (resolves false).
    const removeJobScheduler = vi.fn().mockResolvedValue(false);
    const add = vi.fn().mockResolvedValue(undefined);
    const queue = { add, upsertJobScheduler, removeJobScheduler } as QueueLike;
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    delete process.env.DIGEST_PENDING_SUBMISSIONS_CRON;

    const expectedCount = digests.filter(
      (d) => process.env[d.cronEnvVar],
    ).length;
    expect(expectedCount).toBe(0);

    const count = await registerDigests(queue, process.env);

    expect(count).toBe(0);
    expect(upsertJobScheduler).not.toHaveBeenCalled();
    expect(add).not.toHaveBeenCalled();
    // An unset cron var also removes any leftover scheduler (idempotent: a
    // missing scheduler resolves false and is not announced as removed).
    expect(removeJobScheduler).toHaveBeenCalledTimes(digests.length);
    for (const def of digests) {
      expect(removeJobScheduler).toHaveBeenCalledWith(def.name);
    }
    // Skip is logged per def, and the summary reflects zero registered.
    expect(info).toHaveBeenCalledWith(
      expect.stringContaining("not registered"),
    );
    expect(info).toHaveBeenCalledWith("[notifications] registered 0 digest(s)");
  });

  it("removes a leftover scheduler when the cron env var is unset (announces the removal)", async () => {
    const upsertJobScheduler = vi.fn().mockResolvedValue(undefined);
    // A scheduler persisted by a previous boot still exists → removal
    // resolves true and the log line must say so.
    const removeJobScheduler = vi.fn().mockResolvedValue(true);
    const add = vi.fn().mockResolvedValue(undefined);
    const queue = { add, upsertJobScheduler, removeJobScheduler } as QueueLike;
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    delete process.env.DIGEST_PENDING_SUBMISSIONS_CRON;

    const count = await registerDigests(queue, process.env);

    expect(count).toBe(0);
    expect(upsertJobScheduler).not.toHaveBeenCalled();
    expect(removeJobScheduler).toHaveBeenCalledTimes(digests.length);
    expect(removeJobScheduler).toHaveBeenCalledWith("pending-submissions");
    // The removal is operator-visible (distinct from the plain skip line).
    expect(info).toHaveBeenCalledWith(
      expect.stringContaining("removed leftover scheduler"),
    );
  });
});
