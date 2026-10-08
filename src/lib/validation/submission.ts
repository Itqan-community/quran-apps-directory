import { z } from "zod";

const storeUrl = z
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

const urlList = z
  .array(z.string().trim().url("invalidStoreLink"))
  .max(10)
  .default([]);

export const submissionSchema = z
  .object({
    submitter_name: z.string().trim().max(200).default(""),
    submitter_email: z.string().trim().email().max(200),
    submitter_phone: z.string().trim().max(50).default(""),
    submitter_organization: z.string().trim().max(200).default(""),
    is_developer: z.boolean().default(false),

    app_name_en: z.string().trim().min(1).max(200),
    app_name_ar: z.string().trim().max(200).default(""),

    google_play_link: storeUrl.default(""),
    app_store_link: storeUrl.default(""),
    app_gallery_link: storeUrl.default(""),
    website_link: storeUrl.default(""),

    categories: z.array(z.number().int().positive()).default([]),

    developer_name_en: z.string().trim().max(200).default(""),
    developer_name_ar: z.string().trim().max(200).default(""),
    developer_website: storeUrl.default(""),
    developer_email: z.string().trim().email().max(200).or(z.literal("")).default(""),

    app_icon_url: storeUrl.default(""),
    main_image_en: storeUrl.default(""),
    main_image_ar: storeUrl.default(""),
    screenshots_en: urlList,
    screenshots_ar: urlList,

    additional_notes: z.string().trim().max(2000).default(""),
    content_confirmation: z.literal(true),
  })
  .refine(
    (data) =>
      Boolean(
        data.google_play_link || data.app_store_link || data.app_gallery_link
      ),
    { message: "storeLink", path: ["google_play_link"] }
  );

export type SubmissionInput = z.infer<typeof submissionSchema>;

/** Generate a QAD-XXXXXX tracking id (uppercase letters + digits). */
export function generateTrackingId(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let suffix = "";
  for (let i = 0; i < 6; i++) {
    suffix += chars[Math.floor(Math.random() * chars.length)];
  }
  return `QAD-${suffix}`;
}
