import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import postgres from "postgres";

vi.mock("@/lib/auth", () => ({
  auth: async () => ({ user: { id: "1", email: "admin@local.dev" } }),
}));
vi.mock("next/cache", () => ({ revalidateTag: vi.fn(), revalidatePath: vi.fn() }));

import { saveApp, deleteApp, bulkSetApps } from "@/lib/actions/admin-apps";
import {
  getAppForEdit,
  getAllDevelopers,
  getAllCategories,
  getAllMetadataTypesWithActiveOptions,
  getDeveloperAppCount,
  type AppEditData,
} from "@/lib/repo/admin";
import { revalidateTag } from "next/cache";

const sql = postgres(process.env.TEST_DATABASE_URL!, { max: 4 });

const DEV_NAME = "T:Apps8 DevCo";
const TYPE_SINGLE = "T8 Single Filter";
const TYPE_MULTI = "T8 Multi Filter";

let devId = 0;
let cat1Id = 0;
let cat2Id = 0;
let singleTypeId = 0;
let multiTypeId = 0;
let singleOpt1 = 0;
let singleOpt2 = 0;
let multiOpt1 = 0;
let multiOpt2 = 0;
let establishedAppId = 0; // slug t8-established
let collideAppId = 0; // slug t8-collide-name, name "T8 Slug Keeper"
let renameeAppId = 0; // slug t8-renamee, name "T8 Rename Me"
let deleteeAppId = 0; // slug t8-delete-me
let bulkAId = 0;
let bulkBId = 0;
let bulkOutId = 0;
let slugEditAppId = 0; // slug t8-slug-edit, name "T8 Slug Override"
let keepAppId = 0; // slug t8-keep-name, name "T8 Keep Name"
let repeatAId = 0; // slug t8-repeat-a, name_ar shared with t8-repeat-b (legacy repeat)

const appSeed = (slug: string, nameEn: string, nameAr: string) =>
  sql`
    INSERT INTO apps
      (slug, name_en, name_ar, short_description_en, short_description_ar, description_en, description_ar,
       application_icon, main_image_en, main_image_ar, avg_rating, sort_order, platform, status, featured, developer_id)
    VALUES (${slug}, ${nameEn}, ${nameAr}, 'short', 'قصير', 'desc', 'وصف', 'i.png', 'm.png', 'm.png', '0.00', 0, 'android', 'draft', false, ${devId})`;

const baseInput = {
  nameEn: "T8 Created App",
  nameAr: "ت:تطبيق منشأ",
  shortDescriptionEn: "short en",
  shortDescriptionAr: "قصير",
  descriptionEn: "desc en",
  descriptionAr: "وصف كامل",
  applicationIcon: "https://cdn.test/icon.png",
  mainImageEn: "https://cdn.test/m-en.png",
  mainImageAr: "https://cdn.test/m-ar.png",
  googlePlayLink: "https://play.google.com/store/apps/details?id=t8",
  appStoreLink: "",
  appGalleryLink: "",
  screenshotsEn: ["https://cdn.test/s1en.png", "https://cdn.test/s2en.png"],
  screenshotsAr: ["https://cdn.test/s1ar.png", "https://cdn.test/s2ar.png", "https://cdn.test/s3ar.png"],
  categoryIds: [] as number[],
  metadata: {} as Record<string, number[]>,
  developerId: 0, // set in beforeAll
  platform: "ios",
  status: "draft",
  featured: true,
  sortOrder: 3,
};

beforeEach(() => {
  vi.clearAllMocks();
});

