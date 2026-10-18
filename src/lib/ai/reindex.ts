/**
 * Reindex jobs for smart (RAG) search: re-embeds every published app (or a
 * single app) through the T5 upsert. Plain server-side module — no "use
 * server" — so it is directly testable and reusable by the CLI script.
 *
 * `reindexAllEmbeddings` never throws: per-app failures (provider outages,
 * malformed vectors, DB errors) are tallied as `failed` and the sweep
 * continues.
 */
import { getAppListRows } from "@/lib/repo/apps-rows";
import { upsertAppEmbedding } from "./ingest";
import type { EmbeddingProvider } from "./types";

export type ReindexReport = { embedded: number; skipped: number; failed: number };

/** Page width for the published-apps sweep (getAppListRows' own cap). */
const PAGE_SIZE = 200;

/**
 * Re-embeds every published app, paging through getAppListRows to exhaustion.
 * Unchanged apps (doc_hash match) are tallied as skipped; an app that throws
 * (or vanishes mid-sweep) is tallied as failed and the sweep continues.
 */
export async function reindexAllEmbeddings(opts?: {
  provider?: EmbeddingProvider;
}): Promise<ReindexReport> {
  const report: ReindexReport = { embedded: 0, skipped: 0, failed: 0 };
  let page = 1;
  for (;;) {
    const { results } = await getAppListRows({
      status: "published",
      pageSize: PAGE_SIZE,
      page,
      includeCategories: false,
    });
    for (const app of results) {
      try {
        const { status } = await upsertAppEmbedding(app.id, opts);
        if (status === "embedded") report.embedded += 1;
        else if (status === "skipped") report.skipped += 1;
        else report.failed += 1; // app_not_found
      } catch {
        report.failed += 1;
      }
    }
    if (results.length < PAGE_SIZE) break;
    page += 1;
  }
  return report;
}

/**
 * Embeds one app with the default provider — the approval hook's entry point.
 * Propagates provider errors for the caller to catch (the hook does).
 */
export async function reindexAppEmbedding(
  appId: number
): Promise<{ status: "embedded" | "skipped" | "app_not_found" }> {
  return upsertAppEmbedding(appId);
}
