import { test, expect, type Page } from "@playwright/test";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import postgres from "postgres";
import sharp from "sharp";

// playwright.config.ts loads .env.local via dotenv at config time, so these are
// inherited by this test worker even though the file never imports dotenv.
const hasStorage = Boolean(process.env.R2_ACCOUNT_ID ?? process.env.R2_ENDPOINT);
const storagePublicUrl = (process.env.R2_PUBLIC_URL ?? "").replace(/\/+$/, "");

/**
 * Browser-side interception for /upload form flows (approve flows ignore it:
 * their image transfer happens in a server-side fetch, hence real MinIO objects).
 */
const FAKE_UPLOAD_URL = "https://pub-e11717db663c469fb51c65995892b449.r2.dev/fake.webp";
const interceptUpload = (page: Page, fakeUrl = FAKE_UPLOAD_URL) =>
  page.route("**/upload", (route) => route.fulfill({ json: { ok: true, url: fakeUrl } }));

// Per-run token: every fixture row/blob carries T:E2E, so beforeAll/afterAll
// cleanup is exact (delete by prefix, nothing else in the dev DB is touched).
const RUN = Math.random().toString(36).slice(2, 8).toUpperCase();
const APPROVE_TRACKING = `T:E2E:APPROVE-${RUN}`;
const REJECT_TRACKING = `T:E2E:REJECT-${RUN}`;
const APPROVE_APP_NAME = `T:E2E Approve App ${RUN}`;
const APPROVE_APP_NAME_AR = `T:E2E تطبيق الموافقة ${RUN}`;
const REJECT_APP_NAME = `T:E2E Reject App ${RUN}`;
const APPROVE_DEV_NAME = `T:E2E Approve Dev ${RUN}`;
const CRUD_CREATE_NAME = `T:E2E CRUD App ${RUN}`;
const CRUD_RENAMED_NAME = `T:E2E CRUD App v2 ${RUN}`;
const CRUD_DEV_NAME = `T:E2E CRUD Dev ${RUN}`;
const CAT_NAME = `T:E2E Cat ${RUN}`;
const CAT_NAME_AR = `T:E2E فئة ${RUN}`;
const CAT_NAME_EDITED = `T:E2E Cat ${RUN} v2`;
const DEV_NAME = `T:E2E Dev ${RUN}`;
const DEV_NAME_AR = `T:E2E مطوّر ${RUN}`;
const DEV_NAME_EDITED = `T:E2E Dev ${RUN} v2`;
const DEV_APP_NAME = `T:E2E Dev App ${RUN}`;
const TYPE_NAME = `T:E2E type ${RUN}`;
const TYPE_NAME_AR = `T:E2E نوع ${RUN}`;
const ANALYTICS_APP_NAME = `T:E2E Analytics App ${RUN}`;
const APPROVE_EMAIL = `t-e2e-approve-${RUN}@local.dev`;
const REJECT_EMAIL = `t-e2e-reject-${RUN}@local.dev`;

type R = Record<string, unknown>;

const sql = postgres(process.env.DATABASE_URL!, { prepare: false });

/** Delete every T:E2E fixture row (FK cascades remove children). Run before + after. */
async function cleanupDb() {
  await sql`DELETE FROM apps WHERE name_en LIKE 'T:E2E %'`;
  await sql`DELETE FROM app_submissions WHERE tracking_id LIKE 'T:E2E:%'`;
  await sql`DELETE FROM developers WHERE name_en LIKE 'T:E2E %'`;
  await sql`DELETE FROM categories WHERE name_en LIKE 'T:E2E %'`;
  await sql`DELETE FROM metadata_types WHERE name LIKE 'T:E2E %'`;
}

async function login(page: Page) {
  await page.goto("/admin/login");
  await page.fill('input[type="email"]', process.env.ADMIN_EMAIL ?? "admin@local.dev");
  await page.fill('input[type="password"]', process.env.ADMIN_PASSWORD ?? "admin123");
  await page.click('button[type="submit"]');
  await page.waitForURL("**/admin", { timeout: 15_000 });
  await expect(page.getByRole("heading", { name: "لوحة التحكم" })).toBeVisible({ timeout: 15_000 });
}

