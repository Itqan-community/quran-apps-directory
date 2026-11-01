import { describe, it, expect, afterAll, afterEach, vi } from "vitest";
import postgres from "postgres";
import { submitApp } from "@/lib/actions/submissions";
import { enqueueSubmissionNotification } from "@/lib/services/notifications-queue";

// Module-level mock confined to this file (a shared setup mock would poison
// tests/notifications-queue.test.ts, which exercises the real module).
vi.mock("@/lib/services/notifications-queue", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/services/notifications-queue")>()),
  enqueueSubmissionNotification: vi.fn(async () => true),
}));

const url = process.env.TEST_DATABASE_URL!;
const sql = postgres(url);

afterAll(async () => {
  await sql`
    DELETE FROM app_submissions WHERE submitter_email IN ('notify-ok@test.dev', 'notify-down@test.dev')
  `;
  await sql.end();
});

describe("submitApp post-commit notification enqueue", () => {
  it("enqueues the numeric submission id after a successful commit", async () => {
    vi.mocked(enqueueSubmissionNotification).mockClear();
    const res = await submitApp({
      submitter_email: "notify-ok@test.dev",
      app_name_en: "Notify OK App",
      google_play_link: "https://play.google.com/store/apps/details?id=test",
      content_confirmation: true,
    });
    expect(res.ok).toBe(true);
    expect(enqueueSubmissionNotification).toHaveBeenCalledTimes(1);
    const enqueuedId = vi.mocked(enqueueSubmissionNotification).mock.calls[0][0];
    expect(typeof enqueuedId).toBe("number");
    const [row] = await sql`SELECT id FROM app_submissions WHERE submitter_email = 'notify-ok@test.dev'`;
    expect(enqueuedId).toBe(Number(row.id));
  });

  it("still returns ok (with a tracking id) and logs when enqueue fails", async () => {
    vi.mocked(enqueueSubmissionNotification).mockRejectedValueOnce(new Error("redis down"));
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await submitApp({
      submitter_email: "notify-down@test.dev",
      app_name_en: "Notify Down App",
      google_play_link: "https://play.google.com/store/apps/details?id=test",
      content_confirmation: true,
    });
    // The submission itself succeeded — the notification failure is swallowed
    // and logged, and the user still gets their tracking id.
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.trackingId).toBeTruthy();
    expect(errorSpy).toHaveBeenCalledWith("submit notification failed (slack queue)", expect.anything());
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});
