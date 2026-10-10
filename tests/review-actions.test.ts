import { describe, it, expect, beforeAll, afterAll, beforeEach, vi, afterEach } from "vitest";
import postgres from "postgres";

vi.mock("@/lib/auth", () => ({
  auth: async () => ({ user: { id: "1", email: "admin@local.dev" } }),
}));
vi.mock("next/cache", () => ({ revalidateTag: vi.fn(), revalidatePath: vi.fn() }));
vi.mock("@/lib/services/submission-images", () => ({
  transferSubmissionImages: async () => ({
    appIconUrl: "https://x/icon.webp",
    mainImageEn: "https://x/m_en.webp",
    mainImageAr: "https://x/m_ar.webp",
    screenshotsEn: [],
    screenshotsAr: [],
  }),
}));

import {
  approveSubmission,
  rejectSubmission,
  requestInfo,
  markUnderReview,
  saveAdminNotes,
} from "@/lib/actions/admin-submissions";
import { revalidateTag } from "next/cache";

const sql = postgres(process.env.TEST_DATABASE_URL!, { max: 4 });

const P = "QAD-TR5";
const APP_SLUG_PREFIX = "t-rev5-%";
const DEV_NAME = "T:Rev5DevCo";

let devId = 0;
let catId = 0;
let estAppId = 0;

const stubConsoleBackend = () => {
  vi.stubEnv("SMTP_HOST", "");
  vi.stubEnv("SMTP_PORT", "");
  vi.stubEnv("SMTP_USER", "");
  vi.stubEnv("SMTP_PASS", "");
  vi.stubEnv("SMTP_FROM", "");
  vi.stubEnv("ADMIN_EMAIL", "");
};

const stubR2 = () => {
  vi.stubEnv("R2_ENDPOINT", "http://127.0.0.1:9000");
  vi.stubEnv("R2_ACCESS_KEY_ID", "minioadmin");
  vi.stubEnv("R2_SECRET_ACCESS_KEY", "minioadmin");
  vi.stubEnv("R2_BUCKET", "qad");
};

beforeEach(() => {
  vi.clearAllMocks();
});
afterEach(() => {
  vi.unstubAllEnvs();
});

const spyConsole = () => vi.spyOn(console, "log").mockImplementation(() => {});
const consoleOut = (log: ReturnType<typeof spyConsole>) =>
  log.mock.calls.map((c) => String(c[0])).join("\n");

const subId = async (tracking: string): Promise<number> => {
  const rows = await sql`SELECT id FROM app_submissions WHERE tracking_id = ${tracking}`;
  if (rows.length === 0) throw new Error(`missing fixture ${tracking}`);
  return Number(rows[0].id);
};

const subRow = (tracking: string) =>
  sql`SELECT * FROM app_submissions WHERE tracking_id = ${tracking}`;
const logsOf = (tracking: string) =>
  sql`
    SELECT l.from_status, l.to_status, l.notes, l.changed_by_id
    FROM submission_status_logs l
    JOIN app_submissions s ON s.id = l.submission_id
    WHERE s.tracking_id = ${tracking}`;
const appBySlug = (slug: string) =>
  sql`
    SELECT a.*, d.name_en AS dev_name_en
    FROM apps a JOIN developers d ON d.id = a.developer_id
    WHERE a.slug = ${slug}`;
const catNamesOf = async (slug: string): Promise<string[]> => {
  const rows = await sql`
    SELECT c.name_en FROM apps a
    JOIN apps_categories ac ON ac.app_id = a.id
    JOIN categories c ON c.id = ac.category_id
    WHERE a.slug = ${slug} ORDER BY c.id`;
  return rows.map((r) => String(r.name_en));
};

