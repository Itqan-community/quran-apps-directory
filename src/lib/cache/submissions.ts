import { cacheLife, cacheTag } from "next/cache";
import {
  getSubmissionByTrackingId,
  getSubmissionsByEmail,
} from "@/lib/repo/submissions";

export async function getSubmissionByTrackingIdCached(rawId: string) {
  "use cache";
  cacheLife("minutes");
  cacheTag("submissions");
  return getSubmissionByTrackingId(rawId);
}

export async function getSubmissionsByEmailCached(rawEmail: string) {
  "use cache";
  cacheLife("minutes");
  cacheTag("submissions");
  return getSubmissionsByEmail(rawEmail);
}