// Inserted in beforeAll; tests run after it, so the plain-number fixtures are set.
let approveSubId = 0;
let rejectSubId = 0;
let devId = 0;
let catId = 0;
let analyticsAppId = 0;

// Real tiny sharp-generated PNGs (approve fixture uploads when storage exists;
// the CRUD upload island needs real bytes either way).
let iconBuffer = Buffer.alloc(0);
let mainEnBuffer = Buffer.alloc(0);

test.beforeAll(async () => {
  // Leftovers from a previously interrupted run (afterAll) would collide on
  // statuses/unique names — sweep the exact prefix first.
  await cleanupDb();

  const existing = (await sql`SELECT id FROM categories ORDER BY id LIMIT 1`) as R[];
  if (existing.length === 0) throw new Error("dev DB has no categories to anchor the approve flow");
  catId = Number(existing[0]!.id);

  const [dev] = (await sql`
    INSERT INTO developers (name_en, name_ar, description_en, description_ar)
    VALUES (${CRUD_DEV_NAME}, ${CRUD_DEV_NAME}, '', '')
    RETURNING id
  `) as Array<{ id: number }>;
  devId = dev.id;

  const [approveSub] = (await sql`
    INSERT INTO app_submissions (
      tracking_id, status, submitter_name, submitter_email,
      is_developer, developer_name_en, developer_name_ar, developer_website, developer_email,
      app_name_en, app_name_ar,
      short_description_en, short_description_ar, description_en, description_ar,
      google_play_link, app_icon_url, main_image_en, main_image_ar, content_confirmation
    ) VALUES (
      ${APPROVE_TRACKING}, 'pending', 'E2E Approve Submitter', ${APPROVE_EMAIL},
      TRUE, ${APPROVE_DEV_NAME}, ${APPROVE_DEV_NAME}, '', 'dev-' || ${APPROVE_TRACKING},
      ${APPROVE_APP_NAME}, ${APPROVE_APP_NAME_AR},
      'Short approve', 'وصف مختصر', 'Description approve', 'وصف كامل',
      'https://play.google.com/store/apps/details?id=' || ${APPROVE_TRACKING},
      ${`${storagePublicUrl}/approved-fixtures/icon.webp`},
      ${`${storagePublicUrl}/approved-fixtures/main_en.webp`},
      ${`${storagePublicUrl}/approved-fixtures/main_ar.webp`},
      TRUE
    ) RETURNING id
  `) as Array<{ id: number }>;
  approveSubId = approveSub.id;
  await sql`
    INSERT INTO app_submissions_categories (appsubmission_id, category_id)
    VALUES (${approveSubId}, ${catId})
  `;

  const [rejectSub] = (await sql`
    INSERT INTO app_submissions (
      tracking_id, status, submitter_name, submitter_email,
      app_name_en, app_name_ar, short_description_en, short_description_ar,
      description_en, description_ar, google_play_link, content_confirmation
    ) VALUES (
      ${REJECT_TRACKING}, 'pending', 'E2E Reject Submitter', ${REJECT_EMAIL},
      ${REJECT_APP_NAME}, 'T:E2E تطبيق مرفوض', 'Short reject', 'وصف مختصر',
      'Description reject', 'وصف كامل',
      'https://play.google.com/store/apps/details?id=' || ${REJECT_TRACKING}, TRUE
    ) RETURNING id
  `) as Array<{ id: number }>;
  rejectSubId = rejectSub.id;

  const [analyticsApp] = (await sql`
    INSERT INTO apps (
      name_en, name_ar, slug,
      short_description_en, short_description_ar, description_en, description_ar,
      application_icon, main_image_en, main_image_ar, google_play_link,
      developer_id, status, platform, sort_order, featured
    ) VALUES (
      ${ANALYTICS_APP_NAME}, 'T:E2E تطبيق تحليلات', 't-e2e-analytics-app-' || ${RUN.toLowerCase()},
      'Short analytics', 'وصف مختصر', 'Description analytics', 'وصف كامل',
      ${FAKE_UPLOAD_URL}, ${FAKE_UPLOAD_URL}, ${FAKE_UPLOAD_URL},
      'https://play.google.com/store/apps/details?id=' || ${RUN.toLowerCase()},
      ${devId}, 'draft', 'cross_platform', 99999, FALSE
    ) RETURNING id
  `) as Array<{ id: number }>;
  analyticsAppId = analyticsApp.id;
  await sql`
    INSERT INTO app_view_events (app_id, device_type, country_code)
    VALUES (${analyticsAppId}, 'desktop', 'SA')
  `;

  iconBuffer = await sharp({ create: { width: 64, height: 64, channels: 3, background: "#4477aa" } })
    .png()
    .toBuffer();
  mainEnBuffer = await sharp({ create: { width: 160, height: 100, channels: 3, background: "#338844" } })
    .png()
    .toBuffer();

  if (hasStorage) {
    const mainAr = await sharp({ create: { width: 160, height: 100, channels: 3, background: "#883333" } })
      .png()
      .toBuffer();
    const client = new S3Client({
      region: "auto",
      endpoint: process.env.R2_ENDPOINT!, // mirrors r2.ts env lookup
      forcePathStyle: process.env.R2_FORCE_PATH_STYLE === "1",
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID ?? "",
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? "",
      },
    });
    try {
      const bucket = process.env.R2_BUCKET!;
      for (const [key, body] of [
        ["approved-fixtures/icon.webp", iconBuffer],
        ["approved-fixtures/main_en.webp", mainEnBuffer],
        ["approved-fixtures/main_ar.webp", mainAr],
      ] as const) {
        await client.send(
          new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentType: "image/png" })
        );
      }
    } finally {
      client.destroy();
    }
  }
});

