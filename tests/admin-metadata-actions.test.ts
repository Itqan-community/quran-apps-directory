import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import postgres from "postgres";

vi.mock("@/lib/auth", () => ({
  auth: async () => ({ user: { id: "1", email: "admin@local.dev" } }),
}));
vi.mock("next/cache", () => ({ revalidateTag: vi.fn(), revalidatePath: vi.fn() }));

import {
  saveMetadataType,
  deleteMetadataType,
  saveMetadataOption,
  deleteMetadataOption,
} from "@/lib/actions/admin-metadata";
import { getAllMetadataTypesWithAllOptions } from "@/lib/repo/admin";
import { revalidateTag } from "next/cache";

const sql = postgres(process.env.TEST_DATABASE_URL!, { max: 4 });

const TYPE_EXISTING = "T10 Type Existing"; // dup target for the 23505 name catch (option t10-value-a hangs off it)
const TYPE_BRAVO = "T10 Type Bravo"; // edit target
const TYPE_CASCADE = "T10 Type Cascade"; // delete target: 2 options, one used by a fixture app
const VALUE_DUP = "t10-value-a"; // the only value under TYPE_EXISTING
const OPT_VALUE_MSG = "قيمة الخيار مستخدمة مسبقًا في هذا النوع";
const MET_NAME_MSG = "اسم نوع البيانات مستخدم مسبقًا";

let typeExistingId = 0; // sort 1 — active
let typeBravoId = 0; // sort 2 — active (edit target)
let typeCascadeId = 0; // sort 3 — active (delete target)
let typeInactiveId = 0; // sort 9 — inactive (reader test)

let optExistingId = 0; // t10-value-a under typeExisting
let optEditId = 0; // t10-opt-edit under typeBravo
let optCascadeUsedId = 0; // under typeCascade — linked to 1 fixture app
let optCascadeSpareId = 0; // under typeCascade — unused
let optInactiveId = 0; // inactive option under typeInactive (reader test)

const appSeed = (slug: string, nameEn: string, nameAr: string, developerId: number) =>
  sql`
    INSERT INTO apps
      (slug, name_en, name_ar, short_description_en, short_description_ar, description_en, description_ar,
       application_icon, main_image_en, main_image_ar, avg_rating, sort_order, platform, status, featured, developer_id)
    VALUES (${slug}, ${nameEn}, ${nameAr}, 'short', 'قصير', 'desc', 'وصف', 'i.png', 'm.png', 'm.png', '0.00', 0, 'android', 'draft', false, ${developerId})`;

const baseType = {
  name: "T10 Type Alpha",
  labelEn: "T10 Label Alpha",
  labelAr: "ت:تسمية ألفا",
  descriptionEn: "alpha desc",
  descriptionAr: "وصف ألفا",
  isMultiSelect: true,
  sortOrder: 2,
  isActive: false,
  icon: "",
};

const baseOption = {
  value: "t10-opt-alpha",
  labelEn: "T10 Opt Alpha",
  labelAr: "ت:خيار ألفا",
  descriptionEn: "opt desc",
  descriptionAr: "وصف الخيار",
  sortOrder: 1,
  isActive: true,
  icon: "",
  color: "#336699",
};

beforeEach(() => {
  vi.clearAllMocks();
});

