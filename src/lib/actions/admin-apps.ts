"use server";

import { revalidateTag } from "next/cache";
import { and, eq, inArray, ne, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import {
  appMetadataValues,
  apps,
  appScreenshots,
  appsCategories,
  metadataOptions,
  metadataTypes,
} from "@/db/schema";
import { requireAdmin } from "@/lib/admin-guard";
import { findDuplicateAppName } from "@/lib/repo/apps";
import { appFormSchema } from "@/lib/validation/admin";

export type SaveAppResult =
  | { ok: true; id: number }
  | {
      ok: false;
      error: "validation" | "server";
      fieldErrors?: Record<string, string[]>;
      message?: string;
    };

export type DeleteAppResult = { ok: boolean; message?: string };

export type BulkSetResult = { ok: boolean; affected?: number };

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

interface PgErrorLike {
  code?: string;
  constraint?: string;
}

const DUP_NAME_MSG = "اسم التطبيق مستخدم مسبقًا";
const SLUG_TAKEN_MSG = "الرابط (slug) مستخدم مسبقًا لعمل تطبيق آخر";
const SINGLE_OPTION_MSG = "النوع المفرد يقبل خيارًا واحدًا فقط";
const UNKNOWN_TYPE_MSG = "نوع بيانات وصفية غير معروف";
const UNKNOWN_OPTION_MSG = "خيار وصف غير متاح لهذا النوع";

const BULK_STATUSES = new Set(["draft", "published", "archived"]);

/** Port of Django's slugify for this domain: lowercase, non-alnum → "-", collapse, trim; empty → "app". */
function slugify(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "app";
}

/** slugify(name) + "-1", "-2"… collision loop inside the caller's transaction, skipping excludeId. */
async function uniqueSlugExcluding(
  tx: Tx,
  seed: string,
  excludeId?: number
): Promise<string> {
  const base = slugify(seed);
  let candidate = base;
  for (let i = 1; ; i++) {
    const hit = await tx
      .select({ id: apps.id })
      .from(apps)
      .where(excludeId ? and(eq(apps.slug, candidate), ne(apps.id, excludeId)) : eq(apps.slug, candidate))
      .limit(1);
    if (hit.length === 0) return candidate;
    candidate = `${base}-${i}`;
  }
}

/** The edit row id arrives on the raw input (not part of appFormSchema — create computes it). */
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

/**
 * Per the brief: isMultiSelect lives in the DB, so it is enforced HERE, not in zod —
 * a record entry for a single-select type must carry exactly 1 option; ids must
 * belong to that (active) type. Multi-select types accept any count.
 */
async function collectMetadataRows(
  metadata: Record<string, number[]>
): Promise<{ ok: true; optionIds: number[] } | { ok: false; message: string }> {
  const entries = Object.entries(metadata);
  if (entries.length === 0) return { ok: true, optionIds: [] };

  const activeTypes = await db
    .select({ id: metadataTypes.id, isMultiSelect: metadataTypes.isMultiSelect })
    .from(metadataTypes)
    .where(eq(metadataTypes.isActive, true));
  const typeById = new Map(activeTypes.map((t) => [t.id, t]));

  const optionsByType = new Map<number, Set<number>>();
  if (activeTypes.length > 0) {
    const optionRows = await db
      .select({ id: metadataOptions.id, metadataTypeId: metadataOptions.metadataTypeId })
      .from(metadataOptions)
      .where(
        and(
          eq(metadataOptions.isActive, true),
          inArray(
            metadataOptions.metadataTypeId,
            activeTypes.map((t) => t.id)
          )
        )
      );
    for (const o of optionRows) {
      const set = optionsByType.get(o.metadataTypeId) ?? new Set<number>();
      set.add(o.id);
      optionsByType.set(o.metadataTypeId, set);
    }
  }

  const rows: number[] = [];
  for (const [key, rawIds] of entries) {
    const typeId = Number(key);
    const type = typeById.get(typeId);
    if (!type || !Number.isInteger(typeId)) {
      return { ok: false, message: `${UNKNOWN_TYPE_MSG} (${key})` };
    }
    const optionSet = optionsByType.get(typeId) ?? new Set<number>();
    const ids = [...new Set(rawIds)];
    for (const id of ids) {
      if (!optionSet.has(id)) {
        return { ok: false, message: `${UNKNOWN_OPTION_MSG} (${key})` };
      }
    }
    if (!type.isMultiSelect && ids.length !== 1) {
      return { ok: false, message: SINGLE_OPTION_MSG };
    }
    rows.push(...ids);
  }
  return { ok: true, optionIds: rows };
}

/** apps_categories / app_metadata_values / app_screenshots are wholesale-replaced on every save. */
async function replaceChildren(
  tx: Tx,
  appId: number,
  data: {
    categoryIds: number[];
    screenshotsEn: string[];
    screenshotsAr: string[];
  },
  metadataOptionIds: number[]
): Promise<void> {
  await tx.delete(appsCategories).where(eq(appsCategories.appId, appId));
  const uniqueCats = [...new Set(data.categoryIds)];
  if (uniqueCats.length > 0) {
    await tx.insert(appsCategories).values(uniqueCats.map((categoryId) => ({ appId, categoryId })));
  }

  await tx.delete(appMetadataValues).where(eq(appMetadataValues.appId, appId));
  const uniqueOpts = [...new Set(metadataOptionIds)];
  if (uniqueOpts.length > 0) {
    await tx
      .insert(appMetadataValues)
      .values(uniqueOpts.map((metadataOptionId) => ({ appId, metadataOptionId })));
  }

  await tx.delete(appScreenshots).where(eq(appScreenshots.appId, appId));
  const shotRows = [
    ...data.screenshotsEn.map((image, i) => ({ appId, language: "en", image, sortOrder: i })),
    ...data.screenshotsAr.map((image, i) => ({ appId, language: "ar", image, sortOrder: i })),
  ];
  if (shotRows.length > 0) {
    await tx.insert(appScreenshots).values(shotRows);
  }
}

function appColumnValues(data: {
  nameEn: string;
  nameAr: string;
  shortDescriptionEn: string;
  shortDescriptionAr: string;
  descriptionEn: string;
  descriptionAr: string;
  applicationIcon: string;
  mainImageEn: string;
  mainImageAr: string;
  googlePlayLink: string;
  appStoreLink: string;
  appGalleryLink: string;
  screenshotsEn: string[];
  screenshotsAr: string[];
  sortOrder: number;
  platform: "android" | "ios" | "web" | "cross_platform";
  featured: boolean;
  developerId: number;
  status: "draft" | "published" | "archived";
}) {
  return {
    nameEn: data.nameEn,
    nameAr: data.nameAr,
    shortDescriptionEn: data.shortDescriptionEn,
    shortDescriptionAr: data.shortDescriptionAr,
    descriptionEn: data.descriptionEn,
    descriptionAr: data.descriptionAr,
    applicationIcon: data.applicationIcon,
    mainImageEn: data.mainImageEn,
    mainImageAr: data.mainImageAr,
    googlePlayLink: data.googlePlayLink || null,
    appStoreLink: data.appStoreLink || null,
    appGalleryLink: data.appGalleryLink || null,
    screenshotsEn: data.screenshotsEn,
    screenshotsAr: data.screenshotsAr,
    sortOrder: data.sortOrder,
    platform: data.platform,
    featured: data.featured,
    developerId: data.developerId,
    status: data.status,
  };
}

export async function saveApp(input: unknown): Promise<SaveAppResult> {
  await requireAdmin();

  const parsed = appFormSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "validation", fieldErrors: zodFieldErrors(parsed.error) };
  }
  const data = parsed.data;

  const meta = await collectMetadataRows(data.metadata);
  if (!meta.ok) {
    return { ok: false, error: "validation", fieldErrors: { metadata: [meta.message] } };
  }

  // Create path: write-time name uniqueness up front (no stored row to waive against).
  // The DB unique indexes are the backstop; 23505 is caught below. On edit the check
  // runs inside the transaction (see the AR-unchanged waiver there).
  const editId = readRawId(input);
  if (editId === undefined) {
    const dup = await findDuplicateAppName(data.nameEn, data.nameAr);
    if (dup) {
      return { ok: false, error: "validation", fieldErrors: { [dup]: [DUP_NAME_MSG] } };
    }
  }

  let outcome:
    | { kind: "ok"; id: number }
    | { kind: "not_found" }
    | { kind: "slug_taken" }
    | { kind: "dup_name"; field: "app_name_en" | "app_name_ar" };
  try {
    outcome = await db.transaction(async (tx) => {
      if (editId === undefined) {
        // Create: slug computed from nameEn (seeded from an explicit slug when supplied) + collision loop.
        const slug = await uniqueSlugExcluding(tx, data.slug ? data.slug : data.nameEn);
        const [created] = await tx
          .insert(apps)
          .values({ ...appColumnValues(data), slug })
          .returning({ id: apps.id });
        await replaceChildren(tx, created.id, data, meta.optionIds);
        return { kind: "ok" as const, id: created.id };
      }

      const [existing] = await tx
        .select({ id: apps.id, nameEn: apps.nameEn, nameAr: apps.nameAr, slug: apps.slug })
        .from(apps)
        .where(eq(apps.id, editId))
        .for("update");
      if (!existing) return { kind: "not_found" as const };

      // AR-unchanged waiver: name_ar has no unique index and live data carries legacy
      // repeats; an exactly unchanged Arabic name waives the AR check so those rows stay
      // editable. A NEW colliding nameAr is still rejected. EN keeps the full check.
      const arForDup = data.nameAr === existing.nameAr ? "" : data.nameAr;
      const dup = await findDuplicateAppName(data.nameEn, arForDup, existing.id);
      if (dup) return { kind: "dup_name" as const, field: dup };

      const explicitSlug = (data.slug ?? "").trim();
      let finalSlug: string;
      if (explicitSlug) {
        // Explicit override: uniqueness-checked, never silently suffixed.
        finalSlug = slugify(explicitSlug);
        const clash = await tx
          .select({ id: apps.id })
          .from(apps)
          .where(and(eq(apps.slug, finalSlug), ne(apps.id, existing.id)))
          .limit(1);
        if (clash.length > 0) return { kind: "slug_taken" as const };
      } else if (data.nameEn !== existing.nameEn) {
        // Renamed with no explicit slug → regenerate with collision resolution.
        finalSlug = await uniqueSlugExcluding(tx, data.nameEn, existing.id);
      } else {
        finalSlug = existing.slug;
      }

      await tx
        .update(apps)
        .set({ ...appColumnValues(data), slug: finalSlug, updatedAt: sql`now()` })
        .where(eq(apps.id, existing.id));
      await replaceChildren(tx, existing.id, data, meta.optionIds);
      return { kind: "ok" as const, id: existing.id };
    });
  } catch (e) {
    const pg = e as PgErrorLike;
    if (pg?.code === "23505") {
      const constraint = pg.constraint ?? "";
      const field =
        constraint.includes("slug") || constraint.includes("slug_key")
          ? "slug"
          : "app_name_en";
      return {
        ok: false,
        error: "validation",
        fieldErrors: { [field]: [field === "slug" ? SLUG_TAKEN_MSG : DUP_NAME_MSG] },
      };
    }
    console.error("saveApp error", e);
    return { ok: false, error: "server", message: "تعذر حفظ التطبيق: خطأ غير متوقع." };
  }

  if (outcome.kind === "ok") {
    revalidateTag("apps", "max");
    return { ok: true, id: outcome.id };
  }
  if (outcome.kind === "dup_name") {
    return { ok: false, error: "validation", fieldErrors: { [outcome.field]: [DUP_NAME_MSG] } };
  }
  if (outcome.kind === "slug_taken") {
    return { ok: false, error: "validation", fieldErrors: { slug: [SLUG_TAKEN_MSG] } };
  }
  return { ok: false, error: "validation", message: "التطبيق غير موجود." };
}