test.afterAll(async () => {
  try {
    await cleanupDb();
  } finally {
    await sql.end();
  }
});

// Flow 2 (flow 1 lives in admin-auth.spec.ts — Task 6, unchanged here).
test("guard does not leak submissions list to anonymous visitors", async ({ page }) => {
  await page.goto("/admin/submissions");
  await page.waitForURL("**/admin/login", { timeout: 15_000 });
  expect(page.url()).toContain("/admin/login");
});

test("approve flow transfers media via storage and creates a published app", async ({ page }) => {
  test.skip(!hasStorage, "minio not running");
  test.setTimeout(90_000);

  await login(page);
  await page.goto(`/admin/submissions?q=${encodeURIComponent(APPROVE_TRACKING)}`);
  await page.getByRole("link", { name: APPROVE_TRACKING }).click();
  await page.waitForURL(`**/admin/submissions/${approveSubId}`, { timeout: 15_000 });
  const approveBtn = page.getByRole("button", { name: "موافقة" });
  await expect(approveBtn).toBeVisible();

  // window.confirm gate — listen BEFORE the click.
  page.on("dialog", (dialog) => void dialog.accept());
  await approveBtn.click();

  // Server side: fetch → sharp → upload → transaction → lands on the new app.
  await page.waitForURL(/\/admin\/apps\/\d+$/, { timeout: 60_000 });
  const appId = Number(page.url().match(/\/admin\/apps\/(\d+)$/)![1]);
  expect(Number.isInteger(appId) && appId > 0).toBe(true);
  await expect(page.locator('label:has-text("الاسم (EN)") input')).toHaveValue(APPROVE_APP_NAME, {
    timeout: 15_000,
  });

  // DB outcomes (plain SQL): app published, media transferred to storage keys,
  // submission approved + wired to the app, status log written, categories copied.
  const apps = (await sql`SELECT * FROM apps WHERE id = ${appId}`) as R[];
  expect(apps).toHaveLength(1);
  const appRow = apps[0]!;
  expect(appRow.status).toBe("published");
  expect(String(appRow.slug)).toMatch(/^t-e2e-approve-app/);
  const iconUrl = String(appRow.application_icon);
  expect(iconUrl).toContain(`${storagePublicUrl}/app-icons/`);
  expect(iconUrl).toMatch(/icon\.webp$/);
  // storage row actually serves the transferred object anonymously
  const res = await fetch(iconUrl, { method: "GET" });
  expect(res.status).toBe(200);
  await res.body?.cancel();

  const cats = (await sql`
    SELECT category_id FROM apps_categories WHERE app_id = ${appId}
  `) as Array<{ category_id: number }>;
  expect(cats).toHaveLength(1);
  expect(Number(cats[0]!.category_id)).toBe(catId);

  const subs = (
    await sql`SELECT status, created_app_id, reviewed_at FROM app_submissions WHERE id = ${approveSubId}`
  ) as R[];
  expect(subs[0]!.status).toBe("approved");
  expect(Number(subs[0]!.created_app_id)).toBe(appId);
  expect(subs[0]!.reviewed_at).not.toBeNull();

  const logs = (await sql`
    SELECT to_status FROM submission_status_logs WHERE submission_id = ${approveSubId}
  `) as Array<{ to_status: string }>;
  expect(logs.map((l) => l.to_status)).toContain("approved");

  // Submission detail: approved chip + created-app link; approve is no longer offered.
  await page.goto(`/admin/submissions/${approveSubId}`);
  await expect(page.locator('[data-testid="submissions-status-badge"]').first()).toHaveText(
    "تمت الموافقة",
    { timeout: 15_000 }
  );
  await expect(page.locator(`a[href="/admin/apps/${appId}"]`)).toBeVisible();
  await expect(page.getByRole("button", { name: "موافقة" })).toHaveCount(0);

  // Back to the list: the row carries the approved chip.
  await page.locator('a:has-text("العودة إلى القائمة")').click();
  await page.waitForURL("**/admin/submissions");
  const row = page.locator("table tbody tr", { hasText: APPROVE_TRACKING });
  await expect(row).toBeVisible();
  await expect(row.locator('[data-testid="submissions-status-badge"]')).toHaveText("تمت الموافقة");
});