beforeAll(async () => {
  // Defensive pre-clean so a failed run mid-suite never breaks the next run.
  await sql`DELETE FROM apps WHERE slug LIKE 't10-app-%'`;
  await sql`DELETE FROM apps WHERE name_en LIKE 'T10 %'`;
  await sql`DELETE FROM metadata_types WHERE name LIKE 'T10 %'`; // cascades options + app_metadata_values
  await sql`DELETE FROM developers WHERE name_en LIKE 'T10 %'`;

  const types = await sql`
    INSERT INTO metadata_types (name, label_en, label_ar, description_en, description_ar, is_multi_select, sort_order, is_active) VALUES
      (${TYPE_EXISTING}, 'T10 Label Existing', 'ت:تسميةوجود', '', '', true, 1, true),
      (${TYPE_BRAVO}, 'T10 Label Bravo', 'ت:تسميةثاني', '', '', true, 2, true),
      (${TYPE_CASCADE}, 'T10 Label Cascade', 'ت:تسميةحذف', '', '', true, 3, true),
      ('T10 Type Inactive', 'T10 Label Inactive', 'ت:تسميةموقوف', '', '', false, 9, false)
    RETURNING id, name`;
  for (const t of types) {
    if (t.name === TYPE_EXISTING) typeExistingId = Number(t.id);
    else if (t.name === TYPE_BRAVO) typeBravoId = Number(t.id);
    else if (t.name === TYPE_CASCADE) typeCascadeId = Number(t.id);
    else typeInactiveId = Number(t.id);
  }

  const opts = await sql`
    INSERT INTO metadata_options (metadata_type_id, value, label_en, label_ar, sort_order, is_active) VALUES
      (${typeExistingId}, ${VALUE_DUP}, 'T10 Opt Existing', 'ت:خياروجود', 0, true),
      (${typeBravoId}, 't10-opt-edit', 'T10 Opt Edit', 'ت:خيارتعديل', 0, true),
      (${typeCascadeId}, 't10-opt-used', 'T10 Opt Used', 'ت:خيارمستخدم', 0, true),
      (${typeCascadeId}, 't10-opt-spare', 'T10 Opt Spare', 'ت:خياراحتياطي', 1, true),
      (${typeInactiveId}, 't10-opt-inactive', 'T10 Opt Inactive', 'ت:خياردون', 0, false)
    RETURNING id, value`;
  for (const o of opts) {
    if (o.value === VALUE_DUP) optExistingId = Number(o.id);
    else if (o.value === "t10-opt-edit") optEditId = Number(o.id);
    else if (o.value === "t10-opt-used") optCascadeUsedId = Number(o.id);
    else if (o.value === "t10-opt-spare") optCascadeSpareId = Number(o.id);
    else optInactiveId = Number(o.id);
  }

  // App-usage fixture: one app linked to optCascadeUsedId via app_metadata_values.
  const [dev] = await sql`INSERT INTO developers (name_en, name_ar) VALUES ('T10 Dev Co', 'ت:مطوّر وصفية') RETURNING id`;
  await appSeed("t10-app-a", "T10 Meta App", "ت:تطبيق وصفية", Number(dev.id));
  const [app] = await sql`SELECT id FROM apps WHERE slug = 't10-app-a'`;
  await sql`INSERT INTO app_metadata_values (app_id, metadata_option_id) VALUES (${app.id}, ${optCascadeUsedId})`;

  // sanity: the cascade type really has a linked value
  const [{ n }] = await sql`
    SELECT count(*)::int AS n FROM app_metadata_values WHERE metadata_option_id = ${optCascadeUsedId}`;
  expect(Number(n)).toBe(1);
});

afterAll(async () => {
  await sql`DELETE FROM apps WHERE slug LIKE 't10-app-%'`;
  await sql`DELETE FROM apps WHERE name_en LIKE 'T10 %'`;
  await sql`DELETE FROM metadata_types WHERE name LIKE 'T10 %'`; // cascades options + app_metadata_values
  await sql`DELETE FROM developers WHERE name_en LIKE 'T10 %'`;
  await sql.end();
});

describe("saveMetadataType — validation", () => {
  it("empty name → validation with a name field error, no row written", async () => {
    const res = await saveMetadataType({ ...baseType, name: "  " });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error).toBe("validation");
      expect(res.fieldErrors?.name?.length ?? 0).toBeGreaterThan(0);
    }
    expect(await sql`SELECT 1 FROM metadata_types WHERE name = 'T10 Type Alpha'`).toHaveLength(0);
  });

  it("empty labelAr → validation on labelAr", async () => {
    const res = await saveMetadataType({ ...baseType, labelAr: " " });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error).toBe("validation");
      expect(res.fieldErrors?.labelAr?.length ?? 0).toBeGreaterThan(0);
    }
  });

  it("negative sortOrder → validation on sortOrder", async () => {
    const res = await saveMetadataType({ ...baseType, sortOrder: -1 });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error).toBe("validation");
      expect(res.fieldErrors?.sortOrder?.length ?? 0).toBeGreaterThan(0);
    }
  });

  it("isMultiSelect non-boolean → validation", async () => {
    const res = await saveMetadataType({ ...baseType, isMultiSelect: "yes" as unknown as boolean });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toBe("validation");
  });
});

