import { describe, it, expect, beforeAll, afterAll } from "vitest";
import postgres from "postgres";

import {
  getMetadataTypesNav,
  getMetadataTypesSummary,
  getMetadataTypeWithOptions,
  getMetadataOptionForEdit,
} from "@/lib/repo/admin";

const sql = postgres(process.env.TEST_DATABASE_URL!, { max: 4 });

const TYPE_A = "T11 Type Alpha";
const TYPE_B = "T11 Type Beta";

let typeAId = 0;
let typeBId = 0;
let optA1Id = 0;
let optA2Id = 0;

beforeAll(async () => {
  await sql`DELETE FROM apps WHERE slug LIKE 't11-app-%'`;
  await sql`DELETE FROM metadata_types WHERE name LIKE 'T11 %'`;
  await sql`DELETE FROM developers WHERE name_en LIKE 'T11 %'`;

  const types = await sql`
    INSERT INTO metadata_types (name, label_en, label_ar, description_en, description_ar, is_multi_select, sort_order, is_active, icon) VALUES
      (${TYPE_A}, 'T11 Label Alpha', 'ت11 ألفا', 'desc-a-en', 'وصف-أ', true, 1, true, '📖'),
      (${TYPE_B}, 'T11 Label Beta', 'ت11 بيتا', '', '', false, 2, false, NULL)
    RETURNING id, name`;
  for (const t of types) {
    if (t.name === TYPE_A) typeAId = Number(t.id);
    else typeBId = Number(t.id);
  }

  const opts = await sql`
    INSERT INTO metadata_options (metadata_type_id, value, label_en, label_ar, sort_order, is_active) VALUES
      (${typeAId}, 't11-opt-1', 'T11 Opt One', 'ت11 خيار١', 0, true),
      (${typeAId}, 't11-opt-2', 'T11 Opt Two', 'ت11 خيار٢', 1, false)
    RETURNING id, value`;
  for (const o of opts) {
    if (o.value === "t11-opt-1") optA1Id = Number(o.id);
    else optA2Id = Number(o.id);
  }

  // One app linked to optA1 → appCount 1 for it, 0 for optA2.
  const [dev] = await sql`INSERT INTO developers (name_en, name_ar) VALUES ('T11 Dev Co', 'ت11 مطوّر') RETURNING id`;
  await sql`
    INSERT INTO apps
      (slug, name_en, name_ar, short_description_en, short_description_ar, description_en, description_ar,
       application_icon, main_image_en, main_image_ar, avg_rating, sort_order, platform, status, featured, developer_id)
    VALUES ('t11-app-a', 'T11 Meta App', 'ت11 تطبيق', 'short', 'قصير', 'desc', 'وصف', 'i.png', 'm.png', 'm.png', '0.00', 0, 'android', 'draft', false, ${Number(dev.id)})`;
  const [app] = await sql`SELECT id FROM apps WHERE slug = 't11-app-a'`;
  await sql`INSERT INTO app_metadata_values (app_id, metadata_option_id) VALUES (${app.id}, ${optA1Id})`;
});

afterAll(async () => {
  await sql`DELETE FROM apps WHERE slug LIKE 't11-app-%'`;
  await sql`DELETE FROM metadata_types WHERE name LIKE 'T11 %'`;
  await sql`DELETE FROM developers WHERE name_en LIKE 'T11 %'`;
  await sql.end();
});

describe("getMetadataTypesNav", () => {
  it("includes fixture types ordered by sortOrder with nav shape", async () => {
    const rows = await getMetadataTypesNav();
    const ours = rows.filter((r) => r.name.startsWith("T11 "));
    expect(ours.map((r) => r.name)).toEqual([TYPE_A, TYPE_B]);
    expect(ours[0]).toMatchObject({ id: typeAId, labelAr: "ت11 ألفا" });
  });
});

describe("getMetadataTypesSummary", () => {
  it("carries full type columns plus optionsCount and appsTotal", async () => {
    const rows = await getMetadataTypesSummary();
    const a = rows.find((r) => r.id === typeAId)!;
    const b = rows.find((r) => r.id === typeBId)!;
    expect(a).toMatchObject({
      name: TYPE_A,
      labelEn: "T11 Label Alpha",
      descriptionEn: "desc-a-en",
      isMultiSelect: true,
      isActive: true,
      icon: "📖",
      optionsCount: 2,
      appsTotal: 1,
    });
    expect(b).toMatchObject({ name: TYPE_B, optionsCount: 0, appsTotal: 0 });
  });
});

describe("getMetadataTypeWithOptions", () => {
  it("returns the type with ordered options and per-option appCount", async () => {
    const t = await getMetadataTypeWithOptions(typeAId);
    expect(t).not.toBeNull();
    expect(t).toMatchObject({ id: typeAId, name: TYPE_A, labelAr: "ت11 ألفا" });
    expect(t!.options.map((o) => o.value)).toEqual(["t11-opt-1", "t11-opt-2"]);
    expect(t!.options[0]).toMatchObject({ id: optA1Id, appCount: 1, isActive: true });
    expect(t!.options[1]).toMatchObject({ id: optA2Id, appCount: 0, isActive: false });
  });

  it("null for an unknown id", async () => {
    await expect(getMetadataTypeWithOptions(2_147_483_647)).resolves.toBeNull();
  });
});

describe("getMetadataOptionForEdit", () => {
  it("returns the option row scoped with its type id", async () => {
    const o = await getMetadataOptionForEdit(optA1Id);
    expect(o).toMatchObject({ id: optA1Id, metadataTypeId: typeAId, value: "t11-opt-1" });
  });

  it("null for an unknown id", async () => {
    await expect(getMetadataOptionForEdit(2_147_483_647)).resolves.toBeNull();
  });
});
