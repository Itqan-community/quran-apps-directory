import { describe, it, expect, beforeAll, afterAll } from "vitest";
import postgres from "postgres";
import {
  getAdminApps,
  getAdminSubmissions,
  getSubmissionDetail,
  getDashboardCounts,
  getAllCategories,
  getAllDevelopers,
} from "@/lib/repo/admin";
import {
  getViewsPerDay30d,
  getTopApps30d,
  getCountryBreakdown30d,
  getDeviceBreakdown30d,
} from "@/lib/repo/analytics";

const sql = postgres(process.env.TEST_DATABASE_URL!);

const USER_EMAIL = "admin-fixture@test.local";

let devId = 0;
let userId = 0;
const appIds: Record<string, number> = {};

// View events seeded with hour offsets (never fixed dates) so every bucketing
// assertion stays stable regardless of when the suite runs. Offsets are exact
// multiples of 24h apart (1/2/3/27/51h) so distinct seeds can never share a UTC
// day unexpectedly; 1/2/3h may straddle midnight — expectations are derived from
// the DB's own bucketing of the seeded rows, not from the wall clock.
type ViewSeed = { slug: "t-a-1" | "t-a-2" | "t-a-3"; hoursAgo: number; country: string | null; device: string };
const VIEW_SEEDS: ViewSeed[] = [
  { slug: "t-a-1", hoursAgo: 1, country: "SA", device: "mobile" },
  { slug: "t-a-1", hoursAgo: 2, country: "SA", device: "mobile" },
  { slug: "t-a-1", hoursAgo: 27, country: "EG", device: "desktop" },
  { slug: "t-a-2", hoursAgo: 2, country: "US", device: "tablet" },
  { slug: "t-a-2", hoursAgo: 51, country: null, device: "desktop" },
  { slug: "t-a-3", hoursAgo: 3, country: "SA", device: "mobile" },
];

let expectedDayCounts: Record<string, number> = {};

