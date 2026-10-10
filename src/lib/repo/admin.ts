import { and, asc, desc, eq, inArray, or, sql } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import { getTableColumns } from "drizzle-orm";
import { db } from "@/db";
import {
  appSubmissions,
  appSubmissionsCategories,
  apps,
  categories,
  submissionStatusLogs,
  users,
} from "@/db/schema";
import type { AppListItem } from "./apps-rows";
import { getAppListRows, parsePageParams } from "./apps-rows";

export type AdminAppsFilters = {
  search?: string;
  status?: string;
  featured?: boolean;
  platform?: string;
  developerId?: number;
  page?: number;
  pageSize?: number;
};

/** Admin app listing: status "all" (default) disables the filter, newest first. */
export async function getAdminApps(
  f: AdminAppsFilters
): Promise<{ count: number; page: number; pageSize: number; results: AppListItem[] }> {
  const { count, results } = await getAppListRows({
    search: f.search,
    status: f.status ?? "all",
    featured: f.featured,
    platforms: f.platform ? [f.platform] : undefined,
    developerId: f.developerId,
    ordering: "created_at,desc",
    page: f.page,
    pageSize: f.pageSize,
  });
  const { page, pageSize } = parsePageParams(f);
  return { count, page, pageSize, results };
}

export type AdminSubmissionRow = {
  id: number;
  trackingId: string;
  status: string;
  appNameEn: string;
  appNameAr: string;
  submitterName: string;
  submitterEmail: string;
  appIconUrl: string | null;
  hasStoreLink: boolean;
  createdAt: Date;
  categories: { id: number; nameEn: string; nameAr: string }[];
};

export type AdminSubmissionsFilters = { status?: string; search?: string; page?: number };

const SUBMISSION_PAGE_SIZE = 25;

/** Escape LIKE metacharacters so user input is matched literally (pairs with ESCAPE '\' in SQL). */
function escapeLike(s: string) {
  return s.replace(/[%_\\]/g, "\\$&");
}

/** Admin review queue: newest first, one page at a time (pageSize fixed at 25). */
export async function getAdminSubmissions(
  f: AdminSubmissionsFilters
): Promise<{ count: number; page: number; results: AdminSubmissionRow[] }> {
  const page = Math.max(1, f.page ?? 1);

  const conds: SQL[] = [];
  if (f.status) conds.push(eq(appSubmissions.status, f.status));
  if (f.search) {
    const raw = `%${escapeLike(f.search.trim())}%`;
    conds.push(
      or(
        sql`${appSubmissions.trackingId} ILIKE ${raw} ESCAPE '\\'`,
        sql`${appSubmissions.appNameEn} ILIKE ${raw} ESCAPE '\\'`,
        sql`${appSubmissions.appNameAr} ILIKE ${raw} ESCAPE '\\'`,
        sql`${appSubmissions.submitterName} ILIKE ${raw} ESCAPE '\\'`,
        sql`${appSubmissions.submitterEmail} ILIKE ${raw} ESCAPE '\\'`
      )!
    );
  }
  const where = conds.length > 0 ? and(...conds) : undefined;

  const [{ total }] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(appSubmissions)
    .where(where);

  const rows = await db
    .select({
      id: appSubmissions.id,
      trackingId: appSubmissions.trackingId,
      status: appSubmissions.status,
      appNameEn: appSubmissions.appNameEn,
      appNameAr: appSubmissions.appNameAr,
      submitterName: appSubmissions.submitterName,
      submitterEmail: appSubmissions.submitterEmail,
      appIconUrl: appSubmissions.appIconUrl,
      googlePlayLink: appSubmissions.googlePlayLink,
      appStoreLink: appSubmissions.appStoreLink,
      appGalleryLink: appSubmissions.appGalleryLink,
      createdAt: appSubmissions.createdAt,
    })
    .from(appSubmissions)
    .where(where)
    .orderBy(desc(appSubmissions.createdAt), desc(appSubmissions.id))
    .limit(SUBMISSION_PAGE_SIZE)
    .offset((page - 1) * SUBMISSION_PAGE_SIZE);

  // Categories for the current page only — one extra query by page ids,
  // mirroring the apps-rows.ts pattern.
  const pageIds = rows.map((r) => r.id);
  const catRows =
    pageIds.length > 0
      ? await db
          .select({
            submissionId: appSubmissionsCategories.appsubmissionId,
            id: categories.id,
            nameEn: categories.nameEn,
            nameAr: categories.nameAr,
          })
          .from(appSubmissionsCategories)
          .innerJoin(categories, eq(categories.id, appSubmissionsCategories.categoryId))
          .where(inArray(appSubmissionsCategories.appsubmissionId, pageIds))
      : [];
  const catsBySubmission = new Map<number, AdminSubmissionRow["categories"]>();
  for (const c of catRows) {
    const list = catsBySubmission.get(c.submissionId) ?? [];
    list.push({ id: c.id, nameEn: c.nameEn, nameAr: c.nameAr });
    catsBySubmission.set(c.submissionId, list);
  }

  const results = rows.map((r) => ({
    id: r.id,
    trackingId: r.trackingId,
    status: r.status,
    appNameEn: r.appNameEn,
    appNameAr: r.appNameAr,
    submitterName: r.submitterName,
    submitterEmail: r.submitterEmail,
    appIconUrl: r.appIconUrl,
    hasStoreLink: Boolean(r.googlePlayLink || r.appStoreLink || r.appGalleryLink),
    createdAt: r.createdAt,
    categories: catsBySubmission.get(r.id) ?? [],
  }));

  return { count: total, page, results };
}

