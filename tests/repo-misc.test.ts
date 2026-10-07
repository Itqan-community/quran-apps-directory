import { describe, it, expect, beforeAll, afterAll } from "vitest";
import postgres from "postgres";
import { getCategories } from "@/lib/repo/categories";
import { getDeveloperApps } from "@/lib/repo/developers";
import { getActiveMetadataNames, getMetadataValues } from "@/lib/repo/metadata";

const sql = postgres(process.env.TEST_DATABASE_URL!);

beforeAll(async () => {
  await sql`
    INSERT INTO categories (name_en, name_ar, slug, sort_order, is_active)
    VALUES ('T:Active', 'مفعّل', 't-active', 1, true), ('T:Inactive', 'معطّل', 't-inactive', 2, false)
  `;
  await sql`INSERT INTO metadata_types (name, label_en, label_ar, is_active) VALUES ('t_type', 'T', 'ت', true)`;
  await sql`
    INSERT INTO metadata_options (metadata_type_id, value, label_en, label_ar, is_active)
    SELECT id, 't_val', 'V', 'قيمة', true FROM metadata_types WHERE name = 't_type'
  `;
  const dev = await sql`INSERT INTO developers (name_en, name_ar) VALUES ('T:Dev', 'مطور') RETURNING id`;
  await sql`
    INSERT INTO apps (slug, name_en, name_ar, short_description_en, short_description_ar,
      description_en, description_ar, application_icon, main_image_en, main_image_ar,
      status, developer_id, riwayah)
    VALUES ('t-app-9', 'Zeta', 'زيتا', 'd', 'د', 'desc', 'وصف', 'i.png', 'c.png', 'c.png', 'published', ${dev[0].id}, '["hafs"]'::jsonb)
  `;
  await sql`
    INSERT INTO app_metadata_values (app_id, metadata_option_id)
    SELECT a.id, mo.id FROM apps a, metadata_options mo, metadata_types mt
    WHERE a.slug = 't-app-9' AND mo.value = 't_val' AND mt.name = 't_type' AND mo.metadata_type_id = mt.id
  `;
});

afterAll(async () => {
  await sql`DELETE FROM apps WHERE slug = 't-app-9'`;
  await sql`DELETE FROM categories WHERE slug LIKE 't-%'`;
  await sql`DELETE FROM metadata_types WHERE name = 't_type'`;
  await sql`DELETE FROM developers WHERE name_en = 'T:Dev'`;
  await sql.end();
});

describe("getCategories", () => {
  it("returns only active categories with app counts", async () => {
    const cats = await getCategories();
    const active = cats.find((c) => c.slug === "t-active");
    expect(active).toBeDefined();
    expect(active!.appCount).toBe(0);
    expect(cats.find((c) => c.slug === "t-inactive")).toBeUndefined();
  });
});

describe("getDeveloperApps", () => {
  it("returns published apps of developer id with developer info", async () => {
    const dev = await sql`SELECT id FROM developers WHERE name_en = 'T:Dev'`;
    const res = await getDeveloperApps(dev[0].id as number);
    expect(res.count).toBe(1);
    expect(res.results[0].slug).toBe("t-app-9");
    expect(res.developer?.nameEn).toBe("T:Dev");
  });
});

describe("metadata", () => {
  it("lists active metadata names", async () => {
    const names = await getActiveMetadataNames();
    expect(names).toContain("t_type");
  });

  it("returns bilingual values with counts", async () => {
    const vals = await getMetadataValues();
    expect(vals.platforms).toBeDefined();
    const tType = vals["t_type"];
    expect(tType).toBeDefined();
    expect(tType[0].count).toBe(1);
  });
});
