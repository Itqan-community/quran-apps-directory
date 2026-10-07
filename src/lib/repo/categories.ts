import { eq, sql, asc } from "drizzle-orm";
import { db } from "@/db";
import { categories } from "@/db/schema";

export type CategoryItem = {
  id: number;
  slug: string;
  nameEn: string;
  nameAr: string;
  descriptionEn: string;
  descriptionAr: string;
  icon: string | null;
  color: string | null;
  sortOrder: number;
  appCount: number;
};

export async function getCategories(): Promise<CategoryItem[]> {
  const rows = await db
    .select({
      id: categories.id,
      slug: categories.slug,
      nameEn: categories.nameEn,
      nameAr: categories.nameAr,
      descriptionEn: categories.descriptionEn,
      descriptionAr: categories.descriptionAr,
      icon: categories.icon,
      color: categories.color,
      sortOrder: categories.sortOrder,
      appCount: sql<number>`(SELECT count(*)::int FROM apps_categories ac
        JOIN apps a ON a.id = ac.app_id
        WHERE ac.category_id = ${sql.raw('"categories"."id"')} AND a.status = 'published')`,
    })
    .from(categories)
    .where(eq(categories.isActive, true))
    .orderBy(asc(categories.sortOrder), asc(categories.nameEn));
  return rows;
}

export async function getCategoryBySlug(slug: string) {
  const rows = await db.select().from(categories).where(eq(categories.slug, slug)).limit(1);
  return rows[0] ?? null;
}
