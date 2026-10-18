"use server";

import { revalidateTag } from "next/cache";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { metadataOptions, metadataTypes } from "@/db/schema";
import { pgDupError } from "@/lib/db-errors";
import { requireAdmin } from "@/lib/admin-guard";
import { metadataTypeFormSchema, metadataOptionFormSchema } from "@/lib/validation/admin";
import type { TaxonomyResult } from "@/lib/actions/admin-taxonomy";

type DeleteMetadataTypeResult = { ok: boolean; message?: string };

type DeleteMetadataOptionResult = { ok: boolean };

const MET_NAME_MSG = "اسم نوع البيانات مستخدم مسبقًا";
const OPT_VALUE_MSG = "قيمة الخيار مستخدمة مسبقًا في هذا النوع";
const TYPE_NOT_FOUND_MSG = "نوع البيانات غير موجود.";
const OPTION_NOT_FOUND_MSG = "خيار البيانات غير موجود.";
const TYPE_SAVE_FAIL = "تعذر حفظ نوع البيانات: خطأ غير متوقع.";
const OPT_SAVE_FAIL = "تعذر حفظ الخيار: خطأ غير متوقع.";
const TYPE_DELETE_FAIL = "تعذر حذف نوع البيانات: خطأ غير متوقع.";

/** The edit row id arrives on the raw input (not part of the form schemas — create computes it). */
function readRawId(input: unknown): number | undefined {
  if (typeof input !== "object" || input === null) return undefined;
  const id = (input as { id?: unknown }).id;
  if (typeof id === "number" && Number.isInteger(id) && id > 0) return id;
  return undefined;
}

function zodFieldErrors(error: z.ZodError): Record<string, string[]> {
  const flat = z.flattenError(error).fieldErrors as Record<string, string[] | undefined>;
  const out: Record<string, string[]> = {};
  for (const [key, list] of Object.entries(flat)) {
    if (list && list.length > 0) out[key] = [...list];
  }
  return out;
}

export async function saveMetadataType(input: unknown): Promise<TaxonomyResult> {
  await requireAdmin();

  const parsed = metadataTypeFormSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "validation", fieldErrors: zodFieldErrors(parsed.error) };
  }
  const data = parsed.data;
  let editId = readRawId(input);

  const values = {
    name: data.name,
    labelEn: data.labelEn,
    labelAr: data.labelAr,
    descriptionEn: data.descriptionEn,
    descriptionAr: data.descriptionAr,
    isMultiSelect: data.isMultiSelect,
    sortOrder: data.sortOrder,
    isActive: data.isActive,
    icon: data.icon || null,
  };

  try {
    if (editId === undefined) {
      const [inserted] = await db.insert(metadataTypes).values(values).returning({ id: metadataTypes.id });
      editId = inserted?.id;
    } else {
      const updated = await db
        .update(metadataTypes)
        .set({ ...values, updatedAt: sql`now()` })
        .where(eq(metadataTypes.id, editId))
        .returning({ id: metadataTypes.id });
      if (updated.length === 0) {
        return { ok: false, error: "validation", message: TYPE_NOT_FOUND_MSG };
      }
    }
  } catch (e) {
    const dup = pgDupError(e);
    if (dup) {
      // The only unique column on metadata_types is name (metadata_types_name_unique).
      return { ok: false, error: "validation", fieldErrors: { name: [MET_NAME_MSG] } };
    }
    console.error("saveMetadataType error", e);
    return { ok: false, error: "server", message: TYPE_SAVE_FAIL };
  }

  // Public filter chips / submit form read cached metadata values.
  revalidateTag("metadata", "max");
  return { ok: true, id: editId };
}

/** FK cascade removes the type's options and, with them, the per-app values (apps untouched). */
export async function deleteMetadataType(id: number): Promise<DeleteMetadataTypeResult> {
  await requireAdmin();

  if (!Number.isInteger(id) || id <= 0) return { ok: false };
  try {
    const rows = await db
      .delete(metadataTypes)
      .where(eq(metadataTypes.id, id))
      .returning({ id: metadataTypes.id });
    if (rows.length === 0) return { ok: false, message: TYPE_NOT_FOUND_MSG };
    revalidateTag("metadata", "max");
    return { ok: true };
  } catch (e) {
    console.error("deleteMetadataType error", e);
    return { ok: false, message: TYPE_DELETE_FAIL };
  }
}

export async function saveMetadataOption(typeId: number, input: unknown): Promise<TaxonomyResult> {
  await requireAdmin();

  if (!Number.isInteger(typeId) || typeId <= 0) {
    return { ok: false, error: "validation", message: TYPE_NOT_FOUND_MSG };
  }

  const parsed = metadataOptionFormSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "validation", fieldErrors: zodFieldErrors(parsed.error) };
  }
  const data = parsed.data;
  const editId = readRawId(input);

  try {
    // typeId must exist.
    const [typeRow] = await db
      .select({ id: metadataTypes.id })
      .from(metadataTypes)
      .where(eq(metadataTypes.id, typeId))
      .limit(1);
    if (!typeRow) {
      return { ok: false, error: "validation", message: TYPE_NOT_FOUND_MSG };
    }

    const values = {
      value: data.value,
      labelEn: data.labelEn,
      labelAr: data.labelAr,
      descriptionEn: data.descriptionEn,
      descriptionAr: data.descriptionAr,
      sortOrder: data.sortOrder,
      isActive: data.isActive,
      icon: data.icon || null,
      color: data.color || null,
    };

    if (editId === undefined) {
      await db.insert(metadataOptions).values({ metadataTypeId: typeId, ...values });
    } else {
      // An option never moves between types: scope the edit to its own type.
      const updated = await db
        .update(metadataOptions)
        .set({ ...values, updatedAt: sql`now()` })
        .where(and(eq(metadataOptions.id, editId), eq(metadataOptions.metadataTypeId, typeId)))
        .returning({ id: metadataOptions.id });
      if (updated.length === 0) {
        return { ok: false, error: "validation", message: OPTION_NOT_FOUND_MSG };
      }
    }
  } catch (e) {
    const dup = pgDupError(e);
    if (dup && dup.constraint?.includes("unique_metadata_type_value")) {
      return { ok: false, error: "validation", fieldErrors: { value: [OPT_VALUE_MSG] } };
    }
    console.error("saveMetadataOption error", e);
    return { ok: false, error: "server", message: OPT_SAVE_FAIL };
  }

  revalidateTag("metadata", "max");
  return { ok: true };
}

/** FK cascade removes the option's per-app values (apps untouched). */
export async function deleteMetadataOption(id: number): Promise<DeleteMetadataOptionResult> {
  await requireAdmin();

  if (!Number.isInteger(id) || id <= 0) return { ok: false };
  try {
    const rows = await db
      .delete(metadataOptions)
      .where(eq(metadataOptions.id, id))
      .returning({ id: metadataOptions.id });
    if (rows.length === 0) return { ok: false };
    revalidateTag("metadata", "max");
    return { ok: true };
  } catch (e) {
    console.error("deleteMetadataOption error", e);
    return { ok: false };
  }
}
