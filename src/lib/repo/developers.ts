import { eq } from "drizzle-orm";
import { db } from "@/db";
import { developers } from "@/db/schema";
import type { AppListItem } from "./apps-rows";
import { getAppListRows } from "./apps-rows";

export async function getDeveloperApps(developerId: number): Promise<{
  count: number;
  developer: { id: number; nameEn: string; nameAr: string; website: string | null; logo: string | null } | null;
  results: AppListItem[];
}> {
  const devRows = await db.select().from(developers).where(eq(developers.id, developerId)).limit(1);
  if (devRows.length === 0) return { count: 0, developer: null, results: [] };
  const d = devRows[0];
  const res = await getAppListRows({ developerId });
  return {
    count: res.count,
    developer: { id: d.id, nameEn: d.nameEn, nameAr: d.nameAr, website: d.website, logo: d.logoUrl },
    results: res.results,
  };
}