test("reject flow records reason and flips the chip, list shows it under مرفوض", async ({ page }) => {
  await login(page);
  await page.goto(`/admin/submissions?q=${encodeURIComponent(REJECT_TRACKING)}`);
  await page.getByRole("link", { name: REJECT_TRACKING }).click();
  await page.waitForURL(`**/admin/submissions/${rejectSubId}`, { timeout: 15_000 });

  await page.getByRole("button", { name: "رفض", exact: true }).click();
  await page.locator("#reject-reason").fill("بيانات ناقصة في الطلب");
  await page.getByRole("button", { name: "تأكيد الرفض" }).click();

  const detailBadge = page.locator('[data-testid="submissions-status-badge"]').first();
  await expect(detailBadge).toHaveText("مرفوض", { timeout: 15_000 });

  // DB outcome: reason stored + status log to rejected.
  const subs = (await sql`
    SELECT status, rejection_reason FROM app_submissions WHERE id = ${rejectSubId}
  `) as Array<{ status: string; rejection_reason: string }>;
  expect(subs[0]!.status).toBe("rejected");
  expect(subs[0]!.rejection_reason).toBe("بيانات ناقصة في الطلب");
  const logs = (await sql`
    SELECT to_status FROM submission_status_logs WHERE submission_id = ${rejectSubId}
  `) as Array<{ to_status: string }>;
  expect(logs.map((l) => l.to_status)).toContain("rejected");

  // Back to the list under the rejected tab.
  await page.locator('a:has-text("العودة إلى القائمة")').click();
  await page.waitForURL("**/admin/submissions");
  await page.locator('a[href="/admin/submissions?status=rejected"]').click();
  await page.waitForURL("**/admin/submissions?status=rejected");
  const row = page.locator("table tbody tr", { hasText: REJECT_TRACKING });
  await expect(row).toBeVisible();
  await expect(row.locator('[data-testid="submissions-status-badge"]')).toHaveText("مرفوض");
});