beforeAll(async () => {
  // Defensive pre-clean so a failed run mid-suite never breaks the next run.
  await sql`DELETE FROM apps WHERE slug LIKE ${APP_SLUG_PREFIX} OR slug LIKE 'alpha-one%'`;
  await sql`DELETE FROM app_submissions WHERE tracking_id LIKE ${`${P}%`}`;
  await sql`DELETE FROM categories WHERE slug = 't-rev5-cat'`;
  await sql`DELETE FROM developers WHERE name_en = ${DEV_NAME}`;
  await sql`DELETE FROM users WHERE email = 'admin@local.dev'`;

  // Deterministic FK target for reviewed_by_id / changed_by_id from the mocked session.
  await sql`
    INSERT INTO users (id, email, password_hash, is_staff)
    VALUES (1, 'admin@local.dev', 'x', true)
    ON CONFLICT (id) DO NOTHING`;

  const dev = await sql`INSERT INTO developers (name_en, name_ar) VALUES (${DEV_NAME}, 'ت:شركة 5') RETURNING id`;
  devId = Number(dev[0].id);
  const cat = await sql`INSERT INTO categories (name_en, name_ar, slug) VALUES ('T:Rev5Cat', 'ت:فئة 5', 't-rev5-cat') RETURNING id`;
  catId = Number(cat[0].id);

  const appSeed = (slug: string, nameEn: string, nameAr: string) =>
    sql`
      INSERT INTO apps
        (slug, name_en, name_ar, short_description_en, short_description_ar, description_en, description_ar,
         application_icon, main_image_en, main_image_ar, avg_rating, sort_order, platform, status, developer_id)
      VALUES (${slug}, ${nameEn}, ${nameAr}, 'd', 'د', 'desc', 'وصف', 'i.png', 'c.png', 'c.png', '3.00', 1, 'android', 'published', ${devId})`;
  await appSeed("t-rev5-hold", "T:Rev5 Established", "ت:مؤسّس");
  await appSeed("alpha-one", "Alpha One", "ت:ألفا واحد"); // slug from the brief's collision case
  await appSeed("t-rev5-dup", "T:Rev5 Dup Name", "ت:مكرر");
  const [est] = await sql`SELECT id FROM apps WHERE slug = 't-rev5-hold'`;
  estAppId = Number(est.id);

  const submissionSeed = (o: {
    tracking: string;
    status: string;
    nameEn: string;
    nameAr: string;
    play?: string;
    store?: string;
    gallery?: string;
    descEn?: string;
    descAr?: string;
    createdApp?: number | null;
    rejection?: string;
    info?: string;
  }) => sql`
    INSERT INTO app_submissions
      (tracking_id, status, submitter_name, submitter_email, is_developer,
       developer_name_en, developer_name_ar, developer_website, developer_email,
       app_name_en, app_name_ar, short_description_en, short_description_ar, description_en, description_ar,
       google_play_link, app_store_link, app_gallery_link,
       app_icon_url, main_image_en, main_image_ar, screenshots_en, screenshots_ar,
       admin_notes, rejection_reason, info_request_message, created_app_id)
    VALUES
      (${o.tracking}, ${o.status}, 'T:Rev5 Submitter', 'rev5@test.local', true,
       'T:Rev5 DevCo', 'ت:مطور 5', 'https://Dev5.example/About?Lang=EN', 'dev5@test.local',
       ${o.nameEn}, ${o.nameAr}, 'short', 'قصير', ${o.descEn ?? "desc"}, ${o.descAr ?? "وصف"},
       ${o.play ?? ""}, ${o.store ?? ""}, ${o.gallery ?? ""},
       'https://source.test/icon.png', 'https://source.test/en.png', 'https://source.test/ar.png', '[]'::jsonb, '[]'::jsonb,
       '', ${o.rejection ?? ""}, ${o.info ?? ""}, ${o.createdApp ?? null})`;

  await submissionSeed({ tracking: `${P}A`, status: "pending", nameEn: "T:Rev5 Sub A", nameAr: "ت:أ" });
  await submissionSeed({ tracking: `${P}B`, status: "info_requested", nameEn: "T:Rev5 Sub B", nameAr: "ت:ب" });
  await submissionSeed({
    tracking: `${P}C`, status: "approved", nameEn: "T:Rev5 Sub C", nameAr: "ت:ج", createdApp: estAppId,
  });
  await submissionSeed({ tracking: `${P}D`, status: "pending", nameEn: "T:Rev5 Sub D", nameAr: "ت:د" });
  await submissionSeed({ tracking: `${P}E`, status: "rejected", nameEn: "T:Rev5 Sub E", nameAr: "ت:هـ", rejection: "old reason" });
  await submissionSeed({
    tracking: `${P}F`, status: "pending", nameEn: "T:Rev5 Sub F", nameAr: "ت:و",
    play: "https://play.google.com/store/apps/details?id=rev5f", store: "https://apps.apple.com/app/rev5f",
    descEn: "", descAr: "",
  });
  await submissionSeed({
    tracking: `${P}G`, status: "pending", nameEn: "T:Rev5 Sub G", nameAr: "ت:ز",
    store: "https://apps.apple.com/app/rev5g",
  });
  await submissionSeed({ tracking: `${P}H`, status: "pending", nameEn: "Alpha  One", nameAr: "ت:ألفا واحد ثانية" });
  await submissionSeed({ tracking: `${P}I`, status: "pending", nameEn: "T:Rev5 Dup Name", nameAr: "ت:مكرر جديد" });

  const [f] = await sql`SELECT id FROM app_submissions WHERE tracking_id = ${`${P}F`}`;
  await sql`INSERT INTO app_submissions_categories (appsubmission_id, category_id) VALUES (${Number(f.id)}, ${catId})`;
});

