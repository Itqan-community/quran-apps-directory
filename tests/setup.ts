import { config as dotenvConfig } from "dotenv";

const env = dotenvConfig({ path: ".env.test" });
if (!process.env.TEST_DATABASE_URL && env?.parsed?.TEST_DATABASE_URL) {
  process.env.TEST_DATABASE_URL = env.parsed.TEST_DATABASE_URL;
}
