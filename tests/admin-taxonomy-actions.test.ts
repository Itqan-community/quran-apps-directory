import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import postgres from "postgres";

vi.mock("@/lib/auth", () => ({
  auth: async () => ({ user: { id: "1", email: "admin@local.dev" } }),
}));
vi.mock("next/cache", () => ({ revalidateTag: vi.fn(), revalidatePath: vi.fn() }));

import {
  saveCategory,
  deleteCategory,
  saveDeveloper,
  deleteDeveloper,
} from "@/lib/actions/admin-taxonomy";
import {
  getCategoryForEdit,
  getDeveloperForEdit,
  type CategoryEditRow,
  type DeveloperEditRow,
} from "@/lib/repo/admin";
import { revalidateTag } from "next/cache";

const sql = postgres(process.env.TEST_DATABASE_URL!, { max: 4 });

const CAT_EXISTING = "T9 Cat Existing"; // dup targets for the 23505 catch
const CAT_BRAVO = "T9 Cat Bravo";
const DEV_NAME = "T9 Dev Co";
const CAT_DELETE_MSG = "اسم الفئة مستخدم مسبقًا";

let catExistingId = 0; // slug t9-cat-existing, name_ar "ت:فئةوجود"
let catBravoId = 0; // slug t9-cat-bravo, name_ar "ت:فئةثاني"
let catCascadeId = 0; // slug t9-cat-cascade — delete target with an apps_categories row

let devId = 0; // T9 Dev Co (kept; category-cascade app + edit readers hang off it)
let devEditId = 0; // T9 Dev Edit Me (saveDeveloper edit path)
let devDelId = 0; // T9 Dev Delete Me — delete target with 2 fixture apps

const appSeed = (slug: string, nameEn: string, nameAr: string, developerId: number) =>
  sql`
    INSERT INTO apps
      (slug, name_en, name_ar, short_description_en, short_description_ar, description_en, description_ar,
       application_icon, main_image_en, main_image_ar, avg_rating, sort_order, platform, status, featured, developer_id)
    VALUES (${slug}, ${nameEn}, ${nameAr}, 'short', 'قصير', 'desc', 'وصف', 'i.png', 'm.png', 'm.png', '0.00', 0, 'android', 'draft', false, ${developerId})`;

const baseCategory = {
  nameEn: "T9 Cat Alpha",
  nameAr: "ت:فئة ألفا",
  slug: "t9-cat-alpha",
  descriptionEn: "alpha desc",
  descriptionAr: "وصف ألفا",
  icon: "",
  color: "#336699",
  sortOrder: 2,
  isActive: false,
};

const baseDeveloper = {
  nameEn: "T9 Dev Alpha",
  nameAr: "ت:مطوّر ألفا",
  website: "https://t9alpha.dev",
  email: "hello@t9alpha.dev",
  logoUrl: "https://cdn.test/t9-logo.png",
  descriptionEn: "dev desc",
  descriptionAr: "وصف المطوّر",
  socialLinks: [{ url: "https://x.com/t9alpha" }, { url: "https://t.me/t9alpha" }],
  isVerified: true,
};

beforeEach(() => {
  vi.clearAllMocks();
});

