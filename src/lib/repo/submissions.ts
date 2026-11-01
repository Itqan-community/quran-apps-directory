import { eq, desc, sql } from "drizzle-orm";
import { db } from "@/db";
import { appSubmissions, apps, appSubmissionsCategories, categories } from "@/db/schema";
import type { PendingDigestItem } from "@/lib/services/slack";

export type TrackedSubmission = {
  trackingId: string;
  status: string;
  appNameEn: string;
  appNameAr: string;
  appIconUrl: string | null;
  submittedAt: Date;
  reviewedAt: Date | null;
  createdAppSlug: string | null;
};

export type TrackedListItem = {
  trackingId: string;
  status: string;
  appNameEn: string;
  appNameAr: string;
  submittedAt: Date;
};

const TRACKING_ID_RE = /^QAD-[A-Z0-9]{6}$/;

export async function getSubmissionByTrackingId(
  rawId: string
): Promise<TrackedSubmission | null> {
  const trackingId = rawId.trim().toUpperCase();
  if (!TRACKING_ID_RE.test(trackingId)) return null;

  const rows = await db
    .select({
      trackingId: appSubmissions.trackingId,
      status: appSubmissions.status,
      appNameEn: appSubmissions.appNameEn,
      appNameAr: appSubmissions.appNameAr,
      appIconUrl: appSubmissions.appIconUrl,
      submittedAt: appSubmissions.createdAt,
      reviewedAt: appSubmissions.reviewedAt,
      createdAppSlug: apps.slug,
    })
    .from(appSubmissions)
    .leftJoin(apps, eq(apps.id, appSubmissions.createdAppId))
    .where(eq(appSubmissions.trackingId, trackingId))
    .limit(1);

  return rows[0] ?? null;
}

export async function getSubmissionsByEmail(
  rawEmail: string
): Promise<TrackedListItem[]> {
  const email = rawEmail.trim().toLowerCase();
  if (!email.includes("@")) return [];

  return db
    .select({
      trackingId: appSubmissions.trackingId,
      status: appSubmissions.status,
      appNameEn: appSubmissions.appNameEn,
      appNameAr: appSubmissions.appNameAr,
      submittedAt: appSubmissions.createdAt,
    })
    .from(appSubmissions)
    .where(eq(appSubmissions.submitterEmail, email))
    .orderBy(desc(appSubmissions.createdAt));
}

export type SlackSubmissionData = {
  id: number;
  trackingId: string;
  appNameEn: string;
  appNameAr: string;
  submitterName: string;
  submitterEmail: string;
  submitterOrganization: string;
  developerNameEn: string;
  categories: string[];
  submittedAt: Date;
};

export async function getSubmissionForAdminNotification(
  id: number
): Promise<SlackSubmissionData | null> {
  const rows = await db
    .select({
      id: appSubmissions.id,
      trackingId: appSubmissions.trackingId,
      appNameEn: appSubmissions.appNameEn,
      appNameAr: appSubmissions.appNameAr,
      submitterName: appSubmissions.submitterName,
      submitterEmail: appSubmissions.submitterEmail,
      submitterOrganization: appSubmissions.submitterOrganization,
      developerNameEn: appSubmissions.developerNameEn,
      submittedAt: appSubmissions.createdAt,
    })
    .from(appSubmissions)
    .where(eq(appSubmissions.id, id))
    .limit(1);

  const row = rows[0];
  if (!row) return null;

  const catRows = await db
    .select({ nameEn: categories.nameEn })
    .from(appSubmissionsCategories)
    .innerJoin(categories, eq(categories.id, appSubmissionsCategories.categoryId))
    .where(eq(appSubmissionsCategories.appsubmissionId, id));

  return { ...row, categories: catRows.map((c) => c.nameEn) };
}

export async function listPendingSubmissions(
  limit = 10
): Promise<PendingDigestItem[]> {
  // Clamp: the digest only ever needs a small newest-first slice, and a
  // limit of 0 would silently return nothing.
  const clamped = Math.max(1, Math.min(50, limit));
  return db
    .select({
      trackingId: appSubmissions.trackingId,
      appNameEn: appSubmissions.appNameEn,
      submittedAt: appSubmissions.createdAt,
    })
    .from(appSubmissions)
    .where(eq(appSubmissions.status, "pending"))
    // id desc as a deterministic tie-breaker for identical created_at values.
    .orderBy(desc(appSubmissions.createdAt), desc(appSubmissions.id))
    .limit(clamped);
}

/**
 * Min created_at over ALL pending rows (spec §4.1: the "oldest pending" age
 * in the digest is a fact over every pending row, not over the newest-10
 * slice `listPendingSubmissions` returns). Null when nothing pending.
 *
 * Bare time aggregates (sql-min(createdAt)) surface through the
 * drizzle/postgres-js row mapping as raw SQL text ("2026-01-08 14:17:31.85+00")
 * instead of the Date the driver parses for plain column selects — which broke
 * wholeDays in the Slack digest at cutover. Epoch milliseconds over int8 is
 * deterministic under every transport: numeric text → Number → Date.
 */
export async function oldestPendingSubmittedAt(): Promise<Date | null> {
  const rows = await db
    .select({
      sinceMs: sql<string | number>`extract(epoch from min(${appSubmissions.createdAt})) * 1000::int8`,
    })
    .from(appSubmissions)
    .where(eq(appSubmissions.status, "pending"));
  const raw = rows[0]?.sinceMs;
  if (raw === null || raw === undefined || raw === "") return null;
  const ms = Number(raw);
  return Number.isFinite(ms) ? new Date(ms) : null;
}

export async function countPendingSubmissions(): Promise<number> {
  const rows = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(appSubmissions)
    .where(eq(appSubmissions.status, "pending"));
  return rows[0]?.n ?? 0;
}
