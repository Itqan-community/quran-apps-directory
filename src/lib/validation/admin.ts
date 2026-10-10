import { z } from "zod";

/** Empty string allowed (field absent); a present value must be http(s). Mirrors the public submission store-refine. */
const optionalHttp = z
  .string()
  .trim()
  .refine((v) => {
    if (!v) return true;
    try {
      const parsed = new URL(v);
      return parsed.protocol === "http:" || parsed.protocol === "https:";
    } catch {
      return false;
    }
  }, "invalidStoreLink");

/**
 * Shared by the admin app form island (src/components/admin/app-form.tsx) and
 * saveApp (src/lib/actions/admin-apps.ts). Exactly per the Task 8 brief:
 * - the three store links are each optional, but at least one is required
 *   (refine mirroring the public submission schema);
 * - screenshots cap at 10 per language;
 * - metadata is a record typeId → optionIds; the single-select "exactly 1"
 *   rule is checked in the ACTION, not here, so the schema stays
 *   representation-only.
 * `id` is not part of this schema: the edit path is detected by saveApp from
 * the raw input (the form island targets /admin/apps/[id] semantics).
 */
export const appFormSchema = z
  .object({
    nameEn: z.string().trim().min(1).max(200),
    nameAr: z.string().trim().min(1).max(200),
    shortDescriptionEn: z.string().trim().min(1).max(500),
    shortDescriptionAr: z.string().trim().min(1).max(500),
    descriptionEn: z.string().trim().min(1),
    descriptionAr: z.string().trim().min(1),
    applicationIcon: z.string().trim().url(),
    mainImageEn: z.string().trim().url(),
    mainImageAr: z.string().trim().url(),
    googlePlayLink: optionalHttp.default(""),
    appStoreLink: optionalHttp.default(""),
    appGalleryLink: optionalHttp.default(""),
    screenshotsEn: z.array(z.string().url()).max(10).default([]),
    screenshotsAr: z.array(z.string().url()).max(10).default([]),
    categoryIds: z.array(z.number().int().positive()).default([]),
    metadata: z.record(z.string(), z.array(z.number().int().positive())).default({}),
    developerId: z.number().int().positive(),
    platform: z.enum(["android", "ios", "web", "cross_platform"]),
    status: z.enum(["draft", "published", "archived"]),
    featured: z.boolean().default(false),
    sortOrder: z.number().int().min(0).default(0),
    slug: z.string().trim().max(200).optional(), // create-time computed, edit-time optional override
  })
  .refine(
    (data) => Boolean(data.googlePlayLink || data.appStoreLink || data.appGalleryLink),
    { message: "storeLink", path: ["googlePlayLink"] }
  );

export type AppFormInput = z.infer<typeof appFormSchema>;