beforeAll(async () => {
  // Defensive pre-clean so a failed run mid-suite never breaks the next run.
  await sql`DELETE FROM apps WHERE slug LIKE 't9-app-%'`;
  await sql`DELETE FROM apps WHERE name_en LIKE 'T9 %'`;
  await sql`DELETE FROM categories WHERE name_en LIKE 'T9 %'`;
  await sql`DELETE FROM developers WHERE name_en LIKE 'T9 %'`;

  const cats = await sql`
    INSERT INTO categories (name_en, name_ar, slug, description_en, description_ar, sort_order, is_active) VALUES
      (${CAT_EXISTING}, 'ت:فئةوجود', 't9-cat-existing', 'seed', 'ت:وصف', 0, true),
      (${CAT_BRAVO}, 'ت:فئةثاني', 't9-cat-bravo', 'seed', 'ت:وصف', 1, true),
      ('T9 Cat Cascade', 'ت:فئةحذف', 't9-cat-cascade', '', '', 9, true)
    RETURNING id, name_en`;
  for (const c of cats) {
    if (c.name_en === CAT_EXISTING) catExistingId = Number(c.id);
    else if (c.name_en === CAT_BRAVO) catBravoId = Number(c.id);
    else catCascadeId = Number(c.id);
  }

  const [dev] = await sql`INSERT INTO developers (name_en, name_ar) VALUES (${DEV_NAME}, 'ت:مطوّر ثابت') RETURNING id`;
  devId = Number(dev.id);

  const devs = await sql`
    INSERT INTO developers (name_en, name_ar, is_verified) VALUES
      ('T9 Dev Edit Me', 'ت:مطوّر تعديل', false),
      ('T9 Dev Dup Source', 'ت:مطوّر موجود', false),
      ('T9 Dev Delete Me', 'ت:مطوّر حذف', false)
    RETURNING id, name_en`;
  for (const d of devs) {
    if (d.name_en === "T9 Dev Edit Me") devEditId = Number(d.id);
    else devDelId = Number(d.id);
  }

  // Delete-developer cascade: 2 seed apps under the delete target.
  await appSeed("t9-app-del-a", "T9 Delete App A", "ت:حذف أ", devDelId);
  await appSeed("t9-app-del-b", "T9 Delete App B", "ت:حذف ب", devDelId);
  // Delete-category cascade: a seed app under the kept dev, linked to the cascade category.
  await appSeed("t9-app-catcascade", "T9 Cat Cascade App", "ت:فئة حذف", devId);
  const [cascadeApp] = await sql`SELECT id FROM apps WHERE slug = 't9-app-catcascade'`;
  await sql`INSERT INTO apps_categories (app_id, category_id) VALUES (${cascadeApp.id}, ${catCascadeId})`;

  // sanity: the dev delete target really has 2 apps
  const [{ n }] = await sql`SELECT count(*)::int AS n FROM apps WHERE developer_id = ${devDelId}`;
  expect(Number(n)).toBe(2);
});

afterAll(async () => {
  await sql`DELETE FROM apps WHERE slug LIKE 't9-app-%'`;
  await sql`DELETE FROM apps WHERE name_en LIKE 'T9 %'`;
  await sql`DELETE FROM categories WHERE name_en LIKE 'T9 %'`;
  await sql`DELETE FROM developers WHERE name_en LIKE 'T9 %'`;
  await sql.end();
});

describe("saveCategory — validation", () => {
  it("empty EN name → validation with a nameEn field error, no row written", async () => {
    const res = await saveCategory({ ...baseCategory, nameEn: "  " });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error).toBe("validation");
      expect(res.fieldErrors?.nameEn?.length ?? 0).toBeGreaterThan(0);
    }
    expect(await sql`SELECT 1 FROM categories WHERE slug = 't9-cat-alpha'`).toHaveLength(0);
  });

  it("negative sortOrder → validation on sortOrder", async () => {
    const res = await saveCategory({ ...baseCategory, sortOrder: -1 });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error).toBe("validation");
      expect(res.fieldErrors?.sortOrder?.length ?? 0).toBeGreaterThan(0);
    }
  });

  it("non-integer sortOrder → validation", async () => {
    const res = await saveCategory({ ...baseCategory, sortOrder: 1.5 });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toBe("validation");
  });

  it("isActive non-boolean → validation", async () => {
    const res = await saveCategory({ ...baseCategory, isActive: "yes" as unknown as boolean });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toBe("validation");
  });
});