beforeAll(async () => {
  // Defensive pre-clean so a failed run mid-suite never breaks the next run.
  await sql`DELETE FROM apps WHERE slug LIKE 't-a-%'`;
  await sql`DELETE FROM app_submissions WHERE tracking_id LIKE 'QAD-TA%'`;
  await sql`DELETE FROM categories WHERE slug LIKE 't-acat-%'`;
  await sql`DELETE FROM users WHERE email = ${USER_EMAIL}`;
  await sql`DELETE FROM developers WHERE name_en = 'T:Admin Dev'`;
  await sql`DELETE FROM developers WHERE name_en = 'T:Admin Verified Dev'`;

  const dev = await sql`INSERT INTO developers (name_en, name_ar) VALUES ('T:Admin Dev', 'ت:مطور') RETURNING id`;
  devId = Number(dev[0].id);
  // Verified fixture: keeps the `verified: true` filter test non-vacuous.
  await sql`INSERT INTO developers (name_en, name_ar, is_verified) VALUES ('T:Admin Verified Dev', 'ت:مطور موثّق', true)`;
  const user = await sql`
    INSERT INTO users (email, password_hash, name, is_staff)
    VALUES (${USER_EMAIL}, 'not-a-real-hash', 'T:Admin Admin', true)
    RETURNING id`;
  userId = Number(user[0].id);
  const cats = await sql`
    INSERT INTO categories (name_en, name_ar, slug) VALUES
      ('T:Acat One', 'ت:فئة أ', 't-acat-one'),
      ('T:Acat Two', 'ت:فئة ب', 't-acat-two')
    RETURNING id, slug`;
  const catBySlug = Object.fromEntries(cats.map((c) => [c.slug as string, Number(c.id)]));
  // Inactive fixture: keeps the `active: false` filter test non-vacuous.
  await sql`INSERT INTO categories (name_en, name_ar, slug, is_active) VALUES ('T:Acat Inactive', 'ت:فئة غير نشطة', 't-acat-inactive', false)`;

  const apps = await sql`
    INSERT INTO apps
      (slug, name_en, name_ar, short_description_en, short_description_ar, description_en, description_ar,
       application_icon, main_image_en, main_image_ar, avg_rating, sort_order, platform, featured, status,
       developer_id, created_at)
    VALUES
      ('t-a-1', 'T:Admin App 1', 'ت:تطبيق أ', 'd1', 'د1', 'desc', 'وصف', 'i1.png', 'c1.png', 'c1.png', '4.00', 1, 'ios', true, 'published', ${devId}, now() - interval '3 hours'),
      ('t-a-2', 'T:Admin App 2', 'ت:تطبيق ب', 'd2', 'د2', 'desc', 'وصف', 'i2.png', 'c2.png', 'c2.png', '3.00', 2, 'android', false, 'draft', ${devId}, now() - interval '2 hours'),
      ('t-a-3', 'T:Admin App 3', 'ت:تطبيق ج', 'd3', 'د3', 'desc', 'وصف', 'i3.png', 'c3.png', 'c3.png', '5.00', 3, 'cross_platform', false, 'archived', ${devId}, now() - interval '1 hours')
    RETURNING id, slug`;
  for (const a of apps) appIds[a.slug as string] = Number(a.id);
  await sql`INSERT INTO apps_categories (app_id, category_id) VALUES (${appIds["t-a-1"]}, ${catBySlug["t-acat-one"]})`;

  await sql`
    INSERT INTO app_submissions
      (tracking_id, status, submitter_name, submitter_email, submitter_phone, submitter_organization, is_developer,
       developer_name_en, developer_name_ar, developer_website, developer_email,
       app_name_en, app_name_ar, short_description_en, short_description_ar, description_en, description_ar,
       google_play_link, app_store_link, app_gallery_link, website_link,
       app_icon_url, main_image_en, main_image_ar, screenshots_en, screenshots_ar,
       crawled_content, admin_notes, rejection_reason, info_request_message,
       reviewed_by_id, reviewed_at)
    VALUES
      ('QAD-TA123', 'pending', 'T:Admin Submitter 1', 'sub1@test.local', '+966500000001', '', false,
       '',
       '', '', '',
       'T:Admin Sub A', 'ت:مطلب أ', 'short a', 'قصير أ', 'desc a', 'وصف أ',
       'https://play.google.com/store/apps/details?id=t.admin.a', '', '', '',
       'icon1.png', 'm1e.png', 'm1a.png', '["s1e.png","s2e.png"]'::jsonb, '["s1a.png"]'::jsonb,
       'Crawled store text', '', '', '',
       NULL, NULL),
      ('QAD-TA124', 'under_review', 'T:Admin Submitter 2', 'sub2@test.local', '', '', false,
       '',
       '', '', '',
       'T:Admin Sub B', 'ت:مطلب ب', 'short b', 'قصير ب', 'desc b', 'وصف ب',
       '', '', '', 'https://website-b.test',
       '', '', '', '[]'::jsonb, '[]'::jsonb,
       NULL, '', '', '',
       NULL, NULL),
      ('QAD-TA125', 'info_requested', 'T:Admin Submitter 3', 'sub3@test.local', '', '', false,
       '',
       '', '', '',
       'T:Admin Sub C', 'ت:مطلب ج', 'short c', 'قصير ج', 'desc c', 'وصف ج',
       '', '', '', '',
       '', '', '', '[]'::jsonb, '[]'::jsonb,
       NULL, '', '', 'Please clarify the content source',
       NULL, NULL),
      ('QAD-TA126', 'approved', 'T:Admin Submitter 4', 'sub4@test.local', '', 'T:Org', true,
       'T:Admin DevCo', 'ت:شركة', 'https://SomeDev.example/About?Lang=EN', 'dev@test.local',
       'T:Admin Sub D', 'ت:مطلب د', 'short d', 'قصير د', 'desc d', 'وصف د',
       'https://play.example/qadta126a', 'https://apps.example/qadta126a', 'https://gallery.example/qadta126a', 'https://site.example/qadta126a',
       'icon4.png', 'm4e.png', 'm4a.png', '["s4e.png","s5e.png"]'::jsonb, '["s4a.png"]'::jsonb,
       NULL, 'Good content', '', '',
       (SELECT id FROM users WHERE email = ${USER_EMAIL}), now()),
      ('QAD-TA127', 'rejected', 'T:Admin Submitter 5', 'sub5@test.local', '', '', false,
       '',
       '', '', '',
       'T:Admin Sub E', 'ت:مطلب ه', 'short e', 'قصير ه', 'desc e', 'وصف ه',
       '', '', '', '',
       '', '', '', '[]'::jsonb, '[]'::jsonb,
       NULL, '', 'Duplicate of a published app', '',
       (SELECT id FROM users WHERE email = ${USER_EMAIL}), now())
  `;

  const subIds = await sql`
    SELECT id, tracking_id FROM app_submissions WHERE tracking_id LIKE 'QAD-TA%'`;
  const subByTracking = Object.fromEntries(subIds.map((s) => [s.tracking_id as string, Number(s.id)]));

  // Categories joined onto the pending submission.
  await sql`
    INSERT INTO app_submissions_categories (appsubmission_id, category_id)
    VALUES (${subByTracking["QAD-TA123"]}, ${catBySlug["t-acat-one"]}), (${subByTracking["QAD-TA123"]}, ${catBySlug["t-acat-two"]})`;

  // Two status logs on the approved submission: one with no author, one by the fixture user.
  await sql`
    INSERT INTO submission_status_logs (submission_id, from_status, to_status, changed_by_id, notes)
    VALUES (${subByTracking["QAD-TA126"]}, 'pending', 'under_review', NULL, 'auto route')`;
  await sql`
    INSERT INTO submission_status_logs (submission_id, from_status, to_status, changed_by_id, notes)
    VALUES (${subByTracking["QAD-TA126"]}, 'under_review', 'approved', ${userId}, 'approved by admin')`;

  for (const v of VIEW_SEEDS) {
    await sql`
      INSERT INTO app_view_events (app_id, viewed_at, country_code, device_type)
      VALUES (${appIds[v.slug]}, now() - make_interval(hours => ${v.hoursAgo}), ${v.country}, ${v.device})`;
  }

  // Expected per-day counts, derived from the seeded rows' own UTC-day bucketing
  // (derived via a different SQL expression than the implementation uses).
  expectedDayCounts = Object.fromEntries(
    (
      await sql`
        SELECT (e.viewed_at AT TIME ZONE 'UTC')::date::text AS day, count(*)::int AS n
        FROM app_view_events e
        JOIN apps a ON a.id = e.app_id
        WHERE a.slug LIKE 't-a-%' AND e.viewed_at > now() - interval '30 days'
        GROUP BY 1`
    ).map((r) => [r.day as string, r.n as number])
  );
});

