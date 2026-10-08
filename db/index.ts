import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is not set");

// prepare:false — postgres.js generates statement ids via Math.random(), which
// trips Next 16's unstable-value check inside cache scopes during instant-UI
// validation. Untagged prepared statements also break behind PgBouncer.
const client = postgres(connectionString, { max: 10, prepare: false });
export const db = drizzle(client, { schema });
export { client as pgClient };