describe("saveCategory — create", () => {
  it("happy path: all columns written, empty icon → null, revalidates categories + apps", async () => {
    const res = await saveCategory(baseCategory);
    expect(res).toEqual({ ok: true });

    const [row] = await sql`SELECT * FROM categories WHERE slug = 't9-cat-alpha'`;
    expect(row).not.toBeUndefined();
    expect(row.name_en).toBe("T9 Cat Alpha");
    expect(row.name_ar).toBe("ت:فئة ألفا");
    expect(row.description_en).toBe("alpha desc");
    expect(row.description_ar).toBe("وصف ألفا");
    expect(row.icon).toBeNull();
    expect(row.color).toBe("#336699");
    expect(Number(row.sort_order)).toBe(2);
    expect(row.is_active).toBe(false);

    expect(vi.mocked(revalidateTag).mock.calls).toContainEqual(["categories", "max"]);
    expect(vi.mocked(revalidateTag).mock.calls).toContainEqual(["apps", "max"]);
  });

  it("no slug → computed from nameEn (slugify)", async () => {
    const res = await saveCategory({
      ...baseCategory,
      nameEn: "T9 Auto Slug Cat",
      nameAr: "ت:فئة تلقائية",
      slug: "",
    });
    expect(res).toEqual({ ok: true });

    const [row] = await sql`SELECT slug FROM categories WHERE name_en = 'T9 Auto Slug Cat'`;
    expect(row).not.toBeUndefined();
    expect(row.slug).toBe("t9-auto-slug-cat");
  });
});

describe("saveCategory — uniqueness (pg 23505 → validation, no 500)", () => {
  it("duplicate EN name on create → validation on nameEn", async () => {
    const res = await saveCategory({
      ...baseCategory,
      nameEn: CAT_EXISTING,
      nameAr: "ت:فئة جديدة",
      slug: "t9-cat-fresh",
    });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error).toBe("validation");
      expect(res.fieldErrors?.nameEn).toEqual([CAT_DELETE_MSG]);
    }
  });

  it("duplicate AR name on create → validation on nameAr", async () => {
    const res = await saveCategory({
      ...baseCategory,
      nameEn: "T9 Cat Fresh En",
      nameAr: "ت:فئةثاني", // catBravo's Arabic name
      slug: "t9-cat-fresh-en",
    });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error).toBe("validation");
      expect(res.fieldErrors?.nameAr).toEqual([CAT_DELETE_MSG]);
    }
  });

  it("duplicate slug on create → validation on slug", async () => {
    const res = await saveCategory({
      ...baseCategory,
      nameEn: "T9 Cat Fresh Slug",
      nameAr: "ت:فئة رابط",
      slug: "t9-cat-existing",
    });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error).toBe("validation");
      expect(res.fieldErrors?.slug).toEqual(["الرابط (slug) مستخدم مسبقًا"]);
    }
  });

  it("edit colliding EN name → 23505 caught as validation on nameEn, row untouched", async () => {
    const res = await saveCategory({
      ...baseCategory,
      id: catBravoId,
      nameEn: CAT_EXISTING, // another row's name
      nameAr: "ت:فئة ثاني", // bravo's own AR name (no self-conflict)
      slug: "t9-cat-bravo",
      descriptionAr: "حاول التعديل",
    });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error).toBe("validation");
      expect(res.fieldErrors?.nameEn).toEqual([CAT_DELETE_MSG]);
    }
    const [after] = await sql`SELECT description_ar FROM categories WHERE id = ${catBravoId}`;
    expect(after.description_ar).toBe("ت:وصف"); // failed save wrote nothing
  });

  it("edit unknown id → validation message, not a server error", async () => {
    const res = await saveCategory({ ...baseCategory, id: 999999999 });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error).toBe("validation");
      expect(res.message?.length ?? 0).toBeGreaterThan(0);
    }
  });
});