describe("saveMetadataType — create", () => {
  it("happy path: all columns written, empty icon → null, revalidates metadata", async () => {
    const res = await saveMetadataType(baseType);
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.id).toEqual(expect.any(Number));

    const [row] = await sql`SELECT * FROM metadata_types WHERE name = 'T10 Type Alpha'`;
    expect(row).not.toBeUndefined();
    expect(row.label_en).toBe("T10 Label Alpha");
    expect(row.label_ar).toBe("ت:تسمية ألفا");
    expect(row.description_en).toBe("alpha desc");
    expect(row.description_ar).toBe("وصف ألفا");
    expect(row.is_multi_select).toBe(true);
    expect(Number(row.sort_order)).toBe(2);
    expect(row.is_active).toBe(false);
    expect(row.icon).toBeNull();

    expect(vi.mocked(revalidateTag).mock.calls).toContainEqual(["metadata", "max"]);
  });

  it("minimal input: isMultiSelect/sortOrder/isActive default, icon → null", async () => {
    const res = await saveMetadataType({
      name: "T10 Type Minimal",
      labelEn: "T10 Label Minimal",
      labelAr: "ت:تسمية أدنى",
      descriptionEn: "",
      descriptionAr: "",
    });
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.id).toEqual(expect.any(Number));

    const [row] = await sql`SELECT * FROM metadata_types WHERE name = 'T10 Type Minimal'`;
    expect(row).not.toBeUndefined();
    expect(row.is_multi_select).toBe(true);
    expect(Number(row.sort_order)).toBe(0);
    expect(row.is_active).toBe(true);
    expect(row.icon).toBeNull();
  });

  it("icon string written", async () => {
    const res = await saveMetadataType({ ...baseType, name: "T10 Type Icon", icon: "book" });
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.id).toEqual(expect.any(Number));
    const [row] = await sql`SELECT icon FROM metadata_types WHERE name = 'T10 Type Icon'`;
    expect(row.icon).toBe("book");
  });
});

describe("saveMetadataType — uniqueness (pg 23505 → validation)", () => {
  it("duplicate name on create → validation on name", async () => {
    const res = await saveMetadataType({
      ...baseType,
      name: TYPE_EXISTING,
      labelAr: "ت:تسمية جديدة",
    });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error).toBe("validation");
      expect(res.fieldErrors?.name).toEqual([MET_NAME_MSG]);
    }
  });

  it("edit keeping the row's own name → ok (uniqueness excludes self)", async () => {
    const res = await saveMetadataType({
      ...baseType,
      id: typeBravoId,
      name: TYPE_BRAVO,
      labelAr: "ت:تسميةثاني",
      descriptionAr: "نفس الاسم لا مشكلة",
    });
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.id).toBe(typeBravoId);
    const [row] = await sql`SELECT description_ar FROM metadata_types WHERE id = ${typeBravoId}`;
    expect(row.description_ar).toBe("نفس الاسم لا مشكلة");
  });

  it("edit colliding with another row's name → validation on name, row untouched", async () => {
    const [before] = await sql`SELECT description_en FROM metadata_types WHERE id = ${typeBravoId}`;
    const res = await saveMetadataType({
      ...baseType,
      id: typeBravoId,
      name: TYPE_EXISTING, // another row's name
      labelAr: "ت:تسميةثاني",
      descriptionEn: "حاول التعديل",
    });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error).toBe("validation");
      expect(res.fieldErrors?.name).toEqual([MET_NAME_MSG]);
    }
    const [after] = await sql`SELECT description_en FROM metadata_types WHERE id = ${typeBravoId}`;
    expect(after.description_en).toBe(before.description_en); // failed save wrote nothing
  });

  it("edit unknown id → validation message, not a server error", async () => {
    const res = await saveMetadataType({ ...baseType, id: 999999999 });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error).toBe("validation");
      expect(res.message?.length ?? 0).toBeGreaterThan(0);
    }
  });
});