export type SubmissionDetail = {
  id: number;
  trackingId: string;
  status: string;
  submitter: { name: string; email: string; phone: string; organization: string; isDeveloper: boolean };
  app: {
    nameEn: string;
    nameAr: string;
    shortDescriptionEn: string;
    shortDescriptionAr: string;
    descriptionEn: string;
    descriptionAr: string;
  };
  links: { googlePlay: string; appStore: string; appGallery: string; website: string };
  developer: { nameEn: string; nameAr: string; website: string; email: string };
  media: { appIconUrl: string; mainImageEn: string; mainImageAr: string; screenshotsEn: string[]; screenshotsAr: string[] };
  crawledContent: string | null;
  adminNotes: string;
  rejectionReason: string;
  infoRequestMessage: string;
  categories: { id: number; nameEn: string; nameAr: string }[];
  submittedAt: Date;
  updatedAt: Date;
  reviewedAt: Date | null;
  createdApp: { id: number; nameEn: string; slug: string } | null;
  logs: { id: number; fromStatus: string; toStatus: string; changedBy: string | null; notes: string; createdAt: Date }[];
};

/** Single submission for the review page; null when the id does not exist. */
export async function getSubmissionDetail(id: number): Promise<SubmissionDetail | null> {
  const rows = await db
    .select({
      ...getTableColumns(appSubmissions),
      linkedAppId: apps.id,
      linkedAppNameEn: apps.nameEn,
      linkedAppSlug: apps.slug,
    })
    .from(appSubmissions)
    .leftJoin(apps, eq(apps.id, appSubmissions.createdAppId))
    .where(eq(appSubmissions.id, id))
    .limit(1);
  if (rows.length === 0) return null;
  const s = rows[0];

  const catRows = await db
    .select({
      id: categories.id,
      nameEn: categories.nameEn,
      nameAr: categories.nameAr,
    })
    .from(appSubmissionsCategories)
    .innerJoin(categories, eq(categories.id, appSubmissionsCategories.categoryId))
    .where(eq(appSubmissionsCategories.appsubmissionId, id))
    .orderBy(asc(categories.sortOrder), asc(categories.id));

  const logs = await db
    .select({
      id: submissionStatusLogs.id,
      fromStatus: submissionStatusLogs.fromStatus,
      toStatus: submissionStatusLogs.toStatus,
      changedBy: users.name,
      notes: submissionStatusLogs.notes,
      createdAt: submissionStatusLogs.createdAt,
    })
    .from(submissionStatusLogs)
    .leftJoin(users, eq(users.id, submissionStatusLogs.changedById))
    .where(eq(submissionStatusLogs.submissionId, id))
    .orderBy(asc(submissionStatusLogs.createdAt), asc(submissionStatusLogs.id));

  return {
    id: s.id,
    trackingId: s.trackingId,
    status: s.status,
    submitter: {
      name: s.submitterName,
      email: s.submitterEmail,
      phone: s.submitterPhone,
      organization: s.submitterOrganization,
      isDeveloper: s.isDeveloper,
    },
    app: {
      nameEn: s.appNameEn,
      nameAr: s.appNameAr,
      shortDescriptionEn: s.shortDescriptionEn,
      shortDescriptionAr: s.shortDescriptionAr,
      descriptionEn: s.descriptionEn,
      descriptionAr: s.descriptionAr,
    },
    links: {
      googlePlay: s.googlePlayLink,
      appStore: s.appStoreLink,
      appGallery: s.appGalleryLink,
      website: s.websiteLink,
    },
    developer: {
      nameEn: s.developerNameEn,
      nameAr: s.developerNameAr,
      website: s.developerWebsite,
      email: s.developerEmail,
    },
    media: {
      appIconUrl: s.appIconUrl,
      mainImageEn: s.mainImageEn,
      mainImageAr: s.mainImageAr,
      screenshotsEn: s.screenshotsEn,
      screenshotsAr: s.screenshotsAr,
    },
    crawledContent: s.crawledContent,
    adminNotes: s.adminNotes,
    rejectionReason: s.rejectionReason,
    infoRequestMessage: s.infoRequestMessage,
    categories: catRows,
    submittedAt: s.createdAt,
    updatedAt: s.updatedAt,
    reviewedAt: s.reviewedAt,
    createdApp:
      s.linkedAppId != null
        ? { id: s.linkedAppId, nameEn: s.linkedAppNameEn ?? "", slug: s.linkedAppSlug ?? "" }
        : null,
    logs,
  };
}

