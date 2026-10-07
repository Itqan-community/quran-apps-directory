import { and, eq, sql, asc } from "drizzle-orm";
import { db } from "@/db";
import { apps, metadataOptions, metadataTypes } from "@/db/schema";

export async function getActiveMetadataNames(): Promise<string[]> {
  const rows = await db
    .select({ name: metadataTypes.name })
    .from(metadataTypes)
    .where(eq(metadataTypes.isActive, true))
    .orderBy(asc(metadataTypes.sortOrder));
  return rows.map((r) => r.name);
}

export type MetadataValue = { value: string; labelEn: string; labelAr: string; count: number };
export type MetadataValuesResponse = {
  platforms: MetadataValue[];
  [key: string]: MetadataValue[];
};

const PLATFORMS: [string, string, string][] = [
  ["android", "Android", "أندرويد"],
  ["ios", "iOS", "آي أو إس"],
  ["web", "Web", "ويب"],
  ["cross_platform", "Cross Platform", "متعدد المنصات"],
];

export async function getMetadataValues(): Promise<MetadataValuesResponse> {
  const published = eq(apps.status, "published");

  const platforms: MetadataValue[] = [];
  for (const [value, en, ar] of PLATFORMS) {
    const [{ c }] = await db
      .select({ c: sql<number>`count(*)::int` })
      .from(apps)
      .where(and(published, eq(apps.platform, value)));
    if (c > 0) platforms.push({ value, labelEn: en, labelAr: ar, count: c });
  }

  const response: MetadataValuesResponse = { platforms };

  const types = await db
    .select()
    .from(metadataTypes)
    .where(eq(metadataTypes.isActive, true))
    .orderBy(asc(metadataTypes.sortOrder));

  for (const t of types) {
    const values = await db
      .select({
        value: metadataOptions.value,
        labelEn: metadataOptions.labelEn,
        labelAr: metadataOptions.labelAr,
        count: sql<number>`(SELECT count(*)::int FROM app_metadata_values amv
          JOIN apps a ON a.id = amv.app_id
          WHERE amv.metadata_option_id = ${sql.raw('"metadata_options"."id"')} AND a.status = 'published')`,
      })
      .from(metadataOptions)
      .where(and(eq(metadataOptions.metadataTypeId, t.id), eq(metadataOptions.isActive, true)))
      .orderBy(asc(metadataOptions.sortOrder));
    response[t.name] = values.filter((v) => v.count > 0);
  }

  return response;
}
