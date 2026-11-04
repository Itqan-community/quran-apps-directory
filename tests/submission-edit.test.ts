import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from "vitest";
import postgres from "postgres";

vi.mock("@/lib/auth", () => ({
  auth: async () => ({ user: { id: "1", email: "admin@local.dev" } }),
}));
vi.mock("next/cache", () => ({ revalidateTag: vi.fn(), revalidatePath: vi.fn() }));
// Deterministic tracking id for the submitApp test so fixtures can be cleaned
// up by the QAD-FISET% prefix. Everything else in the module stays real.
vi.mock("@/lib/validation/submission", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/validation/submission")>()),
  generateTrackingId: () => "QAD-FISET1",
}));

import { editSubmission } from "@/lib/actions/admin-submissions";
import { submitApp } from "@/lib/actions/submissions";
import { revalidateTag } from "next/cache";

const sql = postgres(process.env.TEST_DATABASE_URL!, { max: 4 });

const P = "QAD-EDT";
const OLD_CAT_SLUG = "qad-edt-old-cat";
const NEW_CAT_SLUG = "qad-edt-new-cat";
const DEV_NAME = "T:EdtDevCo";

// Public submitApp fixtures (distinctive prefix).
const S = "QAD-FISET";
const SUBMIT_APP_NAME = "T:Fisset Desc";
const SUBMIT_APP_SLUG_PREFIX = "t-fissetdesc";

let oldCatId = 0;
let newCatId = 0;

const stubConsoleBackend = () => {
  vi.stubEnv("SMTP_HOST", "");
  vi.stubEnv("SMTP_PORT", "");
  vi.stubEnv("SMTP_USER", "");
  vi.stubEnv("SMTP_PASS", "");
  vi.stubEnv("SMTP_FROM", "");
  vi.stubEnv("ADMIN_EMAIL", "");
};

beforeEach(() => {
  vi.clearAllMocks();
});
afterEach(() => {
  vi.unstubAllEnvs();
});

const subId = async (tracking: string): Promise<number> => {
  const rows = await sql`SELECT id FROM app_submissions WHERE tracking_id = ${tracking}`;
  if (rows.length === 0) throw new Error(`missing fixture ${tracking}`);
  return Number(rows[0].id);
};

const subRow = (id: number) => sql`SELECT * FROM app_submissions WHERE id = ${id}`;

const catsOf = async (submissionId: number): Promise<number[]> => {
  const rows = await sql`
    SELECT category_id FROM app_submissions_categories
    WHERE appsubmission_id = ${submissionId} ORDER BY category_id`;
  return rows.map((r) => Number(r.category_id));
};

const logsOf = (submissionId: number) =>
  sql`SELECT from_status, to_status, notes, changed_by_id FROM submission_status_logs WHERE submission_id = ${submissionId} ORDER BY id`;

/** One valid snake_case body: all content fields. Identity fields are included
 *  on purpose — the edit schema must drop them and the action must never write them. */
const payload = () => ({
  is_developer: true,
  app_name_en: "T:Edt New Name",
  app_name_ar: "ت:اسم جديد",
  short_description_en: "T:Edt short",
  short_description_ar: "ت:وصف قصير",
  description_en: "# Markdown desc",
  description_ar: "وصف ماركداون",
  google_play_link: "https://play.google.com/x",
  app_store_link: "",
  app_gallery_link: "",
  website_link: "https://edt.example",
  categories: [newCatId],
  developer_name_en: DEV_NAME,
  developer_name_ar: "ت:مطور",
  developer_website: "https://dev-edt.example",
  developer_email: "dev-edt@test.local",
  app_icon_url: "https://cdn.example/new-icon.png",
  main_image_en: "https://cdn.example/new-en.png",
  main_image_ar: "https://cdn.example/new-ar.png",
  screenshots_en: ["https://cdn.example/s1.png"],
  screenshots_ar: [],
  additional_notes: "T:Edt notes",
  // locked identity fields — must be dropped:
  submitter_name: "Hacker",
  submitter_email: "hacker@example.com",
  submitter_phone: "12345",
  submitter_organization: "Evil Inc",
  content_confirmation: true,
});