afterAll(async () => {
  await sql`DELETE FROM app_submissions WHERE tracking_id LIKE ${`${P}%`}`;
  await sql`DELETE FROM apps WHERE slug LIKE ${APP_SLUG_PREFIX} OR slug LIKE 'alpha-one%'`;
  await sql`DELETE FROM categories WHERE slug = 't-rev5-cat'`;
  await sql`DELETE FROM developers WHERE name_en = ${DEV_NAME}`;
  await sql`DELETE FROM users WHERE email = 'admin@local.dev'`;
  await sql.end();
});

describe("markUnderReview", () => {
  it("pending → under_review: flips the row, writes the log, sends the console email", async () => {
    stubConsoleBackend();
    const log = spyConsole();
    const id = await subId(`${P}A`);

    const res = await markUnderReview(id);
    expect(res).toEqual({ ok: true });

    const [row] = await sql`SELECT status FROM app_submissions WHERE id = ${id}`;
    expect(row.status).toBe("under_review");
    const [logRow] = await logsOf(`${P}A`);
    expect(logRow.from_status).toBe("pending");
    expect(logRow.to_status).toBe("under_review");
    expect(logRow.notes).toContain("قيد المراجعة");
    expect(Number(logRow.changed_by_id)).toBe(1);
    expect(vi.mocked(revalidateTag).mock.calls).toEqual([["submissions", "max"]]);

    const out = log.mock.calls.map((c) => String(c[0])).join("\n");
    expect(out).toContain(`${P}A`);
  });

  it("info_requested → { ok:false, error:'invalid_transition' } and no log row", async () => {
    stubConsoleBackend();
    const log = spyConsole();
    const res = await markUnderReview(await subId(`${P}B`));

    expect(res).toEqual({ ok: false, error: "invalid_transition", message: expect.any(String) });
    expect(await logsOf(`${P}B`)).toHaveLength(0);
    expect(consoleOut(log)).not.toContain(`${P}B`);
  });

  it("unknown id → { ok:false, error:'not_found' }", async () => {
    stubConsoleBackend();
    const res = await markUnderReview(999999999);
    expect(res).toEqual({ ok: false, error: "not_found", message: expect.any(String) });
  });
});

describe("rejectSubmission", () => {
  it("pending → rejected: reason + reviewed_by 1 + reviewed_at + log + console email", async () => {
    stubConsoleBackend();
    const log = spyConsole();
    const id = await subId(`${P}D`);

    const res = await rejectSubmission(id, "مخالف لسياسة المحتوى");
    expect(res).toEqual({ ok: true });

    const [row] = await sql`
      SELECT status, rejection_reason, reviewed_by_id, reviewed_at
      FROM app_submissions WHERE id = ${id}`;
    expect(row.status).toBe("rejected");
    expect(row.rejection_reason).toBe("مخالف لسياسة المحتوى");
    expect(Number(row.reviewed_by_id)).toBe(1);
    expect(row.reviewed_at).not.toBeNull();
    const [logRow] = await logsOf(`${P}D`);
    expect(logRow.from_status).toBe("pending");
    expect(logRow.to_status).toBe("rejected");
    expect(logRow.notes).toContain("مخالف لسياسة المحتوى");
    expect(Number(logRow.changed_by_id)).toBe(1);
    expect(consoleOut(log)).toContain(`${P}D`);
  });

  it("rejected → { ok:false, error:'invalid_transition' }", async () => {
    stubConsoleBackend();
    const res = await rejectSubmission(await subId(`${P}E`), "again");
    expect(res).toEqual({ ok: false, error: "invalid_transition", message: expect.any(String) });
  });
});

