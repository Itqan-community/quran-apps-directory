"use server";

import { getApps } from "@/lib/repo/apps";

export type Suggestion = {
  slug: string;
  id: number;
  nameEn: string;
  nameAr: string;
  icon: string;
};

export async function searchSuggestions(query: string): Promise<Suggestion[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const { results } = await getApps({ search: q, pageSize: 5 });
  return results.map((r) => ({
    slug: r.slug,
    id: r.id,
    nameEn: r.nameEn,
    nameAr: r.nameAr,
    icon: r.applicationIcon,
  }));
}
