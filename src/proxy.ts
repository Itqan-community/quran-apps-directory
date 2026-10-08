import { randomUUID } from "node:crypto";
import { auth } from "@/lib/auth";
import { NextResponse, type NextRequest } from "next/server";

const VIEW_COOKIE = "qad_vid";
const ONE_YEAR = 60 * 60 * 24 * 365;

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isAdmin = pathname === "/admin" || pathname.startsWith("/admin/");
  if (isAdmin) {
    if (pathname === "/admin/login") return NextResponse.next();
    const session = await auth();
    if (!session) {
      return NextResponse.redirect(new URL("/admin/login", req.url));
    }
    return withViewId(req);
  }

  // locale bootstrap: only the bare root redirects to the default locale.
  // Unknown first segments (e.g. /fr) fall through so the [lang] layout can
  // serve a real 404 for invalid locales (next-intl requestLocale handles the rest).
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0) {
    return NextResponse.redirect(new URL("/ar", req.url));
  }

  return withViewId(req);
}

/** Ensure every visitor carries a stable anonymous id for view-event dedupe. */
function withViewId(req: NextRequest) {
  if (req.cookies.get(VIEW_COOKIE)?.value) return NextResponse.next();
  const res = NextResponse.next();
  res.cookies.set(VIEW_COOKIE, randomUUID(), {
    httpOnly: false,
    sameSite: "lax",
    maxAge: ONE_YEAR,
    path: "/",
  });
  return res;
}

export default proxy;

export const config = {
  matcher: ["/((?!_next|_vercel|api|health|sentry-tunnel|upload|.*\\..*).*)"],
};
