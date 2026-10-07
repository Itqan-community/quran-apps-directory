import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/db";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const checkDb = url.searchParams.get("check_db") === "true";

  const data: Record<string, unknown> = {
    status: "healthy",
    service: "Quran Apps Directory API",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
  };

  let code = 200;
  if (checkDb) {
    try {
      await db.execute(sql`select 1`);
      data.database_status = "connected";
    } catch {
      data.database_status = "disconnected";
      data.status = "unhealthy";
      code = 503;
    }
  }

  return NextResponse.json(data, { status: code });
}
