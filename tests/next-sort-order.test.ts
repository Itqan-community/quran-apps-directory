import { describe, it, expect, beforeAll, afterAll } from "vitest";
import postgres from "postgres";
import { getNextSortOrder } from "@/lib/repo/apps";

const sql = postgres(process.env.TEST_DATABASE_URL!, { max: 2 });
const P = "t-sorto-%";
const DEV = "T:SortO Dev";

beforeAll(async () => {
  await sql`DELETE FROM apps WHERE slug LIKE ${P}`;
  await sql`DELETE FROM developers WHERE name_en = ${DEV}`;
  // FK target, mirrors tests/review-actions.test.ts seeding style
  await sql`INSERT INTO developers (name_en, name_ar) VALUES (${DEV}, 'ت:ترتيب') RETURNING id`;
});
afterAll(async () => {
  await sql`DELETE FROM apps WHERE slug LIKE ${P}`;
  await sql`DELETE FROM developers WHERE name_en = ${DEV}`;
  await sql.end();
});

describe("getNextSortOrder", () => {
  it("returns current max + 1", async () => {
    const [{ id }] = await sql`SELECT id FROM developers WHERE name_en = ${DEV}`;
    const base = await getNextSortOrder(); // whatever unrelated fixtures occupy
    await sql`
      INSERT INTO apps (slug, name_en, name_ar, short_description_en, short_description_ar,
        description_en, description_ar, application_icon, main_image_en, main_image_ar,
        avg_rating, sort_order, platform, status, developer_id)
      VALUES ('t-sorto-a', 'T:SortO Big', 'ت:أ', 'd', 'د', 'desc', 'وصف', 'i.png', 'c.png', 'c.png',
        '3.00', ${base + 5}, 'android', 'published', ${id})`;
    expect(await getNextSortOrder()).toBe(base + 6);
  });
});