test("apps CRUD: create with upload, list-scan, rename, archive, delete", async ({ page }) => {
  test.setTimeout(90_000);
  await login(page);
  if (!hasStorage) await interceptUpload(page);
  await page.goto("/admin/apps/new");

  const form = page.locator("form").first();
  await form.locator('label:has-text("الاسم (EN)") input').fill(CRUD_CREATE_NAME);
  await form.locator('label:has-text("الاسم (AR)") input').fill("T:E2E تطبيق إدارة");
  await form.locator('label:has-text("الوصف المختصر (EN)") textarea').fill("Short CRUD");
  await form.locator('label:has-text("الوصف المختصر (AR)") textarea').fill("وصف مختصر");
  await form.locator('label:has-text("الوصف الكامل (EN)") textarea').fill("Description CRUD");
  await form.locator('label:has-text("الوصف الكامل (AR)") textarea').fill("وصف كامل");
  await form.locator('label:has-text("Google Play") input').fill("https://play.google.com/store/apps/details?id=e2e-crud");

  // icon via the real upload island (MinIO when hasStorage, fulfilled route otherwise)
  const iconUpload = form.locator('label:has-text("رفع صورة")').first().locator('input[type=file]');
  await iconUpload.setInputFiles([
    { name: "icon.png", mimeType: "image/png", buffer: iconBuffer },
  ]);
  const iconUrlInput = form.locator('label:has-text("أيقونة التطبيق") input[type=url]');
  if (hasStorage) {
    await expect(iconUrlInput).toHaveValue(new RegExp(`^${storagePublicUrl}/uploads/.+\\.webp$`), {
      timeout: 30_000,
    });
  } else {
    await expect(iconUrlInput).toHaveValue(FAKE_UPLOAD_URL, { timeout: 15_000 });
  }
  const fixtureMain = hasStorage ? `${storagePublicUrl}/approved-fixtures/main_en.webp` : FAKE_UPLOAD_URL;
  await form.locator('label:has-text("الصورة الرئيسية (EN)") input[type=url]').fill(fixtureMain);
  await form.locator('label:has-text("الصورة الرئيسية (AR)") input[type=url]').fill(fixtureMain);
  await form.locator('label:has-text("المطور") select').selectOption(String(devId));

  await page.getByRole("button", { name: "إنشاء التطبيق" }).click();
  await page.waitForURL(/\/admin\/apps\/\d+$/, { timeout: 30_000 });
  const appId = Number(page.url().match(/\/admin\/apps\/(\d+)$/)![1]);

  let apps = (await sql`SELECT * FROM apps WHERE id = ${appId}`) as R[];
  expect(apps).toHaveLength(1);
  expect(apps[0]!.status).toBe("draft");
  expect(apps[0]!.name_en).toBe(CRUD_CREATE_NAME);
  if (hasStorage) expect(String(apps[0]!.application_icon)).toContain(`${storagePublicUrl}/uploads/`);

  // list contains it (search)
  await page.goto(`/admin/apps?q=${encodeURIComponent("T:E2E CRUD")}`);
  await expect(page.locator("table tbody tr", { hasText: CRUD_CREATE_NAME })).toBeVisible();

  // edit → rename (slug regenerates when the EN name changes)
  await page.goto(`/admin/apps/${appId}`);
  const editForm = page.locator("form").first();
  await editForm.locator('label:has-text("الاسم (EN)") input').fill(CRUD_RENAMED_NAME);
  await page.getByRole("button", { name: "حفظ التعديلات" }).click();
  await expect(page.getByText("تم حفظ التطبيق بنجاح")).toBeVisible({ timeout: 15_000 });
  apps = (await sql`SELECT name_en, slug FROM apps WHERE id = ${appId}`) as R[];
  expect(apps[0]!.name_en).toBe(CRUD_RENAMED_NAME);

  // archive
  await editForm.locator('label:has-text("الحالة") select').selectOption("archived");
  await page.getByRole("button", { name: "حفظ التعديلات" }).click();
  await expect(page.getByText("تم حفظ التطبيق بنجاح")).toBeVisible({ timeout: 15_000 });
  apps = (await sql`SELECT status FROM apps WHERE id = ${appId}`) as R[];
  expect(apps[0]!.status).toBe("archived");

  // delete → absent from the list + DB
  page.on("dialog", (dialog) => void dialog.accept());
  await page.locator('button:has-text("حذف التطبيق")').click();
  await page.waitForURL("**/admin/apps", { timeout: 15_000 });
  apps = (await sql`SELECT id FROM apps WHERE id = ${appId}`) as R[];
  expect(apps).toHaveLength(0);

  await page.goto(`/admin/apps?q=${encodeURIComponent("T:E2E CRUD")}`);
  await expect(page.getByText("لا توجد تطبيقات مطابقة")).toBeVisible();
});