describe("saveMetadataType — edit", () => {
  it("edit with the row's id updates columns", async () => {
    const res = await saveMetadataType({
      ...baseType,
      id: typeBravoId,
      name: TYPE_BRAVO,
      labelEn: "T10 Label Bravo",
      labelAr: "ت:تسميةثاني",
      descriptionEn: "bravo updated",
      descriptionAr: "وصف معدّل",
      isMultiSelect: false,
      sortOrder: 7,
      isActive: true,
      icon: "layers",
    });
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.id).toBe(typeBravoId);

    const [row] = await sql`
      SELECT description_en, description_ar, is_multi_select, sort_order, is_active, icon
      FROM metadata_types WHERE id = ${typeBravoId}`;
    expect(row.description_en).toBe("bravo updated");
    expect(row.description_ar).toBe("وصف معدّل");
    expect(row.is_multi_select).toBe(false);
    expect(Number(row.sort_order)).toBe(7);
    expect(row.is_active).toBe(true);
    expect(row.icon).toBe("layers");
  });
});

describe("deleteMetadataType", () => {
  it("removes the type, cascades options + app_metadata_values, app survives, revalidates metadata", async () => {
    const res = await deleteMetadataType(typeCascadeId);
    expect(res).toEqual({ ok: true });

    expect(await sql`SELECT 1 FROM metadata_types WHERE id = ${typeCascadeId}`).toHaveLength(0);
    expect(await sql`SELECT 1 FROM metadata_options WHERE metadata_type_id = ${typeCascadeId}`).toHaveLength(0);
    expect(await sql`SELECT 1 FROM metadata_options WHERE id = ${optCascadeSpareId}`).toHaveLength(0);
    // the per-app values rows cascade with their option
    expect(await sql`SELECT 1 FROM app_metadata_values WHERE metadata_option_id = ${optCascadeUsedId}`).toHaveLength(0);
    // the app itself must survive a metadata type deletion
    expect(await sql`SELECT 1 FROM apps WHERE slug = 't10-app-a'`).toHaveLength(1);

    expect(vi.mocked(revalidateTag).mock.calls).toContainEqual(["metadata", "max"]);
  });

  it("unknown id → ok:false with a message", async () => {
    const res = await deleteMetadataType(999999999);
    expect(res.ok).toBe(false);
    expect(res.message?.length ?? 0).toBeGreaterThan(0);
  });

  it("invalid id → ok:false", async () => {
    expect(await deleteMetadataType(0)).toEqual({ ok: false });
    expect(await deleteMetadataType(-3)).toEqual({ ok: false });
  });
});

describe("saveMetadataOption — validation", () => {
  it("empty value → validation on value, no row written", async () => {
    const res = await saveMetadataOption(typeExistingId, { ...baseOption, value: " " });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error).toBe("validation");
      expect(res.fieldErrors?.value?.length ?? 0).toBeGreaterThan(0);
    }
    expect(await sql`SELECT 1 FROM metadata_options WHERE value = 't10-opt-alpha'`).toHaveLength(0);
  });

  it("empty labelEn → validation on labelEn", async () => {
    const res = await saveMetadataOption(typeExistingId, { ...baseOption, labelEn: "" });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error).toBe("validation");
      expect(res.fieldErrors?.labelEn?.length ?? 0).toBeGreaterThan(0);
    }
  });

  it("negative sortOrder → validation", async () => {
    const res = await saveMetadataOption(typeExistingId, { ...baseOption, sortOrder: -2 });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error).toBe("validation");
      expect(res.fieldErrors?.sortOrder?.length ?? 0).toBeGreaterThan(0);
    }
  });
});

describe("saveMetadataOption — typeId checks", () => {
  it("unknown typeId → validation message, no row written", async () => {
    const res = await saveMetadataOption(999999999, baseOption);
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error).toBe("validation");
      expect(res.message?.length ?? 0).toBeGreaterThan(0);
    }
    expect(await sql`SELECT 1 FROM metadata_options WHERE value = 't10-opt-alpha'`).toHaveLength(0);
  });

  it("invalid typeId (0 / -1 / non-integer) → validation, not a server error", async () => {
    for (const bad of [0, -1, 1.5]) {
      const res = await saveMetadataOption(bad, baseOption);
      expect(res.ok).toBe(false);
      if (!res.ok) expect(res.error).toBe("validation");
    }
  });
});