describe("requestInfo", () => {
  it("rejected → { ok:false, error:'invalid_transition' }", async () => {
    stubConsoleBackend();
    const res = await requestInfo(await subId(`${P}E`), "one more thing");
    expect(res).toEqual({ ok: false, error: "invalid_transition", message: expect.any(String) });
  });

  it("under_review → info_requested: message stored, log written, console email", async () => {
    stubConsoleBackend();
    const log = spyConsole();
    const id = await subId(`${P}A`); // put under_review by the markUnderReview test above

    const res = await requestInfo(id, "أرسل رابط المتجر");
    expect(res).toEqual({ ok: true });

    const [row] = await sql`
      SELECT status, info_request_message, reviewed_by_id, reviewed_at
      FROM app_submissions WHERE id = ${id}`;
    expect(row.status).toBe("info_requested");
    expect(row.info_request_message).toBe("أرسل رابط المتجر");
    expect(Number(row.reviewed_by_id)).toBe(1);
    expect(row.reviewed_at).not.toBeNull();
    const logs = await logsOf(`${P}A`);
    expect(logs).toHaveLength(2);
    expect(logs[1].from_status).toBe("under_review");
    expect(logs[1].to_status).toBe("info_requested");
    expect(logs[1].notes).toContain("أرسل رابط المتجر");
    expect(Number(logs[1].changed_by_id)).toBe(1);
    expect(consoleOut(log)).toContain(`${P}A`);
  });
});

describe("saveAdminNotes", () => {
  it("updates admin notes without touching status or the log", async () => {
    stubConsoleBackend();
    const id = await subId(`${P}A`); // info_requested now — status-independent
    const [before] = await subRow(`${P}A`);

    const res = await saveAdminNotes(id, "تنسيق الأيقونة يحتاج مراجعة");
    expect(res).toEqual({ ok: true });

    const [row] = await sql`SELECT status, admin_notes FROM app_submissions WHERE id = ${id}`;
    expect(row.admin_notes).toBe("تنسيق الأيقونة يحتاج مراجعة");
    expect(row.status).toBe(before.status);
    expect(await logsOf(`${P}A`)).toHaveLength(2); // no new entry
  });
});