afterAll(async () => {
  await sql`DELETE FROM apps WHERE slug LIKE 't-a-%'`;
  await sql`DELETE FROM app_submissions WHERE tracking_id LIKE 'QAD-TA%'`;
  await sql`DELETE FROM users WHERE email = ${USER_EMAIL}`;
  await sql`DELETE FROM categories WHERE slug LIKE 't-acat-%'`;
  await sql`DELETE FROM developers WHERE name_en = 'T:Admin Dev'`;
  await sql`DELETE FROM developers WHERE name_en = 'T:Admin Verified Dev'`;
  await sql.end();
});

describe("getAdminApps", () => {
  it("defaults to status 'all' and orders by created_at desc", async () => {
    const res = await getAdminApps({});
    const mine = res.results.filter((r) => r.nameEn.startsWith("T:Admin App"));
    // seeded 3h/2h/1h ago → newest first
    expect(mine.map((r) => r.slug)).toEqual(["t-a-3", "t-a-2", "t-a-1"]);
    expect(res.page).toBe(1);
    expect(res.pageSize).toBe(100);
    expect(mine[2].categories.map((c) => c.slug)).toEqual(["t-acat-one"]);
  });

  it("filters by status", async () => {
    const res = await getAdminApps({ status: "draft" });
    expect(res.count).toBe(1);
    expect(res.results[0].slug).toBe("t-a-2");
    expect(res.results[0].status).toBe("draft");
  });

  it("search + status 'all' returns the exact fixture set", async () => {
    expect((await getAdminApps({ search: "T:Admin App" })).count).toBe(3);
    expect((await getAdminApps({ search: "T:Admin App", status: "all" })).count).toBe(3);
  });

  it("filters by platform and featured", async () => {
    expect((await getAdminApps({ search: "T:Admin App", platform: "ios" })).results[0].slug).toBe("t-a-1");
    expect((await getAdminApps({ search: "T:Admin App", featured: false })).count).toBe(2);
  });

  it("paginates", async () => {
    const res = await getAdminApps({ search: "T:Admin App", page: 2, pageSize: 2 });
    expect(res.count).toBe(3);
    expect(res.results.length).toBe(1);
  });
});