describe("saveMetadataOption — uniqueness (pg 23505 → validation)", () => {
  it("duplicate value within the same type → validation on value", async () => {
    const res = await saveMetadataOption(typeExistingId, { ...baseOption, value: VALUE_DUP });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error).toBe("validation");
      expect(res.fieldErrors?.value).toEqual([OPT_VALUE_MSG]);
    }
  });

  it("same value under a different type → ok (uniqueness is per type)", async () => {
    const res = await saveMetadataOption(typeBravoId, { ...baseOption, value: VALUE_DUP });
    expect(res).toEqual({ ok: true });
    const [row] = await sql`
      SELECT metadata_type_id FROM metadata_options WHERE metadata_type_id = ${typeBravoId} AND value = ${VALUE_DUP}`;
    expect(Number(row.metadata_type_id)).toBe(typeBravoId);
  });

  it("edit keeping the option's own value → ok", async () => {
    const res = await saveMetadataOption(typeBravoId, {
      ...baseOption,
      id: optEditId,
      value: "t10-opt-edit",
      labelAr: "ت:خيارتعديل",
      descriptionAr: "نفس القيمة لا مشكلة",
    });
    expect(res).toEqual({ ok: true });
    const [row] = await sql`SELECT description_ar FROM metadata_options WHERE id = ${optEditId}`;
    expect(row.description_ar).toBe("نفس القيمة لا مشكلة");
  });

  it("edit colliding with a sibling value → validation on value, row untouched", async () => {
    const [before] = await sql`SELECT description_en FROM metadata_options WHERE id = ${optEditId}`;
    const res = await saveMetadataOption(typeBravoId, {
      ...baseOption,
      id: optEditId,
      value: VALUE_DUP, // taken by another option under typeBravo (created 2 tests above)
      labelAr: "ت:خيارتعديل",
      descriptionEn: "حاول التعديل",
    });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error).toBe("validation");
      expect(res.fieldErrors?.value).toEqual([OPT_VALUE_MSG]);
    }
    const [after] = await sql`SELECT description_en FROM metadata_options WHERE id = ${optEditId}`;
    expect(after.description_en).toBe(before.description_en); // failed save wrote nothing
  });

  it("edit unknown id → validation message, not a server error", async () => {
    const res = await saveMetadataOption(typeBravoId, { ...baseOption, id: 999999999 });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error).toBe("validation");
      expect(res.message?.length ?? 0).toBeGreaterThan(0);
    }
  });
});

describe("saveMetadataOption — create + edit", () => {
  it("happy path: all columns written, empty icon/color → null, revalidates metadata", async () => {
    const res = await saveMetadataOption(typeBravoId, baseOption);
    expect(res).toEqual({ ok: true });

    const [row] = await sql`
      SELECT * FROM metadata_options WHERE metadata_type_id = ${typeBravoId} AND value = 't10-opt-alpha'`;
    expect(row).not.toBeUndefined();
    expect(row.label_en).toBe("T10 Opt Alpha");
    expect(row.label_ar).toBe("ت:خيار ألفا");
    expect(row.description_en).toBe("opt desc");
    expect(row.description_ar).toBe("وصف الخيار");
    expect(Number(row.sort_order)).toBe(1);
    expect(row.is_active).toBe(true);
    expect(row.icon).toBeNull();
    expect(row.color).toBe("#336699");

    expect(vi.mocked(revalidateTag).mock.calls).toContainEqual(["metadata", "max"]);
  });

  it("edit with the row's id updates columns; option stays under its type", async () => {
    const res = await saveMetadataOption(typeBravoId, {
      ...baseOption,
      id: optEditId,
      value: "t10-opt-edit",
      labelEn: "T10 Opt Edit",
      labelAr: "ت:خيارتعديل",
      descriptionEn: "edited desc",
      descriptionAr: "وصف معدّل",
      sortOrder: 4,
      isActive: false,
      icon: "star",
      color: "#112233",
    });
    expect(res).toEqual({ ok: true });

    const [row] = await sql`
      SELECT metadata_type_id, description_en, description_ar, sort_order, is_active, icon, color
      FROM metadata_options WHERE id = ${optEditId}`;
    expect(Number(row.metadata_type_id)).toBe(typeBravoId);
    expect(row.description_en).toBe("edited desc");
    expect(row.description_ar).toBe("وصف معدّل");
    expect(Number(row.sort_order)).toBe(4);
    expect(row.is_active).toBe(false);
    expect(row.icon).toBe("star");
    expect(row.color).toBe("#112233");
  });
});

