"use server";

import { asc, sql } from "drizzle-orm";
import { db } from "@/db";
import { appsCategories, apps, categories } from "@/db/schema";
import type { Locale } from "@/lib/i18n";

export type PublicCategory = {
  id: number;
  slug: string;
  label: string;
};

export async function getSubmissionCategories(
  lang: Locale
): Promise<PublicCategory[]> {
  const rows = await db
    .select({
      id: categories.id,
      slug: categories.slug,
      label: sql<string>`CASE WHEN ${lang === "ar"} THEN ${categories.nameAr} ELSE ${categories.nameEn} END`,
    })
    .from(categories)
    .where(
      sql`${categories.isActive} AND EXISTS (
        SELECT 1 FROM apps_categories ac
        JOIN apps a ON a.id = ac.app_id
        WHERE ac.category_id = ${categories.id} AND a.status = 'published'
      )`
    )
    .orderBy(asc(categories.sortOrder));
  return rows.map((r) => ({ id: r.id, slug: r.slug, label: r.label }));
}
