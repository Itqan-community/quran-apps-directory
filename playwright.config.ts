import { defineConfig } from "@playwright/test";
import { config as dotenvConfig } from "dotenv";

dotenvConfig({ path: ".env.local" });

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  use: { baseURL: "http://127.0.0.1:3210" },
  webServer: {
    command:
      "npm run build && cp -r public .next/standalone/ && mkdir -p .next/standalone/.next && cp -r .next/static .next/standalone/.next/ && PORT=3210 HOSTNAME=127.0.0.1 node .next/standalone/server.js",
    url: "http://127.0.0.1:3210/health",
    reuseExistingServer: !process.env.CI,
    timeout: 300_000,
    // Deterministic e2e: the mock embedding provider must win over any ambient
    // AI_SEARCH_PROVIDER so no external API calls happen during tests.
    env: { ...process.env, AI_SEARCH_PROVIDER: "mock" },
  },
});
