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
  it("returns exactly the seeded pending rows, newest-first", async () => {
    const items = await listPendingSubmissions(10);
    expect(items.map((i) => i.trackingId)).toEqual(["t-slack-b", "t-slack-a"]);
    for (const item of items) {
      expect(item.appNameEn).toBeTypeOf("string");
      expect(item.submittedAt).toBeInstanceOf(Date);
    }
  });

  it("truncates to the newest rows when limit is small", async () => {
    const items = await listPendingSubmissions(1);
    expect(items.map((i) => i.trackingId)).toEqual(["t-slack-b"]);
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

  it("returns null for a non-existing id", async () => {
    expect(await getSubmissionForAdminNotification(999999999)).toBeNull();
  });
});
