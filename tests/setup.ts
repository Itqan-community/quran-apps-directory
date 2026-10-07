import { config as dotenvConfig } from "dotenv";

const env = dotenvConfig({ path: ".env.test" });

const testUrl = process.env.TEST_DATABASE_URL ?? env?.parsed?.TEST_DATABASE_URL;

if (testUrl) {
  process.env.TEST_DATABASE_URL = testUrl;
  // All repo-layer tests run against the test DB: point the Drizzle client (DATABASE_URL)
  // at the test DB too, matching the CI environment in the plan (Task 13).
  process.env.DATABASE_URL = testUrl;
}