/** Single DELETE — FK cascades remove children; submissions.created_app_id is SET NULL. */
export async function deleteApp(id: number): Promise<DeleteAppResult> {
  await requireAdmin();

  if (!Number.isInteger(id) || id <= 0) return { ok: false, message: "التطبيق غير موجود." };
  try {
    const rows = await db.delete(apps).where(eq(apps.id, id)).returning({ id: apps.id });
    if (rows.length === 0) return { ok: false, message: "التطبيق غير موجود." };
    revalidateTag("apps", "max");
    return { ok: true };
  } catch (e) {
    console.error("deleteApp error", e);
    return { ok: false, message: "تعذر حذف التطبيق: خطأ غير متوقع." };
  }
}

/** Bulk bar: status change and/or featured flip; null/"empty" components are left untouched. */
export async function bulkSetApps(
  ids: number[],
  status: string,
  featured: boolean | null
): Promise<BulkSetResult> {
  await requireAdmin();

  const wantStatus = typeof status === "string" && status.trim() !== "";
  if (wantStatus && !BULK_STATUSES.has(status)) return { ok: false };

  const cleanIds = [...new Set((Array.isArray(ids) ? ids : []).filter((n) => Number.isInteger(n) && n > 0))];
  if (cleanIds.length === 0 || (!wantStatus && featured === null)) {
    return { ok: true, affected: 0 };
  }

  try {
    const rows = await db
      .update(apps)
      .set({
        ...(wantStatus ? { status } : {}),
        ...(featured !== null ? { featured } : {}),
        updatedAt: sql`now()`,
      })
      .where(inArray(apps.id, cleanIds))
      .returning({ id: apps.id });
    revalidateTag("apps", "max");
    return { ok: true, affected: rows.length };
  } catch (e) {
    console.error("bulkSetApps error", e);
    return { ok: false };
  }
}