test("categories: new → list → search/filter → edit → delete", async ({ page }) => {
  await login(page);
  await page.goto("/admin/categories/new");

  // Create from the dedicated new page; save lands back on the list.
  await page.getByLabel(/الاسم \(EN\)/).fill(CAT_NAME);
  await page.getByLabel(/الاسم \(AR\)/).fill(CAT_NAME_AR);
  await page.getByRole("button", { name: "إضافة الفئة" }).click();
  await expect(page).toHaveURL(/\/admin\/categories$/, { timeout: 15_000 });
  const rows = (await sql`SELECT id FROM categories WHERE name_en = ${CAT_NAME}`) as R[];
  expect(rows).toHaveLength(1);
  const newCatId = Number(rows[0]!.id);

  // Search finds the new category by name.
  await page.goto(`/admin/categories?q=${encodeURIComponent(CAT_NAME)}`);
  await expect(page.getByRole("table")).toContainText(CAT_NAME);

  // Active filter: created active by default → yes includes, no excludes.
  await page.goto(`/admin/categories?q=${encodeURIComponent(CAT_NAME)}&active=yes`);
  await expect(page.getByRole("table")).toContainText(CAT_NAME);
  await page.goto(`/admin/categories?q=${encodeURIComponent(CAT_NAME)}&active=no`);
  await expect(page.getByText("لا توجد فئات مطابقة")).toBeVisible();

  // Edit: row link → dedicated edit page prefilled with the row.
  await page.goto(`/admin/categories?q=${encodeURIComponent(CAT_NAME)}`);
  const catRow = page.locator("table tbody tr", { hasText: CAT_NAME });
  await catRow.getByRole("link", { name: "تعديل" }).click();
  await expect(page).toHaveURL(/\/admin\/categories\/\d+/);
  await expect(page.getByLabel(/الاسم \(EN\)/)).toHaveValue(CAT_NAME);

  // Rename and save → back on the list.
  await page.getByLabel(/الاسم \(EN\)/).fill(CAT_NAME_EDITED);
  await page.getByRole("button", { name: "حفظ التعديلات" }).click();
  await expect(page).toHaveURL(/\/admin\/categories$/, { timeout: 15_000 });
  const renamed = (await sql`SELECT name_en FROM categories WHERE id = ${newCatId}`) as R[];
  expect(renamed[0]!.name_en).toBe(CAT_NAME_EDITED);

  // Delete: confirm dialog, then row + DB row gone.
  await page.goto(`/admin/categories?q=${encodeURIComponent(CAT_NAME_EDITED)}`);
  // Capture the message in the handler (asserting there would not fail the
  // test); assert on it after the row is gone — the row only disappears once
  // the dialog is accepted, so the capture is guaranteed to have happened.
  let catDeleteMessage = "";
  page.on("dialog", (dialog) => {
    catDeleteMessage = dialog.message();
    void dialog.accept();
  });
  await page
    .locator("table tbody tr", { hasText: CAT_NAME_EDITED })
    .getByRole("button", { name: "حذف" })
    .click();
  await expect(page.locator("table tbody tr", { hasText: CAT_NAME_EDITED })).toHaveCount(0, {
    timeout: 15_000,
  });
  expect(catDeleteMessage).toContain("سيتم حذف الفئة نهائيًا");
  const after = (await sql`SELECT id FROM categories WHERE id = ${newCatId}`) as R[];
  expect(after).toHaveLength(0);
});

