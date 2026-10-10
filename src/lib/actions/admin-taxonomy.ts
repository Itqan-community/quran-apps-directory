"use server";

import { revalidateTag } from "next/cache";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { categories, developers } from "@/db/schema";
import { requireAdmin } from "@/lib/admin-guard";
import { categoryFormSchema, developerFormSchema } from "@/lib/validation/admin";

export type TaxonomyResult =
  | { ok: true }
  | {
      ok: false;
      error: "validation" | "server";
      fieldErrors?: Record<string, string[]>;
      message?: string;
    };

type DeleteCategoryResult = { ok: boolean };

type DeleteDeveloperResult = { ok: boolean; message?: string };

interface PgErrorLike {
  code?: string;
  constraint?: string;
  constraint_name?: string;
  cause?: unknown;
}

/**
 * Drizzle wraps driver errors (DrizzleQueryError.cause), and postgres.js exposes
 * the violating index as `constraint_name` (not `constraint`) — normalize both.
 */
function pgDupError(e: unknown): PgErrorLike | undefined {
  const direct = e as PgErrorLike | undefined;
  const cause = direct?.cause as PgErrorLike | undefined;
  const src = direct?.code === "23505" ? direct : cause?.code === "23505" ? cause : undefined;
  if (!src) return undefined;
  return { code: "23505", constraint: src.constraint_name ?? src.constraint ?? "" };
}

const CAT_NAME_MSG = "اسم الفئة مستخدم مسبقًا";
const CAT_SLUG_MSG = "الرابط (slug) مستخدم مسبقًا";
const DEV_NAME_MSG = "اسم المطور مستخدم مسبقًا";
const CAT_NOT_FOUND_MSG = "الفئة غير موجودة.";
const DEV_NOT_FOUND_MSG = "المطور غير موجود.";
const CAT_SAVE_FAIL = "تعذر حفظ الفئة: خطأ غير متوقع.";
const DEV_SAVE_FAIL = "تعذر حفظ المطور: خطأ غير متوقع.";
const DEV_DELETE_FAIL = "تعذر حذف المطور: خطأ غير متوقع.";

/** Port of Django's slugify (same rules as admin-apps): lowercase, non-alnum → "-", collapse, trim; empty → "category". */
function slugify(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "category";
}

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

/** Unique index names (drizzle): categories_slug_unique / categories_name_ar_unique / categories_name_en_unique. */
function categoryDupFieldErrors(constraint: string): Record<string, string[]> {
  if (constraint.includes("slug")) return { slug: [CAT_SLUG_MSG] };
  if (constraint.includes("name_ar")) return { nameAr: [CAT_NAME_MSG] };
  return { nameEn: [CAT_NAME_MSG] };
}

export async function saveCategory(input: unknown): Promise<TaxonomyResult> {
  await requireAdmin();

  const parsed = categoryFormSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "validation", fieldErrors: zodFieldErrors(parsed.error) };
  }
  const data = parsed.data;
  const editId = readRawId(input);

  const values = {
    nameEn: data.nameEn,
    nameAr: data.nameAr,
    slug: slugify(data.slug || data.nameEn),
    descriptionEn: data.descriptionEn,
    descriptionAr: data.descriptionAr,
    icon: data.icon || null,
    color: data.color || null,
    sortOrder: data.sortOrder,
    isActive: data.isActive,
  };

  try {
    if (editId === undefined) {
      await db.insert(categories).values(values);
    } else {
      const updated = await db
        .update(categories)
        .set({ ...values, updatedAt: sql`now()` })
        .where(eq(categories.id, editId))
        .returning({ id: categories.id });
      if (updated.length === 0) {
        return { ok: false, error: "validation", message: CAT_NOT_FOUND_MSG };
      }
    }
  } catch (e) {
    const dup = pgDupError(e);
    if (dup) {
      return { ok: false, error: "validation", fieldErrors: categoryDupFieldErrors(dup.constraint ?? "") };
    }
    console.error("saveCategory error", e);
    return { ok: false, error: "server", message: CAT_SAVE_FAIL };
  }

  // Public listings embed category names (and apps carry apps_categories rows).
  revalidateTag("categories", "max");
  revalidateTag("apps", "max");
  return { ok: true };
}

/** FK cascade removes apps_categories rows (apps themselves are untouched). */
export async function deleteCategory(id: number): Promise<DeleteCategoryResult> {
  await requireAdmin();

  if (!Number.isInteger(id) || id <= 0) return { ok: false };
  try {
    const rows = await db
      .delete(categories)
      .where(eq(categories.id, id))
      .returning({ id: categories.id });
    if (rows.length === 0) return { ok: false };
    revalidateTag("categories", "max");
    revalidateTag("apps", "max");
    return { ok: true };
  } catch (e) {
    console.error("deleteCategory error", e);
    return { ok: false };
  }
}

export async function saveDeveloper(input: unknown): Promise<TaxonomyResult> {
  await requireAdmin();

  const parsed = developerFormSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "validation", fieldErrors: zodFieldErrors(parsed.error) };
  }
  const data = parsed.data;
  const editId = readRawId(input);

  // The island collects {url} rows; the jsonb column is Record<string,string>
  // with each link keyed by the URL itself (dropping blank/duplicate rows).
  const socialLinks: Record<string, string> = {};
  for (const row of data.socialLinks) {
    if (row.url) socialLinks[row.url] = row.url;
  }

  const values = {
    nameEn: data.nameEn,
    nameAr: data.nameAr,
    website: data.website || null,
    email: data.email || null,
    logoUrl: data.logoUrl || null,
    descriptionEn: data.descriptionEn,
    descriptionAr: data.descriptionAr,
    socialLinks,
    isVerified: data.isVerified,
  };

  try {
    if (editId === undefined) {
      await db.insert(developers).values(values);
    } else {
      const updated = await db
        .update(developers)
        .set({ ...values, updatedAt: sql`now()` })
        .where(eq(developers.id, editId))
        .returning({ id: developers.id });
      if (updated.length === 0) {
        return { ok: false, error: "validation", message: DEV_NOT_FOUND_MSG };
      }
    }
  } catch (e) {
    if (pgDupError(e)) {
      // The only unique column on developers is name_en.
      return { ok: false, error: "validation", fieldErrors: { nameEn: [DEV_NAME_MSG] } };
    }
    console.error("saveDeveloper error", e);
    return { ok: false, error: "server", message: DEV_SAVE_FAIL };
  }

  // Developer names surface via joins on public pages (apps tag).
  revalidateTag("apps", "max");
  return { ok: true };
}

/** FK CASCADE — deleting a developer deletes their apps (warned in the confirm dialog). */
export async function deleteDeveloper(id: number): Promise<DeleteDeveloperResult> {
  await requireAdmin();

  if (!Number.isInteger(id) || id <= 0) return { ok: false };
  try {
    const rows = await db
      .delete(developers)
      .where(eq(developers.id, id))
      .returning({ id: developers.id });
    if (rows.length === 0) return { ok: false, message: DEV_NOT_FOUND_MSG };
    revalidateTag("apps", "max");
    return { ok: true };
  } catch (e) {
    console.error("deleteDeveloper error", e);
    return { ok: false, message: DEV_DELETE_FAIL };
  }
}