describe("saveCategory — edit", () => {
  it("edit with the row's id updates columns; identity fields unchanged save fine", async () => {
    const res = await saveCategory({
      ...baseCategory,
      id: catBravoId,
      nameEn: CAT_BRAVO,
      nameAr: "ت:فئةثاني",
      slug: "t9-cat-bravo",
      descriptionEn: "bravo updated",
      descriptionAr: "وصف معدّل",
      icon: "book",
      color: "",
      sortOrder: 0,
      isActive: false,
    });
    expect(res).toEqual({ ok: true });

    const [row] = await sql`
      SELECT description_en, description_ar, icon, color, sort_order, is_active
      FROM categories WHERE id = ${catBravoId}`;
    expect(row.description_en).toBe("bravo updated");
    expect(row.description_ar).toBe("وصف معدّل");
    expect(row.icon).toBe("book");
    expect(row.color).toBeNull();
    expect(Number(row.sort_order)).toBe(0);
    expect(row.is_active).toBe(false);
  });
});

describe("deleteCategory", () => {
  it("removes the row, cascades apps_categories, revalidates categories + apps", async () => {
    const linksBefore = await sql`SELECT 1 FROM apps_categories WHERE category_id = ${catCascadeId}`;
    expect(linksBefore).toHaveLength(1);

    const res = await deleteCategory(catCascadeId);
    expect(res).toEqual({ ok: true });

    expect(await sql`SELECT 1 FROM categories WHERE id = ${catCascadeId}`).toHaveLength(0);
    expect(await sql`SELECT 1 FROM apps_categories WHERE category_id = ${catCascadeId}`).toHaveLength(0);
    // the app itself must survive a category deletion
    expect(await sql`SELECT 1 FROM apps WHERE slug = 't9-app-catcascade'`).toHaveLength(1);

    expect(vi.mocked(revalidateTag).mock.calls).toContainEqual(["categories", "max"]);
    expect(vi.mocked(revalidateTag).mock.calls).toContainEqual(["apps", "max"]);
  });

  it("unknown id → ok:false", async () => {
    const res = await deleteCategory(999999999);
    expect(res).toEqual({ ok: false });
  });

  it("invalid id → ok:false", async () => {
    expect(await deleteCategory(0)).toEqual({ ok: false });
    expect(await deleteCategory(-3)).toEqual({ ok: false });
  });
});

describe("saveDeveloper", () => {
  it("happy path: jsonb rows normalized into the record, revalidates apps (not categories)", async () => {
    const res = await saveDeveloper(baseDeveloper);
    expect(res).toEqual({ ok: true });

    const [row] = await sql`SELECT * FROM developers WHERE name_en = 'T9 Dev Alpha'`;
    expect(row).not.toBeUndefined();
    expect(row.website).toBe("https://t9alpha.dev");
    expect(row.email).toBe("hello@t9alpha.dev");
    expect(row.logo_url).toBe("https://cdn.test/t9-logo.png");
    expect(row.description_en).toBe("dev desc");
    expect(row.description_ar).toBe("وصف المطوّر");
    expect(row.is_verified).toBe(true);
    // {url}[] rows → record keyed by the URL itself (url → url)
    expect(row.social_links).toEqual({
      "https://x.com/t9alpha": "https://x.com/t9alpha",
      "https://t.me/t9alpha": "https://t.me/t9alpha",
    });

    const calls = vi.mocked(revalidateTag).mock.calls;
    expect(calls).toContainEqual(["apps", "max"]);
    expect(calls).not.toContainEqual(["categories", "max"]);
  });

  it("duplicate EN name on create → validation on nameEn", async () => {
    const res = await saveDeveloper({ ...baseDeveloper, nameEn: "T9 Dev Dup Source", nameAr: "ت:آخر" });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error).toBe("validation");
      expect(res.fieldErrors?.nameEn).toEqual(["اسم المطور مستخدم مسبقًا"]);
    }
  });

  it("non-URL social row → validation on socialLinks, no row written", async () => {
    const res = await saveDeveloper({
      ...baseDeveloper,
      nameEn: "T9 Dev Bad Social",
      nameAr: "ت:رابط سيء",
      socialLinks: [{ url: "not-a-url" }],
    });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error).toBe("validation");
      expect(res.fieldErrors?.socialLinks?.length ?? 0).toBeGreaterThan(0);
    }
    expect(await sql`SELECT 1 FROM developers WHERE name_en = 'T9 Dev Bad Social'`).toHaveLength(0);
  });

  it("blank rows are dropped, URLs are trimmed", async () => {
    const res = await saveDeveloper({
      ...baseDeveloper,
      nameEn: "T9 Dev Social Trim",
      nameAr: "ت:اقتطاع",
      website: "",
      email: "",
      logoUrl: "",
      socialLinks: [{ url: "  " }, { url: " https://bsky.app/profile/t9 " }],
      isVerified: false,
    });
    expect(res).toEqual({ ok: true });

    const [row] = await sql`SELECT social_links, website, email FROM developers WHERE name_en = 'T9 Dev Social Trim'`;
    expect(row.website).toBeNull();
    expect(row.email).toBeNull();
    expect(row.social_links).toEqual({ "https://bsky.app/profile/t9": "https://bsky.app/profile/t9" });
  });

  it("edit with the row's id updates columns and replaces social rows", async () => {
    const res = await saveDeveloper({
      ...baseDeveloper,
      id: devEditId,
      nameEn: "T9 Dev Edit Me",
      nameAr: "ت:مطوّر تعديل",
      website: "https://edited.t9.dev",
      socialLinks: [{ url: "https://youtube.com/@t9" }],
      isVerified: true,
    });
    expect(res).toEqual({ ok: true });

    const [row] = await sql`
      SELECT website, email, is_verified, social_links FROM developers WHERE id = ${devEditId}`;
    expect(row.website).toBe("https://edited.t9.dev");
    expect(row.is_verified).toBe(true);
    expect(row.social_links).toEqual({ "https://youtube.com/@t9": "https://youtube.com/@t9" });
    expect(vi.mocked(revalidateTag).mock.calls).toContainEqual(["apps", "max"]);
  });

  it("edit unknown id → validation message, not a server error", async () => {
    const res = await saveDeveloper({ ...baseDeveloper, id: 999999999 });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error).toBe("validation");
      expect(res.message?.length ?? 0).toBeGreaterThan(0);
    }
  });
});