beforeAll(async () => {
  // Defensive pre-clean so a failed run mid-suite never breaks the next run.
  await sql`DELETE FROM apps WHERE slug LIKE 't8-%'`;
  await sql`DELETE FROM categories WHERE slug LIKE 't8-cat-%'`;
  await sql`DELETE FROM metadata_types WHERE name IN (${TYPE_SINGLE}, ${TYPE_MULTI})`;
  await sql`DELETE FROM developers WHERE name_en = ${DEV_NAME}`;

  const dev = await sql`INSERT INTO developers (name_en, name_ar) VALUES (${DEV_NAME}, 'ت:شركة 8') RETURNING id`;
  devId = Number(dev[0].id);
  baseInput.developerId = devId;

  const cats = await sql`
    INSERT INTO categories (name_en, name_ar, slug) VALUES
      ('T8 Cat One', 'ت:فئة ٨-أ', 't8-cat-one'),
      ('T8 Cat Two', 'ت:فئة ٨-ب', 't8-cat-two')
    RETURNING id, slug`;
  cat1Id = Number(cats[0].id);
  cat2Id = Number(cats[1].id);

  const [tSingle] = await sql`
    INSERT INTO metadata_types (name, label_en, label_ar, is_multi_select, sort_order)
    VALUES (${TYPE_SINGLE}, 'T8 Single', 'ت:مفرد', false, 10) RETURNING id`;
  singleTypeId = Number(tSingle.id);
  const [tMulti] = await sql`
    INSERT INTO metadata_types (name, label_en, label_ar, is_multi_select, sort_order)
    VALUES (${TYPE_MULTI}, 'T8 Multi', 'ت:متعدد', true, 20) RETURNING id`;
  multiTypeId = Number(tMulti.id);

  const opts = await sql`
    INSERT INTO metadata_options (metadata_type_id, value, label_en, label_ar) VALUES
      (${singleTypeId}, 't8-s1', 'S One', 'ت:واحد'),
      (${singleTypeId}, 't8-s2', 'S Two', 'ت:اثنان'),
      (${multiTypeId}, 't8-m1', 'M One', 'ت:م1'),
      (${multiTypeId}, 't8-m2', 'M Two', 'ت:م2')
    RETURNING id, value`;
  for (const o of opts) {
    if (o.value === "t8-s1") singleOpt1 = Number(o.id);
    if (o.value === "t8-s2") singleOpt2 = Number(o.id);
    if (o.value === "t8-m1") multiOpt1 = Number(o.id);
    if (o.value === "t8-m2") multiOpt2 = Number(o.id);
  }

  await appSeed("t8-established", "T8 Established App", "ت:مؤسّس");
  await appSeed("t8-collide-name", "T8 Slug Keeper", "ت:حارس"); // different name, slug kept for collision
  await appSeed("t8-renamee", "T8 Rename Me", "ت:غيّرني");
  await appSeed("t8-delete-me", "T8 Delete Me", "ت:احذفني");
  await appSeed("t8-bulk-a", "T8 Bulk A", "ت:مجمع أ");
  await appSeed("t8-bulk-b", "T8 Bulk B", "ت:مجمع ب");
  await appSeed("t8-bulk-out", "T8 Bulk Out", "ت:خارج");
  await appSeed("t8-slug-edit", "T8 Slug Override", "ت:رابط");
  await appSeed("t8-keep-name", "T8 Keep Name", "ت:بقيت");
  await appSeed("t8-repeat-a", "T8 Repeat A", "ألفا");
  await appSeed("t8-repeat-b", "T8 Repeat B", "ألفا"); // legacy repeat: same name_ar as repeat-a

  const bySlug = (slug: string) => sql`SELECT id FROM apps WHERE slug = ${slug}`;
  for (const [slug, assign] of [
    ["t8-established", (v: number) => (establishedAppId = v)],
    ["t8-collide-name", (v: number) => (collideAppId = v)],
    ["t8-renamee", (v: number) => (renameeAppId = v)],
    ["t8-delete-me", (v: number) => (deleteeAppId = v)],
    ["t8-bulk-a", (v: number) => (bulkAId = v)],
    ["t8-bulk-b", (v: number) => (bulkBId = v)],
    ["t8-bulk-out", (v: number) => (bulkOutId = v)],
    ["t8-slug-edit", (v: number) => (slugEditAppId = v)],
    ["t8-keep-name", (v: number) => (keepAppId = v)],
    ["t8-repeat-a", (v: number) => (repeatAId = v)],
  ] as const) {
    const [row] = await bySlug(slug);
    assign(Number(row!.id));
  }

  // Child rows under the delete target — every cascade path gets a row.
  await sql`INSERT INTO apps_categories (app_id, category_id) VALUES (${deleteeAppId}, ${cat1Id})`;
  await sql`
    INSERT INTO app_screenshots (app_id, language, image, sort_order) VALUES
      (${deleteeAppId}, 'en', 'https://cdn.test/d1.png', 0),
      (${deleteeAppId}, 'en', 'https://cdn.test/d2.png', 1),
      (${deleteeAppId}, 'ar', 'https://cdn.test/d1a.png', 0)`;
  for (const optId of [singleOpt1, multiOpt1]) {
    await sql`INSERT INTO app_metadata_values (app_id, metadata_option_id) VALUES (${deleteeAppId}, ${optId})`;
  }
  await sql`INSERT INTO app_view_events (app_id) VALUES (${deleteeAppId})`;
});

