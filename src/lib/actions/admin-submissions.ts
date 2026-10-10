"use server";

import { revalidateTag } from "next/cache";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  appSubmissions,
  appSubmissionsCategories,
  apps,
  appsCategories,
  developers,
  submissionStatusLogs,
} from "@/db/schema";
import type { appSubmissions as appSubmissionsTable } from "@/db/schema";
import { requireAdmin } from "@/lib/admin-guard";
import { pgDupError } from "@/lib/db-errors";
import { findDuplicateAppName } from "@/lib/repo/apps";
import { r2Configured } from "@/lib/services/r2";
import {
  transferSubmissionImages,
  type TransferResult,
} from "@/lib/services/submission-images";
import {
  sendInfoRequested,
  sendSubmissionApproved,
  sendSubmissionRejected,
  sendSubmissionUnderReview,
  type EmailSubmission,
} from "@/lib/services/email";

export type ReviewResult =
  | { ok: true; appId?: number }
  | { ok: false; error: "not_found" | "invalid_transition" | "storage" | "db"; message: string };

type AppSubmissionRow = typeof appSubmissionsTable.$inferSelect;
type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

function adminUserId(session: Awaited<ReturnType<typeof requireAdmin>>): number {
  return Number((session.user as { id?: string } | undefined)?.id ?? 0);
}

/** Port of Django's slugify for this domain: lowercase, non-alnum → "-", collapse, trim; empty → "app". */
function slugify(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "app";
}

/** slugify(nameEn) + "-1", "-2"… collision loop inside the caller's transaction. */
async function uniqueSlug(tx: Tx, nameEn: string): Promise<string> {
  const base = slugify(nameEn);
  let candidate = base;
  for (let i = 1; ; i++) {
    const hit = await tx.select({ id: apps.id }).from(apps).where(eq(apps.slug, candidate)).limit(1);
    if (hit.length === 0) return candidate;
    candidate = `${base}-${i}`;
  }
}

/** Port of _detect_platform: AppGallery counts as Android. */
function detectPlatform(rows: { googlePlayLink: string; appStoreLink: string; appGalleryLink: string }) {
  const hasAndroid = Boolean(rows.googlePlayLink || rows.appGalleryLink);
  const hasIos = Boolean(rows.appStoreLink);
  if (hasAndroid && hasIos) return "cross_platform";
  if (hasAndroid) return "android";
  if (hasIos) return "ios";
  return "web";
}

/** Port of _get_or_create_developer: name_en iexact → email iexact → create. */
async function getOrCreateDeveloper(
  tx: Tx,
  row: Pick<AppSubmissionRow, "developerNameEn" | "developerNameAr" | "developerWebsite" | "developerEmail">
): Promise<number> {
  const nameEn = row.developerNameEn.trim().toLowerCase();
  if (nameEn) {
    const byName = await tx
      .select({ id: developers.id })
      .from(developers)
      .where(sql`lower(${developers.nameEn}) = ${nameEn}`)
      .limit(1);
    if (byName.length > 0) return byName[0].id;
  }
  const email = row.developerEmail.trim().toLowerCase();
  if (email) {
    const byEmail = await tx
      .select({ id: developers.id })
      .from(developers)
      .where(sql`lower(${developers.email}) = ${email}`)
      .limit(1);
    if (byEmail.length > 0) return byEmail[0].id;
  }
  const [created] = await tx
    .insert(developers)
    .values({
      nameEn: row.developerNameEn,
      nameAr: row.developerNameAr || row.developerNameEn,
      website: row.developerWebsite,
      email: row.developerEmail,
    })
    .returning({ id: developers.id });
  return created.id;
}

function emailData(sub: AppSubmissionRow): EmailSubmission {
  return {
    trackingId: sub.trackingId,
    appNameEn: sub.appNameEn,
    appNameAr: sub.appNameAr,
    submitterName: sub.submitterName,
    submitterEmail: sub.submitterEmail,
    submitterPhone: sub.submitterPhone,
    submitterOrganization: sub.submitterOrganization,
    isDeveloper: sub.isDeveloper,
    submissionId: sub.id,
  };
}

type TxOutcome =
  | { kind: "ok"; appId: number; sub: AppSubmissionRow; appSlug: string }
  | { kind: "not_found" }
  | { kind: "invalid_transition" }
  | { kind: "storage"; message: string }
  | { kind: "db"; message: string };

