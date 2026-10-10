"use server";

import { sql } from "drizzle-orm";
import { db } from "@/db";
import {
  appSubmissions,
  appSubmissionsCategories,
  categories,
  submissionStatusLogs,
} from "@/db/schema";
import { submissionSchema, generateTrackingId } from "@/lib/validation/submission";
import { findDuplicateAppName } from "@/lib/repo/apps";

export type SubmitResult =
  | { ok: true; trackingId: string }
  | { ok: false; error: "validation" | "server"; message?: string; fieldErrors?: Record<string, string[]> };

export async function submitApp(input: unknown): Promise<SubmitResult> {
  const parsed = submissionSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join(".") || "form";
      (fieldErrors[key] ??= []).push(issue.message);
    }
    return { ok: false, error: "validation", fieldErrors };
  }
  const data = parsed.data;

  // Names must be unique across the directory (reference: live data).
  const dupField = await findDuplicateAppName(data.app_name_en, data.app_name_ar);
  if (dupField) {
    return { ok: false, error: "validation", fieldErrors: { [dupField]: ["duplicateName"] } };
  }

  for (let attempt = 0; attempt < 5; attempt++) {
    const trackingId = generateTrackingId();
    try {
      return await db.transaction(async (tx) => {
        const inserted = await tx
          .insert(appSubmissions)
          .values({
            trackingId,
            status: "pending",
            submitterName: data.submitter_name,
            submitterEmail: data.submitter_email.toLowerCase(),
            submitterPhone: data.submitter_phone,
            submitterOrganization: data.submitter_organization,
            isDeveloper: data.is_developer,
            developerNameEn: data.developer_name_en,
            developerNameAr: data.developer_name_ar,
            developerWebsite: data.developer_website,
            developerEmail: data.developer_email,
            appNameEn: data.app_name_en,
            appNameAr: data.app_name_ar,
            googlePlayLink: data.google_play_link,
            appStoreLink: data.app_store_link,
            appGalleryLink: data.app_gallery_link,
            websiteLink: data.website_link,
            appIconUrl: data.app_icon_url,
            mainImageEn: data.main_image_en,
            mainImageAr: data.main_image_ar,
            screenshotsEn: data.screenshots_en,
            screenshotsAr: data.screenshots_ar,
            additionalNotes: data.additional_notes,
            contentConfirmation: data.content_confirmation,
          })
          .returning({ id: appSubmissions.id });

        const submissionId = inserted[0].id;

        if (data.categories.length > 0) {
          const placeholders = sql.join(
            data.categories.map((c) => sql`${c}`),
            sql`, `
          );
          const validIds = new Set(
            (
              await tx
                .select({ id: categories.id })
                .from(categories)
                .where(sql`id IN (${placeholders})`)
            ).map((r) => r.id)
          );
          for (const categoryId of data.categories) {
            if (!validIds.has(categoryId)) continue;
            await tx.insert(appSubmissionsCategories).values({
              appsubmissionId: submissionId,
              categoryId,
            });
          }
        }

        await tx.insert(submissionStatusLogs).values({
          submissionId,
          fromStatus: "",
          toStatus: "pending",
        });

        return { ok: true as const, trackingId };
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      if (message.includes("app_submissions_tracking_id_unique")) {
        continue; // collision — retry with a new id
      }
      console.error("submitApp error", e);
      return { ok: false, error: "server", message: "Failed to submit. Please try again." };
    }
  }
  return { ok: false, error: "server", message: "Failed to generate tracking ID. Please try again." };
}
