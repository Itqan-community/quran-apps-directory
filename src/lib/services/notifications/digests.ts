/**
 * Declarative digest registry: the worker (Task 7) and compose (Task 8) are
 * generic over this array — a future digest is added as one entry (name +
 * cronEnvVar + optional webhookEnvVar + build fn). Digest names are
 * write-once contracts (they back persisted Redis state), so keep them stable.
 * `build` may do its own repo I/O; it never posts — delivery stays in the worker.
 */

import {
  countPendingSubmissions,
  listPendingSubmissions,
  oldestPendingSubmittedAt,
} from "@/lib/repo/submissions";
import { pendingDigestMessage, type SlackMessage } from "@/lib/services/slack";

export type DigestDefinition = {
  name: string;          // write-once BullMQ job name
  cronEnvVar: string;    // env var holding the node-cron pattern
  webhookEnvVar?: string; // per-digest webhook override; falls back to SLACK_WEBHOOK_URL
  build: () => Promise<SlackMessage | null>; // null = nothing to send
};

export const digests: DigestDefinition[] = [
  {
    name: "pending-submissions",
    cronEnvVar: "DIGEST_PENDING_SUBMISSIONS_CRON",
    async build() {
      const items = await listPendingSubmissions();
      if (items.length === 0) return null;
      // total and oldest are facts over ALL pending rows (spec §4.1): the
      // shown slice is only the newest 10, so the oldest age must come from
      // a separate aggregate, not from the slice.
      const [total, oldest] = await Promise.all([
        countPendingSubmissions(),
        oldestPendingSubmittedAt(),
      ]);
      return pendingDigestMessage(items, total, new Date(), oldest ?? undefined);
    },
  },
];