/** FOR UPDATE lock + current status, shared by every transition action. */
async function lockSubmission(tx: Tx, id: number): Promise<AppSubmissionRow | null> {
  const [row] = await tx
    .select()
    .from(appSubmissions)
    .where(eq(appSubmissions.id, id))
    .for("update");
  return row ?? null;
}

const okResult = (appId?: number): ReviewResult => (appId === undefined ? { ok: true } : { ok: true, appId });
const notFoundResult = (): ReviewResult => ({ ok: false, error: "not_found", message: "الطلب غير موجود." });
const invalidTransitionResult = (message: string): ReviewResult => ({
  ok: false,
  error: "invalid_transition",
  message,
});

/** Approve flow steps 2-8 run in one transaction; steps 1/9 straddle it. */
export async function approveSubmission(id: number): Promise<ReviewResult> {
  const session = await requireAdmin();
  const userId = adminUserId(session);

  // Step 1 gate — before ANY writes/emails.
  if (!r2Configured()) {
    return {
      ok: false,
      error: "storage",
      message: "الموافقة متوقفة: تخزين R2 غير مُعدّ. اضبط متغيرات R2 قبل الموافقة.",
    };
  }

  let outcome: TxOutcome;
  try {
    outcome = await db.transaction(async (tx): Promise<TxOutcome> => {
      // Step 2: lock + state guard.
      const sub = await lockSubmission(tx, id);
      if (!sub) return { kind: "not_found" };
      if (
        sub.createdAppId !== null ||
        !["pending", "under_review", "info_requested"].includes(sub.status)
      ) {
        return { kind: "invalid_transition" };
      }

      // Step 1 gate (media part) — names the missing field.
      const missing: string[] = [];
      if (!sub.appIconUrl) missing.push("أيقونة التطبيق");
      if (!sub.mainImageEn) missing.push("الصورة الرئيسية (EN)");
      if (!sub.mainImageAr) missing.push("الصورة الرئيسية (AR)");
      if (missing.length > 0) {
        return {
          kind: "storage",
          message: `الموافقة متوقفة: ${missing.join(" و")} مفقودة. أضفها قبل الموافقة.`,
        };
      }

      // Name uniqueness (write-time rule; the DB unique index stays the backstop).
      const dup = await findDuplicateAppName(sub.appNameEn, sub.appNameAr);
      if (dup) {
        return {
          kind: "db",
          message: "تعذر إتمام الموافقة: اسم التطبيق مستخدم مسبقًا في الدليل.",
        };
      }

      // Step 3: FINAL slug first, then imagery transfer keyed by it.
      const slug = await uniqueSlug(tx, sub.appNameEn);
      let transferred: TransferResult;
      try {
        transferred = await transferSubmissionImages({
          appIconUrl: sub.appIconUrl,
          mainImageEn: sub.mainImageEn,
          mainImageAr: sub.mainImageAr,
          screenshotsEn: sub.screenshotsEn ?? [],
          screenshotsAr: sub.screenshotsAr ?? [],
          slug,
        });
      } catch (e) {
        console.error("image transfer failed", e);
        return { kind: "storage", message: "الموافقة متوقفة: فشل نقل الصور إلى التخزين." };
      }

      // Step 4: developer upsert.
      const developerId = await getOrCreateDeveloper(tx, sub);

      // Step 5: insert the published app.
      const [app] = await tx
        .insert(apps)
        .values({
          nameEn: sub.appNameEn,
          nameAr: sub.appNameAr,
          slug,
          shortDescriptionEn: sub.shortDescriptionEn,
          shortDescriptionAr: sub.shortDescriptionAr,
          descriptionEn: sub.descriptionEn || sub.shortDescriptionEn,
          descriptionAr: sub.descriptionAr || sub.shortDescriptionAr,
          applicationIcon: transferred.appIconUrl,
          mainImageEn: transferred.mainImageEn,
          mainImageAr: transferred.mainImageAr,
          googlePlayLink: sub.googlePlayLink,
          appStoreLink: sub.appStoreLink,
          appGalleryLink: sub.appGalleryLink,
          screenshotsEn: transferred.screenshotsEn,
          screenshotsAr: transferred.screenshotsAr,
          avgRating: "2.50",
          reviewCount: 0,
          platform: detectPlatform(sub),
          status: "published",
          developerId,
        })
        .returning({ id: apps.id, slug: apps.slug, nameEn: apps.nameEn });

      // Step 6: replace-then-set categories.
      await tx.delete(appsCategories).where(eq(appsCategories.appId, app.id));
      const catRows = await tx
        .select({ categoryId: appSubmissionsCategories.categoryId })
        .from(appSubmissionsCategories)
        .where(eq(appSubmissionsCategories.appsubmissionId, sub.id));
      for (const c of catRows) {
        await tx.insert(appsCategories).values({ appId: app.id, categoryId: c.categoryId });
      }

      // Step 7: finish the submission.
      await tx
        .update(appSubmissions)
        .set({
          status: "approved",
          createdAppId: app.id,
          reviewedById: userId,
          reviewedAt: sql`now()`,
        })
        .where(eq(appSubmissions.id, sub.id));

      // Step 8: status log.
      await tx.insert(submissionStatusLogs).values({
        submissionId: sub.id,
        fromStatus: sub.status,
        toStatus: "approved",
        changedById: userId,
        notes: `تمت الموافقة. أنشئ التطبيق: ${app.nameEn}`,
      });

      return { kind: "ok", appId: app.id, sub, appSlug: app.slug };
    });
  } catch (e) {
    if (pgDupError(e)) {
      outcome = {
        kind: "db",
        message: "تعذر إتمام الموافقة: اسم التطبيق مستخدم مسبقًا في الدليل.",
      };
    } else {
      console.error("approveSubmission error", e);
      outcome = { kind: "db", message: "تعذر إتمام الموافقة: خطأ في قاعدة البيانات." };
    }
  }

  // Step 9: after commit — email failures never abort the result.
  if (outcome.kind === "ok") {
    try {
      await sendSubmissionApproved({
        ...emailData(outcome.sub),
        createdAppSlug: outcome.appSlug,
        createdAppId: outcome.appId,
      });
    } catch (e) {
      console.error("approval email failed", e);
    }
    revalidateTag("apps", "max");
    revalidateTag("submissions", "max");
    return { ok: true, appId: outcome.appId };
  }
  if (outcome.kind === "storage") return { ok: false, error: "storage", message: outcome.message };
  if (outcome.kind === "db") return { ok: false, error: "db", message: outcome.message };
  if (outcome.kind === "not_found") return notFoundResult();
  return invalidTransitionResult("لا يمكن الموافقة على هذا الطلب في حالته الحالية.");
}