describe("getAdminSubmissions", () => {
  it("filters by status and attaches categories", async () => {
    const res = await getAdminSubmissions({ status: "pending" });
    expect(res.count).toBe(1);
    expect(res.page).toBe(1);
    const row = res.results[0];
    expect(row.trackingId).toBe("QAD-TA123");
    expect(row.appNameEn).toBe("T:Admin Sub A");
    expect(row.hasStoreLink).toBe(true);
    expect(row.appIconUrl).toBe("icon1.png");
    expect(row.categories).toEqual([
      { id: expect.any(Number), nameEn: "T:Acat One", nameAr: "ت:فئة أ" },
      { id: expect.any(Number), nameEn: "T:Acat Two", nameAr: "ت:فئة ب" },
    ]);
  });

  it("hasStoreLink is true only for rows with a store link (website is not a store)", async () => {
    const res = await getAdminSubmissions({});
    expect(res.count).toBe(5);
    const byTracking = new Map(res.results.map((r) => [r.trackingId, r.hasStoreLink]));
    expect(byTracking.get("QAD-TA123")).toBe(true);
    expect(byTracking.get("QAD-TA126")).toBe(true);
    expect(byTracking.get("QAD-TA124")).toBe(false); // website link only
    expect(byTracking.get("QAD-TA125")).toBe(false);
    expect(byTracking.get("QAD-TA127")).toBe(false);
  });

  it("searches over tracking, name and submitter fields", async () => {
    const byTracking = await getAdminSubmissions({ search: "QAD-TA127" });
    expect(byTracking.count).toBe(1);
    expect(byTracking.results[0].trackingId).toBe("QAD-TA127");
    expect(byTracking.results[0].status).toBe("rejected");

    const bySubmitter = await getAdminSubmissions({ search: "submitter 2" });
    expect(bySubmitter.count).toBe(1);
    expect(bySubmitter.results[0].trackingId).toBe("QAD-TA124");
  });

  it("pages with a fixed pageSize of 25", async () => {
    const res = await getAdminSubmissions({ page: 2 });
    expect(res.count).toBe(5);
    expect(res.results).toHaveLength(0);
  });
});

