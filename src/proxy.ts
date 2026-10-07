import { auth } from "@/lib/auth";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isAdmin = pathname === "/admin" || pathname.startsWith("/admin/");
  if (isAdmin) {
    if (pathname === "/admin/login") return NextResponse.next();
    const session = await auth();
    if (!session) {
      return NextResponse.redirect(new URL("/admin/login", req.url));
    }
    return NextResponse.next();
  }

  // locale bootstrap: only the bare root redirects to the default locale.
  // Unknown first segments (e.g. /fr) fall through so the [lang] layout can
  // serve a real 404 for invalid locales (next-intl requestLocale handles the rest).
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0) {
    return NextResponse.redirect(new URL("/ar", req.url));
  }

  return NextResponse.next();
}

export default proxy;

export const config = {
  matcher: ["/((?!_next|_vercel|api|health|sentry-tunnel|upload|.*\\..*).*)"],
};