/** reject: set reason, reviewed fields, log, email rejected; not approved/rejected → rejected. */
export async function rejectSubmission(id: number, reason: string): Promise<ReviewResult> {
  const session = await requireAdmin();
  const userId = adminUserId(session);

  let outcome: Exclude<TxOutcome, { kind: "ok" } | { kind: "storage" }> | { kind: "ok"; sub: AppSubmissionRow };
  try {
    outcome = await db.transaction(async (tx) => {
      const sub = await lockSubmission(tx, id);
      if (!sub) return { kind: "not_found" as const };
      if (sub.status === "approved" || sub.status === "rejected") {
        return { kind: "invalid_transition" as const };
      }
      await tx
        .update(appSubmissions)
        .set({
          status: "rejected",
          rejectionReason: reason,
          reviewedById: userId,
          reviewedAt: sql`now()`,
        })
        .where(eq(appSubmissions.id, sub.id));
      await tx.insert(submissionStatusLogs).values({
        submissionId: sub.id,
        fromStatus: sub.status,
        toStatus: "rejected",
        changedById: userId,
        notes: `تم الرفض: ${reason.slice(0, 200)}`,
      });
      return { kind: "ok" as const, sub };
    });
  } catch (e) {
    console.error("rejectSubmission error", e);
    outcome = { kind: "db", message: "تعذر الرفض: خطأ في قاعدة البيانات." };
  }

  if (outcome.kind === "ok") {
    try {
      await sendSubmissionRejected(emailData(outcome.sub), reason);
    } catch (e) {
      console.error("rejection email failed", e);
    }
    revalidateTag("submissions", "max");
    return okResult();
  }
  if (outcome.kind === "not_found") return notFoundResult();
  if (outcome.kind === "invalid_transition")
    return invalidTransitionResult("لا يمكن رفض هذا الطلب في حالته الحالية.");
  return { ok: false, error: "db", message: outcome.message };
}