describe("deleteDeveloper", () => {
  it("cascade deletes the developer AND their 2 fixture apps, revalidates apps", async () => {
    const res = await deleteDeveloper(devDelId);
    expect(res).toEqual({ ok: true });

    expect(await sql`SELECT 1 FROM developers WHERE id = ${devDelId}`).toHaveLength(0);
    expect(await sql`SELECT 1 FROM apps WHERE developer_id = ${devDelId}`).toHaveLength(0);
    expect(await sql`SELECT 1 FROM apps WHERE slug LIKE 't9-app-del-%'`).toHaveLength(0);

    expect(vi.mocked(revalidateTag).mock.calls).toContainEqual(["apps", "max"]);
  });

  it("unknown id → ok:false with a message", async () => {
    const res = await deleteDeveloper(999999999);
    expect(res.ok).toBe(false);
    expect(res.message?.length ?? 0).toBeGreaterThan(0);
  });
});

describe("taxonomy edit readers", () => {
  it("getCategoryForEdit returns the full row; null for a missing id", async () => {
    const row = (await getCategoryForEdit(catExistingId)) as CategoryEditRow;
    expect(typeof row.id === "number" ? row.id : Number(row.id)).toBe(catExistingId);
    expect(row.nameEn).toBe(CAT_EXISTING);
    expect(row.slug).toBe("t9-cat-existing");
    expect(row.isActive).toBe(true);
    expect("sortOrder" in row).toBe(true);
    expect("color" in row).toBe(true);

    expect(await getCategoryForEdit(999999999)).toBeNull();
  });

  it("getDeveloperForEdit returns the full row incl. socialLinks typed as record; null when missing", async () => {
    const row = (await getDeveloperForEdit(devId)) as DeveloperEditRow;
    expect(row.nameEn).toBe(DEV_NAME);
    expect(row.socialLinks).toEqual({});
    expect("isVerified" in row).toBe(true);

    expect(await getDeveloperForEdit(999999999)).toBeNull();
  });
});