describe("getSubmissionDetail", () => {
  it("returns null for a missing id", async () => {
    expect(await getSubmissionDetail(999999999)).toBeNull();
  });

  it("returns the full detail shape with logs (changedBy null-friendly) and categories", async () => {
    const [sub] = await sql`SELECT id FROM app_submissions WHERE tracking_id = 'QAD-TA126'`;
    const subId = Number(sub.id);
    const d = await getSubmissionDetail(subId);
    expect(d).not.toBeNull();

    expect(d!.id).toBe(subId);
    expect(d!.trackingId).toBe("QAD-TA126");
    expect(d!.status).toBe("approved");
    expect(d!.submitter).toEqual({
      name: "T:Admin Submitter 4",
      email: "sub4@test.local",
      phone: "",
      organization: "T:Org",
      isDeveloper: true,
    });
    expect(d!.app).toEqual({
      nameEn: "T:Admin Sub D",
      nameAr: "ت:مطلب د",
      shortDescriptionEn: "short d",
      shortDescriptionAr: "قصير د",
      descriptionEn: "desc d",
      descriptionAr: "وصف د",
    });
    expect(d!.links).toEqual({
      googlePlay: "https://play.example/qadta126a",
      appStore: "https://apps.example/qadta126a",
      appGallery: "https://gallery.example/qadta126a",
      website: "https://site.example/qadta126a",
    });
    expect(d!.developer).toEqual({
      nameEn: "T:Admin DevCo",
      nameAr: "ت:شركة",
      website: "https://SomeDev.example/About?Lang=EN",
      email: "dev@test.local",
    });
    expect(d!.media).toEqual({
      appIconUrl: "icon4.png",
      mainImageEn: "m4e.png",
      mainImageAr: "m4a.png",
      screenshotsEn: ["s4e.png", "s5e.png"],
      screenshotsAr: ["s4a.png"],
    });
    expect(d!.crawledContent).toBeNull();
    expect(d!.adminNotes).toBe("Good content");
    expect(d!.rejectionReason).toBe("");
    expect(d!.infoRequestMessage).toBe("");
    expect(d!.categories).toEqual([]);
    expect(d!.reviewedAt).toBeInstanceOf(Date);
    expect(d!.updatedAt).toBeInstanceOf(Date);
    expect(d!.createdApp).toBeNull();

    expect(d!.logs).toHaveLength(2);
    expect(d!.logs[0]).toEqual({
      id: expect.any(Number),
      fromStatus: "pending",
      toStatus: "under_review",
      changedBy: null,
      notes: "auto route",
      createdAt: expect.any(Date),
    });
    expect(d!.logs[1].toStatus).toBe("approved");
    expect(d!.logs[1].changedBy).toBe("T:Admin Admin");
    expect(d!.logs[1].notes).toBe("approved by admin");
  });

  it("surfaces crawled content and categories when present", async () => {
    const [sub] = await sql`SELECT id FROM app_submissions WHERE tracking_id = 'QAD-TA123'`;
    const d = await getSubmissionDetail(Number(sub.id));
    expect(d!.crawledContent).toBe("Crawled store text");
    expect(d!.categories.map((c) => c.nameEn).sort()).toEqual(["T:Acat One", "T:Acat Two"]);
  });

  it("links createdApp after the submission is approved", async () => {
    const [sub] = await sql`SELECT id FROM app_submissions WHERE tracking_id = 'QAD-TA126'`;
    const subId = Number(sub.id);
    await sql`UPDATE app_submissions SET created_app_id = ${appIds["t-a-1"]} WHERE id = ${subId}`;
    const d = await getSubmissionDetail(subId);
    expect(d!.createdApp).toEqual({
      id: appIds["t-a-1"],
      nameEn: "T:Admin App 1",
      slug: "t-a-1",
    });
    // reset so the fixture stays canonical for other assertions
    await sql`UPDATE app_submissions SET created_app_id = NULL WHERE id = ${subId}`;
  });
});

describe("getDashboardCounts", () => {
  it("counts app statuses, submission statuses and 30d views", async () => {
    expect(await getDashboardCounts()).toEqual({
      appsPublished: 1,
      appsDraft: 1,
      appsArchived: 1,
      subsPending: 1,
      subsUnderReview: 1,
      subsInfoRequested: 1,
      subsApproved: 1,
      subsRejected: 1,
      views30d: VIEW_SEEDS.length,
    });
  });
});