/** requestInfo: message + guard pending|under_review → info_requested. */
export async function requestInfo(id: number, message: string): Promise<ReviewResult> {
  const session = await requireAdmin();
  const userId = adminUserId(session);

  let outcome: Exclude<TxOutcome, { kind: "ok" } | { kind: "storage" }> | { kind: "ok"; sub: AppSubmissionRow };
  try {
    outcome = await db.transaction(async (tx) => {
      const sub = await lockSubmission(tx, id);
      if (!sub) return { kind: "not_found" as const };
      if (!["pending", "under_review"].includes(sub.status)) {
        return { kind: "invalid_transition" as const };
      }
      await tx
        .update(appSubmissions)
        .set({
          status: "info_requested",
          infoRequestMessage: message,
          reviewedById: userId,
          reviewedAt: sql`now()`,
        })
        .where(eq(appSubmissions.id, sub.id));
      await tx.insert(submissionStatusLogs).values({
        submissionId: sub.id,
        fromStatus: sub.status,
        toStatus: "info_requested",
        changedById: userId,
        notes: `تم طلب معلومات إضافية: ${message.slice(0, 200)}`,
      });
      return { kind: "ok" as const, sub };
    });
  } catch (e) {
    console.error("requestInfo error", e);
    outcome = { kind: "db", message: "تعذر طلب المعلومات: خطأ في قاعدة البيانات." };
  }

  if (outcome.kind === "ok") {
    try {
      await sendInfoRequested(emailData(outcome.sub), message);
    } catch (e) {
      console.error("info request email failed", e);
    }
    revalidateTag("submissions", "max");
    return okResult();
  }
  if (outcome.kind === "not_found") return notFoundResult();
  if (outcome.kind === "invalid_transition")
    return invalidTransitionResult("لا يمكن طلب معلومات إضافية في الحالة الحالية.");
  return { ok: false, error: "db", message: outcome.message };
}

/** markUnderReview: pending → under_review + email. */
export async function markUnderReview(id: number): Promise<ReviewResult> {
  const session = await requireAdmin();
  const userId = adminUserId(session);

  let outcome: Exclude<TxOutcome, { kind: "ok" } | { kind: "storage" }> | { kind: "ok"; sub: AppSubmissionRow };
  try {
    outcome = await db.transaction(async (tx) => {
      const sub = await lockSubmission(tx, id);
      if (!sub) return { kind: "not_found" as const };
      if (sub.status !== "pending") return { kind: "invalid_transition" as const };
      await tx.update(appSubmissions).set({ status: "under_review" }).where(eq(appSubmissions.id, sub.id));
      await tx.insert(submissionStatusLogs).values({
        submissionId: sub.id,
        fromStatus: sub.status,
        toStatus: "under_review",
        changedById: userId,
        notes: "تم وضع الطلب قيد المراجعة",
      });
      return { kind: "ok" as const, sub };
    });
  } catch (e) {
    console.error("markUnderReview error", e);
    outcome = { kind: "db", message: "تعذر تحديد الطلب قيد المراجعة: خطأ في قاعدة البيانات." };
  }

  if (outcome.kind === "ok") {
    try {
      await sendSubmissionUnderReview(emailData(outcome.sub));
    } catch (e) {
      console.error("under review email failed", e);
    }
    revalidateTag("submissions", "max");
    return okResult();
  }
  if (outcome.kind === "not_found") return notFoundResult();
  if (outcome.kind === "invalid_transition")
    return invalidTransitionResult("لا يمكن تحديد الطلب قيد المراجعة في الحالة الحالية.");
  return { ok: false, error: "db", message: outcome.message };
}

/** Status-independent note keeping — no log entry, no email. */
export async function saveAdminNotes(id: number, notes: string): Promise<ReviewResult> {
  await requireAdmin();

  try {
    const result = await db.transaction(async (tx) => {
      const rows = await tx
        .update(appSubmissions)
        .set({ adminNotes: notes })
        .where(eq(appSubmissions.id, id))
        .returning({ id: appSubmissions.id });
      return rows.length > 0 ? { kind: "ok" as const } : { kind: "not_found" as const };
    });
    if (result.kind === "ok") return okResult();
    return notFoundResult();
  } catch (e) {
    console.error("saveAdminNotes error", e);
    return { ok: false, error: "db", message: "تعذر حفظ الملاحظات: خطأ في قاعدة البيانات." };
  }
}