test("developers: new → verified filter → edit → delete", async ({ page }) => {
  await login(page);
  await page.goto("/admin/developers/new");

  // Create a verified developer from the dedicated new page.
  await page.getByLabel(/الاسم \(EN\)/).fill(DEV_NAME);
  await page.getByLabel(/الاسم \(AR\)/).fill(DEV_NAME_AR);
  await page.getByLabel(/مطوّر موثّق/).check();
  await page.getByRole("button", { name: "إضافة المطوّر" }).click();
  await expect(page).toHaveURL(/\/admin\/developers$/, { timeout: 15_000 });
  const rows = (await sql`SELECT id FROM developers WHERE name_en = ${DEV_NAME}`) as R[];
  expect(rows).toHaveLength(1);
  const newDevId = Number(rows[0]!.id);

  // Verified filter: found under verified=yes, absent under verified=no.
  await page.goto(`/admin/developers?q=${encodeURIComponent(DEV_NAME)}&verified=yes`);
  await expect(page.getByRole("table")).toContainText(DEV_NAME);
  await page.goto(`/admin/developers?q=${encodeURIComponent(DEV_NAME)}&verified=no`);
  await expect(page.getByText("لا يوجد مطورون مطابقون")).toBeVisible();

  // Edit: row link → dedicated edit page, verified checkbox prefilled.
  await page.goto(`/admin/developers?q=${encodeURIComponent(DEV_NAME)}&verified=yes`);
  const devRow = page.locator("table tbody tr", { hasText: DEV_NAME });
  await devRow.getByRole("link", { name: "تعديل" }).click();
  await expect(page).toHaveURL(/\/admin\/developers\/\d+/);
  await expect(page.getByLabel(/مطوّر موثّق/)).toBeChecked();

  // Rename and save → back on the list.
  await page.getByLabel(/الاسم \(EN\)/).fill(DEV_NAME_EDITED);
  await page.getByRole("button", { name: "حفظ التعديلات" }).click();
  await expect(page).toHaveURL(/\/admin\/developers$/, { timeout: 15_000 });
  const renamed = (await sql`SELECT name_en FROM developers WHERE id = ${newDevId}`) as R[];
  expect(renamed[0]!.name_en).toBe(DEV_NAME_EDITED);

  // Give the developer an app so the delete warning is the cascade variant
  // (the FK cascade then removes the app with the developer).
  await sql`
    INSERT INTO apps (
      name_en, name_ar, slug,
      short_description_en, short_description_ar, description_en, description_ar,
      application_icon, main_image_en, main_image_ar, google_play_link,
      developer_id, status, platform, sort_order, featured
    ) VALUES (
      ${DEV_APP_NAME}, 'T:E2E تطبيق مطوّر', 't-e2e-dev-app-' || ${RUN.toLowerCase()},
      'Short', 'وصف مختصر', 'Description', 'وصف كامل',
      ${FAKE_UPLOAD_URL}, ${FAKE_UPLOAD_URL}, ${FAKE_UPLOAD_URL},
      'https://play.google.com/store/apps/details?id=' || ${RUN.toLowerCase()},
      ${newDevId}, 'draft', 'cross_platform', 99999, FALSE
    )
  `;

  // Delete: cascade confirm text, then row + developer + app gone.
  await page.goto(`/admin/developers?q=${encodeURIComponent(DEV_NAME_EDITED)}`);
  // Capture the message in the handler; assert on it after the row is gone
  // (the row only disappears once the dialog is accepted).
  let devDeleteMessage = "";
  page.on("dialog", (dialog) => {
    devDeleteMessage = dialog.message();
    void dialog.accept();
  });
  await page
    .locator("table tbody tr", { hasText: DEV_NAME_EDITED })
    .getByRole("button", { name: "حذف" })
    .click();
  await expect(page.locator("table tbody tr", { hasText: DEV_NAME_EDITED })).toHaveCount(0, {
    timeout: 15_000,
  });
  expect(devDeleteMessage).toContain("سيتم حذف تطبيقات المطور المرتبطة");
  const devs = (await sql`SELECT id FROM developers WHERE id = ${newDevId}`) as R[];
  expect(devs).toHaveLength(0);
  const apps = (await sql`SELECT id FROM apps WHERE developer_id = ${newDevId}`) as R[];
  expect(apps).toHaveLength(0);
});

