import { describe, it, expect, beforeAll, afterAll } from "vitest";
import postgres from "postgres";
import { getApps } from "@/lib/repo/apps";

const url = process.env.TEST_DATABASE_URL!;
const sql = postgres(url);

let devId = 0;

beforeAll(async () => {
  const d = await sql`
    INSERT INTO developers (name_en, name_ar) VALUES ('T:ArSort Dev', 'مطوّر الترتيب العربي') RETURNING id
  `;
  devId = d[0].id;
  // First letters are hamza-alef variants where the two orderings disagree:
  // codepoint order (أ U+0623 < إ U+0625) puts أنا أتلو first, while the
  // Arabic letter collation folds the variants and compares the next letter
  // (ت < ن), putting إتقان الفاتحة first.
  await sql`
    INSERT INTO apps
      (slug, name_en, name_ar, short_description_en, short_description_ar, description_en, description_ar,
       application_icon, main_image_en, main_image_ar, avg_rating, sort_order, platform, featured, status, developer_id,
       riwayah, mushaf_type, features)
    VALUES
      ('t-ar-a', 'Zeta App', 'أنا أتلو', 'd', 'د', 'desc', 'وصف', 'i.png', 'c.png', 'c.png', '4.00', 1, 'android', false, 'published', ${devId}, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb),
      ('t-ar-b', 'Alpha App', 'إتقان الفاتحة', 'd', 'د', 'desc', 'وصف', 'i.png', 'c.png', 'c.png', '4.00', 2, 'android', false, 'published', ${devId}, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb)
  `;
});

afterAll(async () => {
  await sql`DELETE FROM apps WHERE slug LIKE 't-ar-%'`;
  await sql`DELETE FROM developers WHERE name_en = 'T:ArSort Dev'`;
  await sql.end();
});

describe("getApps Arabic ordering", () => {
  it("orders name_ar by Arabic letter order, not codepoint order", async () => {
    const res = await getApps({ ordering: "name_ar" });
    const idxAna = res.results.findIndex((r) => r.slug === "t-ar-a");
    const idxItqan = res.results.findIndex((r) => r.slug === "t-ar-b");
    expect(idxAna).toBeGreaterThanOrEqual(0);
    expect(idxItqan).toBeGreaterThanOrEqual(0);
    // Arabic letter order: إتقان الفاتحة before أنا أتلو (codepoint order would be the reverse)
    expect(idxItqan).toBeLessThan(idxAna);
  });
});
