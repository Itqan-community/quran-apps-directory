import { asc, desc, eq, sql } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import { db } from "@/db";
import { appViewEvents, apps } from "@/db/schema";

export type DayCount = { day: string; views: number };

const VIEWS_30D_WINDOW: SQL = sql`${appViewEvents.viewedAt} > now() - interval '30 days'`;
/** day = YYYY-MM-DD in UTC, independent of the server's timezone */
const VIEWED_DAY_KEY = sql<string>`(date_trunc('day', ${appViewEvents.viewedAt} AT TIME ZONE 'UTC'))::date::text`;

/** Daily view counts across the last 30 days (oldest first), zero-filled to exactly 30 entries. */
export async function getViewsPerDay30d(): Promise<DayCount[]> {
  const rows = await db
    .select({
      day: VIEWED_DAY_KEY,
      views: sql<number>`count(*)::int`,
    })
    .from(appViewEvents)
    .where(VIEWS_30D_WINDOW)
    .groupBy(sql`1`)
    .orderBy(sql`1`);

  const countByDay = new Map(rows.map((r) => [r.day, r.views]));
  const now = new Date();
  const todayUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const out: DayCount[] = [];
  for (let i = 29; i >= 0; i--) {
    const day = new Date(todayUtc - i * 86_400_000).toISOString().slice(0, 10);
    out.push({ day, views: countByDay.get(day) ?? 0 });
  }
  return out;
}

/** Most-viewed apps over the last 30 days. */
export async function getTopApps30d(
  limit = 20
): Promise<{ appId: number; nameEn: string; nameAr: string; views: number }[]> {
  return db
    .select({
      appId: apps.id,
      nameEn: apps.nameEn,
      nameAr: apps.nameAr,
      views: sql<number>`count(*)::int`,
    })
    .from(appViewEvents)
    .innerJoin(apps, eq(apps.id, appViewEvents.appId))
    .where(VIEWS_30D_WINDOW)
    .groupBy(apps.id, apps.nameEn, apps.nameAr)
    .orderBy(desc(sql`count(*)`), asc(apps.id))
    .limit(limit);
}

/** Views per country over the last 30 days (null country kept, ranked by views). */
export async function getCountryBreakdown30d(
  limit = 10
): Promise<{ countryCode: string | null; views: number }[]> {
  return db
    .select({
      countryCode: appViewEvents.countryCode,
      views: sql<number>`count(*)::int`,
    })
    .from(appViewEvents)
    .where(VIEWS_30D_WINDOW)
    .groupBy(appViewEvents.countryCode)
    .orderBy(desc(sql`count(*)`), asc(appViewEvents.countryCode))
    .limit(limit);
}

/** Views per device type over the last 30 days. */
export async function getDeviceBreakdown30d(): Promise<{ deviceType: string; views: number }[]> {
  return db
    .select({
      deviceType: appViewEvents.deviceType,
      views: sql<number>`count(*)::int`,
    })
    .from(appViewEvents)
    .where(VIEWS_30D_WINDOW)
    .groupBy(appViewEvents.deviceType)
    .orderBy(desc(sql`count(*)`), asc(appViewEvents.deviceType));
}
