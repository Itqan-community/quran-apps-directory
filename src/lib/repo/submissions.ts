import { eq, desc } from "drizzle-orm";
import { db } from "@/db";
import { appSubmissions, apps } from "@/db/schema";

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