afterAll(async () => {
  await sql`DELETE FROM apps WHERE slug LIKE 't8-%'`;
  await sql`DELETE FROM categories WHERE slug LIKE 't8-cat-%'`;
  await sql`DELETE FROM metadata_types WHERE name IN (${TYPE_SINGLE}, ${TYPE_MULTI})`;
  await sql`DELETE FROM developers WHERE name_en = ${DEV_NAME}`;
  await sql.end();
});

describe("saveApp — validation", () => {
  it("missing EN name → validation with a nameEn field error", async () => {
    const res = await saveApp({ ...baseInput, nameEn: "" });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error).toBe("validation");
      expect(res.fieldErrors?.nameEn?.length ?? 0).toBeGreaterThan(0);
    }
  });

  it("no store link at all → validation, googlePlayLink carries the refine message", async () => {
    const res = await saveApp({ ...baseInput, googlePlayLink: "", appStoreLink: "", appGalleryLink: "" });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error).toBe("validation");
      expect(res.fieldErrors?.googlePlayLink).toEqual(["storeLink"]);
    }
  });

  it("a non-URL icon → validation with an applicationIcon field error", async () => {
    const res = await saveApp({ ...baseInput, applicationIcon: "not-a-url" });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error).toBe("validation");
      expect(res.fieldErrors?.applicationIcon?.length ?? 0).toBeGreaterThan(0);
    }
  });

  it("single-select metadata with two options → validation (length 1 enforced in the action)", async () => {
    const res = await saveApp({
      ...baseInput,
      metadata: { [String(singleTypeId)]: [singleOpt1, singleOpt2] },
    });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toBe("validation");
  });

  it("option ids from another type → validation", async () => {
    const res = await saveApp({ ...baseInput, metadata: { [String(singleTypeId)]: [multiOpt1] } });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toBe("validation");
  });

  it("unknown platform value → validation, no row written", async () => {
    const before = await sql`SELECT count(*)::int AS n FROM apps WHERE slug LIKE 't8-%'`;
    const res = await saveApp({ ...baseInput, platform: "windows" });
    expect(res.ok).toBe(false);
    const after = await sql`SELECT count(*)::int AS n FROM apps WHERE slug LIKE 't8-%'`;
    expect(after[0]!.n).toBe(before[0]!.n);
  });

  it("avgRating outside 0–5 → validation with an avgRating field error", async () => {
    const res = await saveApp({ ...baseInput, avgRating: 7 });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error).toBe("validation");
      expect(res.fieldErrors?.avgRating?.length ?? 0).toBeGreaterThan(0);
    }
  });

  it("negative counts → validation with reviewCount/viewCount field errors", async () => {
    const res = await saveApp({ ...baseInput, reviewCount: -1, viewCount: -5 });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.fieldErrors?.reviewCount?.length ?? 0).toBeGreaterThan(0);
      expect(res.fieldErrors?.viewCount?.length ?? 0).toBeGreaterThan(0);
    }
  });
});