const submissionSeed = (tracking: string) =>
  sql`
    INSERT INTO app_submissions
      (tracking_id, status, submitter_name, submitter_email, submitter_phone, submitter_organization,
       is_developer, developer_name_en, developer_name_ar, developer_website, developer_email,
       app_name_en, app_name_ar, short_description_en, short_description_ar, description_en, description_ar,
       google_play_link, app_store_link, app_gallery_link, website_link,
       app_icon_url, main_image_en, main_image_ar, screenshots_en, screenshots_ar,
       additional_notes, content_confirmation)
    VALUES
      (${tracking}, 'pending', 'T:Edt Submitter', 'edt@test.local', '', '',
       false, 'T:EdtDevCo', 'ت:مطور قديم', 'https://dev-old.example', 'dev-old@test.local',
       'T:Edt Old Name', 'ت:اسم قديم', 'old short', 'وصف قصير قديم', 'old desc', 'وصف قديم',
       'https://play.google.com/old', '', '', '',
       'https://cdn.example/old-icon.png', 'https://cdn.example/old-en.png', 'https://cdn.example/old-ar.png', '[]'::jsonb, '[]'::jsonb,
       '', true)
    RETURNING id`;

beforeAll(async () => {
  // Defensive pre-clean so a failed run mid-suite never breaks the next run.
  await sql`DELETE FROM app_submissions WHERE tracking_id LIKE ${`${P}%`}`;
  await sql`DELETE FROM app_submissions WHERE tracking_id LIKE ${`${S}%`}`;
  await sql`DELETE FROM categories WHERE slug IN (${OLD_CAT_SLUG}, ${NEW_CAT_SLUG})`;
  await sql`DELETE FROM developers WHERE name_en = ${DEV_NAME}`;
  await sql`DELETE FROM users WHERE id = 1 AND email = 'admin@local.dev'`;
  await sql`DELETE FROM apps WHERE slug LIKE ${`${SUBMIT_APP_SLUG_PREFIX}%`} OR name_en = ${SUBMIT_APP_NAME}`;

  // Deterministic FK target for changed_by_id from the mocked session.
  await sql`
    INSERT INTO users (id, email, password_hash, is_staff)
    VALUES (1, 'admin@local.dev', 'x', true)
    ON CONFLICT (id) DO NOTHING`;

  await sql`INSERT INTO developers (name_en, name_ar) VALUES (${DEV_NAME}, 'ت:شركة تعديل')`;

  const [oldCat] = await sql`
    INSERT INTO categories (name_en, name_ar, slug) VALUES ('T:EdtOldCat', 'ت:فئة قديمة', ${OLD_CAT_SLUG}) RETURNING id`;
  oldCatId = Number(oldCat.id);
  const [newCat] = await sql`
    INSERT INTO categories (name_en, name_ar, slug) VALUES ('T:EdtNewCat', 'ت:فئة جديدة', ${NEW_CAT_SLUG}) RETURNING id`;
  newCatId = Number(newCat.id);

  const [sub1] = await submissionSeed(`${P}1`);
  // join: the OLD category, replaced by the payload's new one
  await sql`INSERT INTO app_submissions_categories (appsubmission_id, category_id) VALUES (${Number(sub1.id)}, ${oldCatId})`;

  await submissionSeed(`${P}2`); // validation cases
});

afterAll(async () => {
  await sql`DELETE FROM app_submissions WHERE tracking_id LIKE ${`${P}%`}`;
  await sql`DELETE FROM app_submissions WHERE tracking_id LIKE ${`${S}%`}`;
  await sql`DELETE FROM categories WHERE slug IN (${OLD_CAT_SLUG}, ${NEW_CAT_SLUG})`;
  await sql`DELETE FROM developers WHERE name_en = ${DEV_NAME}`;
  await sql`DELETE FROM users WHERE id = 1 AND email = 'admin@local.dev'`;
  await sql`DELETE FROM apps WHERE slug LIKE ${`${SUBMIT_APP_SLUG_PREFIX}%`} OR name_en = ${SUBMIT_APP_NAME}`;
  await sql.end();
});

