/**
 * Regenerates the smart-search embeddings for every published app.
 *
 * Usage: npm run embeddings:reindex
 * (node --experimental-strip-types --env-file=.env.local scripts/reindex-embeddings.ts)
 *
 * Prints the ReindexReport as JSON and always exits 0: per-app failures are
 * tallied in the report, not thrown.
 *
 * Node's type-stripping loader cannot resolve the tsconfig path aliases
 * ("@/db" → db/, "@/*" → src/*) or the extensionless relative imports used
 * across the codebase, so a resolve hook maps them to real files before any
 * app module is imported.
 */
import "dotenv/config";
import { registerHooks } from "node:module";
import { statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(import.meta.dirname, "..");
const dbRoot = resolve(root, "db");
const srcRoot = resolve(root, "src");

const isFile = (p: string): boolean => {
  try {
    return statSync(p).isFile();
  } catch {
    return false;
  }
};

const withExtension = (base: string): string | null => {
  for (const suffix of ["", ".ts", ".tsx", "/index.ts", "/index.tsx"]) {
    const candidate = base + suffix;
    if (isFile(candidate)) return candidate;
  }
  return null;
};

registerHooks({
  resolve(specifier, context, nextResolve) {
    // Mirror tsconfig paths: "@/db" → db/index.ts, "@/db/*" → db/*, "@/*" → src/*.
    let base: string | null = null;
    if (specifier === "@/db") base = resolve(dbRoot, "index.ts");
    else if (specifier.startsWith("@/db/")) base = withExtension(resolve(dbRoot, specifier.slice(5)));
    else if (specifier.startsWith("@/")) base = withExtension(resolve(srcRoot, specifier.slice(2)));
    if (base) return nextResolve(base, context);

    if ((specifier.startsWith("./") || specifier.startsWith("../")) && context.parentURL) {
      const parentDir = dirname(fileURLToPath(context.parentURL));
      const hit = withExtension(resolve(parentDir, specifier));
      if (hit) return nextResolve(hit, context);
    }
    return nextResolve(specifier, context);
  },
});

async function main(): Promise<void> {
  const [{ getEmbeddingProvider }, { reindexAllEmbeddings }, { pgClient }] = await Promise.all([
    import("@/lib/ai/provider"),
    import("@/lib/ai/reindex"),
    import("@/db"),
  ]);
  try {
    const report = await reindexAllEmbeddings({ provider: getEmbeddingProvider() });
    console.log(JSON.stringify(report));
  } finally {
    await pgClient.end();
  }
}

void main().catch((err) => {
  console.error("embeddings:reindex failed", err);
});