describe("saveApp — create", () => {
  it("happy path: auto slug, column writes, category rows, metadata rows, screenshots, revalidate", async () => {
    const res = await saveApp({
      ...baseInput,
      categoryIds: [cat1Id, cat2Id],
      metadata: { [String(singleTypeId)]: [singleOpt1], [String(multiTypeId)]: [multiOpt1, multiOpt2] },
    });
    expect(res).toEqual({ ok: true, id: expect.any(Number) });
    const id = res.ok ? res.id : 0;

    const [row] = await sql`SELECT * FROM apps WHERE id = ${id}`;
    expect(row).not.toBeUndefined();
    expect(row!.slug).toBe("t8-created-app");
    expect(row!.name_en).toBe("T8 Created App");
    expect(row!.name_ar).toBe("ت:تطبيق منشأ");
    expect(row!.platform).toBe("ios");
    expect(row!.status).toBe("draft");
    expect(row!.featured).toBe(true);
    expect(row!.sort_order).toBe(3);
    expect(String(row!.avg_rating)).toBe("0.00");
    expect(row!.google_play_link).toBe("https://play.google.com/store/apps/details?id=t8");
    expect(row!.app_store_link).toBeNull();
    expect(row!.screenshots_en).toEqual(["https://cdn.test/s1en.png", "https://cdn.test/s2en.png"]);
    expect(row!.riwayah).toEqual([]); // legacy jsonb filter columns untouched by the admin form
    expect(Number(row!.developer_id)).toBe(devId);

    const cats = await sql`SELECT category_id FROM apps_categories WHERE app_id = ${id} ORDER BY category_id`;
    expect(cats.map((c) => Number(c.category_id))).toEqual([cat1Id, cat2Id].sort((a, b) => a - b));

    // single-select → exactly one row; multi-select → one row per option
    const single = await sql`
      SELECT amv.metadata_option_id FROM app_metadata_values amv
      JOIN metadata_options mo ON mo.id = amv.metadata_option_id
      WHERE amv.app_id = ${id} AND mo.metadata_type_id = ${singleTypeId}`;
    expect(single).toHaveLength(1);
    expect(Number(single[0]!.metadata_option_id)).toBe(singleOpt1);
    const multi = await sql`
      SELECT amv.metadata_option_id FROM app_metadata_values amv
      JOIN metadata_options mo ON mo.id = amv.metadata_option_id
      WHERE amv.app_id = ${id} AND mo.metadata_type_id = ${multiTypeId} ORDER BY 1`;
    expect(multi.map((m) => Number(m.metadata_option_id))).toEqual([multiOpt1, multiOpt2].sort((a, b) => a - b));

    const shots = await sql`
      SELECT language, image, sort_order FROM app_screenshots WHERE app_id = ${id}
      ORDER BY language, sort_order`;
    expect(shots.map((s) => [s.language, s.image, Number(s.sort_order)])).toEqual([
      ["ar", "https://cdn.test/s1ar.png", 0],
      ["ar", "https://cdn.test/s2ar.png", 1],
      ["ar", "https://cdn.test/s3ar.png", 2],
      ["en", "https://cdn.test/s1en.png", 0],
      ["en", "https://cdn.test/s2en.png", 1],
    ]);

    expect(vi.mocked(revalidateTag).mock.calls).toContainEqual(["apps", "max"]);
  });

  it("writes rating, reviews and views; rating rounded to the column scale", async () => {
    const res = await saveApp({
      ...baseInput,
      nameEn: "T8 Stats App",
      nameAr: "ت:إحصاءات",
      avgRating: 4.567,
      reviewCount: 120,
      viewCount: 9000,
    });
    expect(res).toEqual({ ok: true, id: expect.any(Number) });
    const id = res.ok ? res.id : 0;

    const [row] = await sql`SELECT avg_rating, review_count, view_count FROM apps WHERE id = ${id}`;
    expect(String(row!.avg_rating)).toBe("4.57");
    expect(Number(row!.review_count)).toBe(120);
    expect(Number(row!.view_count)).toBe(9000);
  });
});

