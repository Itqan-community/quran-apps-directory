import { describe, it, expect, beforeAll, afterAll } from "vitest";
import postgres from "postgres";
import {
  getSubmissionForAdminNotification,
  listPendingSubmissions,
  countPendingSubmissions,
} from "@/lib/repo/submissions";

const sql = postgres(process.env.TEST_DATABASE_URL!);

const CAT_NAME_EN = "T:Slack Cat";
const CAT_SLUG = "t-slack-cat";

let idA = 0;
let idB = 0;
let pendingBaseline = 0;

beforeAll(async () => {
  // Defensive pre-clean so a failed run mid-suite never breaks the next run.
  await sql`DELETE FROM app_submissions_categories WHERE appsubmission_id IN (SELECT id FROM app_submissions WHERE tracking_id LIKE 't-slack-%')`;
  await sql`DELETE FROM app_submissions WHERE tracking_id LIKE 't-slack-%'`;
  await sql`DELETE FROM categories WHERE slug = ${CAT_SLUG}`;

  // Baseline pending count: the test DB is shared across the suite, so assert
  // the seeded rows on top of whatever pending rows pre-exist.
  const [{ n }] = await sql`SELECT count(*)::int AS n FROM app_submissions WHERE status = 'pending'`;
  pendingBaseline = Number(n);

  const [cat] = await sql`
    INSERT INTO categories (name_en, name_ar, slug)
    VALUES (${CAT_NAME_EN}, 'ت:فئة سلاك', ${CAT_SLUG})
    RETURNING id`;
  const catId = Number(cat.id);

  const rows = await sql`
    INSERT INTO app_submissions
      (tracking_id, status, submitter_name, submitter_email, submitter_organization,
       developer_name_en, app_name_en, app_name_ar, created_at)
    VALUES
      ('t-slack-a', 'pending', 'Slack A', 'slack-a@test.local', 'Org A', 'Dev A', 'T:Slack App A', 'ت:سلاك أ', now() - interval '5 days'),
      ('t-slack-b', 'pending', 'Slack B', 'slack-b@test.local', 'Org B', 'Dev B', 'T:Slack App B', 'ت:سلاك ب', now()),
      ('t-slack-c', 'approved', 'Slack C', 'slack-c@test.local', '', '', 'T:Slack App C', 'ت:سلاك ج', now())
    RETURNING id, tracking_id`;
  for (const r of rows) {
    if (r.tracking_id === "t-slack-a") idA = Number(r.id);
    if (r.tracking_id === "t-slack-b") idB = Number(r.id);
  }

  // Category link on row A only.
  await sql`INSERT INTO app_submissions_categories (appsubmission_id, category_id) VALUES (${idA}, ${catId})`;
});

afterAll(async () => {
  await sql`DELETE FROM app_submissions_categories WHERE appsubmission_id IN (SELECT id FROM app_submissions WHERE tracking_id LIKE 't-slack-%')`;
  await sql`DELETE FROM app_submissions WHERE tracking_id LIKE 't-slack-%'`;
  await sql`DELETE FROM categories WHERE slug = ${CAT_SLUG}`;
  await sql.end();
});

describe("listPendingSubmissions", () => {
  it("returns the seeded pending rows, newest-first (filter-robust)", async () => {
    const items = await listPendingSubmissions(10);
    // The test DB is shared across the suite, so other pending rows may be
    // present. Filter to the seeded tracking ids before asserting order.
    const seeded = items
      .filter((i) => i.trackingId === "t-slack-a" || i.trackingId === "t-slack-b")
      .map((i) => i.trackingId);
    expect(seeded).toEqual(["t-slack-b", "t-slack-a"]);
    for (const item of items) {
      expect(item.appNameEn).toBeTypeOf("string");
      expect(item.submittedAt).toBeInstanceOf(Date);
    }
  });

  it("truncates to the single newest pending row when limit is 1", async () => {
    const items = await listPendingSubmissions(1);
    expect(items).toHaveLength(1);
    // The one returned row must be the overall newest pending row (the shared
    // DB may hold other pending rows, so compare against a direct query).
    const [newest] = await sql`
      SELECT tracking_id FROM app_submissions
      WHERE status = 'pending' ORDER BY created_at DESC, id DESC LIMIT 1`;
    expect(items[0].trackingId).toBe(String(newest.tracking_id));
  });

  it("clamps a non-positive limit to 1 (never returns nothing)", async () => {
    const items = await listPendingSubmissions(0);
    expect(items).toHaveLength(1);
  });
});

describe("countPendingSubmissions", () => {
  it("counts the seeded pending rows (not the approved one)", async () => {
    expect(await countPendingSubmissions()).toBe(pendingBaseline + 2);
  });
});

describe("getSubmissionForAdminNotification", () => {
  it("returns the submission with its category names", async () => {
    const data = await getSubmissionForAdminNotification(idA);
    expect(data).not.toBeNull();
    expect(data?.trackingId).toBe("t-slack-a");
    expect(data?.appNameEn).toBe("T:Slack App A");
    expect(data?.appNameAr).toBe("ت:سلاك أ");
    expect(data?.submitterName).toBe("Slack A");
    expect(data?.submitterEmail).toBe("slack-a@test.local");
    expect(data?.submitterOrganization).toBe("Org A");
    expect(data?.developerNameEn).toBe("Dev A");
    expect(data?.categories).toEqual([CAT_NAME_EN]);
    expect(data?.submittedAt).toBeInstanceOf(Date);
  });

  it("returns an empty categories array when no categories are linked", async () => {
    // Row B (t-slack-b) has no app_submissions_categories link.
    const data = await getSubmissionForAdminNotification(idB);
    expect(data).not.toBeNull();
    expect(data?.trackingId).toBe("t-slack-b");
    expect(data?.categories).toEqual([]);
  });

  it("returns null for a non-existing id", async () => {
    expect(await getSubmissionForAdminNotification(999999999)).toBeNull();
  });
});