describe("approveSubmission", () => {
  it("unconfigured storage → { ok:false, error:'storage' } naming the config, no writes", async () => {
    stubConsoleBackend();
    vi.stubEnv("R2_ENDPOINT", "");
    vi.stubEnv("R2_ACCOUNT_ID", "");
    vi.stubEnv("R2_ACCESS_KEY_ID", "");
    vi.stubEnv("R2_SECRET_ACCESS_KEY", "");
    vi.stubEnv("R2_BUCKET", "");
    const before = await sql`SELECT count(*)::int AS n FROM apps WHERE slug LIKE ${APP_SLUG_PREFIX}`;

    const res = await approveSubmission(await subId(`${P}F`));
    expect(res).toEqual({ ok: false, error: "storage", message: expect.stringContaining("R2") });

    const after = await sql`SELECT count(*)::int AS n FROM apps WHERE slug LIKE ${APP_SLUG_PREFIX}`;
    expect(after[0].n).toBe(before[0].n);
  });

  it("missing source media → { ok:false, error:'storage' } naming the field", async () => {
    stubConsoleBackend();
    stubR2();
    const [seed] = await sql`
      INSERT INTO app_submissions
        (tracking_id, status, submitter_name, submitter_email, is_developer,
         developer_name_en, developer_name_ar, developer_website, developer_email,
         app_name_en, app_name_ar, short_description_en, short_description_ar,
         google_play_link, app_store_link, app_gallery_link,
         app_icon_url, main_image_en, main_image_ar, screenshots_en, screenshots_ar,
         admin_notes, rejection_reason, info_request_message)
      VALUES
        ('QAD-TR5J', 'pending', 'T:Rev5 Submitter', 'rev5@test.local', false,
         '', '', '', '',
         'T:Rev5 Sub J', 'ت:ط', 'short', 'قصير',
         '', '', '',
         '', 'https://source.test/en.png', 'https://source.test/ar.png', '[]'::jsonb, '[]'::jsonb,
         '', '', '')
      RETURNING id`;
    const id = Number(seed.id);

    const res = await approveSubmission(id);
    expect(res).toEqual({
      ok: false,
      error: "storage",
      message: expect.stringContaining("أيقونة التطبيق"),
    });
  });

  it("already-approved (createdAppId set) → invalid_transition and no extra app row", async () => {
    stubConsoleBackend();
    stubR2();
    const id = await subId(`${P}C`);
    const before = await sql`SELECT count(*)::int AS n FROM apps WHERE slug LIKE ${APP_SLUG_PREFIX}`;

    const res = await approveSubmission(id);
    expect(res).toEqual({ ok: false, error: "invalid_transition", message: expect.any(String) });

    const after = await sql`SELECT count(*)::int AS n FROM apps WHERE slug LIKE ${APP_SLUG_PREFIX}`;
    expect(after[0].n).toBe(before[0].n);
    const [row] = await subRow(`${P}C`);
    expect(Number(row.created_app_id)).toBe(estAppId);
  });

  it("duplicate app name → { ok:false, error:'db' } with an Arabic message, no partial rows", async () => {
    stubConsoleBackend();
    stubR2();
    const before = await sql`SELECT count(*)::int AS n FROM apps WHERE slug LIKE ${APP_SLUG_PREFIX}`;

    const res = await approveSubmission(await subId(`${P}I`));
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error).toBe("db");
      expect(res.message.length).toBeGreaterThan(0);
      expect(res.message).toContain("مستخدم");
    }

    const after = await sql`SELECT count(*)::int AS n FROM apps WHERE slug LIKE ${APP_SLUG_PREFIX}`;
    expect(after[0].n).toBe(before[0].n);
    const [row] = await subRow(`${P}I`);
    expect(row.status).toBe("pending");
    expect(row.created_app_id).toBeNull();
  });

  it("happy path (cross_platform): app row, imagery, description fallbacks, categories, submission update, log", async () => {
    stubConsoleBackend();
    stubR2();
    const id = await subId(`${P}F`);

    const res = await approveSubmission(id);
    expect(res).toEqual({ ok: true, appId: expect.any(Number) });

    const [app] = await appBySlug("t-rev5-sub-f");
    expect(app).not.toBeNull();
    expect(app.status).toBe("published");
    expect(app.platform).toBe("cross_platform");
    expect(app.avg_rating).toBe("2.50");
    expect(app.review_count).toBe(0);
    expect(app.name_en).toBe("T:Rev5 Sub F");
    expect(app.name_ar).toBe("ت:و");
    // description fallbacks: submission descriptions were seeded empty
    expect(app.description_en).toBe("short");
    expect(app.description_ar).toBe("قصير");
    expect(app.application_icon).toBe("https://x/icon.webp");
    expect(app.main_image_en).toBe("https://x/m_en.webp");
    expect(app.main_image_ar).toBe("https://x/m_ar.webp");
    expect(app.screenshots_en).toEqual([]);
    expect(app.google_play_link).toBe("https://play.google.com/store/apps/details?id=rev5f");
    expect(app.app_store_link).toBe("https://apps.apple.com/app/rev5f");
    expect(String(app.dev_name_en)).toBe("T:Rev5 DevCo");

    // submission categories copied
    expect(await catNamesOf("t-rev5-sub-f")).toEqual(["T:Rev5Cat"]);

    // submission updated
    const [row] = await subRow(`${P}F`);
    expect(row.status).toBe("approved");
    expect(Number(row.created_app_id)).toBe(Number(app!.id));
    expect(Number(row.reviewed_by_id)).toBe(1);
    expect(row.reviewed_at).not.toBeNull();

    // log row written
    const logs = await logsOf(`${P}F`);
    expect(logs).toHaveLength(1);
    expect(logs[0].from_status).toBe("pending");
    expect(logs[0].to_status).toBe("approved");
    expect(logs[0].notes).toBe("تمت الموافقة. أنشئ التطبيق: T:Rev5 Sub F");
    expect(Number(logs[0].changed_by_id)).toBe(1);

    // approve revalidates the public tags
    expect(vi.mocked(revalidateTag).mock.calls).toEqual([
      ["apps", "max"],
      ["submissions", "max"],
    ]);
  });

  it("happy path (ios only): platform detection is appStore-only → ios", async () => {
    stubConsoleBackend();
    stubR2();
    const id = await subId(`${P}G`);

    const res = await approveSubmission(id);
    expect(res.ok).toBe(true);

    const [app] = await appBySlug("t-rev5-sub-g");
    expect(app.platform).toBe("ios");
  });

  it("slug collision: 'Alpha  One' against slug 'alpha-one' yields 'alpha-one-1'", async () => {
    stubConsoleBackend();
    stubR2();
    const res = await approveSubmission(await subId(`${P}H`));
    expect(res.ok).toBe(true);
    expect(res).toEqual({ ok: true, appId: expect.any(Number) });

    const [app] = await appBySlug("alpha-one-1");
    expect(app).not.toBeNull();
    expect(app.name_en).toBe("Alpha  One");
  });

  it("not_found for a missing id", async () => {
    stubConsoleBackend();
    stubR2();
    const res = await approveSubmission(999999999);
    expect(res).toEqual({ ok: false, error: "not_found", message: expect.any(String) });
  });
});
