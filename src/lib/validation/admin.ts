import { z } from "zod";

/** Empty string allowed (field absent); a present value must be http(s). Mirrors the public submission store-refine. */
export const optionalHttp = z
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

/** One social-link row: blank rows are normalized away by the action; non-blank values must be http(s). */
export const socialLinkRow = z.object({
  url: z
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
    }, "invalidHttpLink"),
});

/** Empty string allowed; a present value must look like an email. */
const optionalEmail = z
  .string()
  .trim()
  .refine((v) => v === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), "invalidEmail");

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

/**
 * Shared by the categories page island (CategoryForm in taxonomy-editor.tsx) and
 * saveCategory (src/lib/actions/admin-taxonomy.ts). `id` is not part of this
 * schema — the edit path is detected by saveCategory from the raw input
 * (mirrors the Task 8 appFormSchema convention). A blank slug is computed from
 * nameEn by the action; uniqueness is DB-enforced and surfaced via the pg
 * `23505` catch.
 */
export const categoryFormSchema = z.object({
  nameEn: z.string().trim().min(1).max(200),
  nameAr: z.string().trim().min(1).max(200),
  slug: z.string().trim().max(200).optional(),
  descriptionEn: z.string().trim(),
  descriptionAr: z.string().trim(),
  icon: z.string().trim().max(200).default(""),
  color: z.string().trim().max(50).default(""),
  sortOrder: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
});

export type CategoryFormInput = z.infer<typeof categoryFormSchema>;

/**
 * Shared by the developers page island (DeveloperForm in taxonomy-editor.tsx)
 * and saveDeveloper. The island collects social links as repeatable {url}
 * rows; saveDeveloper normalizes them into the Record<string,string> jsonb
 * column (each row keyed by the URL itself). `id` again rides the raw input.
 */
export const developerFormSchema = z.object({
  nameEn: z.string().trim().min(1).max(200),
  nameAr: z.string().trim().min(1).max(200),
  website: optionalHttp.default(""),
  email: optionalEmail.default(""),
  logoUrl: optionalHttp.default(""),
  descriptionEn: z.string().trim(),
  descriptionAr: z.string().trim(),
  socialLinks: z.array(socialLinkRow).max(30).default([]),
  isVerified: z.boolean().default(false),
});

export type DeveloperFormInput = z.infer<typeof developerFormSchema>;
