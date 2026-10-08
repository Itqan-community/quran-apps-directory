import { NextResponse } from "next/server";
import { recordViewEvent, countryFromHeaders } from "@/lib/services/view-analytics";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { appId?: number };
    if (!body.appId || !Number.isInteger(body.appId)) {
      return NextResponse.json({ error: "invalid" }, { status: 400 });
    }
    const h = req.headers;
    await recordViewEvent({
      appId: body.appId,
      userAgent: h.get("user-agent"),
      ip: h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip"),
      country: countryFromHeaders(h),
      sessionId: req.headers.get("cookie")?.match(/qad_vid=([^;]+)/)?.[1] ?? null,
      referrer: h.get("referer"),
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("view event error", e);
    return NextResponse.json({ error: "error" }, { status: 500 });
  }
}