export type DashboardCounts = {
  appsPublished: number;
  appsDraft: number;
  appsArchived: number;
  subsPending: number;
  subsUnderReview: number;
  subsInfoRequested: number;
  subsApproved: number;
  subsRejected: number;
  views30d: number;
};

type DashboardRow = {
  apps_published: number;
  apps_draft: number;
  apps_archived: number;
  subs_pending: number;
  subs_under_review: number;
  subs_info_requested: number;
  subs_approved: number;
  subs_rejected: number;
  views_30d: number;
};

/** Dashboard tiles: one round trip — apps + submissions grouped by status plus the 30d views count. */
export async function getDashboardCounts(): Promise<DashboardCounts> {
  const [row] = await db.execute<DashboardRow>(sql`
    WITH
      a AS (SELECT status, count(*)::int AS n FROM apps GROUP BY status),
      s AS (SELECT status, count(*)::int AS n FROM app_submissions GROUP BY status)
    SELECT
      coalesce((SELECT n FROM a WHERE status = 'published'), 0)      AS apps_published,
      coalesce((SELECT n FROM a WHERE status = 'draft'), 0)          AS apps_draft,
      coalesce((SELECT n FROM a WHERE status = 'archived'), 0)       AS apps_archived,
      coalesce((SELECT n FROM s WHERE status = 'pending'), 0)        AS subs_pending,
      coalesce((SELECT n FROM s WHERE status = 'under_review'), 0)   AS subs_under_review,
      coalesce((SELECT n FROM s WHERE status = 'info_requested'), 0) AS subs_info_requested,
      coalesce((SELECT n FROM s WHERE status = 'approved'), 0)       AS subs_approved,
      coalesce((SELECT n FROM s WHERE status = 'rejected'), 0)       AS subs_rejected,
      (SELECT count(*)::int FROM app_view_events WHERE viewed_at > now() - interval '30 days') AS views_30d
  `);
  return {
    appsPublished: row.apps_published,
    appsDraft: row.apps_draft,
    appsArchived: row.apps_archived,
    subsPending: row.subs_pending,
    subsUnderReview: row.subs_under_review,
    subsInfoRequested: row.subs_info_requested,
    subsApproved: row.subs_approved,
    subsRejected: row.subs_rejected,
    views30d: row.views_30d,
  };
}
