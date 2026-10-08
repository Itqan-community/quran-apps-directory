import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    // Suites share one test DB and assert exact counts: run files sequentially
    // so one suite's fixtures can never leak into another's assertions.
    fileParallelism: false,
    setupFiles: ["./tests/setup.ts"],
    exclude: ["node_modules/**", "e2e/**", ".next/**"],
  },
  resolve: {
    alias: { "@/db": path.resolve(__dirname, "./db"), "@": path.resolve(__dirname, "./src") },
  },
});
