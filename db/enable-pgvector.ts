import "dotenv/config";
import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set");
const sql = postgres(url, { max: 4 });

async function main() {
  await sql`CREATE EXTENSION IF NOT EXISTS vector`;
  await sql.end();
  console.log("pgvector ready");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