describe("saveApp — names & slugs", () => {
  it("duplicate EN name with no id (create path) → mirrored Arabic message", async () => {
    const res = await saveApp({ ...baseInput, nameEn: "T8 Keep Name", nameAr: "ت:بقيت" });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error).toBe("validation");
      expect(res.fieldErrors?.app_name_en).toEqual(["اسم التطبيق مستخدم مسبقًا"]);
    }
  });

  it("duplicate AR name → app_name_ar field key", async () => {
    const res = await saveApp({ ...baseInput, nameEn: "T8 Fresh En Name", nameAr: "ت:مؤسّس" });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error).toBe("validation");
      expect(res.fieldErrors?.app_name_ar).toEqual(["اسم التطبيق مستخدم مسبقًا"]);
    }
  });

  it("edit leaving name_ar UNCHANGED while it repeats another app's name_ar (legacy row) → ok", async () => {
    const [row] = await sql`SELECT name_en, name_ar FROM apps WHERE id = ${repeatAId}`;
    expect(row!.name_ar).toBe("ألفا"); // shared with repeat-b, no unique index
    const res = await saveApp({
      ...baseInput,
      id: repeatAId,
      nameEn: String(row!.name_en),
      nameAr: String(row!.name_ar),
      sortOrder: 11,
    });
    expect(res).toEqual({ ok: true, id: repeatAId });
    const [after] = await sql`SELECT sort_order, name_ar, slug FROM apps WHERE id = ${repeatAId}`;
    expect(Number(after!.sort_order)).toBe(11); // the save went through
    expect(after!.name_ar).toBe("ألفا");
    expect(after!.slug).toBe("t8-repeat-a");
  });

  it("edit CHANGING name_ar onto a third app's name_ar → app_name_ar validation, no write", async () => {
    const [before] = await sql`SELECT sort_order, name_ar FROM apps WHERE id = ${repeatAId}`;
    const res = await saveApp({
      ...baseInput,
      id: repeatAId,
      nameEn: "T8 Repeat A",
      nameAr: "ت:مؤسّس", // established app's Arabic name
      sortOrder: 12,
    });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error).toBe("validation");
      expect(res.fieldErrors?.app_name_ar).toEqual(["اسم التطبيق مستخدم مسبقًا"]);
    }
    const [after] = await sql`SELECT sort_order, name_ar FROM apps WHERE id = ${repeatAId}`;
    expect(Number(after!.sort_order)).toBe(Number(before!.sort_order)); // failed save wrote nothing
    expect(after!.name_ar).toBe(before!.name_ar);
  });

  it("edit with the row's id (excludeId): unchanged names save fine, columns updated", async () => {
    const [row] = await sql`SELECT name_en, name_ar FROM apps WHERE id = ${keepAppId}`;
    const res = await saveApp({
      ...baseInput,
      id: keepAppId,
      nameEn: String(row!.name_en),
      nameAr: String(row!.name_ar),
      status: "published",
      featured: false,
    });
    expect(res).toEqual({ ok: true, id: keepAppId });

    const [after] = await sql`SELECT status, featured FROM apps WHERE id = ${keepAppId}`;
    expect(after!.status).toBe("published");
    expect(after!.featured).toBe(false);
  });

  it("edit rename into another app's name → validation, no write", async () => {
    const [before] = await sql`SELECT name_en FROM apps WHERE id = ${renameeAppId}`;
    const res = await saveApp({
      ...baseInput,
      id: renameeAppId,
      nameEn: "T8 Established App",
      nameAr: "ت:مؤسّس",
    });
    expect(res.ok).toBe(false);
    const [after] = await sql`SELECT name_en FROM apps WHERE id = ${renameeAppId}`;
    expect(after!.name_en).toBe(before!.name_en);
  });

  it("edit rename whose regenerated slug collides → '…-1' suffix", async () => {
    const res = await saveApp({
      ...baseInput,
      id: renameeAppId,
      nameEn: "T8 Collide Name", // slugify → t8-collide-name, taken by the Slug Keeper row
      nameAr: "ت:مُعاد",
    });
    expect(res).toEqual({ ok: true, id: renameeAppId });

    const [after] = await sql`SELECT name_en, slug FROM apps WHERE id = ${renameeAppId}`;
    expect(after!.name_en).toBe("T8 Collide Name");
    expect(after!.slug).toBe("t8-collide-name-1");
  });

  it("explicit slug override colliding with another app's slug → validation on slug", async () => {
    const res = await saveApp({
      ...baseInput,
      id: slugEditAppId,
      nameEn: "T8 Slug Override",
      nameAr: "ت:رابط",
      slug: "t8-collide-name",
    });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error).toBe("validation");
      expect(res.fieldErrors?.slug?.length ?? 0).toBeGreaterThan(0);
    }
    const [after] = await sql`SELECT slug FROM apps WHERE id = ${slugEditAppId}`;
    expect(after!.slug).toBe("t8-slug-edit");
  });

  it("explicit slug override (fresh value) → slug replaced", async () => {
    const res = await saveApp({
      ...baseInput,
      id: slugEditAppId,
      nameEn: "T8 Slug Override",
      nameAr: "ت:رابط",
      slug: "t8-custom-slug",
    });
    expect(res).toEqual({ ok: true, id: slugEditAppId });
    const [after] = await sql`SELECT slug FROM apps WHERE id = ${slugEditAppId}`;
    expect(after!.slug).toBe("t8-custom-slug");
  });

  it("edit replaces children: categories, metadata, screenshots (order honored)", async () => {
    const res = await saveApp({
      ...baseInput,
      id: slugEditAppId,
      nameEn: "T8 Slug Override",
      nameAr: "ت:رابط",
      googlePlayLink: "",
      appStoreLink: "https://apps.apple.com/app/t8",
      screenshotsEn: ["https://cdn.test/new1.png"],
      screenshotsAr: [],
      categoryIds: [cat2Id],
      metadata: { [String(singleTypeId)]: [singleOpt2], [String(multiTypeId)]: [] },
    });
    expect(res).toEqual({ ok: true, id: slugEditAppId });

    const cats = await sql`SELECT category_id FROM apps_categories WHERE app_id = ${slugEditAppId}`;
    expect(cats.map((c) => Number(c.category_id))).toEqual([cat2Id]);
    const shots = await sql`SELECT language FROM app_screenshots WHERE app_id = ${slugEditAppId}`;
    expect(shots).toHaveLength(1);
    expect(shots[0]!.language).toBe("en");
    const meta = await sql`
      SELECT mo.id AS option_id FROM app_metadata_values amv
      JOIN metadata_options mo ON mo.id = amv.metadata_option_id
      WHERE amv.app_id = ${slugEditAppId}`;
    expect(meta).toHaveLength(1);
    expect(Number(meta[0]!.option_id)).toBe(singleOpt2);
    const [row] = await sql`SELECT app_store_link, google_play_link FROM apps WHERE id = ${slugEditAppId}`;
    expect(row!.app_store_link).toBe("https://apps.apple.com/app/t8");
    expect(row!.google_play_link).toBeNull();
  });

  it("different app ids never leak: renamee keeps its own slug", async () => {
    const [row] = await sql`SELECT slug FROM apps WHERE id = ${renameeAppId}`;
    expect(row!.slug).toBe("t8-collide-name-1");
    const [other] = await sql`SELECT slug FROM apps WHERE id = ${collideAppId}`;
    expect(other!.slug).toBe("t8-collide-name");
  });
});

