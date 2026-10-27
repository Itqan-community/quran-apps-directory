import { describe, it, expect, beforeAll, afterAll } from "vitest";
import postgres from "postgres";
import { getApps } from "@/lib/repo/apps";

const url = process.env.TEST_DATABASE_URL!;
const sql = postgres(url);

let devId = 0;

beforeAll(async () => {
  const d = await sql`
    INSERT INTO developers (name_en, name_ar) VALUES ('T:FeatSort Dev', 'مطوّر الترتيب المميز') RETURNING id
  `;
  devId = d[0].id;
  // sort_order alone would put the non-featured app first; the featured flag must win.
  await sql`
    INSERT INTO apps
      (slug, name_en, name_ar, short_description_en, short_description_ar, description_en, description_ar,
       application_icon, main_image_en, main_image_ar, avg_rating, sort_order, platform, featured, status, developer_id,
       riwayah, mushaf_type, features)
    VALUES
      ('t-feat-a', 'AAA Non Featured', 'غير مميز', 'd', 'د', 'desc', 'وصف', 'i.png', 'c.png', 'c.png', '4.00', 0, 'android', false, 'published', ${devId}, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb),
      ('t-feat-b', 'ZZZ Featured', 'مميز', 'd', 'د', 'desc', 'وصف', 'i.png', 'c.png', 'c.png', '4.00', 10, 'android', true, 'published', ${devId}, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb)
  `;
});

afterAll(async () => {
  await sql`DELETE FROM apps WHERE slug LIKE 't-feat-%'`;
  await sql`DELETE FROM developers WHERE name_en = 'T:FeatSort Dev'`;
  await sql.end();
});

describe("getApps featured ordering", () => {
  it("puts featured apps first in the default ordering, regardless of sort_order", async () => {
    const res = await getApps({});
    const idxNon = res.results.findIndex((r) => r.slug === "t-feat-a");
    const idxFeat = res.results.findIndex((r) => r.slug === "t-feat-b");
    expect(idxNon).toBeGreaterThanOrEqual(0);
    expect(idxFeat).toBeGreaterThanOrEqual(0);
    expect(idxFeat).toBeLessThan(idxNon);
  });
});
