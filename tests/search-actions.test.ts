import { describe, it, expect, beforeAll, afterAll } from "vitest";
import postgres from "postgres";
import { searchSuggestions } from "@/lib/actions/search";

const url = process.env.TEST_DATABASE_URL!;
const sql = postgres(url);

async function seedFixtures() {
  const d = await sql`
    INSERT INTO developers (name_en, name_ar) VALUES ('T:Suggest Dev', 'مطور التلميحات')
    RETURNING id
  `;
  await sql`
    INSERT INTO apps
      (slug, name_en, name_ar, short_description_en, short_description_ar, description_en, description_ar,
       application_icon, main_image_en, main_image_ar, avg_rating, sort_order, platform, featured, status, developer_id,
       riwayah, mushaf_type, features)
    VALUES
      ('t-sugg-1', 'Suggestible', 'قابل للاقتراح', 's1', 'ت1', 'desc1', 'وصف1', 'i1.png', 'c1.png', 'c1.png', '4.50', 1, 'android', false, 'published', ${d[0].id}, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb),
      ('t-sugg-2', 'Suggestible Two', 'مقترح اثنان', 's2', 'ت2', 'desc2', 'وصف2', 'i2.png', 'c2.png', 'c2.png', '3.00', 2, 'ios', false, 'draft', ${d[0].id}, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb)
  `;
}

beforeAll(async () => {
  await seedFixtures();
});

afterAll(async () => {
  await sql`DELETE FROM apps WHERE slug LIKE 't-sugg-%'`;
  await sql`DELETE FROM developers WHERE name_en = 'T:Suggest Dev'`;
  await sql.end();
});

describe("searchSuggestions", () => {
  it("guards queries shorter than 2 characters", async () => {
    expect(await searchSuggestions("")).toEqual([]);
    expect(await searchSuggestions("a")).toEqual([]);
    expect(await searchSuggestions("  ")).toEqual([]);
  });

  it("maps matching apps to the suggestion shape", async () => {
    const results = await searchSuggestions("suggest");
    expect(results.length).toBe(1); // only the published fixture; drafts excluded
    expect(Object.keys(results[0])).toEqual(["slug", "id", "nameEn", "nameAr", "icon"]);
    expect(results[0].slug).toBe("t-sugg-1");
    expect(typeof results[0].id).toBe("number");
    expect(results[0].nameEn).toBe("Suggestible");
    expect(results[0].nameAr).toBe("قابل للاقتراح");
    expect(results[0].icon).toBe("i1.png");
  });
});