describe("deleteApp", () => {
  it("removes the app, cascades children, revalidates the apps tag", async () => {
    const res = await deleteApp(deleteeAppId);
    expect(res).toEqual({ ok: true });

    expect(await sql`SELECT 1 FROM apps WHERE id = ${deleteeAppId}`).toHaveLength(0);
    expect(await sql`SELECT 1 FROM apps_categories WHERE app_id = ${deleteeAppId}`).toHaveLength(0);
    expect(await sql`SELECT 1 FROM app_screenshots WHERE app_id = ${deleteeAppId}`).toHaveLength(0);
    expect(await sql`SELECT 1 FROM app_metadata_values WHERE app_id = ${deleteeAppId}`).toHaveLength(0);
    expect(await sql`SELECT 1 FROM app_view_events WHERE app_id = ${deleteeAppId}`).toHaveLength(0);

    expect(vi.mocked(revalidateTag).mock.calls).toContainEqual(["apps", "max"]);
  });

  it("unknown id → ok:false with a message", async () => {
    const res = await deleteApp(999999999);
    expect(res.ok).toBe(false);
    expect(res.message?.length ?? 0).toBeGreaterThan(0);
  });
});

describe("bulkSetApps", () => {
  it("updates only the targeted ids; invalid ids are ignored; affected is exact", async () => {
    const res = await bulkSetApps([bulkAId, bulkBId, 999999999, -3, 1.5], "published", true);
    expect(res).toEqual({ ok: true, affected: 2 });

    const [a] = await sql`SELECT status, featured FROM apps WHERE id = ${bulkAId}`;
    const [b] = await sql`SELECT status, featured FROM apps WHERE id = ${bulkBId}`;
    const [out] = await sql`SELECT status, featured FROM apps WHERE id = ${bulkOutId}`;
    expect(a!.status).toBe("published");
    expect(a!.featured).toBe(true);
    expect(b!.status).toBe("published");
    expect(b!.featured).toBe(true);
    expect(out!.status).toBe("draft");
    expect(out!.featured).toBe(false);
    expect(vi.mocked(revalidateTag).mock.calls).toContainEqual(["apps", "max"]);
  });

  it("featured-only bulk (status '') changes the flag without moving status", async () => {
    const res = await bulkSetApps([bulkAId], "", false);
    expect(res).toEqual({ ok: true, affected: 1 });
    const [a] = await sql`SELECT status, featured FROM apps WHERE id = ${bulkAId}`;
    expect(a!.status).toBe("published");
    expect(a!.featured).toBe(false);
  });

  it("no-op bulk (status '' and featured null) → ok, affected 0", async () => {
    const res = await bulkSetApps([bulkAId], "", null);
    expect(res).toEqual({ ok: true, affected: 0 });
  });

  it("unknown status → ok:false, nothing changed", async () => {
    const res = await bulkSetApps([bulkAId], "nope", null);
    expect(res.ok).toBe(false);
    const [a] = await sql`SELECT status FROM apps WHERE id = ${bulkAId}`;
    expect(a!.status).toBe("published");
  });
});