describe("analytics", () => {
  it("getViewsPerDay30d: exactly 30 UTC days, zero-filled, includes seeded counts", async () => {
    const days = await getViewsPerDay30d();
    expect(days).toHaveLength(30);
    for (let i = 1; i < days.length; i++) expect(days[i].day > days[i - 1].day).toBe(true);
    expect(days[days.length - 1].day).toBe(new Date().toISOString().slice(0, 10));

    const byDay = new Map(days.map((d) => [d.day, d.views]));
    for (const [day, n] of Object.entries(expectedDayCounts)) expect(byDay.get(day)).toBe(n);
    expect(days.reduce((acc, d) => acc + d.views, 0)).toBe(VIEW_SEEDS.length);
  });

  it("getTopApps30d: app views in descending order", async () => {
    const top = await getTopApps30d();
    expect(top).toHaveLength(3);
    expect(top[0]).toEqual({ appId: appIds["t-a-1"], nameEn: "T:Admin App 1", nameAr: "ت:تطبيق أ", views: 3 });
    expect(top[1]).toEqual({ appId: appIds["t-a-2"], nameEn: "T:Admin App 2", nameAr: "ت:تطبيق ب", views: 2 });
    expect(top[2]).toEqual({ appId: appIds["t-a-3"], nameEn: "T:Admin App 3", nameAr: "ت:تطبيق ج", views: 1 });
    expect(await getTopApps30d(2)).toHaveLength(2);
  });

  it("getCountryBreakdown30d: counts incl. null country, honors limit", async () => {
    const rows = await getCountryBreakdown30d();
    expect(rows).toEqual([
      { countryCode: "SA", views: 3 },
      { countryCode: "EG", views: 1 },
      { countryCode: "US", views: 1 },
      { countryCode: null, views: 1 },
    ]);
    expect(await getCountryBreakdown30d(2)).toEqual([
      { countryCode: "SA", views: 3 },
      { countryCode: "EG", views: 1 },
    ]);
  });

  it("getDeviceBreakdown30d: counts per device type", async () => {
    expect(await getDeviceBreakdown30d()).toEqual([
      { deviceType: "mobile", views: 3 },
      { deviceType: "desktop", views: 2 },
      { deviceType: "tablet", views: 1 },
    ]);
  });
});

describe("taxonomy filters", () => {
  it("categories: search matches nameEn/nameAr/slug, active filter ANDs", async () => {
    expect((await getAllCategories({ search: "T:Acat One" })).length).toBe(1);
    expect((await getAllCategories({ search: "  " })).length).toBeGreaterThanOrEqual(2);
    // Non-vacuous: the seeded inactive fixture guarantees a non-empty set, so
    // the every() predicate below is actually exercised.
    const inactive = await getAllCategories({ active: false });
    expect(inactive.length).toBeGreaterThanOrEqual(1);
    expect(inactive.every((c) => c.isActive === false)).toBe(true);
    // search + active AND: the inactive fixture matches only under active=false.
    const andMatch = await getAllCategories({ search: "T:Acat Inactive", active: false });
    expect(andMatch.length).toBeGreaterThanOrEqual(1);
    expect(andMatch.every((c) => c.isActive === false)).toBe(true);
    expect((await getAllCategories({ search: "T:Acat Inactive", active: true })).length).toBe(0);
  });

  it("developers: search matches nameEn/website/email, verified filter ANDs", async () => {
    expect((await getAllDevelopers({ search: "T:Admin Dev" })).length).toBeGreaterThanOrEqual(1);
    // Non-vacuous: the seeded verified fixture guarantees a non-empty set, so
    // the every() predicate below is actually exercised.
    const verified = await getAllDevelopers({ verified: true });
    expect(verified.length).toBeGreaterThanOrEqual(1);
    expect(verified.every((d) => d.isVerified === true)).toBe(true);
    // search + verified AND: the verified fixture matches only under verified=true.
    const andMatch = await getAllDevelopers({ search: "T:Admin Verified Dev", verified: true });
    expect(andMatch.length).toBeGreaterThanOrEqual(1);
    expect(andMatch.every((d) => d.isVerified === true)).toBe(true);
    expect((await getAllDevelopers({ search: "T:Admin Verified Dev", verified: false })).length).toBe(0);
  });
});
