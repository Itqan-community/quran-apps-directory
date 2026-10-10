import { describe, it, expect, beforeAll, afterAll } from "vitest";
import postgres from "postgres";
import { findDuplicateAppName } from "@/lib/repo/apps";
import { submitApp } from "@/lib/actions/submissions";

const url = process.env.TEST_DATABASE_URL!;
const sql = postgres(url);

let devId = 0;

beforeAll(async () => {
  const d = await sql`INSERT INTO developers (name_en, name_ar) VALUES ('T:Dupe Dev', 'مطور') RETURNING id`;
  devId = d[0].id;
  await sql`
    INSERT INTO apps
      (slug, name_en, name_ar, short_description_en, short_description_ar, description_en, description_ar,
       application_icon, main_image_en, main_image_ar, avg_rating, sort_order, platform, featured, status, developer_id)
    VALUES
      ('t-dupe-1', 'Alpha', 'ألفا', 'd1', 'د1', 'desc1', 'وصف1', 'i1.png', 'c1.png', 'c1.png', '4.50', 1, 'android', false, 'published', ${devId})
  `;
});

afterAll(async () => {
  await sql`DELETE FROM apps WHERE slug LIKE 't-dupe-%'`;
  await sql`DELETE FROM app_submissions WHERE app_name_en = 'Alpha'`;
  await sql`DELETE FROM app_submissions WHERE app_name_en = 'DevInfo App'`;
  await sql`DELETE FROM app_submissions WHERE app_name_en = 'Minimal App'`;
  await sql`DELETE FROM developers WHERE name_en = 'T:Dupe Dev'`;
  await sql.end();
});

describe("findDuplicateAppName", () => {
  it("flags a case-insensitive EN duplicate", async () => {
    expect(await findDuplicateAppName("ALPHA", "")).toBe("app_name_en");
  });

  it("flags an AR duplicate", async () => {
    expect(await findDuplicateAppName("Omega", "ألفا")).toBe("app_name_ar");
    expect(await findDuplicateAppName("", "ألفا")).toBe("app_name_ar");
  });

  it("returns null for a fresh name pair", async () => {
    expect(await findDuplicateAppName("Something Else", "شيء آخر")).toBeNull();
  });

  it("skips the excluded row (update flow)", async () => {
    const row = await sql`SELECT id FROM apps WHERE slug = 't-dupe-1'`;
    expect(await findDuplicateAppName("ALPHA", "", Number(row[0].id))).toBeNull();
  });
});

describe("submitApp duplicate gate", () => {
  it("rejects a submission whose EN name matches an existing app", async () => {
    const res = await submitApp({
      submitter_email: "dupe@test.dev",
      app_name_en: "ALPHA",
      app_name_ar: "",
      google_play_link: "https://play.google.com/store/apps/details?id=test",
      content_confirmation: true,
    });
    expect(res.ok).toBe(false);
    if (!res.ok && res.error === "validation") {
      expect(res.fieldErrors?.app_name_en).toContain("duplicateName");
    }
  });
});

describe("submitApp persists developer info", () => {
  it("stores submitted developer fields for the review flow", async () => {
    const res = await submitApp({
      submitter_email: "devinfo@test.dev",
      app_name_en: "DevInfo App",
      google_play_link: "https://play.google.com/store/apps/details?id=test",
      developer_name_en: "SomeDev",
      developer_name_ar: "مطور",
      developer_website: "https://SomeDev.io/About?Lang=EN",
      developer_email: "team@somedev.io",
      content_confirmation: true,
    });
    expect(res.ok).toBe(true);
    const [row] = await sql`
      SELECT developer_name_en, developer_name_ar, developer_website, developer_email
      FROM app_submissions WHERE app_name_en = 'DevInfo App'`;
    expect(row).toEqual({
      developer_name_en: "SomeDev",
      developer_name_ar: "مطور",
      developer_website: "https://SomeDev.io/About?Lang=EN",
      developer_email: "team@somedev.io",
    });
  });

  it("persists the column defaults when developer fields are omitted", async () => {
    const res = await submitApp({
      submitter_email: "minimal@test.dev",
      app_name_en: "Minimal App",
      google_play_link: "https://play.google.com/store/apps/details?id=test",
      content_confirmation: true,
    });
    expect(res.ok).toBe(true);
    const [row] = await sql`
      SELECT developer_name_en, developer_name_ar, developer_website, developer_email
      FROM app_submissions WHERE app_name_en = 'Minimal App'`;
    expect(row).toEqual({
      developer_name_en: "",
      developer_name_ar: "",
      developer_website: "",
      developer_email: "",
    });
  });
});