describe("admin edit readers", () => {
  it("getAppForEdit returns the row shape with children ids", async () => {
    const edit = (await getAppForEdit(establishedAppId)) as AppEditData;
    expect(edit.app.nameEn).toBe("T8 Established App");
    expect(edit.app.slug).toBe("t8-established");
    expect(edit.categoryIds).toEqual([]);
    expect(edit.screenshots).toEqual([]);

    const full = await saveApp({
      ...baseInput,
      nameEn: "T8 Edit Readers App",
      nameAr: "ت:قراء",
      categoryIds: [cat1Id, cat2Id],
      metadata: { [String(singleTypeId)]: [singleOpt1], [String(multiTypeId)]: [multiOpt2] },
    });
    expect(full.ok).toBe(true);
    const detail = (await getAppForEdit(full.ok ? full.id : 0)) as AppEditData;
    expect([...detail.categoryIds].sort((a, b) => a - b)).toEqual([cat1Id, cat2Id].sort((a, b) => a - b));
    const singleEntry = detail.metadataOptionIds.find((m) => m.typeId === singleTypeId);
    expect(singleEntry?.optionIds).toEqual([singleOpt1]);
    const multiEntry = detail.metadataOptionIds.find((m) => m.typeId === multiTypeId);
    expect(multiEntry?.optionIds).toEqual([multiOpt2]);
    expect(detail.screenshots.filter((s) => s.language === "ar")).toHaveLength(3);
    await deleteApp(full.ok ? full.id : 0);
  });

  it("getAppForEdit null for a missing id", async () => {
    expect(await getAppForEdit(999999999)).toBeNull();
  });

  it("full-table readers list fixtures; developer app count matches SQL", async () => {
    const devs = await getAllDevelopers();
    expect(devs.some((d) => d.id === devId)).toBe(true);

    const cats = await getAllCategories();
    expect(cats.some((c) => c.id === cat1Id)).toBe(true);

    const types = await getAllMetadataTypesWithActiveOptions();
    expect(types.some((t) => t.id === singleTypeId && !t.isMultiSelect)).toBe(true);
    const multiType = types.find((t) => t.id === multiTypeId);
    expect(multiType?.options.some((o) => o.id === multiOpt1)).toBe(true);

    const [{ n }] = await sql`SELECT count(*)::int AS n FROM apps WHERE developer_id = ${devId}`;
    expect(await getDeveloperAppCount(devId)).toBe(Number(n));
  });
});