test("metadata: add type → add option → shows → delete type via confirm", async ({ page }) => {
  await login(page);
  await page.goto("/admin/metadata");

  const typeForm = page.locator("form").first();
  await typeForm.locator('label:has-text("الاسم التقني") input').fill(TYPE_NAME);
  await typeForm.locator('label:has-text("التسمية (EN)") input').fill(TYPE_NAME);
  await typeForm.locator('label:has-text("التسمية (AR)") input').fill(TYPE_NAME_AR);
  await page.getByRole("button", { name: "إضافة النوع" }).click();
  await expect(page.getByText("تم حفظ نوع البيانات بنجاح")).toBeVisible({ timeout: 15_000 });

  const card = page.locator("section", { has: page.locator(`h2:has-text("${TYPE_NAME_AR}")`) });
  await expect(card).toBeVisible();

  // Options form inside the new type card
  await card.locator('label:has-text("القيمة") input').fill(TYPE_NAME.toLowerCase().replace(/\s+/g, "-"));
  await card.locator('label:has-text("التسمية (EN)") input').fill(`${TYPE_NAME}-opt`);
  await card.locator('label:has-text("التسمية (AR)") input').fill(`${TYPE_NAME_AR} خيار`);
  await card.getByRole("button", { name: "إضافة الخيار" }).click();
  const optionRow = card.locator("table tbody tr", { hasText: `${TYPE_NAME}-opt` });
  await expect(optionRow).toBeVisible({ timeout: 15_000 });

  const rows = (await sql`
    SELECT o.value FROM metadata_options o
    JOIN metadata_types t ON t.id = o.metadata_type_id
    WHERE t.name = ${TYPE_NAME}
  `) as Array<{ value: string }>;
  expect(rows).toHaveLength(1);
  expect(rows[0]!.value).toBe(TYPE_NAME.toLowerCase().replace(/\s+/g, "-"));

  page.on("dialog", (dialog) => void dialog.accept());
  await card.getByRole("button", { name: "حذف النوع" }).click();
  await expect(card).toHaveCount(0, { timeout: 15_000 });
  const types = (await sql`SELECT id FROM metadata_types WHERE name = ${TYPE_NAME}`) as R[];
  expect(types).toHaveLength(0);
});

test("analytics renders bar chart svg and non-empty tables for the seeded event", async ({ page }) => {
  await login(page);
  await page.goto("/admin/analytics");

  // Zero-height bars render empty; the seeded event is "today", so today's bar (last) is non-zero.
  await expect(page.locator('svg[role="img"] rect:not([height="0"])').last()).toBeVisible({ timeout: 15_000 });

  await expect(page.locator("table tbody tr", { hasText: ANALYTICS_APP_NAME })).toBeVisible();
  await expect(page.locator("table tbody tr", { hasText: "SA" })).toBeVisible();
  await expect(page.locator("table tbody tr", { hasText: "desktop" })).toBeVisible();
  await expect(page.getByText("لا توجد بيانات")).toHaveCount(0);
});