describe("editSubmission", () => {
  it("pending → content fields updated, categories replaced, identity + status untouched", async () => {
    stubConsoleBackend();
    const id = await subId(`${P}1`);

    const res = await editSubmission(id, payload());
    expect(res).toEqual({ ok: true });

    const [row] = await subRow(id);
    expect(row.app_name_en).toBe("T:Edt New Name");
    expect(row.app_name_ar).toBe("ت:اسم جديد");
    expect(row.description_en).toBe("# Markdown desc");
    expect(row.description_ar).toBe("وصف ماركداون");
    expect(row.short_description_en).toBe("T:Edt short");
    expect(row.google_play_link).toBe("https://play.google.com/x");
    expect(row.app_icon_url).toBe("https://cdn.example/new-icon.png");
    expect(row.screenshots_en).toEqual(["https://cdn.example/s1.png"]);
    expect(row.additional_notes).toBe("T:Edt notes");
    // locked identity fields unchanged
    expect(row.submitter_email).toBe("edt@test.local");
    expect(row.submitter_name).toBe("T:Edt Submitter");
    expect(row.submitter_organization).toBe("");
    // status unchanged
    expect(row.status).toBe("pending");

    // join table replaced: old cat gone, new cat present
    expect(await catsOf(id)).toEqual([newCatId]);

    expect(vi.mocked(revalidateTag).mock.calls).toEqual([["submissions", "max"]]);
  });

  it("appends one audit-log row: from_status = to_status = 'pending', changed_by_id 1, notes mention تعديل", async () => {
    stubConsoleBackend();
    const id = await subId(`${P}1`);

    const logs = await logsOf(id);
    expect(logs).toHaveLength(1);
    expect(logs[0].from_status).toBe("pending");
    expect(logs[0].to_status).toBe("pending");
    expect(Number(logs[0].changed_by_id)).toBe(1);
    expect(String(logs[0].notes)).toContain("تعديل");
  });

  it("closed submissions (approved / rejected) → { ok:false, error:'invalid_transition' }", async () => {
    stubConsoleBackend();
    const id = await subId(`${P}1`);

    await sql`UPDATE app_submissions SET status = 'approved' WHERE id = ${id}`;
    const resApproved = await editSubmission(id, payload());
    expect(resApproved).toEqual({ ok: false, error: "invalid_transition", message: expect.any(String) });

    await sql`UPDATE app_submissions SET status = 'rejected' WHERE id = ${id}`;
    const resRejected = await editSubmission(id, payload());
    expect(resRejected).toEqual({ ok: false, error: "invalid_transition", message: expect.any(String) });
  });

  it("validation: bad store link → fieldErrors.google_play_link; empty links are allowed (no store-link refine)", async () => {
    stubConsoleBackend();
    const id = await subId(`${P}2`);

    const res = await editSubmission(id, { ...payload(), google_play_link: "ftp://x" });
    expect(res.ok).toBe(false);
    if (!res.ok && res.error === "validation") {
      expect(res.fieldErrors.google_play_link?.length).toBeGreaterThan(0);
    } else {
      expect(res).toEqual({ ok: false, error: "validation", fieldErrors: expect.anything() });
    }
    // nothing written by the failed parse
    const [row] = await subRow(id);
    expect(row.app_name_en).toBe("T:Edt Old Name");
    expect(await logsOf(id)).toHaveLength(0);

    const cleared = {
      ...payload(),
      google_play_link: "",
      app_store_link: "",
      app_gallery_link: "",
    };
    const resCleared = await editSubmission(id, cleared);
    expect(resCleared).toEqual({ ok: true });
    const [after] = await subRow(id);
    expect(after.google_play_link).toBe("");
    expect(after.app_name_en).toBe("T:Edt New Name");
  });

  it("unknown id → { ok:false, error:'not_found' }", async () => {
    stubConsoleBackend();
    const res = await editSubmission(999999, payload());
    expect(res).toEqual({ ok: false, error: "not_found", message: expect.any(String) });
  });
});

describe("submitApp (public) description persistence", () => {
  it("persists the four description fields collected by the public form", async () => {
    stubConsoleBackend();
    vi.stubEnv("REDIS_URL", "");

    const res = await submitApp({
      submitter_email: "fisset@test.dev",
      app_name_en: SUBMIT_APP_NAME,
      app_name_ar: "ت:فست",
      short_description_en: "S-desc-marker",
      short_description_ar: "وصف قصير علامة",
      description_en: "D-desc-marker",
      description_ar: "وصف علامة",
      google_play_link: "https://play.google.com/store/apps/details?id=fisset",
      content_confirmation: true,
    });
    expect(res).toEqual({ ok: true, trackingId: "QAD-FISET1" });
    if (!res.ok) return;

    const [row] = await sql`
      SELECT short_description_en, short_description_ar, description_en, description_ar
      FROM app_submissions WHERE tracking_id = ${res.trackingId}`;
    expect(row).toEqual({
      short_description_en: "S-desc-marker",
      short_description_ar: "وصف قصير علامة",
      description_en: "D-desc-marker",
      description_ar: "وصف علامة",
    });
  });
});
