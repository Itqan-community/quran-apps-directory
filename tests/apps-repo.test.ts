import { describe, it, expect, beforeAll, afterAll } from "vitest";
import postgres from "postgres";
import { getApps, getApp } from "@/lib/repo/apps";

const url = process.env.TEST_DATABASE_URL!;
const sql = postgres(url);

let devA = 0, devB = 0, catMushaf = 0, catTafsir = 0;

async function seedFixtures() {
  const d = await sql`
    INSERT INTO developers (name_en, name_ar) VALUES ('T:Unit A', 'وحدة أ'), ('T:Unit B', 'وحدة ب')
    RETURNING id
  `;
  devA = d[0].id; devB = d[1].id;
  const c = await sql`
    INSERT INTO categories (name_en, name_ar, slug) VALUES ('T:Mushaf', 'مصحف', 't-mushaf'), ('T:Tafsir', 'تفسير', 't-tafsir')
    RETURNING id
  `;
  catMushaf = c[0].id; catTafsir = c[1].id;

  const apps = await sql`
    INSERT INTO apps
      (slug, name_en, name_ar, short_description_en, short_description_ar, description_en, description_ar,
       application_icon, main_image_en, main_image_ar, avg_rating, sort_order, platform, featured, status, developer_id,
       riwayah, mushaf_type, features)
    VALUES
      ('t-app-1', 'Alpha', 'ألفا', 'd1', 'د1', 'desc1', 'وصف1', 'i1.png', 'c1.png', 'c1.png', '4.50', 1, 'android', true, 'published', ${devA}, '["hafs","warsh"]'::jsonb, '["madani"]'::jsonb, '["offline","audio"]'::jsonb),
      ('t-app-2', 'Beta', 'بيتا', 'd2', 'د2', 'desc2', 'وصف2', 'i2.png', 'c2.png', 'c2.png', '3.00', 2, 'ios', false, 'published', ${devA}, '["hafs"]'::jsonb, '[]'::jsonb, '["audio"]'::jsonb),
      ('t-app-3', 'Gamma', 'غاما', 'd3', 'د3', 'desc3', 'وصف3', 'i3.png', 'c3.png', 'c3.png', '5.00', 3, 'cross_platform', true, 'draft', ${devB}, '["warsh"]'::jsonb, '[]'::jsonb, '[]'::jsonb)
    RETURNING id
  `;
  await sql`INSERT INTO apps_categories (app_id, category_id) VALUES (${apps[0].id}, ${catMushaf}), (${apps[1].id}, ${catTafsir})`;

  // Arabic normalization fixture: stored name uses ta-marbuta (ة) with no tashkeel.
  // SQL translate() cannot strip tashkeel from stored data, so diacritics must live
  // in the search terms, not here. Raw ILIKE for "الصلاه" misses (haa ≠ marbuta),
  // so only the translate()-normalized branch can match — a regression net for
  // the Arabic translate map (buggy map shifted ة→ا and would return 0 results).
  await sql`UPDATE apps SET name_ar = 'الصلاة' WHERE slug = 't-app-1'`;
}

beforeAll(async () => {
  await seedFixtures();
});

afterAll(async () => {
  await sql`DELETE FROM apps WHERE slug LIKE 't-app-%'`;
  await sql`DELETE FROM categories WHERE slug LIKE 't-%'`;
  await sql`DELETE FROM developers WHERE name_en LIKE 'T:Unit%'`;
  await sql.end();
});

describe("getApps", () => {
  it("returns published apps ordered by sort_order by default", async () => {
    const res = await getApps({});
    expect(res.count).toBe(2);
    expect(res.results[0].slug).toBe("t-app-1");
  });

  it("filters by category (OR within)", async () => {
    const res = await getApps({ categorySlugs: ["t-mushaf", "t-tafsir"] });
    expect(res.count).toBe(2);
  });

  it("AND between different filter fields", async () => {
    const res = await getApps({ platforms: ["ios"], featured: false });
    expect(res.count).toBe(1);
    expect(res.results[0].slug).toBe("t-app-2");
  });

  it("OR within one jsonb metadata field via GIN", async () => {
    const res = await getApps({ riwayah: ["warsh"] });
    expect(res.count).toBe(1); // only t-app-1 (t-app-3 is draft)
  });

  it("search matches name", async () => {
    const res = await getApps({ search: "alph" });
    expect(res.count).toBe(1);
    expect(res.results[0].slug).toBe("t-app-1");
  });

  it("search normalizes Arabic (ta-marbuta vs haa)", async () => {
    // Raw ILIKE cannot match (search has tashkeel + haa, stored has neither),
    // so this only passes through the translate()-normalized SQL branch.
    // With the old buggy map ('اااااهوي', 8 chars), translate() produced
    // 'الصلاا' and this search returned 0 results.
    const res = await getApps({ search: "الصَّلاه" });
    expect(res.count).toBe(1);
    expect(res.results[0].slug).toBe("t-app-1");
  });

  it("search normalizes Arabic (alef variants)", async () => {
    const res = await getApps({ search: "الصلاة" });
    expect(res.count).toBe(1);
  });

  it("respects ordering override", async () => {
    const res = await getApps({ ordering: "avg_rating,desc" });
    expect(res.results[0].slug).toBe("t-app-1");
  });

  it("paginates", async () => {
    const res = await getApps({ page: 2, pageSize: 1 });
    expect(res.count).toBe(2);
    expect(res.results.length).toBe(1);
  });

  it("includeDrafts shows drafts (admin path)", async () => {
    const res = await getApps({ status: "draft" });
    expect(res.count).toBe(1);
    expect(res.results[0].slug).toBe("t-app-3");
  });
});

describe("getApp", () => {
  it("resolves by slug with developer and categories", async () => {
    const app = await getApp("t-app-1");
    expect(app).not.toBeNull();
    expect(app!.developer.nameEn).toBe("T:Unit A");
    expect(app!.categories[0].slug).toBe("t-mushaf");
  });

  it("resolves by id", async () => {
    const bySlug = await getApp("t-app-1");
    const byId = await getApp(String(bySlug!.id));
    expect(byId!.slug).toBe("t-app-1");
  });

  it("does not return drafts without includeDrafts", async () => {
    expect(await getApp("t-app-3")).toBeNull();
    expect(await getApp("t-app-3", { includeDrafts: true })).not.toBeNull();
  });
});