describe("deleteMetadataOption", () => {
  it("removes the option and cascades its app_metadata_values rows, revalidates metadata", async () => {
    // plant a value row under an option, then delete it
    const [app] = await sql`SELECT id FROM apps WHERE slug = 't10-app-a'`;
    await sql`INSERT INTO app_metadata_values (app_id, metadata_option_id) VALUES (${app.id}, ${optExistingId})`;

    const res = await deleteMetadataOption(optExistingId);
    expect(res).toEqual({ ok: true });

    expect(await sql`SELECT 1 FROM metadata_options WHERE id = ${optExistingId}`).toHaveLength(0);
    expect(await sql`SELECT 1 FROM app_metadata_values WHERE metadata_option_id = ${optExistingId}`).toHaveLength(0);
    expect(await sql`SELECT 1 FROM apps WHERE slug = 't10-app-a'`).toHaveLength(1);

    expect(vi.mocked(revalidateTag).mock.calls).toContainEqual(["metadata", "max"]);
  });

  it("unknown id → ok:false", async () => {
    expect(await deleteMetadataOption(999999999)).toEqual({ ok: false });
  });

  it("invalid id → ok:false", async () => {
    expect(await deleteMetadataOption(0)).toEqual({ ok: false });
    expect(await deleteMetadataOption(-2)).toEqual({ ok: false });
  });
});

describe("getAllMetadataTypesWithAllOptions (reader)", () => {
  it("returns every type (incl. inactive) with all options (incl. inactive) and usage counts", async () => {
    const all = await getAllMetadataTypesWithAllOptions();
    const mine = all.filter((t) => [typeExistingId, typeBravoId, typeInactiveId].includes(t.id));

    expect(mine).toHaveLength(3);

    // TYPE_EXISTING's seed option was deleted in the deleteMetadataOption test;
    // no create test targets this type, so it must have no options left.
    const existing = mine.find((t) => t.id === typeExistingId)!;
    expect(existing.isActive).toBe(true);
    expect(existing.options).toHaveLength(0);

    // TYPE_BRAVO holds the fixture edit-target option plus options created by
    // the create/uniqueness tests above.
    const bravo = mine.find((t) => t.id === typeBravoId)!;
    const bravoValues = bravo.options.map((o) => o.value);
    expect(bravoValues).toContain("t10-opt-edit");
    expect(bravoValues).toContain("t10-opt-alpha");
    expect(bravoValues).toContain(VALUE_DUP);

    const inactive = mine.find((t) => t.id === typeInactiveId)!;
    expect(inactive.isActive).toBe(false);
    expect(inactive.options).toHaveLength(1);
    expect(inactive.options[0].id).toBe(optInactiveId);
    expect(inactive.options[0].isActive).toBe(false);
  });

  it("option appCount reflects app_metadata_values rows", async () => {
    const all = await getAllMetadataTypesWithAllOptions();
    const bravo = all.find((t) => t.id === typeBravoId)!;
    expect(bravo.options.find((o) => o.value === "t10-opt-alpha")?.appCount).toBe(0);

    // plant a second app usage on t10-opt-alpha under typeBravo
    const [app] = await sql`SELECT id FROM apps WHERE slug = 't10-app-a'`;
    const [opt] = await sql`
      SELECT id FROM metadata_options WHERE metadata_type_id = ${typeBravoId} AND value = 't10-opt-alpha'`;
    await sql`INSERT INTO app_metadata_values (app_id, metadata_option_id) VALUES (${app.id}, ${opt.id})`;

    const again = await getAllMetadataTypesWithAllOptions();
    const bravo2 = again.find((t) => t.id === typeBravoId)!;
    expect(bravo2.options.find((o) => o.value === "t10-opt-alpha")?.appCount).toBe(1);
  });

  it("types ordered by sortOrder; options nested ordered by sortOrder", async () => {
    const all = await getAllMetadataTypesWithAllOptions();
    const mine = all.filter((t) => [typeExistingId, typeBravoId, typeInactiveId].includes(t.id));
    expect(mine.map((t) => t.id)).toEqual([typeExistingId, typeBravoId, typeInactiveId]); // sorts 1, 2, 9
    const bravo = mine.find((t) => t.id === typeBravoId)!;
    const sorts = bravo.options.map((o) => o.sortOrder);
    expect([...sorts].sort((a, b) => a - b)).toEqual(sorts);
  });
});
